/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */

class MyTestStrategy {
    constructor(dataset = {}) {
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

        return rsi.slice(-1) > 30 && data.close.slice(-1)[0] < lowerBand.slice(-1)[0];
    }

    generateSellSignal() {
        const data = this.getDataset('close');
        const ti = this.indicatorGenerator(); // technical indicator
        const bollinger = ti.next().value.result;
        const relativeSI = ti.next().value.result;

        const middleBand = bollinger.outRealMiddleBand; // .outRealMiddleBand;
        const rsi = relativeSI.outReal; // .outReal;

        return rsi.slice(-1)[0] > 70 && data.close.slice(-1)[0] > middleBand.slice(-1)[0];
    }
}

module.exports = MyTestStrategy;
