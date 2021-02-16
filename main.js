/* eslint-disable no-console */
/* eslint-disable no-irregular-whitespace */
const config = require('./config.json');
const { logger, updateConfig } = require('./log');
const { BBANDS, RSI } = require('./indicators/indicators');
const { sleep, killProc, convertMarketData } = require('./helper');

// Classes
const Client = require('./index');
const MyTestStrategy = require('./strategies/bollinger');
// const WebSocket = require('./websocket');

let binance = null;
const bbrsi = new MyTestStrategy();
// const ws = new WebSocket('wss', 'stream.binance.com:9443');

const { pid } = process;
let lastOpPrice = config.lastPrice;

if (config.testnet === true) {
    binance = new Client(config.testnetApiKey, config.testnetSecret);
    binance.base = 'https://testnet.binance.vision/';
    logger('TESTNET', `Instance running with dry-run enabled`, 'info');
} else {
    binance = new Client(config.apiKey, config.apiSecret);
}

const tryToBuy = () => {
    lastOpPrice = binance.placeBuyOrder('ETHBTC');
    return lastOpPrice;
};

const tryToSell = () => {
    lastOpPrice = binance.placeSellOrder('ETHBTC');
    return lastOpPrice;
};

const attemptToMakeTrade = async () => {
    const promises = await Promise.all([
        binance.getOperationDetails('ETHBTC'),
        binance.priceInUSD('ETHBTC'),
        binance.getCandlestickData('ETHBTC', '4h'),
    ]);
    const openTrades = promises[0];
    const usdPrice = promises[1];
    const marketData = convertMarketData(promises[2]);
    bbrsi.dataset = marketData;

    // Empty indicators and set them
    bbrsi.indicators = [];
    bbrsi.populateIndicators(BBANDS(bbrsi.dataset));
    bbrsi.populateIndicators(RSI(bbrsi.dataset));
    const buySignal = bbrsi.generateBuySignal();
    const sellSignal = bbrsi.generateSellSignal();

    // TODO: check if this is still necessary
    if (Promise.resolve(lastOpPrice)) {
        lastOpPrice = await lastOpPrice;
        updateConfig(config, lastOpPrice);
    } else {
        lastOpPrice = config.lastPrice;
    }

    if (openTrades.length > 0) {
        logger('SYSTEM', `There is an open order... orderId: ${openTrades[0].orderId}`, 'info');
        logger('SYSTEM', `Recheck trades...`, 'info');
        logger('SYSTEM', `NUMBER OF OPEN TRADES : ${openTrades.length}`, 'info');
    } else if (buySignal) {
        tryToBuy();
        logger(
            'TRY-TO-BUY',
            `lastOpPrice => '${await lastOpPrice} = $${((await lastOpPrice) * usdPrice).toFixed(2)}'`,
            'INFO'
        );
    } else if (sellSignal) {
        tryToSell();
        logger(
            'TRY-TO-SELL',
            `lastOpPrice => '${await lastOpPrice} = $${((await lastOpPrice) * usdPrice).toFixed(2)}'`,
            'INFO'
        );
    } else {
        logger('SYSTEM', 'Buy and Sell signals have returned false', 'INFO');
    }
};

const startBot = async () => {
    logger('SYSTEM', `######## Starting BOT with PID: ${pid} ########`, 'info');

    while (binance) {
        try {
            // logger('SYSTEM', `Looking for trade...`, 'info');
            await attemptToMakeTrade();
            // logger('SYSTEM', `Sleeping for 30 sec...`, 'info');
            await sleep(10000);
        } catch (critical) {
            logger('SYSTEM', `BOT failed, FATAL ERROR => '${critical}'`, 'CRITICAL');
        }
    }
};

const stopBot = async (proc) => {
    logger('SYSTEM', `######## Stopping BOT with PID: ${proc} ########`, 'info');
    try {
        // Since pid === 0 is already handeld, this should not be undefined
        // so we can just kill it
        await binance.cancelOrder(await binance.getOperationDetails());
        process.kill(proc, 'SIGKILL');
    } catch (critical) {
        logger('SYSTEM', `Command failed, FATAL ERROR => '${critical}'`, 'CRITICAL');
        process.exit(1);
    }
};

process.on('message', (message) => {
    // console.log(`CHILD: message from parent: ${message.cmd}`);
    logger('CHILD', `CHILD: message from parent: ${message.cmd}`, 'telegram');

    if (message.cmd === 'START') {
        // console.log(`Starting bot with PID: ${process.pid}`);
        logger('CHILD', `Starting bot with PID: ${process.pid}`, 'telegram');
        startBot().then(process.send(process.pid));
    } else if (message.cmd === 'STOP') {
        const orders = binance.getOperationDetails();
        if (message.pid === 0 && orders !== undefined) {
            // console.log('PID is 0! ---> just cancel orders');
            logger('CHILD', 'PID is 0! ---> just cancel orders', 'telegram');
            binance.cancelAllOrders('ETHBTC').then(() => {
                process.send('CANCELLED');
                process.exit(0);
            });
        } else {
            // console.log(`Stopping bot with PID: ${message.pid}`);
            logger('CHILD', `Stopping bot with PID: ${message.pid}`, 'telegram');
            stopBot(message.pid).then(() => {
                process.send(`Stopped bot with PID: ${message.pid}`);
                process.exit(0);
            });
        }
    } else if (message.cmd === 'STATUS') {
        // console.log('Querying API for order status');
        logger('CHILD', 'Querying API for order status', 'telegram');
        binance.getOperationDetails().then((response) => {
            if (response.length === 0) {
                process.send('There is no open order currently.');
                process.exit(0);
            } else {
                for (const item of response) {
                    process.send(item);
                }
            }
            process.exit(0);
        });
    } else if (message.cmd === 'BALANCE') {
        // console.log('Getting account balance from API');
        logger('CHILD', 'Getting account balance from API', 'telegram');
        binance.usdTotal().then((r) => {
            process.send(r);
            process.exit(0);
        });
    } else {
        process.exit(1);
    }
});

process.on('SIGTERM', killProc);
process.on('exit', killProc);

module.exports = { startBot, stopBot };
