/* eslint-disable no-console */
const talib = require('talib');
// const { convertMarketData, readMarketData } = require('../helper');

// const config = require('../config.json');
// const Client = require('../index');

// const client = new Client(config.apiKey, config.apiSecret);

// Retreive indicator specifications
// const functionDesc = talib.explain('RSI');
// console.dir(functionDesc);

// marketData = { open: [...], close: [...], high: [...], low: [...], volume: [...] };

const SMA = (data, period = 20) => {
    const marketData = data;

    return talib.execute(
        {
            name: 'SMA',
            startIdx: 0,
            endIdx: marketData.close.length - 1,
            inReal: marketData.close,
            optInTimePeriod: period,
        } // ,
        // function (err, result) {
        //     if (err) console.log(err);
        //     // console.log(result.result.outReal);
        //     // console.log(result.result.outReal.slice(-1)[0]);
        //     return result.result.outReal;
        // }
    );
};

const EMA = (data, period = 20) => {
    const marketData = data;

    return talib.execute(
        {
            name: 'EMA',
            startIdx: 0,
            endIdx: marketData.close.length - 1,
            inReal: marketData.close,
            optInTimePeriod: period,
        } // ,
        // function (err, result) {
        //     if (err) console.log(err);
        //     // console.log(result.result.outReal);
        //     // console.log(result.result.outReal.slice(-1)[0]);
        //     return result.result.outReal;
        // }
    );
};

const RSI = (data, period = 14) => {
    const marketData = data;

    return talib.execute(
        {
            name: 'RSI',
            startIdx: 0,
            endIdx: marketData.close.length - 1,
            inReal: marketData.close,
            optInTimePeriod: period,
        } // ,
        // function (err, result) {
        //     if (err) console.log(err);
        //     // console.log(result.result.outReal);
        //     // console.log(result.result.outReal.slice(-1)[0]);
        //     return result.result.outReal;
        // }
    );
};

const BBANDS = (data, period = 20, upper = 2, lower = 2, maType = 0) => {
    const marketData = data;

    return talib.execute(
        {
            name: 'BBANDS',
            startIdx: 0,
            endIdx: marketData.close.length - 1,
            inReal: marketData.close,
            optInTimePeriod: period,
            optInNbDevUp: upper,
            optInNbDevDn: lower,
            optInMAType: maType,
        } // ,
        // function (err, result) {
        //     if (err) console.log(err);
        //     // console.log(result.result);
        //     // console.log(result.result.outRealUpperBand.slice(-1)[0]);
        //     // console.log(result.result.outRealMiddleBand.slice(-1)[0]);
        //     // console.log(result.result.outRealLowerBand.slice(-1)[0]);
        //     return result.result;
        // }
    );
};

module.exports = { SMA, EMA, RSI, BBANDS };
// readMarketData('./backtest/ETHBTC_4h.json').then((r) => console.log(r));
// sma(readMarketData('./backtest/ETHBTC_4h.json'));
// client
//     .getCandlestickData('ETHUSDT', '15m')
//     .then((response) => convertMarketData(response))
//     .then((dataframe) => sma(dataframe));
// client
//     .getCandlestickData('ETHUSDT', '4h')
//     .then((response) => convertMarketData(response))
//     .then((dataframe) => ema(dataframe, 12));
// client
//     .getCandlestickData('ETHUSDT', '4h')
//     .then((response) => convertMarketData(response))
//     .then((dataframe) => bbands(dataframe, 20, 2, 2))
//     .then((results) => console.log(results.result));
