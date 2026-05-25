const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, dialog } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const FAST_POLL_INTERVAL_MS = 500;
const FULL_REFRESH_INTERVAL_MS = 5000;
const EVENT_DEDUPE_MS = 1200;
const ICON_PATH = path.join(__dirname, '..', 'assets', 'app.ico');

let mainWindow;
let tray;
let aliases = {};
let ports = [];
let events = [];
let portInfoCache = new Map();
let recentEventKeys = new Map();
let activeNotifications = new Map();
let fastKnownPortNames = new Set();
let isReadyForNotifications = false;
let fastPollTimer;
let fullRefreshTimer;
let queryInFlight = false;
let fastQueryInFlight = false;

function getDataDir() {
  if (app.isPackaged && process.env.PORTABLE_EXECUTABLE_DIR) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
  }

  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'data');
  }

  return path.join(app.getAppPath(), 'data');
}

function getAliasesFile() {
  return path.join(getDataDir(), 'port-aliases.json');
}

function ensureDataDir() {
  fs.mkdirSync(getDataDir(), { recursive: true });
}

function loadAliases() {
  ensureDataDir();
  try {
    aliases = JSON.parse(fs.readFileSync(getAliasesFile(), 'utf8'));
  } catch {
    aliases = {};
  }
}

function saveAliases() {
  ensureDataDir();
  fs.writeFileSync(getAliasesFile(), JSON.stringify(aliases, null, 2), 'utf8');
}

function normalizeAlias(value) {
  return String(value || '').trim().slice(0, 80);
}

function createTrayImage() {
  return nativeImage.createFromPath(ICON_PATH);
}

function getAliasForPort(port) {
  return aliases[port.deviceKey] || aliases[`port:${port.portName}`] || '';
}

function getDisplayLabel(port) {
  const alias = getAliasForPort(port);
  return alias ? `${alias} (${port.portName})` : port.portName;
}

function sortPortNames(portNames) {
  return [...portNames].sort((left, right) => {
    const a = Number(String(left).replace(/\D+/g, '')) || 9999;
    const b = Number(String(right).replace(/\D+/g, '')) || 9999;
    return a - b;
  });
}

function sortPorts(list) {
  return [...list].sort((left, right) => {
    const a = Number(String(left.portName).replace(/\D+/g, '')) || 9999;
    const b = Number(String(right.portName).replace(/\D+/g, '')) || 9999;
    return a - b;
  });
}

function cachePortInfo(list) {
  for (const port of list) {
    if (port.portName && port.deviceKey && !String(port.deviceKey).startsWith('port:')) {
      portInfoCache.set(port.portName, { ...port });
    }
  }
}

function getBestKnownPort(portName) {
  const current = ports.find((port) => port.portName === portName);
  const cached = portInfoCache.get(portName);
  return cached || current || createPlaceholderPort(portName);
}

function shouldAcceptEvent(type, portName) {
  const now = Date.now();
  const key = `${type}:${portName}`;
  const lastAt = recentEventKeys.get(key) || 0;

  for (const [eventKey, timestamp] of recentEventKeys) {
    if (now - timestamp > EVENT_DEDUPE_MS * 4) {
      recentEventKeys.delete(eventKey);
    }
  }

  if (now - lastAt < EVENT_DEDUPE_MS) {
    return false;
  }

  recentEventKeys.set(key, now);
  return true;
}

function buildPowerShellScript() {
  return `
$ErrorActionPreference = 'SilentlyContinue'
$nativeSerialProbeCode = @'
using System;
using System.Runtime.InteropServices;
public static class NativeSerialProbe {
  [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Auto)]
  public static extern IntPtr CreateFile(string lpFileName, uint dwDesiredAccess, uint dwShareMode, IntPtr lpSecurityAttributes, uint dwCreationDisposition, uint dwFlagsAndAttributes, IntPtr hTemplateFile);
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool CloseHandle(IntPtr hObject);
}
'@
Add-Type -TypeDefinition $nativeSerialProbeCode -ErrorAction SilentlyContinue

function Test-PortOpenState {
  param([string]$PortName)

  $handle = [NativeSerialProbe]::CreateFile('\\\\.\\' + $PortName, [uint32]2147483648, [uint32]0, [IntPtr]::Zero, [uint32]3, [uint32]0, [IntPtr]::Zero)
  $errorCode = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  if ($handle.ToInt64() -ne -1) {
    [NativeSerialProbe]::CloseHandle($handle) | Out-Null
    return 'free'
  }

  if ($errorCode -eq 5 -or $errorCode -eq 32) {
    return 'open'
  }

  return 'unknown'
}

$items = Get-CimInstance Win32_PnPEntity |
  Where-Object { $_.Name -match '\\(COM[0-9]+\\)' } |
  ForEach-Object {
    $match = [regex]::Match($_.Name, '\\((COM[0-9]+)\\)')
    $portName = $match.Groups[1].Value
    [pscustomobject]@{
      portName = $portName
      name = $_.Name
      caption = $_.Caption
      description = $_.Description
      manufacturer = $_.Manufacturer
      status = $_.Status
      openState = Test-PortOpenState $portName
      service = $_.Service
      deviceId = $_.PNPDeviceID
    }
  } |
  Sort-Object {
    if ($_.portName -match 'COM([0-9]+)') { [int]$Matches[1] } else { 9999 }
  }
$json = @($items) | ConvertTo-Json -Compress
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
`;
}

