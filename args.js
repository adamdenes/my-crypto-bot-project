/* eslint-disable no-console */
const process = require('process');
const config = require('./config.json');
const Client = require('./index');

const binance = new Client(config.apiKey, config.apiSecret);
const myArgs = process.argv.slice(2);
console.log(myArgs);

switch (myArgs[0].toLowerCase()) {
    case '--orders':
        binance.getOperationDetails().then((r) => console.log(r));
        break;
    case '-c' || '--cancel':
        binance.cancelOrder(binance.getOperationDetails()).then((r) => console.log(r));
        break;
    case '-i':
        binance.getAccountInfo().then((r) => console.log(r));
        break;
    case '-cs' || '--candelsticks':
        binance.downloadCandelSticks(myArgs[1], myArgs[2], myArgs[3]);
        break;
    case '--current':
        binance.getCandlestickData(myArgs[1], myArgs[2]);
        break;
    case '-e':
        binance.exchangeInfo().then((r) => console.log(r));
        break;
    case '-p':
        binance.priceInUSD(myArgs[1]).then((r) => console.log(r));
        break;
    case '--balance':
        binance.usdTotal().then((r) => console.log(`$${r.toFixed(2)}`));
        break;
    case '-b':
        binance.getBalances().then((r) => console.log(r));
        break;
    default:
        break;
}
