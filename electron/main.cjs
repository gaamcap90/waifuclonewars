const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

// Register custom scheme BEFORE app is ready so it gets full privileges
// (allows fetch, audio, images, etc. from absolute paths like /art/...)
protocol.registerSchemesAsPrivileged([
  { scheme: 'wcw', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

function createWindow() {
  const distPath = path.join(__dirname, '../dist');

  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Waifu Clone Wars',
    icon: path.join(distPath, 'favicon.ico'),
  });

  // Map wcw://dist/<path> → <distPath>/<path>
  protocol.registerFileProtocol('wcw', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('wcw://dist', ''));
    callback({ path: path.join(distPath, filePath) });
  });

  win.loadURL('wcw://dist/index.html');
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
