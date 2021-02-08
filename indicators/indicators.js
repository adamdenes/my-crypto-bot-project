/* eslint-disable no-console */
// Load the module and display its version
const fs = require('fs');
const talib = require('talib');

// console.log(`TALib Version: ${talib.version}`);

// Retreive indicator specifications
const functionDesc = talib.explain('BBANDS');
console.dir(functionDesc);

// marketData = { open: [...], close: [...], high: [...], low: [...], volume: [...] };
const getMarketData = (json) => {
    fs.readFile(json, (err, data) => {
        if (err) console.error(err);
        const content = JSON.parse(data);
        // console.log(marketData);

        // OHLCV data conversion
        const marketData = {
            open: Object.values(content).map((o) => o.open),
            close: Object.values(content).map((c) => c.close),
            high: Object.values(content).map((h) => h.high),
            volume: Object.values(content).map((v) => v.volume),
        };

        // execute indicator function
        talib.execute(
            {
                name: 'BBANDS',
                inputs: [{ name: 'inReal', type: 'real' }],
                startIdx: 0,
                endIdx: marketData.close.length - 1,
                inReal: marketData.close,
                optInTimePeriod: 20,
                optInNbDevUp: 2,
                optInNbDevDn: 2,
                optInMAType: 0,
            },
            function (err, result) {
                if (err) console.log(err);
                // Show the result array
                console.log('Function Results:');
                console.log(result);
            }
        );
    });
};

getMarketData('./backtest/ETHUSDT_4h.json');
