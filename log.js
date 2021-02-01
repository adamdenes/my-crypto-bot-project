const fs = require('fs');
const process = require('process');
const config = require('./config.json');


const arrayToKlineObj = (arr) => {
    let dataHolder = [];
    for (let i = 0; i < arr.length; i++) {
        let data = {
            openTime: arr[i][0],
            open: arr[i][1],
            high: arr[i][2],
            low: arr[i][3],
            close: arr[i][4],
            volume: arr[i][5],
            closeTime: arr[i][6],
            quoteAVol: arr[i][7],
            numOfTrades: arr[i][8],
            tbbav: arr[i][9],
            tbqav: arr[i][10],
            ignore: arr[i][11]
        };
        dataHolder.push(data);
    }
    return dataHolder;
}

const writeData = async (data, symbol = 'ETHBTC') => {
    const klineObj = arrayToKlineObj(await data);
    const jsonString = JSON.stringify(klineObj);

    fs.writeFile(`./backtest/${symbol}.json`, jsonString, (err) => {
        if (err) {
            console.log('Error creating file.', err);
        } else {
            console.log(`Successfully created ${symbol}.json.`)
        }
    })
};


/**
 * Rewrite the config with the latest operation price.
 * @param {object} data 
 * @param {number} price 
 */
const updateConfig = (data, price) => {
    if (price === data.lastPrice) {
        console.log('Update is not necessary.')
        return;
    }

    data.lastPrice = price;
    const jsonString = JSON.stringify(data);

    fs.writeFile('./config.json', jsonString, (err) => {
        if (err) {
            console.log('Error updating file.', err);
        } else {
            console.log('Successfully updated file.');
        }
    })
};

/**
 * Iterate over the current directory and
 * return the last file with the current date.
 * @param {string} path 
 * @param {string} fileName 
 */
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

/**
 * Create separate file with log entries.
 * If there is a file with the current date timestamp,
 * then append to that file. Otherwise create a new one.
 * @param {string} msg 
 */
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

/**
 * Simple logger function which creates separate file
 * and logs also to console.
 * @param {string} operation 
 * @param {string} msg 
 * @param {string} severity 
 */
const logger = (operation, msg, severity) => {
    const timeInUTC = new Date();
    let localTime = timeInUTC.toISOString().split('T')[0] + 'T' + timeInUTC.toLocaleTimeString();
    let data = `${localTime} - [${severity.toUpperCase()}]: [${operation.toUpperCase()}] ${msg}`; 
    console.log(data);
    logToFile(data);
};

module.exports = { logger, updateConfig, writeData };