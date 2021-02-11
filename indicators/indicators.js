/* eslint-disable no-console */
const talib = require('talib');

// Retreive indicator specifications
// const functionDesc = talib.explain('RSI');
// console.dir(functionDesc);

// marketData = { open: [...], close: [...], high: [...], low: [...], volume: [...] };

const SMA = (data, period = 20) => {
    const marketData = data;

    return talib.execute({
        name: 'SMA',
        startIdx: 0,
        endIdx: marketData.close.length - 1,
        inReal: marketData.close,
        optInTimePeriod: period,
    });
};

const EMA = (data, period = 20) => {
    const marketData = data;

    return talib.execute({
        name: 'EMA',
        startIdx: 0,
        endIdx: marketData.close.length - 1,
        inReal: marketData.close,
        optInTimePeriod: period,
    });
};

const RSI = (data, period = 14) => {
    const marketData = data;

    return talib.execute({
        name: 'RSI',
        startIdx: 0,
        endIdx: marketData.close.length - 1,
        inReal: marketData.close,
        optInTimePeriod: period,
    });
};

const BBANDS = (data, period = 20, upper = 2, lower = 2, maType = 0) => {
    const marketData = data;

    return talib.execute({
        name: 'BBANDS',
        startIdx: 0,
        endIdx: marketData.close.length - 1,
        inReal: marketData.close,
        optInTimePeriod: period,
        optInNbDevUp: upper,
        optInNbDevDn: lower,
        optInMAType: maType,
    });
};

module.exports = { SMA, EMA, RSI, BBANDS };
