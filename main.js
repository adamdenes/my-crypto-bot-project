const config = require("./config.json");
const Client = require("./index");
const { logger } = require("./log");


const binance = new Client(config.apiKey, config.apiSecret);
let isNextOperationBuy = true;
let lastOpPrice = 100.00

const attemptToMakeTrade = async () => {
    const currentPrice = await binance.getMarketPrice("ETHBTC");
    const percentageDiff = (currentPrice.price - lastOpPrice) / lastOpPrice * 100;

    if (isNextOperationBuy) {
        tryToBuy(percentageDiff);
    } else {
        tryToSell(percentageDiff);
    }
};

const sleep = ms => new Promise((resolve) => setTimeout(resolve, ms));

const tryToBuy = (percentageDiff) => {
    if (percentageDiff >= binance.operation.BUY_UPWARD_TREND_THRESHOLD ||
        percentageDiff <= binance.operation.BUY_DIP_THRESHOLD) {
        lastOpPrice = binance.placeBuyOrder("ETHBTC");
        isNextOperationBuy = false;
    }
};

const tryToSell = (percentageDiff) => {
    if (percentageDiff >= binance.operation.SELL_PROFIT_THRESHOLD ||
        percentageDiff <= binance.operation.SELL_STOP_LOSS_THRESHOLD) {
        lastOpPrice = binance.placeSellOrder("ETHBTC");
        isNextOperationBuy = true;
    }
};

const startBot = async () => {
    let openTrades = await binance.getOperationDetails();
    logger('SYSTEM', `######## Starting BOT ########`, 'info');
    logger('SYSTEM', `NUMBER OF OPEN TRADES : ${openTrades.length}`, 'info');

    while (binance) {
        try {
            if (openTrades.length != 0) {
                logger('SYSTEM', `There is an open order... : ${openTrades[0].orderId}`, 'info');
                await sleep(5000);
                console.log('Recheck trades...')
                logger('SYSTEM', `Recheck trades...`, 'info');
                openTrades = await binance.getOperationDetails();
            } else {
                console.log('Looking for trade...')
                logger('SYSTEM', `Looking for trade...`, 'info');
                await attemptToMakeTrade();
                logger('SYSTEM', `Trade found, going to sleep...`, 'info');
                await sleep(30000);
            }
        } catch (error) {
            console.log(error);
        }  
    }
};

startBot();