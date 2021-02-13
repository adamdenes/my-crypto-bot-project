/* eslint-disable no-console */
const { readMarketData } = require('../helper');
const { BBANDS, RSI } = require('../indicators/indicators');

const jsonFile = readMarketData(`${__dirname}/ETHBTC_4h.json`);

class BackTester {
    constructor(candles = {}) {
        this._candles = candles;
    }

    get candles() {
        return this._candles;
    }

    add(newCandles) {
        this._candles = Object.assign(this._candles, newCandles);
    }

    *dataGenerator() {
        // for (const key in this._candles) {
        //     yield this._candles[key];
        // }
        yield this._candles;
    }
}

const bt = new BackTester();

jsonFile
    .then((e) => {
        bt.add(e);
        // console.log(bt.candles);
        const gen = bt.dataGenerator();

        console.time('Loop time');
        for (const iterator of gen) {
            // console.log(iterator);
            console.log(RSI(iterator));
            console.log(BBANDS(iterator));
        }
        // while (!(next = gen.next()).done) {
        //     console.log('valami: ', next.value)
        // }
        console.timeEnd('Loop time');
    })
    .catch((err) => console.log(err));
