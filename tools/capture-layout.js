const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output', 'layout');
const CAPTURE_ALIAS_EDIT = process.env.CAPTURE_ALIAS_EDIT === '1';
const VIEWPORTS = [
  { width: 1180, height: 760, name: 'default' },
  { width: 1600, height: 900, name: 'wide' }
];

function createWindow() {
  return new BrowserWindow({
    width: VIEWPORTS[0].width,
    height: VIEWPORTS[0].height,
    show: false,
    backgroundColor: '#f5f1e7',
    webPreferences: {
      preload: path.join(__dirname, 'layout-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
}

async function loadFixture(win) {
  await win.loadURL(pathToFileURL(path.join(ROOT, 'src', 'index.html')).href);
  await waitForRenderedPorts(win);
  if (CAPTURE_ALIAS_EDIT) {
    await beginFirstAliasEdit(win);
  }
  await disableAnimations(win);
}

async function captureViewport(win, viewport) {
  win.setSize(viewport.width, viewport.height);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const image = await win.webContents.capturePage();
  const mode = CAPTURE_ALIAS_EDIT ? 'alias-edit' : 'layout';
  const outputPath = path.join(OUTPUT_DIR, `${mode}-${viewport.name}-${viewport.width}x${viewport.height}.png`);
  fs.writeFileSync(outputPath, image.toPNG());
  return outputPath;
}

async function beginFirstAliasEdit(win) {
  await win.webContents.executeJavaScript(`
    document.querySelector('.port-card .edit-icon-button')?.click();
  `);
  await waitForAliasEditor(win);
}

async function disableAnimations(win) {
  await win.webContents.insertCSS(`
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }

    .port-card,
    .event-item,
    .app-tooltip,
    .confirm-backdrop,
    .confirm-dialog {
      opacity: 1 !important;
      transform: none !important;
    }
  `);
}

async function waitForRenderedPorts(win) {
  const deadline = Date.now() + 3000;

  while (Date.now() < deadline) {
    const count = await win.webContents.executeJavaScript('document.querySelectorAll(".port-card").length');
    if (count > 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for fixture port cards to render');
}

async function waitForAliasEditor(win) {
  const deadline = Date.now() + 3000;

  while (Date.now() < deadline) {
    const count = await win.webContents.executeJavaScript('document.querySelectorAll(".alias-input").length');
    if (count > 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for alias editor to render');
}

app.on('window-all-closed', () => {});

app.whenReady()
  .then(async () => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const win = createWindow();
    await loadFixture(win);

    const outputs = [];

    for (const viewport of VIEWPORTS) {
      outputs.push(await captureViewport(win, viewport));
    }

    win.destroy();
    console.log(outputs.join('\n'));
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
    app.quit();
  });
