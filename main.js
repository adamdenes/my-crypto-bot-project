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
        lastOpPrice = binance.placeSellOrder("ETHBTC");
        isNextOperationBuy = true;
    }
};

const startBot = async () => {
    let openTrades = await binance.getOperationDetails();
    console.log('Starting bot...')
    console.log('Open trades: ' + openTrades.length);

    while (binance) {
        try {
            if (openTrades.length != 0) {
                console.log('There is an open order...' + openTrades[0].orderId);
                await sleep(5000);
                console.log('Recheck trades...')
                openTrades = await binance.getOperationDetails();
            } else {
                console.log('Looking for trade...')
                await attemptToMakeTrade();
                console.log('Long sleep....')
                await sleep(30000);
            }
        } catch (error) {
            console.log(error);
        }  
    }
    console.log('Slept for 30 seconds...');
};

startBot();