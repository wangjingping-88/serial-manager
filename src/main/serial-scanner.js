const { execFile } = require('child_process');
const { sortPortNames, sortPorts } = require('./serial-utils');

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
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }

        const matches = String(stdout || '').match(/\bCOM\d+\b/g) || [];
        resolve(sortPortNames(new Set(matches)));
      }
    );
  });
}

function querySerialPorts(aliases = {}) {
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
          resolve(sortPorts(list.filter(Boolean).map((item) => normalizePort(item, aliases))));
        } catch {
          resolve([]);
        }
      }
    );
  });
}

function normalizePort(raw, aliases = {}) {
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

module.exports = {
  buildPowerShellScript,
  normalizePort,
  queryFastPortNames,
  querySerialPorts
};
