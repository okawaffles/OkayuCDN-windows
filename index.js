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
      resizable: false
    })

    win.loadFile(path.join(__dirname, 'gui', 'main.html'))
}

const BUNDLED_DEFAULT_CONFIGURATION = {
    version: 1,
    app: {
        version: "1.0.0",
        server: "https://okayu.okawaffles.com",
        upload_path: "/api/desktop/upload",
    },
    user: {
        username: "",
        token: ""
    }
}

let uploadIsFinished = false;
let uploadSuccess = false;
let uploadedLink = '';

function UploadHandler(_event, filepath, filename) {
    console.log('get config ...');
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'okayu_conf.json')));

    let link = `${config.app.server}/content/${config.user.username}/`;

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
            uploadIsFinished = true;
            uploadSuccess = false;
            process.exit();
        }
    }).on('complete', () => {
        console.log('upload complete!');
        uploadSuccess = true;
        uploadIsFinished = true;
    });

    console.log('appending file ...')

    let form = req.form();
    let file_ext = ".FILE";
    if (filepath.includes('.')) {
        file_ext = '.' + filepath.split('.').at(-1);
    }
    form.append('file', dataStream, {
        filename: filename + file_ext,
    });

    uploadedLink = link + filename + file_ext;

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
    ipcMain.handle('checkFinished', () => {return {isFinished:uploadIsFinished, success:uploadSuccess, link:uploadedLink}});

    if (!fs.existsSync(path.join(__dirname, 'okayu_conf.json'))) {
        // write default configuration
        fs.writeFileSync(path.join(__dirname, 'okayu_conf.json'), JSON.stringify(BUNDLED_DEFAULT_CONFIGURATION));
    }

    createWindow();
})