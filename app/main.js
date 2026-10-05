const { app, BrowserWindow } = require('electron');
const path = require('path');
const createServer = require('./server');

const APP_PORT = 3210;
let mainWindow;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1450,
    height: 980,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#0b1220',
    title: 'OPTIMIZER PANEL',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}`);
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
