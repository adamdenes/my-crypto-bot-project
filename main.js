const config = require('./config.json');
const Client = require('./index');
const { logger } = require('./log');


const binance = new Client(config.apiKey, config.apiSecret);
let isNextOperationBuy = false;
let lastOpPrice = 100.00

const attemptToMakeTrade = async () => {
    const promises = await Promise.all([binance.getMarketPrice('ETHBTC'), binance.getOperationDetails(), binance.priceInUSD('ETHBTC')]);
    const currentPrice = promises[0];
    const openTrades = promises[1];
    const usdPrice = promises[2];

    lastOpPrice = Promise.resolve(lastOpPrice) ? await lastOpPrice : lastOpPrice;
    let percentageDiff = (Number(currentPrice.price) - Number(lastOpPrice)) / Number(lastOpPrice) * 100;
    // console.log(lastOpPrice)
    // console.log(percentageDiff)
    // console.log(+currentPrice.price)
    // console.log(typeof lastOpPrice)
    // console.log(typeof percentageDiff)
    // console.log(typeof currentPrice.price)
    // console.log(typeof (+currentPrice.price - +lastOpPrice) / +lastOpPrice * 100)

    if (openTrades.length != 0) {
        logger('SYSTEM', `There is an open order... orderId: ${openTrades[0].orderId}`, 'info');
        logger('SYSTEM', `Recheck trades...`, 'info');
        logger('SYSTEM', `NUMBER OF OPEN TRADES : ${openTrades.length}`, 'info');
        return;
    } else if (isNextOperationBuy) {
        tryToBuy(percentageDiff);
        logger('TRY-TO-BUY', `lastOpPrice => '${await lastOpPrice} = $${(await lastOpPrice * usdPrice).toFixed(2)}'`, 'INFO');
        logger('TRY-TO-BUY', `isNextOperationBuy => '${isNextOperationBuy}'`, 'INFO');
    } else {
        tryToSell(percentageDiff);
        logger('TRY-TO-SELL', `lastOpPrice => '${await lastOpPrice} = $${(await lastOpPrice * usdPrice).toFixed(2)}'`, 'INFO');
        logger('TRY-TO-SELL', `isNextOperationBuy => '${isNextOperationBuy}'`, 'INFO');
    }
};

const sleep = ms => new Promise((resolve) => setTimeout(resolve, ms));

const tryToBuy = (percentageDiff) => {
 
    // console.log( 'binance.operation.BUY_UPWARD_TREND_THRESHOLD = ' + binance.operation.BUY_UPWARD_TREND_THRESHOLD );
    // console.log( 'binance.operation.BUY_DIP_THRESHOLD = ' + binance.operation.BUY_DIP_THRESHOLD );
    // console.log( (percentageDiff >= binance.operation.BUY_UPWARD_TREND_THRESHOLD || percentageDiff <= binance.operation.BUY_DIP_THRESHOLD) );

    if (percentageDiff >= binance.operation.BUY_UPWARD_TREND_THRESHOLD ||
        percentageDiff <= binance.operation.BUY_DIP_THRESHOLD) {
        lastOpPrice = binance.placeBuyOrder('ETHBTC');
        isNextOperationBuy = false;
        logger('TRY-TO-BUY', `percentageDiff => '${percentageDiff}'`, 'INFO');
        return lastOpPrice;
    }
};

const tryToSell = (percentageDiff) => {

    // console.log( 'binance.operation.SELL_PROFIT_THRESHOLD = ' + binance.operation.SELL_PROFIT_THRESHOLD );
    // console.log( 'binance.operation.SELL_STOP_LOSS_THRESHOLD = ' + binance.operation.SELL_STOP_LOSS_THRESHOLD );
    // console.log( (percentageDiff >= binance.operation.SELL_PROFIT_THRESHOLD || percentageDiff <= binance.operation.SELL_STOP_LOSS_THRESHOLD) );

    if (percentageDiff >= binance.operation.SELL_PROFIT_THRESHOLD ||
        percentageDiff <= binance.operation.SELL_STOP_LOSS_THRESHOLD) {
        lastOpPrice = binance.placeSellOrder('ETHBTC');
        isNextOperationBuy = true;
        logger('TRY-TO-SELL', `percentageDiff => '${percentageDiff}'`, 'INFO');
        return lastOpPrice;
    }
};

const startBot = async () => {
    logger('SYSTEM', `######## Starting BOT ########`, 'info');

    while (binance) {
        try {
            logger('SYSTEM', `Looking for trade...`, 'info');
            await attemptToMakeTrade();
            logger('SYSTEM', `Trade ongoing, sleeping...`, 'info');
            await sleep(30000);
        } catch (critical) {
            logger('SYSTEM', `BOT failed, FATAL ERROR => '${critical}'`, 'CRITICAL');
        }
    }
};

startBot();