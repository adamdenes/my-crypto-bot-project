const Websocket = require('ws');
const { logger } = require('./log');
const { convertMarketData } = require('./helper');

class WebSocket {
    constructor(protocol, stream, payload = { method: 'SUBSCRIBE', params: ['ethbtc@ticker'], id: 1 }) {
        this.protocol = protocol;
        this.stream = stream;
        this._payload = payload;
        this.reconnect = this.randomDelay(); // 1000-4000
        this.ws = null;
        this.marketData = null;
    }

    get protocol() {
        return this._protocol;
    }

    set protocol(newProtocol) {
        if (typeof newProtocol !== 'string') {
            // console.log(`Expected string, got ${typeof newProtocol}.`);
            logger('WEBSOCKET', `Expected string, got ${typeof newProtocol}.`, 'error');
        }
        this._protocol = newProtocol;
    }

    get stream() {
        return this._stream;
    }

    set stream(newStream) {
        if (typeof newStream !== 'string') {
            // console.log(`Expected string, got ${typeof newStream}.`);
            logger('WEBSOCKET', `Expected string, got ${typeof newStream}.`, 'error');
        }
        this._stream = newStream;
    }

    get payload() {
        return this._payload;
    }

    set payload(newPayload) {
        if (typeof newPayload !== 'object' && newPayload === null) {
            // console.log(`Expected object, got ${typeof newPayload}.`);
            logger('WEBSOCKET', `Expected object, got ${typeof newPayload}.`, 'error');
        }
        this._payload = newPayload;
    }

    get marketData() {
        return this._marketData;
    }

    set marketData(newMarketData) {
        if (typeof newMarketData !== 'object' && newMarketData === null) {
            logger('WEBSOCKET', `Expected object, got ${typeof newMarketData}.`, 'error');
        }
        this._marketData = newMarketData;
    }

    randomDelay() {
        this._reconnect = (Math.floor(Math.random() * 4) + 1) * 1000;
        return this._reconnect;
    }

    startWS() {
        this.ws = new Websocket(`${this.protocol}://${this.stream}/stream?`);
        this.eventListener();
        // console.log(`reconnect interval: ${this.reconnect}`);
        this.reconnect = this.randomDelay() + 250;
    }

    eventListener() {
        this.ws.on('open', () => {
            // console.log(`OPEN stream ${Date.now()}`);
            logger('WEBSOCKET', `OPEN stream ${Date.now()}`, 'info');

            this.ws.send(JSON.stringify(this._payload));
            setInterval(() => {
                this.ws.ping();
            }, 5 * 1000);
        });

        this.ws.on('ping', (data) => {
            // console.log(`PING --> ${data}`);
            logger('WEBSOCKET', `PING --> ${data}`, 'info');
        });

        this.ws.on('pong', () => {
            // console.log(`PONG --> ${Date.now()}`);
            // logger('WEBSOCKET', `PONG --> ${Date.now()}`, 'info');
        });

        this.ws.on('message', (data) => {
            const dataObj = JSON.parse(data);

            if (Object.keys(dataObj).includes('data')) {
                const objKey = Object.keys(dataObj)[1];
                const convertedData = {};
                convertedData[objKey] = dataObj[objKey];

                if (dataObj.stream === this._payload.params[0]) {
                    this._marketData = convertMarketData(convertedData);
                    // console.log(`TICKER --> Time: \t${ohlcv.time}`);
                    // console.log(`TICKER --> Open: \t${ohlcv.open}`);
                    // console.log(`TICKER --> High: \t${ohlcv.high}`);
                    // console.log(`TICKER --> Low: \t${ohlcv.low}`);
                    // console.log(`TICKER --> Close: \t${ohlcv.close}`);
                    // console.log(`TICKER --> Volume: \t${ohlcv.volume}`);
                    // console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
                }
            }
        });

        this.ws.on('error', (error) => {
            // console.log(`Error: ${error}`);
            logger('WEBSOCKET', `Error: ${error}`, 'error');
        });

        this.ws.on('close', (code) => {
            // console.log(`CLOSE ${Date.now()} --> code: ${code}.`);
            logger('WEBSOCKET', `CLOSE ${Date.now()} --> code: ${code}.`, 'info');

            // Need to recreate the websocket object
            setTimeout(() => {
                logger('WEBSOCKET', `RECONNECTING after connection loss.`, 'CRITICAL');
                this.startWS();
            }, this.reconnect);
        });
    }
}

module.exports = WebSocket;

// const socket = new WebSocket('wss', 'stream.binance.com:9443');
// socket.startWS();

// FOR TESTING SOCKET RECONNECTION
// const wss = new Websocket.Server({ port: 8080 });

// wss.on('connection', (ws) => {
//     ws.on('message', (message) => {
//         console.log(`Received message => ${message}`);
//     });

//     ws.send(JSON.stringify('ho!'));
//     setTimeout(() => {
//         ws.close();
//     }, 5000);
// });
// const socket = new WebSocket('ws', 'localhost:8080');
// socket.startWS();
