const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const createWindow = () => {
    const win = new BrowserWindow({
      width: 600,
      height: 400,
      webPreferences: {
        preload: path.join(__dirname, 'system', 'preload.js'),
        nodeIntegration: true,
        sandbox: false
      },
      autoHideMenuBar: true,
    })

    win.loadFile(path.join(__dirname, 'gui', 'main.html'))
}

app.whenReady().then(() => {
    ipcMain.handle('getFileName', () => {
        return process.argv[2];
    });
    ipcMain.handle('createError', (_e, text) => {
        dialog.showErrorBox('Oh nyao!', text.toString());
    });
    ipcMain.handle('exit', () => {process.exit()});

    createWindow()
})