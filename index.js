const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const request = require('request');

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

function UploadHandler(_event, filepath, filename) {
    console.log('get config ...');
    const config = JSON.parse(fs.readFileSync('okayu_conf.json'));

    console.log('check if file exists ...');
    if (!fs.existsSync(filepath)) {
        dialog.showErrorBox('Oh nyao!', 'The file you were trying to upload no longer exists!');
        process.exit();
    }

    console.log('exists, continue')
    // if it DOES exist
    const dataStream = fs.createReadStream(filepath);

    console.log('created stream, starting POST ...')
    let req = request({
        method:'POST',
        headers: {
            'Authorization': config.user.token
        },
        uri:`${config.app.server}${config.app.upload_path}`,
    }, (err, resp, body) => {
        if (err) {
            dialog.showErrorBox('Oh nyao!', 'Something went wrong internally, sorry!');
            process.exit();
        }
    }).on('complete', () => {
        console.log('upload complete!');
    });

    console.log('appending file ...')

    let form = req.form();
    form.append('file', dataStream, {
        filename: filename,
    });

    console.log('done');
}

app.whenReady().then(() => {
    ipcMain.handle('getFileName', () => {
        return process.argv[2];
    });
    ipcMain.handle('createError', (_e, text) => {
        dialog.showErrorBox('Oh nyao!', text.toString());
    });
    ipcMain.handle('exit', () => {process.exit()});
    ipcMain.handle('uploadFile', UploadHandler);

    createWindow()
})