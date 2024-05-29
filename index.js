const { app, BrowserWindow, ipcMain, dialog, protocol, shell, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const axios = require('axios');
const { LocalFileData, constructFileFromLocalFileData } = require('get-file-object-from-local-path');

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('okayucdn', process.execPath, [path.resolve(process.argv[1])])
    }
} else {
    app.setAsDefaultProtocolClient('okayucdn')
}

let win;

const createWindow = () => {
    win = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
            preload: path.join(__dirname, 'system', 'preload.js'),
            nodeIntegration: true,
            sandbox: false
        },
        autoHideMenuBar: true,
        resizable: false
    })

    win.loadFile(path.join(__dirname, 'gui', 'main.html'))
}

const BUNDLED_DEFAULT_CONFIGURATION = {
    version: 2,
    app: {
        version: "2.0.0",
        server: "https://okayucdn.com",
    },
    user: {
        username: "",
        token: ""
    }
}

let uploadIsFinished = false;
let uploadSuccess = false;
let uploadedLink = '';

async function StartFileUpload(_event, filepath, filename, extension, isPrivate) {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'okayu_conf.json')));

    uploadInProgress = true;

    // see here
    // https://stackoverflow.com/questions/71074049/upload-large-files-in-chunks-using-nodejs

    const fileData = new LocalFileData(filepath);
    const file = constructFileFromLocalFileData(fileData);
    console.log(file);
    const chunk_size = 1024*1024*5; // 5MB chunks
    const total_chunks = Math.ceil(file.size / chunk_size);
    let start_byte = 0;
    for (let i = 0; i <= total_chunks; i++) {
        const end_byte = Math.min(start_byte + chunk_size, file.size);
        const chunk = file.slice(start_byte, end_byte);
        console.debug('sending chunk...');
        await sendChunk(chunk, total_chunks, i);
        start_byte += chunk_size;
        
        // change progress bar based on current progress
        //$('#progress').css('width', `${(i / total_chunks)*100}%`);
    }

    console.log(filename, extension)

    const formData = new FormData();
    formData.append('filename', filename);
    formData.append('extension', extension);
    formData.append('isPrivate', isPrivate);
    formData.append('chunk_count', total_chunks);

    const response = await fetch(`${config.app.server}/api/upload/finish`, {
        method: 'POST',
        body: formData,
        headers: {
            'Cookie': `token=${config.user.token};`
        }
    });

    if (response.ok) {
        win.webContents.send('file-success', {link: `${config.app.server}/@${config.user.username}/${filename}.${extension}`});
    }
}

async function sendChunk(chunk, total_chunks, current_chunk) {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'okayu_conf.json')));

    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('totalChunks', total_chunks);
    formData.append('currentChunk', current_chunk);
    const response = await fetch(`${config.app.server}/api/upload?current_chunk=`+current_chunk, {
        method: 'POST',
        body: formData,
        headers: {
            'Cookie': `token=${config.user.token};`
        }
    });
    if (!response.ok) {
        dialog.showErrorBox('An error occurred while uploading your file.');
        uploadInProgress = false;
        process.exit();
    }
}

const gotTheLock = app.requestSingleInstanceLock();
let permitLoginLaunch = true;

if (!gotTheLock) {
    app.quit()
} else {
    app.whenReady().then(() => {
        ipcMain.handle('getFileName', () => {
            return process.argv[2];
        });
        ipcMain.handle('createError', (_e, text) => {
            dialog.showErrorBox('Oh nyao!', text.toString());
        });
        ipcMain.handle('exit', () => { process.exit() });
        ipcMain.handle('uploadFile', StartFileUpload);
        ipcMain.handle('checkFinished', () => { return { isFinished: uploadIsFinished, success: uploadSuccess, link: uploadedLink } });
        ipcMain.handle('openLogin', () => {
            const configuration = JSON.parse(fs.readFileSync(path.join(__dirname, 'okayu_conf.json')));
            if (permitLoginLaunch) { shell.openExternal(configuration.app.server + '/beam'); permitLoginLaunch = false }
        });
        ipcMain.handle('getConfig', () => {
            const configuration = JSON.parse(fs.readFileSync(path.join(__dirname, 'okayu_conf.json')));
            return configuration;
        });
        ipcMain.handle('setNewConfig', (_e, username, token) => {
            const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'okayu_conf.json')));
            const newConfig = {
                "version": config.version,
                "app": {
                    "version": config.app.version,
                    "server": config.app.server,
                    "upload_path": config.app.upload_path
                },
                "user": {
                    "username": username,
                    "token": token
                }
            };
            fs.writeFileSync(path.join(__dirname, 'okayu_conf.json'), JSON.stringify(newConfig));
        })

        if (!fs.existsSync(path.join(__dirname, 'okayu_conf.json'))) {
            // write default configuration
            fs.writeFileSync(path.join(__dirname, 'okayu_conf.json'), JSON.stringify(BUNDLED_DEFAULT_CONFIGURATION));
        }

        app.on('second-instance', (event, commandLine, workingDirectory) => {
            // Someone tried to run a second instance, we should focus our window.
            if (win) {
                if (win.isMinimized()) win.restore()
                win.focus()
            }
            // the commandLine is array of strings in which last element is deep link url
            let command = commandLine.pop();

            if (command.startsWith('okayucdn://token/')) {
                const token = command.slice('okayucdn://token/'.length);

                const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'okayu_conf.json')));
                const newConfig = {
                    "version": config.version,
                    "app": {
                        "version": config.app.version,
                        "server": config.app.server,
                        "upload_path": config.app.upload_path
                    },
                    "user": {
                        "username": config.user.username,
                        "token": token
                    }
                };
                fs.writeFileSync(path.join(__dirname, 'okayu_conf.json'), JSON.stringify(newConfig));
                win.webContents.send('token-beamed', { token });
            }
        })

        createWindow();
    })
}