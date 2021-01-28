const config = require("./config.json");
const Client = require("./index")


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
        lastOpPrice = binance.placeBuyOrder("ETHBTC");
        isNextOperationBuy = true;
    }
};

const startBot = async () => {
    console.log('Starting bot...')
    console.log('Looking for trade...')

    while (binance) {
        await attemptToMakeTrade();
        sleep(30000);
    }
    console.log('Sleeping for 30 seconds...');
};

startBot();