/* eslint-disable no-console */
const fs = require('fs');
const talib = require('talib');

// console.log(`TALib Version: ${talib.version}`);

// Retreive indicator specifications
// const functionDesc = talib.explain('SMA');
// console.dir(functionDesc);

// marketData = { open: [...], close: [...], high: [...], low: [...], volume: [...] };
const getMarketData = async (json) => {
    const fileContent = await new Promise((resolve, reject) =>
        fs.readFile(json, (err, data) => {
            if (err) {
                return reject(err);
            }
            return resolve(data);
        })
    );
    const content = JSON.parse(fileContent);
    // OHLCV data conversion + date
    const marketData = {
        date: Object.values(content).map((d) => d.openTime),
        open: Object.values(content).map((o) => o.open),
        high: Object.values(content).map((h) => h.high),
        low: Object.values(content).map((l) => l.low),
        close: Object.values(content).map((c) => c.close),
        volume: Object.values(content).map((v) => v.volume),
    };
    return marketData;
};

const movingAverage = async () => {
    const marketData = await getMarketData('./backtest/ETHUSDT_4h.json');
    talib.execute(
        {
            name: 'SMA',
            startIdx: 0,
            endIdx: marketData.close.length - 1,
            inReal: marketData.close,
            optInTimePeriod: 20,
        },
        function (err, result) {
            if (err) console.log(err);
            // Show the result array
            console.log('Function Results:');
            console.log(result.result.outReal.slice(-1)[0]);
        }
    );
};

// getMarketData('./backtest/ETHUSDT_1h.json');
movingAverage();
