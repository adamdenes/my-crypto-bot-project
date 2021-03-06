/* eslint-disable object-shorthand */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
const crypto = require('crypto');
const fetch = require('node-fetch');
const { logger, writeData } = require('./log');
const { queryString, sleep, offset, now } = require('./helper');

class Client {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.serverTime = 0;
        this.base = 'https://api.binance.com/';
        this.order = {}; // for options see helper.js
        this.operation = {
            BUY: true,
            SELL: false,
            BUY_DIP_THRESHOLD: 0.02, // buy if price decreased more than TH
            BUY_UPWARD_TREND_THRESHOLD: 0.05, // buy if price increased more than TH
            SELL_PROFIT_THRESHOLD: 0.02, // sell if price increased above TH
            SELL_STOP_LOSS_THRESHOLD: 0.05, // stop loss
        };
    }

    get apiKey() {
        return this._apiKey;
    }

    set apiKey(newKey) {
        this._apiKey = newKey;
    }

    get apiSecret() {
        return this._apiSecret;
    }

    set apiSecret(newSecret) {
        this._apiSecret = newSecret;
    }

    get serverTime() {
        return this._serverTime;
    }

    set serverTime(newServerTime) {
        this._serverTime = newServerTime;
    }

    get order() {
        return this._order;
    }

    set order(newOrderObject) {
        this._order = newOrderObject;
    }

    signature(query) {
        return crypto.createHmac('sha256', this.apiSecret).update(query).digest('hex');
    }

    async price(symbol) {
        let response = null;
        if (symbol === undefined) {
            response = await this.getRequest(`${this.base}api/v3/ticker/price`);
        } else {
            response = await this.getRequest(`${this.base}api/v3/ticker/price?symbol=${symbol}`);
        }
        return response;
    }

    async bookTicker(symbol) {
        let response = null;
        if (symbol === undefined) {
            response = await this.getRequest(`${this.base}api/v3/ticker/bookTicker`);
        } else {
            response = await this.getRequest(`${this.base}api/v3/ticker/bookTicker?symbol=${symbol}`);
        }
        return response;
    }

    async ticker24hr(symbol) {
        let response = null;
        if (symbol === undefined) {
            response = await this.getRequest(`${this.base}api/v3/ticker/24hr`);
        } else {
            response = await this.getRequest(`${this.base}api/v3/ticker/24hr?symbol=${symbol}`);
        }
        return response;
    }

    async priceInUSD(cryptoPriceInQuote) {
        if (cryptoPriceInQuote.includes('USDT')) {
            const currentPrice = await this.getMarketPrice(cryptoPriceInQuote);
            return +currentPrice.price;
        }
        const currentPrices = await Promise.all([
            this.getMarketPrice(cryptoPriceInQuote),
            this.getMarketPrice(`${cryptoPriceInQuote.slice(3)}USDT`),
        ]);

        return currentPrices.reduce((acc, cp) => acc.price * cp.price);
    }

    async usdTotal() {
        const info = await Promise.all([this.priceInUSD('BTCUSDT'), this.priceInUSD('ETHBTC'), this.getBalances()]);

        let balanceInUSD = 0;

        info[2].forEach((element) => {
            if (element.asset === 'BTC') {
                balanceInUSD += (+element.free + +element.locked) * info[0];
            }
            if (element.asset === 'ETH') {
                balanceInUSD += (+element.free + +element.locked) * info[1];
            }
            if (element.asset === 'USDT') {
                balanceInUSD += +element.free + +element.locked;
            }
        });
        // logger('BALANCE', `balance => '$${balanceInUSD.toFixed(2)}'`, 'info');

        return balanceInUSD;
    }

    async getRequest(endpoint, data = {}) {
        try {
            const response = await fetch(endpoint, data);
            if (response.ok) {
                const jsonResponse = await response.json();
                return jsonResponse;
            }
            throw new Error('Request failed!');
        } catch (error) {
            logger('GET', `GET request failed ${error}`, 'error');
        }
    }

    async postRequest(endpoint, data) {
        try {
            const response = await fetch(endpoint, data);
            if (response.ok) {
                const jsonResponse = await response.json();
                return jsonResponse;
            }
            throw new Error('Request failed!');
        } catch (error) {
            console.log(error);
            logger('POST', `POST request failed ${error}`, 'error');
        }
    }

    async getServerTime() {
        const response = await this.getRequest(`${this.base}api/v3/time`);
        // logger('SERVERTIME', `GET getServerTime() success, servertime => '${response.serverTime}'`, 'info');

        return response.serverTime;
    }

    async exchangeInfo() {
        const response = await this.getRequest(`${this.base}api/v3/exchangeInfo`);
        logger('EXCHANGE-INFO', `GET exchangeInfo() success'`, 'info');

        return response;
    }

    async minQuantity(exchInf, sym) {
        const info = await exchInf;
        let minQuantity = 0;

        for (let i = 0; i < info.symbols.length; i++) {
            if (info.symbols[i].symbol.includes(sym)) {
                for (let j = 0; j < info.symbols[i].filters.length; j++) {
                    if (info.symbols[i].filters[j].filterType === 'MIN_NOTIONAL') {
                        // console.log(info.symbols[i].filters[j]);
                        minQuantity = info.symbols[i].filters[j].minNotional;
                    }
                }
            }
        }
        return minQuantity;
    }

    async testConnectivity() {
        const response = await this.getRequest(`${this.base}api/v3/ping`);
        logger('TEST-CON', `GET testConnectivity() success`, 'info');

        return response;
    }

    async adjustTimestamp(server) {
        const serverTime = await server;
        const currentTime = new Date().getTime();
        const os = offset(serverTime, currentTime);
        const useServerTime = os < 0 ? serverTime - os : serverTime + os;
        // logger('TIMESTAMP', `GET adjustTimestamp() success, => '${useServerTime}'`, 'info');

        return useServerTime;
    }

    async getAccountInfo() {
        try {
            const serverTime = await this.adjustTimestamp(this.getServerTime());
            const query = queryString({ timestamp: serverTime });
            const signature = this.signature(query);

            const response = await this.getRequest(`${this.base}api/v3/account?${query}&signature=${signature}`, {
                method: 'GET',
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-type': 'x-www-form-urlencoded',
                },
            });
            // logger('ACCOUNT', `GET getAccountInfo() success => '${response.permissions}'`, 'info');
            return response;
        } catch (error) {
            logger('ACCOUNT', `GET getAccountInfo() failed => '${error}'`, 'error');
        }
    }

    async testNewOrders(symbol, side, type = 'LIMIT', timeInForce = 'GTC') {
        const serverTime = await this.adjustTimestamp(this.getServerTime());
        const query = queryString({
            symbol: 'ETHBTC',
            side: 'SELL',
            type: 'LIMIT',
            timeInForce: 'GTC',
            quantity: 1,
            price: 0.1,
            recvWindow: 5000,
            timestamp: serverTime,
        });
        const sig = this.signature(query);

        const response = await this.postRequest(`${this.base}api/v3/order/test?${query}&signature=${sig}`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': this.apiKey,
                'Content-type': 'x-www-form-urlencoded',
            },
        });
        return response;
    }

    async getBalances() {
        try {
            const data = await this.getAccountInfo();
            const balances = data.balances.map((asset) => asset).filter((value) => +value.free > 0);
            // logger('BALANCES', `GET getBalances() success`, 'info');

            return balances;
        } catch (error) {
            logger('BALANCES', `GET getBalances() failed => '${error}'`, 'error');
        }
    }

    async getMarketPrice(symbol = 'ETHBTC') {
        const param = typeof symbol === 'string' ? `?symbol=${symbol}` : '';
        const marketPrice = await this.getRequest(`${this.base}api/v3/ticker/price${param}`);
        // logger('PRICE', `GET getMarketPrice() success, asset => ${marketPrice.symbol}, price => ${marketPrice.price}`, 'info');

        return marketPrice;
    }

    async placeSellOrder(sym = 'ETHBTC', sell = 'SELL', orderType = 'LIMIT', tif = 'GTC') {
        logger('SELL-ORDER', `Attempt to sell: ${sym}`, 'info');

        try {
            const priceInfo = await Promise.all([
                this.priceInUSD(sym),
                this.getBalances(),
                this.getMarketPrice(sym),
                this.adjustTimestamp(this.getServerTime()),
                this.minQuantity(this.exchangeInfo(), sym),
            ]);

            const quote = priceInfo[1][0].free;
            const freeCrypto = priceInfo[1][1].free;
            const marketPrice = priceInfo[2].price;
            const serverTime = priceInfo[3];
            const pt = +marketPrice + marketPrice * this.operation.SELL_PROFIT_THRESHOLD;
            const sl = +marketPrice - marketPrice * this.operation.SELL_STOP_LOSS_THRESHOLD;
            const minQuantity = priceInfo[4];
            const priceQuantity = +(freeCrypto * 0.02).toFixed(3) * marketPrice;

            logger('SELL-ORDER', `Quote: ${priceInfo[1][0].asset} - Free: ${quote}`, 'debug');
            logger('SELL-ORDER', `Available: ${freeCrypto}`, 'debug');
            logger('SELL-ORDER', `Price in USD: ${priceInfo[0]}`, 'debug');
            logger('SELL-ORDER', `Marketprice: ${marketPrice} = $${priceInfo[0] * marketPrice}`, 'debug');
            logger('SELL-ORDER', `Quantity: ${+(freeCrypto * 0.02).toFixed(3)}`, 'debug');
            logger('SELL-ORDER', `Quantity * Price: ${+(freeCrypto * 0.02).toFixed(3) * marketPrice}`, 'debug');
            logger('SELL-ORDER', `Profit Target: ${+pt.toFixed(6)} = $${priceInfo[0] * +pt.toFixed(6)}`, 'debug');
            logger('SELL-ORDER', `Stop Loss: ${+sl.toFixed(6)} = $${priceInfo[0] * +sl.toFixed(6)}`, 'debug');
            logger('SELL-ORDER', `Minimum Quantity: ${minQuantity}`, 'debug');
            logger(
                'SELL-ORDER',
                `Minimum Quantity < Quantity : ${minQuantity < +(freeCrypto * 0.02).toFixed(3)}`,
                'debug'
            );

            // if price * quantity > available balance
            if (priceQuantity > freeCrypto) {
                logger('SELL-ORDER', `Insufficient balance : ${freeCrypto}`, 'CRITICAL');
            }

            this.order = {
                symbol: sym,
                side: sell,
                type: orderType,
                timeInForce: tif,
                quantity: +(freeCrypto * 0.02).toFixed(3),
                price: +pt.toFixed(6),
                recvWindow: 5000,
                timestamp: serverTime,
            };
            const query = queryString(this.order);
            const sig = this.signature(query);

            const response = await this.postRequest(`${this.base}api/v3/order?${query}&signature=${sig}`, {
                method: 'POST',
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-type': 'x-www-form-urlencoded',
                },
            });
            logger(
                'SELL-ORDER',
                `GET placeSellOrder() success, SELL price => '${response.price} = $${(
                    response.price * priceInfo[0]
                ).toFixed(2)}'`,
                'warning'
            );
            return response.price;
        } catch (error) {
            logger('SELL-ORDER', `GET placeSellOrder() failed => '${error}'`, 'error');
        }
    }

    async placeBuyOrder(sym = 'ETHBTC', buy = 'BUY', orderType = 'LIMIT', tif = 'GTC') {
        logger('BUY-ORDER', `Attempt to buy: ${sym}`, 'info');

        try {
            const priceInfo = await Promise.all([
                this.priceInUSD(sym),
                this.getBalances(),
                this.getMarketPrice(sym),
                this.adjustTimestamp(this.getServerTime()),
                this.minQuantity(this.exchangeInfo(), sym),
            ]);

            const quote = priceInfo[1][0].free;
            const freeCrypto = priceInfo[1][1].free;
            const marketPrice = priceInfo[2].price;
            const serverTime = priceInfo[3];
            const pt = +marketPrice - marketPrice * this.operation.BUY_DIP_THRESHOLD;
            const sl = +marketPrice + marketPrice * this.operation.BUY_UPWARD_TREND_THRESHOLD;
            const minQuantity = priceInfo[4];
            const priceQuantity = +(freeCrypto * 0.02).toFixed(3) * marketPrice;

            logger('BUY-ORDER', `Quote: ${priceInfo[1][0].asset} - Free: ${quote}`, 'debug');
            logger('BUY-ORDER', `Available: ${freeCrypto}`, 'debug');
            logger('BUY-ORDER', `Price in USD: ${priceInfo[0]}`, 'debug');
            logger('BUY-ORDER', `Marketprice: ${marketPrice} = $${priceInfo[0] * marketPrice}`, 'debug');
            logger('BUY-ORDER', `Quantity: ${+(freeCrypto * 0.02).toFixed(3)}`, 'debug');
            logger('BUY-ORDER', `Quantity * Price: ${+(freeCrypto * 0.02).toFixed(3) * marketPrice}`, 'debug');
            logger('BUY-ORDER', `Profit Target: ${+pt.toFixed(6)} = $${priceInfo[0] * +pt.toFixed(6)}`, 'debug');
            logger('BUY-ORDER', `Stop Loss: ${+sl.toFixed(6)} = $${priceInfo[0] * +sl.toFixed(6)}`, 'debug');
            logger('BUY-ORDER', `Minimum Quantity: ${minQuantity}`, 'debug');
            logger(
                'BUY-ORDER',
                `Minimum Quantity < Quantity : ${minQuantity < +(freeCrypto * 0.02).toFixed(3)}`,
                'debug'
            );

            // if price * quantity > available balance
            if (priceQuantity > quote) {
                logger('BUY-ORDER', `Insufficient balance : ${quote}`, 'CRITICAL');
            }

            this.order = {
                symbol: sym,
                side: buy,
                type: orderType,
                timeInForce: tif,
                quantity: +(freeCrypto * 0.02).toFixed(3),
                price: +pt.toFixed(6),
                recvWindow: 5000,
                timestamp: serverTime,
            };
            const query = queryString(this.order);
            const sig = this.signature(query);

            const response = await this.postRequest(`${this.base}api/v3/order?${query}&signature=${sig}`, {
                method: 'POST',
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-type': 'x-www-form-urlencoded',
                },
            });
            logger(
                'BUY-ORDER',
                `GET placeBuyOrder() success, BUY price => '${response.price} = $${(
                    response.price * priceInfo[0]
                ).toFixed(2)}'`,
                'warning'
            );
            return response.price;
        } catch (error) {
            logger('BUY-ORDER', `GET placeBuyOrder() failed => '${error}'`, 'error');
        }
    }

    async queryOrder(sym = 'ETHBTC', orderId) {
        try {
            const serverTime = await this.adjustTimestamp(this.getServerTime());
            const query = queryString({
                symbol: sym,
                orderId: orderId,
                recvWindow: 5000,
                timestamp: serverTime,
            });
            const sig = this.signature(query);
            const response = await this.getRequest(`${this.base}api/v3/order?${query}&signature=${sig}`, {
                method: 'GET',
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-type': 'x-www-form-urlencoded',
                },
            });
            return response;
        } catch (error) {
            logger('BALANCES', `GET queryOrder() failed => '${error}'`, 'error');
        }
    }

    async cancelOrder(operation) {
        try {
            const openOrders = await operation;
            const serverTime = await this.adjustTimestamp(this.getServerTime());
            const query = queryString({
                symbol: openOrders[0].symbol,
                orderId: openOrders[0].orderId,
                recvWindow: 5000,
                timestamp: serverTime,
            });
            const sig = this.signature(query);
            const response = await this.postRequest(`${this.base}api/v3/order?${query}&signature=${sig}`, {
                method: 'DELETE',
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-type': 'x-www-form-urlencoded',
                },
            });
            logger('CANCEL-ORDER', `Order cancelled, orderId => '${query.orderId}'`, 'error');
            return response;
        } catch (error) {
            logger('CANCEL-ORDER', `GET cancelOrder() failed => '${error}'`, 'error');
        }
    }

    async cancelAllOrders(sym = 'ETHBTC') {
        try {
            const serverTime = await this.adjustTimestamp(this.getServerTime());
            const query = queryString({
                symbol: sym,
                recvWindow: 5000,
                timestamp: serverTime,
            });
            const sig = this.signature(query);
            const response = await this.postRequest(`${this.base}api/v3/openOrders?${query}&signature=${sig}`, {
                method: 'DELETE',
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-type': 'x-www-form-urlencoded',
                },
            });
            logger('CANCEL-ALL', `Order(s) cancelled`, 'error');
            return response;
        } catch (error) {
            logger('CANCEL-ALL', `GET cancelAllOrders() failed => '${error}'`, 'error');
        }
    }

    async getOperationDetails(sym = 'ETHBTC') {
        try {
            const serverTime = await this.adjustTimestamp(this.getServerTime());
            const query = queryString({ symbol: sym, recvWindow: 5000, timestamp: serverTime });
            const sig = this.signature(query);

            const response = await this.getRequest(`${this.base}api/v3/openOrders?${query}&signature=${sig}`, {
                method: 'GET',
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-type': 'x-www-form-urlencoded',
                },
            });
            // logger('OPERATION', `GET getOperationDetails() success => '${response}'`, 'info');
            return response;
        } catch (error) {
            logger('OPERATION-DETAILS', `GET getOperationDetails() failed => '${error}'`, 'error');
        }
    }

    async getCandlestickData(sym, int, start, end) {
        try {
            let query = null;
            if (start === 'undefined' && end === 'undefined') {
                query = queryString({
                    symbol: sym,
                    interval: int,
                });
            } else {
                query = queryString({
                    symbol: sym,
                    interval: int,
                    startTime: start,
                    endTime: end,
                });
            }
            const response = await this.getRequest(`${this.base}api/v3/klines?${query}`, {
                method: 'GET',
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-type': 'x-www-form-urlencoded',
                },
            });
            // console.log(response.slice(-1)[0]);
            return response;
        } catch (error) {
            logger('KLINE', `GET getCandelsticData() failed => '${error}'`, 'error');
        }
    }

    async downloadCandelSticks(sym, interval, startTime) {
        // last available closeprice
        const lastClose = await this.getCandlestickData(sym, interval);
        const end = now(lastClose.slice(-1)[0][6], interval);
        // const end =  Date.parse(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 24, 59, 59, 999)) + 999;

        let start = new Date().setFullYear(new Date().getFullYear() - startTime);
        let sticks = await this.getCandlestickData(sym, interval, start, end);
        const data = sticks.filter((e) => e[6] < end).map((e) => e);
        let lastDateIteration = data[data.length - 1][6];

        while (lastDateIteration < end) {
            start = lastDateIteration + 1;
            console.log(`STARTTIME: \t${start}`);
            console.log(`END: \t\t${end}`);
            sticks = await this.getCandlestickData(sym, interval, start, end);
            await sleep(500);

            sticks.forEach((e) => {
                data.push(e);
            });
            console.log(`DATA-LENGTH: \t${data.length}`);
            lastDateIteration = data[data.length - 1][6];
            console.log(`LASTITERATION: \t${lastDateIteration}`);
        }
        // It is possible to get a full JSON format { open: 123, close: 456 }
        // Or we can get an Array-like dataset

        // writeData(convertArrToJson(data), sym, interval, 'w');
        // return convertArrToJson(data);
        writeData(data, sym, interval, 'w');
        return data;
    }

    async listenKey() {
        const response = await this.postRequest(`${this.base}api/v3/userDataStream`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': this.apiKey,
                'Content-type': 'x-www-form-urlencoded',
            },
        });
        return response;
    }

    async placeOCO(sym = 'ETHBTC', sell = 'SELL', tif = 'GTC') {
        logger('OCO-ORDER', `Attempt to sell: ${sym}`, 'info');

        try {
            const priceInfo = await Promise.all([
                this.priceInUSD(sym),
                this.getBalances(),
                this.getMarketPrice(sym),
                this.adjustTimestamp(this.getServerTime()),
                this.minQuantity(this.exchangeInfo(), sym),
            ]);

            const freeCrypto = +priceInfo[1][1].free;
            const marketPrice = +priceInfo[2].price;
            const serverTime = priceInfo[3];
            const pt = (+marketPrice + marketPrice * this.operation.SELL_PROFIT_THRESHOLD).toFixed(6);
            const sl = (+marketPrice - marketPrice * this.operation.SELL_STOP_LOSS_THRESHOLD).toFixed(6);
            const priceQuantity = +(freeCrypto * 0.02).toFixed(3) * marketPrice;
            let quant = +(freeCrypto * 0.02).toFixed(3);
            const minQty = priceInfo[4];
            if (priceQuantity > freeCrypto) {
                console.log('OCO-ORDER', `Insufficient balance : ${freeCrypto}`, 'CRITICAL');
                // logger('OCO-ORDER', `Insufficient balance : ${freeCrypto}`, 'CRITICAL');
            }

            if (priceQuantity < minQty) {
                console.log('OCO-ORDER', `Minimun quantity not reached : ${minQty}`, 'CRITICAL');
                console.log('OCO-ORDER', `Setting minQuant to : ${minQty}`, 'CRITICAL');
                quant = +minQty;
            }
            console.log(freeCrypto);
            console.log(marketPrice);
            console.log(serverTime);
            console.log(pt);
            console.log(sl);
            console.log(priceQuantity);
            console.log(quant);
            console.log(minQty);

            this.order = {
                symbol: sym,
                side: sell,
                type: 'OCO',
                quantity: quant,
                price: +pt,
                stopPrice: +sl,
                stopLimitPrice: +sl,
                stopLimitTimeInForce: tif,
                recvWindow: 5000,
                timestamp: serverTime,
            };
            const query = queryString(this.order);
            const sig = this.signature(query);

            const response = await this.postRequest(`${this.base}api/v3/order/oco?${query}&signature=${sig}`, {
                method: 'POST',
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-type': 'x-www-form-urlencoded',
                },
            });
            // logger(
            //     'OCO-ORDER',
            //     `GET placeSellOrder() success, SELL price => '${response.price} = $${(
            //         response.price * priceInfo[0]
            //     ).toFixed(2)}'`,
            //     'warning'
            // );
            return response.price;
        } catch (error) {
            console.log('OCO-ORDER', `GET placeOCO() failed => '${error}'`, 'error');
            // logger('OCO-ORDER', `GET placeOCO() failed => '${error}'`, 'error');
        }
    }
}

module.exports = Client;
