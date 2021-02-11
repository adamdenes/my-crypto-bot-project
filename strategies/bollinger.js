/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const { convertMarketData } = require('../helper');
const { BBANDS, RSI } = require('../indicators/indicators');
const config = require('../config.json');
const Client = require('../index');

const client = new Client(config.apiKey, config.apiSecret);
const marketData = client.getCandlestickData('BTCUSDT', '4h').then((data) => convertMarketData(data));

class MyTestStrategy {
    constructor(dataset) {
        this._dataset = dataset;
        this._indicators = [];
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

    generateBuySignal() {
        const data = this.getDataset('close');
        const ti = this.indicatorGenerator(); // technical indicator
        const bollinger = ti.next().value.result;
        const relativeSI = ti.next().value.result;

        const upperBand = bollinger.outRealUpperBand; // .outRealUpperBand;
        const middleBand = bollinger.outRealMiddleBand; // .outRealMiddleBand;
        const lowerBand = bollinger.outRealLowerBand; // .outRealLowerBand;
        const rsi = relativeSI.outReal; // .outReal;
        console.log(upperBand.slice(-1));
        console.log(middleBand.slice(-1));
        console.log(lowerBand.slice(-1));
        console.log(rsi.slice(-1));

        console.log(`RSI: ${rsi.slice(-1)}`);
        console.log(`CLOSING CANDLE: ${data.close.slice(-1)}`);
        console.log(`LOWERBAND: ${lowerBand.slice(-1)}`);
        console.log(rsi.slice(-1) > 30 && data.close.slice(-1)[0] < lowerBand.slice(-1)[0]);

        return rsi.slice(-1) > 30 && data.close.slice(-1)[0] < lowerBand.slice(-1)[0];
    }

    generateSellSignal() {
        const data = this.getDataset('close');
        const ti = this.indicatorGenerator(); // technical indicator
        const bollinger = ti.next().value.result;
        const relativeSI = ti.next().value.result;

        const middleBand = bollinger.outRealMiddleBand; // .outRealMiddleBand;
        const rsi = relativeSI.outReal; // .outReal;

        console.log(middleBand.slice(-1));
        console.log(rsi.slice(-1));

        console.log(`RSI: ${rsi.slice(-1)}`);
        console.log(`CLOSING CANDLE: ${data.close.slice(-1)}`);
        console.log(`MIDDLEBAND: ${middleBand.slice(-1)}`);
        console.log(rsi.slice(-1)[0] > 80 && data.close.slice(-1)[0] > middleBand.slice(-1)[0]);

        return rsi.slice(-1)[0] > 70 && data.close.slice(-1)[0] > middleBand.slice(-1)[0];
    }
}

const strat = new MyTestStrategy();

marketData.then((d) => {
    strat.dataset = d;
    strat.populateIndicators(BBANDS(d));
    strat.populateIndicators(RSI(d));
    strat.generateBuySignal();
    strat.generateSellSignal();
});
