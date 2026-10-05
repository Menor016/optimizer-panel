const { app, BrowserWindow } = require('electron');
const path = require('path');
const createServer = require('./server');

const APP_PORT = 3210;
let mainWindow;
let server;

function ensureServerReady() {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (server && server.listening) {
        resolve(true);
        return;
      }
      if (Date.now() - start > 15000) {
        resolve(false);
        return;
      }
      setTimeout(tick, 150);
    };
    tick();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1450,
    height: 980,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#0b1220',
    title: 'OPTIMIZER PANEL',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  ensureServerReady().then((ready) => {
    if (ready) {
      mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}`);
    } else {
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent('<html><body style="font-family:sans-serif;background:#081120;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;">Servidor local não iniciou corretamente.</body></html>')}`);
    }
  });
}

app.whenReady().then(() => {
  server = createServer(APP_PORT);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server && server.close) {
    server.close();
  }
});