function queryFastPortNames() {
  return new Promise((resolve) => {
    execFile(
      'reg.exe',
      ['query', 'HKLM\\HARDWARE\\DEVICEMAP\\SERIALCOMM'],
      { windowsHide: true, timeout: 1200, maxBuffer: 256 * 1024 },
      (_error, stdout) => {
        const matches = String(stdout || '').match(/\bCOM\d+\b/g) || [];
        resolve(sortPortNames(new Set(matches)));
      }
    );
  });
}

function querySerialPorts() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', buildPowerShellScript()],
      { windowsHide: true, timeout: 7000, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve([]);
          return;
        }

        try {
          const json = Buffer.from(stdout.replace(/\s+/g, ''), 'base64').toString('utf8');
          const parsed = JSON.parse(json);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          resolve(sortPorts(list.filter(Boolean).map(normalizePort)));
        } catch {
          resolve([]);
        }
      }
    );
  });
}

function normalizePort(raw) {
  const portName = String(raw.portName || '').trim();
  const deviceId = String(raw.deviceId || '').trim();
  const name = String(raw.name || raw.caption || '').trim();
  const deviceKey = deviceId || `port:${portName}`;
  const openState = String(raw.openState || 'unknown').trim();

  return {
    portName,
    deviceKey,
    name,
    caption: String(raw.caption || '').trim(),
    description: String(raw.description || '').trim(),
    manufacturer: String(raw.manufacturer || '').trim(),
    status: String(raw.status || '').trim(),
    openState: ['open', 'free', 'unknown'].includes(openState) ? openState : 'unknown',
    service: String(raw.service || '').trim(),
    alias: aliases[deviceKey] || aliases[`port:${portName}`] || ''
  };
}

function createPlaceholderPort(portName) {
  const cached = portInfoCache.get(portName);
  if (cached) {
    return { ...cached, alias: getAliasForPort(cached) };
  }

  return {
    portName,
    deviceKey: `port:${portName}`,
    name: '',
    caption: '',
    description: '',
    manufacturer: '',
    status: 'OK',
    openState: 'unknown',
    service: '',
    alias: aliases[`port:${portName}`] || ''
  };
}

function createSnapshot() {
  return {
    ports: ports.map((port) => ({ ...port, alias: getAliasForPort(port) })),
    events,
    updatedAt: new Date().toISOString()
  };
}

function sendSnapshot() {
  const snapshot = createSnapshot();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('serial:snapshot', snapshot);
  }
}

function shouldShowSystemNotification() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return true;
  }

  return !mainWindow.isVisible() || !mainWindow.isFocused();
}

function buildNotificationBody(event, port) {
  const lines = [event.label];
  const details = [port.name || port.description, port.manufacturer].filter(Boolean);

  for (const detail of details) {
    if (detail && detail !== event.label && detail !== port.portName && !lines.includes(detail)) {
      lines.push(detail);
    }
  }

  return lines.join('\n');
}

function showPortNotification(type, event, port) {
  if (!isReadyForNotifications || !shouldShowSystemNotification() || !Notification.isSupported()) {
    return;
  }

  const previous = activeNotifications.get(port.portName);
  if (previous) {
    previous.close();
  }

  const notification = new Notification({
    title: type === 'attached' ? '串口已插入' : '串口已拔出',
    body: buildNotificationBody(event, port),
    icon: ICON_PATH,
    silent: false
  });

  activeNotifications.set(port.portName, notification);
  notification.once('close', () => {
    if (activeNotifications.get(port.portName) === notification) {
      activeNotifications.delete(port.portName);
    }
  });
  notification.show();
}

function addEvent(type, port) {
  if (!shouldAcceptEvent(type, port.portName)) {
    return;
  }

  const event = {
    id: `${Date.now()}-${type}-${port.portName}`,
    type,
    portName: port.portName,
    label: getDisplayLabel(port),
    name: port.name,
    manufacturer: port.manufacturer,
    deviceKey: port.deviceKey,
    timestamp: new Date().toISOString()
  };

  events = [event, ...events].slice(0, 80);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('serial:event', event);
  }

  showPortNotification(type, event, port);
}

