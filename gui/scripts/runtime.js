let global_filename = "";

function formatSize(size) {
    let fsize = "";
    if (size > 750*1024*1024)
        fsize = (((size / 1024) / 1024) / 1024).toFixed(2) + "GB";
    else if (size > 750*1024)
        fsize = ((size / 1024) / 1024).toFixed(2) + "MB";
    else if (size > 1024)
        fsize = (size / 1024).toFixed(2) + "KB";
    else
        fsize = `${size}B`;

    return fsize;
}

function RunAuthentication() {
    let config = cfg.get();
    const infostring = document.getElementById('infostring');

    axios.post(config.app.server+'/api/desktop/token?token='+config.user.token)
        .then(async (response) => {
            if (response.status != 200) {
                infostring.innerText = `Failed to authenticate: ${response.data.reason}`;
                document.getElementById('login').style.display = 'flex';
                document.getElementById('topbar-username').innerText = "Signed out";
                return;
            }

            infostring.innerText = `Logged in as ${config.user.username}`;
            document.getElementById('topbar-username').innerText = config.user.username;

            // get user storage
            axios.get(config.app.server+'/api/qus?user='+config.user.username).then((r) => {
                let used = formatSize(r.data.size);
                let avail = formatSize(r.data.userTS);
                document.getElementById('topbar-storage').innerText = `${used} / ${avail}`;
            });


            // UPLOADER STARTS HERE!
            document.getElementById('uploader').style.display = "flex";
            let sys_filename = await system.filename();
            global_filename = sys_filename;
            document.getElementById('file').innerText = `You're uploading: ${sys_filename}`;
            if (sys_filename == "undefined") {
                system.error('You need to right click and choose "Upload with OkayuCDN" to use this app!');
                system.exit();
            }
            
            if (!system.checkFile(sys_filename)) {
                system.error('File does not exist, exiting!');
                system.exit();
            }
        })
        .catch((err) => {
            console.log(err);
            if (!err.response) {
                infostring.innerText = `Failed to connect to central server. Please check your configuration, and make sure OkayuCDN is up.`;
                document.getElementById('topbar-username').innerText = "Signed out";
                document.getElementById('topbar-storage').innerText = 'No storage info';
                return;
            }
            infostring.innerText = `Failed to authenticate: ${err.response.data.reason}`;
            document.getElementById('login').style.display = 'flex';
            document.getElementById('topbar-username').innerText = "Signed out";
            document.getElementById('topbar-storage').innerText = 'No storage info';
        });
}

window.onload = function() {
    let config = cfg.get();
    document.getElementById('server').innerText = config.app.server;
    RunAuthentication();
}

function InitLoginProcess() {
    document.getElementById('login').style.display = 'none';
    const infostring = document.getElementById('infostring');
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    infostring.innerText = "Logging in, please wait...";

    let config = cfg.get();

    axios.post(config.app.server+`/api/desktop/authenticate?username=${username}&password=${password}`)
        .then((response) => {
            if (response.status != 200) {
                infostring.innerText = `Failed to log in: ${response.data.reason}`;
                document.getElementById('login').style.display = 'flex';
                document.getElementById('topbar-username').innerText = "Signed out";
                return;
            }

            cfg.setNewLogin(username, response.data.token);
            RunAuthentication();
        })
        .catch((err) => {
            infostring.innerText = `Failed to log in: ${err.response.data.reason}`;
            document.getElementById('login').style.display = 'flex';
            document.getElementById('topbar-username').innerText = "Signed out";
            return;
        });
}

function updateProgressBar() {
    // ...
}

function UploadFile() {
    document.getElementById('uploader').style.display = "none";
    infostring.innerText = "Your file is uploading...";
    
    system.uploadFile(global_filename, document.getElementById('filename').value);
    setTimeout(() => {
        CheckUploadCompletion();
    }, 2500);
}

async function CheckUploadCompletion() {
    let result = await system.checkFinished();
    console.log(result);
    if (result.isFinished) {
        if (result.success) {
            infostring.innerText = `File upload success! Your file is uploaded at:`;
            document.getElementById('link').innerText = result.link;
            document.getElementById('link').style.display = 'flex';
        }
    } else {
        setTimeout(() => {
            CheckUploadCompletion();
        }, 2500);
    }
}