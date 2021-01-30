const fs = require('fs');
const process = require('process');


const readDir = async (path, fileName) => {
    const dir = await fs.promises.opendir(path);
    let files = [];

    for await (const dirent of dir) {
        if (dirent.name.startsWith('bot')) {
            if (dirent.name.slice(3, 13).includes(fileName.slice(3, 13))){
                files.push(dirent.name)
            }
        }
    }
    // return the last log file with that date
    return files[files.length - 1];
}

const logToFile = async (msg) => {
    let time = new Date().toISOString().split('T');
    const path = process.cwd();
    const fname = 'bot' + time[0] + '_' + time[1].slice(0, 5) + '.txt';
    const file = await readDir(path, fname);
    // there is no file with that date
    if (typeof file === 'undefined') {
        // create file stream with 'fname' and append to it
        const stream = fs.createWriteStream(path + '/' + fname, {flags: 'a', autoClose: true})
        stream.write(msg + '\n');
    } else {
        const stream = fs.createWriteStream(path + '/' + file, {flags: 'a', autoClose: true})
        stream.write(msg + '\n');
    }
};

const logger = (operation, msg, severity) => {
    const timeInUTC = new Date();
    let localTime = timeInUTC.toISOString().split('T')[0] + 'T' + timeInUTC.toLocaleTimeString();
    let data = `${localTime} - [${severity.toUpperCase()}]: [${operation.toUpperCase()}] ${msg}`; 
    console.log(data);
    logToFile(data);
};

module.exports = { logger };