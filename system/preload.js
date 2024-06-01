const { contextBridge, ipcRenderer } = require('electron/renderer')
const fs = require('node:fs');
const path = require('node:path');

const token_beamed = new Event('token_beamed');

contextBridge.exposeInMainWorld('cfg', {
    get: () => {
        // load configuration
        return ipcRenderer.invoke('getConfig');
    },
    setNewLogin: (username, token) => {
        // load configuration
        ipcRenderer.invoke('setNewConfig', username, token);
    },
})

contextBridge.exposeInMainWorld('system', {
    filename: () => { return ipcRenderer.invoke('getFileName') },
    checkFile: (path) => {
        return fs.existsSync(path) && fs.statSync(path).isFile();
    },
    error: (text) => ipcRenderer.invoke('createError', text.toString()),
    exit: () => ipcRenderer.invoke('exit'),
    uploadFile: (path, file, extension, isPrivate) => { ipcRenderer.invoke('uploadFile', path, file, extension, isPrivate); },
    checkFinished: () => ipcRenderer.invoke('checkFinished'),
    openLogin: () => ipcRenderer.invoke('openLogin'),
    openOnline: (link) => ipcRenderer.invoke('openOnline', link),
})

ipcRenderer.on('token-beamed', (ev, token) => {
    document.dispatchEvent(token_beamed);
});

ipcRenderer.on('file-success', (ev, link) => {
    const file_success = new CustomEvent('file_success', {
        detail: {
            link
        }
    });
    
    document.dispatchEvent(file_success);
});