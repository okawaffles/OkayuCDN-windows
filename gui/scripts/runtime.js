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

// half-assed jquery replacement
const $ = (v) => document.querySelector(v);

async function RunAuthentication() {
    let config = await cfg.get();
    console.log(config)
    const infostring = document.getElementById('infostring');

    // whoami is essentially a route to ensure you're logged in
    axios.get(config.app.server+'/api/desktop/whoami', {
        headers: {
            'Authorization': config.user.token
        }
    })
        .then(async (response) => {
            if (response.status != 200) {
                infostring.innerText = `Failed to log in: ${response.data.reason}. Please log in with your browser.`;
                document.getElementById('topbar-username').innerText = "Signed out";

                document.addEventListener('token_beamed', (e) => {
                    RunAuthentication();
                });

                return;
            }

            cfg.setNewLogin(response.data.username, config.user.token);
            infostring.innerText = `Logged in as ${response.data.username}`;
            document.getElementById('topbar-username').innerText = response.data.username;

            // get user storage
            config = await cfg.get();
            axios.get(config.app.server+'/api/desktop/storage', {
                headers: {
                    'Authorization': config.user.token
                }
            }).then((result) => {
                let used = formatSize(result.data.used);
                let avail = formatSize(result.data.total);
                document.getElementById('topbar-storage').innerText = `${used} / ${avail}`;
            }).catch(err => {
                console.log(err);
                system.error('An internal error occurred and the software must close.');
                system.exit();
            });


            // UPLOADER STARTS HERE!
            document.getElementById('uploader').style.display = "flex";
            let sys_filename = await system.filename();
            global_filename = sys_filename;
            document.getElementById('file').innerText = `You're uploading: ${sys_filename}`;
            if (sys_filename == undefined) {
                system.error('You need to right click a file and choose "Upload with OkayuCDN" to use this app!');
                system.exit();
            }
            
            if (!system.checkFile(sys_filename)) {
                system.error(`That's not a file, silly!`);
                system.exit();
            }
        })
        .catch((err) => {
            console.log(err);
            if (!err.response) {
                infostring.innerText = `Failed to connect to the OkayuCDN instance. Please check your configuration, and make sure the instance is online.`;
                document.getElementById('topbar-username').innerText = "Signed out";
                document.getElementById('topbar-storage').innerText = 'No storage info';
                return;
            }
            infostring.innerText = `Failed to log in. Please log in with your browser.`;
            document.getElementById('topbar-username').innerText = "Signed out";

            system.openLogin();

            document.addEventListener('token_beamed', (e) => {
                RunAuthentication();
            });

            return;
        });
}

window.onload = async function() {
    let config = await cfg.get();
    console.log(config);
    document.getElementById('server').innerText = config.app.server;
    RunAuthentication();
}

function updateProgressBar() {
    // ...
}

let link = '';
let viewlink = '';

function UploadFile() {
    const regex = new RegExp('^[A-Za-z0-9_-]+$');
    if (!regex.test($('#filename').value) || $('#filename').value.length > 25) return system.error('You may only use alphanumeric characters and underscores in your file names, as well as only up to 25 characters.');

    document.getElementById('uploader').style.display = "none";
    infostring.innerText = "Your file is uploading...";
    
    let extension = 'FILE';
    if (global_filename.split('.').length > 1) {
        extension = global_filename.split('.').at(-1);
    }

    system.uploadFile(global_filename, document.getElementById('filename').value, extension, $('#private_toggle').checked);
}

function ViewOnline() {
    system.openOnline(viewlink);
}

document.addEventListener('file_success', (event) => {
    infostring.innerText = `File upload success! Your file is uploaded at:`;
    link = event.detail.link.link;
    viewlink = event.detail.link.viewlink;
    console.log(link);
    $('#link').innerText = link;
    $('#finished').style.display = 'flex';
});