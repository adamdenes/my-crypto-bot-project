/* eslint-disable no-console */
const fs = require('fs');
const talib = require('talib');

const config = require('../config.json');
const Client = require('../index');

const client = new Client(config.apiKey, config.apiSecret);

// console.log(`TALib Version: ${talib.version}`);

// Retreive indicator specifications
// const functionDesc = talib.explain('RSI');
// console.dir(functionDesc);

// marketData = { open: [...], close: [...], high: [...], low: [...], volume: [...] };

const convertMarketData = (source) => {
    // OHLCV data conversion + date
    if (Array.isArray(source)) {
        return {
            time: source.map((t) => t[0]),
            open: source.map((o) => o[1]),
            high: source.map((h) => h[2]),
            low: source.map((l) => l[3]),
            close: source.map((c) => c[4]),
            volume: source.map((v) => v[5]),
        };
    }
    // For true Object converison in case convertArrToJson() is used!
    return {
        time: Object.values(source).map((t) => t.openTime),
        open: Object.values(source).map((o) => o.open),
        high: Object.values(source).map((h) => h.high),
        low: Object.values(source).map((l) => l.low),
        close: Object.values(source).map((c) => c.close),
        volume: Object.values(source).map((v) => v.volume),
    };
};

const readMarketData = async (json) => {
    const fileContent = await new Promise((resolve, reject) =>
        fs.readFile(json, (err, data) => {
            if (err) {
                return reject(err);
            }
            return resolve(data);
        })
    );
    const content = JSON.parse(fileContent);
    return convertMarketData(content);
};

const sma = async (data, period = 20) => {
    const marketData = await data;
    // console.log(marketData.close.slice(-1));

    talib.execute(
        {
            name: 'SMA',
            startIdx: 0,
            endIdx: marketData.close.length - 1,
            inReal: marketData.close,
            optInTimePeriod: period,
        },
        function (err, result) {
            if (err) console.log(err);
            // console.log(result.result.outReal);
            console.log(result.result.outReal.slice(-1)[0]);
            return result.result.outReal;
        }
    );
};

const ema = async (data, period = 20) => {
    const marketData = await data;
    // console.log(marketData.close.slice(-1));

    talib.execute(
        {
            name: 'EMA',
            startIdx: 0,
            endIdx: marketData.close.length - 1,
            inReal: marketData.close,
            optInTimePeriod: period,
        },
        function (err, result) {
            if (err) console.log(err);
            // console.log(result.result.outReal);
            console.log(result.result.outReal.slice(-1)[0]);
            return result.result.outReal;
        }
    );
};

const rsi = async (data, period = 14) => {
    const marketData = await data;
    console.log(marketData.time.slice(-1));
    console.log(marketData.open.slice(-1));
    console.log(marketData.high.slice(-1));
    console.log(marketData.low.slice(-1));
    console.log(marketData.close.slice(-1));
    console.log(marketData.volume.slice(-1));

    talib.execute(
        {
            name: 'RSI',
            startIdx: 0,
            endIdx: marketData.close.length - 1,
            inReal: marketData.close,
            optInTimePeriod: period,
        },
        function (err, result) {
            if (err) console.log(err);
            // console.log(result.result.outReal);
            console.log(result.result.outReal.slice(-1)[0]);
            return result.result.outReal;
        }
    );
};

// readMarketData('./backtest/ETHBTC_4h.json').then((r) => console.log(r));
// sma(readMarketData('./backtest/ETHBTC_4h.json'));
// client
//     .getCandlestickData('ETHUSDT', '15m')
//     .then((response) => convertMarketData(response))
//     .then((dataframe) => sma(dataframe))
// client
//     .getCandlestickData('ETHUSDT', '4h')
//     .then((response) => convertMarketData(response))
//     .then((dataframe) => ema(dataframe, 12));
// client
//     .getCandlestickData('ETHUSDT', '4h')
//     .then((response) => convertMarketData(response))
//     .then((dataframe) => rsi(dataframe));
