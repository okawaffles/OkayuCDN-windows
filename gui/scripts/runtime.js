let global_filename = "";

function RunAuthentication() {
    let config = cfg.get();
    const infostring = document.getElementById('infostring');

    axios.post(config.app.server+'/api/desktop/token?token='+config.user.token)
        .then(async (response) => {
            if (response.status != 200) {
                infostring.innerText = `Failed to authenticate: ${response.data.reason}`;
                document.getElementById('login').style.display = 'flex';
                return;
            }

            infostring.innerText = `Logged in as ${config.user.username}`;
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
            infostring.innerText = `Failed to authenticate: ${err.response.data.reason}`;
            document.getElementById('login').style.display = 'flex';
        });
}

window.onload = function() {
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
                return;
            }

            cfg.setNewLogin(username, response.data.token);
            RunAuthentication();
        })
        .catch((err) => {
            infostring.innerText = `Failed to log in: ${err.response.data.reason}`;
            document.getElementById('login').style.display = 'flex';
            return;
        });
}

function updateProgressBar() {
    // ...
}

function UploadFile() {
    document.getElementById('uploader').style.display = "none";
    infostring.innerText = "Your file is uploading...";
    
}