const process = require('process');
const config = require('./config.json');
const Client = require('./index');
const { writeData } = require('./log');

const binance = new Client(config.apiKey, config.apiSecret);
let myArgs = process.argv.slice(2);
console.log(myArgs)

switch (myArgs[0].toLowerCase()) {
    case '-c' || '--cancel':
        binance.cancelOrder(binance.getOperationDetails()).then(r => console.log(r));
        break;
    case '-i':
        binance.getAccountInfo().then(r => console.log(r));
        break;
    case '-cs' || '--candelsticks':
        binance.downloadCandelSticks(myArgs[1], myArgs[2], myArgs[3]);
        break;
    case '-e':
        binance.exchangeInfo().then(r => console.log(r));
        break;
    case '-p':
        binance.priceInUSD(myArgs[1]).then(r => console.log(r));
        break;
    case '--balance':
        binance.usdTotal().then(r => console.log('$' + r.toFixed(2)));
        break;
    default:
        break;
}