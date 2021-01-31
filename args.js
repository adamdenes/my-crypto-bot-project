const process = require('process');
const config = require('./config.json');
const Client = require('./index');

const binance = new Client(config.apiKey, config.apiSecret);
let myArgs = process.argv.slice(2);

switch (myArgs[0].toLowerCase()) {
    case '-c' || '--cancel':
        binance.cancelOrder(binance.getOperationDetails()).then(r => console.log(r));
        break;
    case '-i':
        binance.getAccountInfo().then(r => console.log(r));
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