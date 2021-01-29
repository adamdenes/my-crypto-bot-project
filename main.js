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
        logger('TRY-TO-BUY', `lastOpPrice => '${await lastOpPrice}', percentageDiff => '${percentageDiff}'`, 'INFO');
        logger('TRY-TO-BUY', `isNextOperationBuy => '${isNextOperationBuy}'`, 'INFO');
    } else {
        tryToSell(percentageDiff);
        logger('TRY-TO-SELL', `lastOpPrice => '${await lastOpPrice}', percentageDiff => '${percentageDiff}'`, 'INFO');
        logger('TRY-TO-SELL', `isNextOperationBuy => '${isNextOperationBuy}'`, 'INFO');
    }
};

const sleep = ms => new Promise((resolve) => setTimeout(resolve, ms));

const tryToBuy = (percentageDiff) => {
    if (percentageDiff >= binance.operation.BUY_UPWARD_TREND_THRESHOLD ||
        percentageDiff <= binance.operation.BUY_DIP_THRESHOLD) {
        lastOpPrice = binance.placeBuyOrder("ETHBTC");
        isNextOperationBuy = false;
        return lastOpPrice;
    }
};

const tryToSell = (percentageDiff) => {
    if (percentageDiff >= binance.operation.SELL_PROFIT_THRESHOLD ||
        percentageDiff <= binance.operation.SELL_STOP_LOSS_THRESHOLD) {
        lastOpPrice = binance.placeSellOrder("ETHBTC");
        isNextOperationBuy = true;
        return lastOpPrice;
    }
};

const startBot = async () => {
    let openTrades = await binance.getOperationDetails();
    logger('SYSTEM', `######## Starting BOT ########`, 'info');
    logger('SYSTEM', `NUMBER OF OPEN TRADES : ${openTrades.length}`, 'info');

    while (binance) {
        try {
            if (openTrades.length != 0) {
                logger('SYSTEM', `There is an open order... orderId: ${openTrades[0].orderId}`, 'info');
                await sleep(5000);
                logger('SYSTEM', `Recheck trades...`, 'info');
                openTrades = await binance.getOperationDetails();
            } else {
                logger('SYSTEM', `Looking for trade...`, 'info');
                await attemptToMakeTrade();
                logger('SYSTEM', `Trade found, going to sleep...`, 'info');
                await sleep(30000);
            }
        } catch (critical) {
            logger('SYSTEM', `BOT failed, FATAL ERROR => '${critical}'`, 'CRITICAL');
        }  
    }
};

startBot();