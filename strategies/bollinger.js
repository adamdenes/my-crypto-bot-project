/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const { DataFrame } = require('dataframe-js');
const { logger } = require('../log');
const { BBANDS, RSI } = require('../indicators/indicators');

// const Client = require('../index');
// const config = require('../config.json');
// const { convertMarketData } = require('../helper');

class MyTestStrategy {
    constructor(dataset = {}, maxBuyOps = 1, maxSellOps = 1) {
        this._dataset = dataset;
        this._indicators = [BBANDS, RSI];
        this._maxBuyOps = maxBuyOps;
        this._maxSellOps = maxSellOps;
    }

    get maxBuyOps() {
        return this._maxBuyOps;
    }

    get maxSellOps() {
        return this._maxSellOps;
    }

    get dataset() {
        return this._dataset;
    }

    set dataset(newDataset) {
        this._dataset = newDataset;
    }

    get indicators() {
        return this._indicators;
    }

    set indicators(newIndicator) {
        if (!Array.isArray(newIndicator)) {
            console.log(`Expected array, got ${typeof newIndicator}.`);
        }
        this._indicators = newIndicator;
    }

    populateIndicators(newIndicator) {
        return this._indicators.push(newIndicator);
    }

    getDataset(key) {
        if (typeof key !== 'string') {
            console.log(`The key was not a string, but a(n) ${typeof key}.`);
        }

        for (const k in this._dataset) {
            if (k === key) {
                const dataObj = {};
                dataObj[k] = this._dataset[k];
                return dataObj;
            }
        }
    }

    *indicatorGenerator() {
        for (const item of this._indicators) {
            yield item;
        }
    }

    createDataFrame() {
        const relativeSI = RSI(this._dataset);
        const bbands = BBANDS(this._dataset);
        const dataObj = { ...bbands.result, ...relativeSI.result, ...this._dataset };
        return new DataFrame(dataObj);
    }

    generateBuySignal() {
        const data = this.getDataset('close');
        const ti = this.indicatorGenerator(); // technical indicator
        const bollinger = ti.next().value.result;
        const relativeSI = ti.next().value.result;

        // const upperBand = bollinger.outRealUpperBand; // .outRealUpperBand;
        const middleBand = bollinger.outRealMiddleBand; // .outRealMiddleBand;
        // const lowerBand = bollinger.outRealLowerBand; // .outRealLowerBand;
        const rsi = relativeSI.outReal; // .outReal;

        // console.log(`BUY-SIGNAL | RSI: ${rsi.slice(-1)[0]} > 30 -> ${rsi.slice(-1)[0] > 30}`);
        // console.log(
        //     `BUY-SIGNAL | Close: ${data.close.slice(-1)[0]} < BB lower: ${middleBand.slice(-1)[0]} -> ${
        //         data.close.slice(-1)[0] < middleBand.slice(-1)[0]
        //     }`
        // );
        // console.log(
        //     `BUY-SIGNAL | overall ${rsi.slice(-1)[0] > 30 && data.close.slice(-1)[0] < middleBand.slice(-1)[0]}`
        // );
        logger('BUY-SIGNAL', `RSI: ${rsi.slice(-1)[0]} > 30 -> ${rsi.slice(-1)[0] > 30}`, 'debug');
        logger(
            'BUY-SIGNAL',
            `Close: ${data.close.slice(-1)[0]} < BB lower: ${middleBand.slice(-1)[0]} -> ${
                data.close.slice(-1)[0] < middleBand.slice(-1)[0]
            }`,
            'debug'
        );
        logger(
            'BUY-SIGNAL',
            `overall ${rsi.slice(-1)[0] > 30 && data.close.slice(-1)[0] < middleBand.slice(-1)[0]}`,
            'debug'
        );
        return rsi.slice(-1)[0] > 30 && data.close.slice(-1)[0] < middleBand.slice(-1)[0];
        // const df = this.createDataFrame();
        // let buy = df.select('outReal', 'outRealLowerBand', 'close', 'time');
        // buy = buy
        //     .chain(
        //         (row) => row.get('outReal') > 30,
        //         (row) => row.get('close') < row.get('outRealLowerBand')
        //     )
        //     .withColumn('buy', () => 1);

        // return buy;
    }

    generateSellSignal() {
        const data = this.getDataset('close');
        const ti = this.indicatorGenerator(); // technical indicator
        const bollinger = ti.next().value.result;
        const relativeSI = ti.next().value.result;
        const middleBand = bollinger.outRealMiddleBand; // .outRealMiddleBand;
        const rsi = relativeSI.outReal; // .outReal;

        // console.log(`SELL-SIGNAL | RSI: ${rsi.slice(-1)[0]} > 70 -> ${rsi.slice(-1)[0] > 70}`);
        // console.log(
        //     `SELL-SIGNAL | Close: ${data.close.slice(-1)[0]} > BB middle: ${middleBand.slice(-1)[0]} -> ${
        //         data.close.slice(-1)[0] > middleBand.slice(-1)[0]
        //     }`
        // );
        // console.log(
        //     `SELL-SIGNAL | overall ${rsi.slice(-1)[0] > 70 && data.close.slice(-1)[0] > middleBand.slice(-1)[0]}`
        // );
        logger('SELL-SIGNAL', `RSI: ${rsi.slice(-1)[0]} > 70 -> ${rsi.slice(-1)[0] > 70}`, 'debug');
        logger(
            'SELL-SIGNAL',
            `Close: ${data.close.slice(-1)} > BB middle: ${middleBand.slice(-1)} -> ${
                data.close.slice(-1)[0] > middleBand.slice(-1)[0]
            }`,
            'debug'
        );
        logger(
            'SELL-SIGNAL',
            `overall ${rsi.slice(-1)[0] > 70 && data.close.slice(-1)[0] > middleBand.slice(-1)[0]}`,
            'debug'
        );
        return rsi.slice(-1)[0] > 70 && data.close.slice(-1)[0] > middleBand.slice(-1)[0];

        // const df = this.createDataFrame();
        // let sell = df.select('outReal', 'outRealMiddleBand', 'close', 'time');
        // sell = sell
        //     .chain(
        //         (row) => row.get('outReal') > 70,
        //         (row) => row.get('close') > row.get('outRealMiddleBand')
        //     )
        //     .withColumn('sell', () => 1);

        // return sell;
    }
}

module.exports = MyTestStrategy;

// const binance = new Client(config.apiKey, config.apiSecret);
// const bbrsi = new MyTestStrategy();

// const json = binance.getCandlestickData('ETHBTC', '4h');

// json.then((j) => {
//     // console.log(j);
//     bbrsi.dataset = convertMarketData(j);
//     // console.log(bbrsi.dataset);
//     bbrsi.indicators = [];
//     bbrsi.populateIndicators(BBANDS(bbrsi.dataset));
//     bbrsi.populateIndicators(RSI(bbrsi.dataset));

//     console.time('buy');
//     bbrsi.generateBuySignal();
//     console.timeEnd('buy');

//     console.log('\n');

//     console.time('sell');
//     bbrsi.generateSellSignal();
//     console.timeEnd('sell');
// });