async function refreshFastPortNames() {
  if (fastQueryInFlight) {
    return;
  }

  fastQueryInFlight = true;
  try {
    const nextNames = await queryFastPortNames();
    const nextSet = new Set(nextNames);
    const added = nextNames.filter((name) => !fastKnownPortNames.has(name));
    const removed = [...fastKnownPortNames].filter((name) => !nextSet.has(name));

    if (added.length === 0 && removed.length === 0) {
      return;
    }

    fastKnownPortNames = nextSet;

    for (const portName of removed) {
      addEvent('detached', getBestKnownPort(portName));
    }

    ports = ports.filter((port) => !removed.includes(port.portName));

    for (const portName of added) {
      const port = getBestKnownPort(portName);
      if (!ports.some((item) => item.portName === portName)) {
        ports.push(port);
      }
      addEvent('attached', port);
    }

    ports = sortPorts(ports);
    sendSnapshot();
    refreshPorts({ notifyDiff: false });
  } finally {
    fastQueryInFlight = false;
  }
}

async function refreshPorts({ notifyDiff = false } = {}) {
  if (queryInFlight) {
    return createSnapshot();
  }

  queryInFlight = true;
  try {
    const nextPorts = await querySerialPorts();
    cachePortInfo(nextPorts);
    if (notifyDiff) {
      diffAndApply(nextPorts);
    } else {
      ports = nextPorts;
      fastKnownPortNames = new Set(nextPorts.map((port) => port.portName));
      sendSnapshot();
    }
  } finally {
    queryInFlight = false;
  }

  return createSnapshot();
}

function diffAndApply(nextPorts) {
  const previousMap = new Map(ports.map((port) => [port.portName, port]));
  const nextMap = new Map(nextPorts.map((port) => [port.portName, port]));

  for (const port of nextPorts) {
    if (!previousMap.has(port.portName)) {
      addEvent('attached', port);
    }
  }

  for (const port of ports) {
    if (!nextMap.has(port.portName)) {
      addEvent('detached', getBestKnownPort(port.portName));
    }
  }

  ports = nextPorts;
  cachePortInfo(nextPorts);
  fastKnownPortNames = new Set(nextPorts.map((port) => port.portName));
  sendSnapshot();
}

function startPolling() {
  clearInterval(fastPollTimer);
  clearInterval(fullRefreshTimer);
  fastPollTimer = setInterval(refreshFastPortNames, FAST_POLL_INTERVAL_MS);
  fullRefreshTimer = setInterval(() => {
    refreshPorts({ notifyDiff: false });
  }, FULL_REFRESH_INTERVAL_MS);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    title: '串口通知工具',
    backgroundColor: '#f5f1e7',
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (app.isQuitting) {
      return;
    }

    event.preventDefault();
    promptCloseAction();
  });
}

async function promptCloseAction() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: '关闭窗口',
    message: '要退出程序，还是最小化到托盘继续监听？',
    detail: '最小化到托盘后，只有后台检测到串口插拔时才会弹出系统通知。',
    buttons: ['最小化到托盘', '退出程序', '取消'],
    defaultId: 0,
    cancelId: 2,
    noLink: true
  });

  if (result.response === 0) {
    mainWindow.hide();
    return;
  }

  if (result.response === 1) {
    app.isQuitting = true;
    app.quit();
  }
}

function createTray() {
  tray = new Tray(createTrayImage());
  tray.setToolTip('串口通知工具');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示窗口', click: showWindow },
    { label: '立即刷新', click: () => refreshPorts({ notifyDiff: false }) },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on('click', showWindow);
}

function showWindow() {
  if (!mainWindow) {
    return;
  }

  mainWindow.show();
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

ipcMain.handle('serial:get-snapshot', () => createSnapshot());
ipcMain.handle('serial:refresh', () => refreshPorts({ notifyDiff: false }));
ipcMain.handle('serial:save-alias', (_event, deviceKey, alias) => {
  const key = String(deviceKey || '').trim();
  if (!key) {
    return createSnapshot();
  }

  const normalized = normalizeAlias(alias);
  if (normalized) {
    aliases[key] = normalized;
  } else {
    delete aliases[key];
  }

  saveAliases();
  ports = ports.map((port) => ({ ...port, alias: getAliasForPort(port) }));
  sendSnapshot();
  return createSnapshot();
});
ipcMain.handle('window:show', () => showWindow());
ipcMain.handle('window:minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

app.whenReady().then(async () => {
  app.setAppUserModelId('SerialNotification.PortWatcher');
  loadAliases();
  createWindow();
  createTray();
  await refreshPorts({ notifyDiff: false });
  isReadyForNotifications = true;
  startPolling();
});

app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  app.isQuitting = true;
  clearInterval(fastPollTimer);
  clearInterval(fullRefreshTimer);
  for (const notification of activeNotifications.values()) {
    notification.close();
  }
});
