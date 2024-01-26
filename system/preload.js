const { contextBridge, ipcRenderer } = require('electron/renderer')
const fs = require('node:fs');
const path = require('node:path');


contextBridge.exposeInMainWorld('cfg', {
    get: () => {
        // load configuration
        const configuration = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'okayu_conf.json')));
        return configuration;
    },
    setNewLogin: (username, token) => {
        // load configuration
        const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'okayu_conf.json')));
        const newConfig = {
            "version":config.version,
            "app":{
                "version":config.app.version,
                "server":config.app.server,
                "upload_path":config.app.upload_path
            },
            "user":{
                "username":username,
                "token":token
            }
        };
        fs.writeFileSync(path.join(__dirname, '../', 'okayu_conf.json'), JSON.stringify(newConfig));
    }
})

contextBridge.exposeInMainWorld('system', {
    filename: () => ipcRenderer.invoke('getFileName'),
    checkFile: (path) => {
        return fs.existsSync(path);
    },
    error: (text) => ipcRenderer.invoke('createError', text.toString()),
    exit: () => ipcRenderer.invoke('exit'),
    uploadFile: (path, file) => { ipcRenderer.invoke('uploadFile', path, file); }
})