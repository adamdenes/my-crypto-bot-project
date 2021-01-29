const fetch = require("node-fetch");
const crypto = require("crypto");
const { logger } = require("./log");


class Client {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.serverTime = 0;
        this.base = "https://api.binance.com/";
        this.order = {}; // for options see helper.js
        this.operation = {
            BUY: 0,
            SELL: 1,
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
        return crypto
            .createHmac("sha256", this.apiSecret)
            .update(query)
            .digest("hex");
    }

    offset(server, date) {
        return server - date;
    }

    queryString(obj) {
        return Object.keys(obj)
            .reduce((a, k) => {
                if (obj[k] !== undefined) {
                    a.push(k + "=" + encodeURIComponent(obj[k]));
                }
                return a;
            }, [])
            .join("&");
    }

    async priceInUSD(cryptoPriceInQuote) {
        if (cryptoPriceInQuote === "BTCUSDT") {
            const currentPrice = await this.getMarketPrice(cryptoPriceInQuote);
            return +currentPrice.price;
        } else {
            const currentPrices = await Promise.all([
                this.getMarketPrice(cryptoPriceInQuote),
                this.getMarketPrice(cryptoPriceInQuote.slice(3) + "USDT"),
            ]);

            return currentPrices.reduce((acc, cp) => acc.price * cp.price);
        }
    }

    async usdTotal() {
        const info = await Promise.all([
            this.priceInUSD("BTCUSDT"),
            this.priceInUSD("ETHBTC"),
            this.getBalances()
        ]);

        let balanceInUSD = 0;

        info[2].forEach(element => {
            if (element.asset === "BTC") {
                balanceInUSD += element.free * info[0];
            }
            if (element.asset === "ETH") {
                balanceInUSD += element.free * info[1];
            }
        });
        logger('BALANCE', `balance => '$${balanceInUSD.toFixed(2)}'`, 'info');

        return balanceInUSD;
    }

    async getRequest(endpoint, data = {}) {
        try {
            const response = await fetch(endpoint, data);
            if (response.ok) {
                const jsonResponse = await response.json();
                return jsonResponse;
            }
            throw new Error("Request failed!");
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
            throw new Error("Request failed!");
        } catch (error) {
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

    async testConnectivity() {
        const response = await this.getRequest(`${this.base}api/v3/ping`);
        logger('TEST-CON', `GET testConnectivity() success`, 'info');

        return response;
    }

    async adjustTimestamp(server) {
        const serverTime = await server;
        const currentTime = new Date().getTime();
        const offset = this.offset(serverTime, currentTime);
        const useServerTime =
            offset < 0 ? serverTime - offset : serverTime + offset;
        // logger('TIMESTAMP', `GET adjustTimestamp() success, => '${useServerTime}'`, 'info');

        return useServerTime;
    }

    async getAccountInfo() {
        try {
            const serverTime = await this.adjustTimestamp(this.getServerTime());
            const query = this.queryString({ timestamp: serverTime });
            const signature = this.signature(query);

            const response = await this.getRequest(
                `${this.base}api/v3/account?${query}&signature=${signature}`,
                {
                    method: "GET",
                    headers: {
                        "X-MBX-APIKEY": this.apiKey,
                        "Content-type": "x-www-form-urlencoded",
                    },
                }
            );
            logger('ACCOUNT', `GET getAccountInfo() success => '${response.permissions}'`, 'info');
            return response;
        } catch (error) {
            logger('ACCOUNT', `GET getAccountInfo() failed => '${error}'`, 'error');
        }
    }

    async testNewOrders(symbol, side, type = "LIMIT", timeInForce = "GTC") {
        const serverTime = await this.adjustTimestamp(this.getServerTime());
        const query = this.queryString({
            symbol: "ETHBTC",
            side: "SELL",
            type: "LIMIT",
            timeInForce: "GTC",
            quantity: 1,
            price: 0.1,
            recvWindow: 5000,
            timestamp: serverTime,
        });
        const sig = this.signature(query);

        const response = await this.postRequest(
            `${this.base}api/v3/order/test?${query}&signature=${sig}`,
            {
                method: "POST",
                headers: {
                    "X-MBX-APIKEY": this.apiKey,
                    "Content-type": "x-www-form-urlencoded",
                },
            }
        );
        return response;
    }

    async getBalances() {
        try {
            const data = await this.getAccountInfo();
            const balances = data.balances
                .map((asset) => asset)
                .filter((value) => +value.free > 0);
            logger('BALANCES', `GET getBalances() success`, 'info');

            return balances;
        } catch (error) {
            logger('BALANCES', `GET getBalances() failed => '${error}'`, 'error');
        }
    }

    async getMarketPrice(symbol = "ETHBTC") {
        const param = typeof symbol === "string" ? "?symbol=" + symbol : "";
        const marketPrice = await this.getRequest(
            `${this.base}api/v3/ticker/price${param}`
        );
        logger('PRICE', `GET getMarketPrice() success, asset => ${marketPrice.symbol}, price => ${marketPrice.price}`, 'info');

        return marketPrice;
    }

    async placeSellOrder(sym, sell = "SELL", orderType = "LIMIT", tif = "GTC") {
        logger('SELL-ORDER', `Attempt to sell: ${sym}`, 'info');

        try {
            const priceInfo = await Promise.all([
                this.priceInUSD(sym),
                this.getBalances(),
                this.getMarketPrice(sym),
                this.adjustTimestamp(this.getServerTime())
            ]);

            // const currentPrice = priceInfo[0];
            const freeCrypto = priceInfo[1][0].free;
            const marketPrice = priceInfo[2].price;
            const serverTime = priceInfo[3];
            let pt = +marketPrice + marketPrice * this.operation.SELL_PROFIT_THRESHOLD;
            // let sl = +marketPrice - (marketPrice * this.operation.SELL_STOP_LOSS_THRESHOLD);

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
            const query = this.queryString(this.order);
            const sig = this.signature(query);

            const response = await this.postRequest(
                `${this.base}api/v3/order?${query}&signature=${sig}`,
                {
                    method: "POST",
                    headers: {
                        "X-MBX-APIKEY": this.apiKey,
                        "Content-type": "x-www-form-urlencoded",
                    },
                }
            );
            logger('SELL-ORDER', `GET placeSellOrder() success, SELL price => '${response.price}'`, 'warning');
            return response.price;
        } catch (error) {
            logger('SELL-ORDER', `GET placeSellOrder() failed => '${error}'`, 'error');
        }
    }

    async placeBuyOrder(sym, buy = "BUY", orderType = "LIMIT", tif = "GTC") {
        logger('BUY-ORDER', `Attempt to buy: ${sym}`, 'info');

        try {
            const priceInfo = await Promise.all([
                this.priceInUSD(sym),
                this.getBalances(),
                this.getMarketPrice(sym),
                this.adjustTimestamp(this.getServerTime())
            ]);

            // const currentPrice = priceInfo[0];
            const freeCrypto = priceInfo[1][1].free;
            const marketPrice = priceInfo[2].price;
            const serverTime = priceInfo[3];
            let pt = +marketPrice - marketPrice * this.operation.BUY_DIP_THRESHOLD;
            // let sl = +marketPrice + (marketPrice * this.operation.BUY_UPWARD_TREND_THRESHOLD);

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
            const query = this.queryString(this.order);
            const sig = this.signature(query);

            const response = await this.postRequest(
                `${this.base}api/v3/order?${query}&signature=${sig}`,
                {
                    method: "POST",
                    headers: {
                        "X-MBX-APIKEY": this.apiKey,
                        "Content-type": "x-www-form-urlencoded",
                    },
                }
            );
            logger('BUY-ORDER', `GET placeBuyOrder() success, BUY price => '${response.price}'`, 'warning');

            return response.price;
        } catch (error) {
            logger('BUY-ORDER', `GET placeBuyOrder() failed => '${error}'`, 'error');
        }
    }

    async cancelOrder(operation) {
        try {
            const openOrders = await operation;
            const serverTime = await this.adjustTimestamp(this.getServerTime());
            const query = this.queryString({
                symbol: openOrders[0].symbol,
                orderId: openOrders[0].orderId,
                recvWindow: 5000,
                timestamp: serverTime,
            });
            const sig = this.signature(query);
            const response = await this.postRequest(
                `${this.base}api/v3/order?${query}&signature=${sig}`,
                {
                    method: "DELETE",
                    headers: {
                        "X-MBX-APIKEY": this.apiKey,
                        "Content-type": "x-www-form-urlencoded",
                    },
                }
            );
            logger('CANCEL-ORDER', `GET cancelOrder() success, orderId => '${query.orderId}'`, 'error');
            return response;
        } catch (error) {
            logger('CANCEL-ORDER', `GET cancelOrder() failed => '${error}'`, 'error');
        }
    }

    async getOperationDetails() {
        try {
            const serverTime = await this.adjustTimestamp(this.getServerTime());
            const query = this.queryString({ recvWindow: 5000, timestamp: serverTime });
            const sig = this.signature(query);

            const response = await this.getRequest(
                `${this.base}api/v3/openOrders?${query}&signature=${sig}`,
                {
                    method: "GET",
                    headers: {
                        "X-MBX-APIKEY": this.apiKey,
                        "Content-type": "x-www-form-urlencoded",
                    },
                }
            );
            logger('ACCOUNT', `GET getOperationDetails() success => '${true}'`, 'info');
            return response;
        } catch (error) {
            logger('OPERATION-DETAILS', `GET getOperationDetails() failed => '${error}'`, 'error');
        }
    }
}

module.exports = Client;

// const client = new Client(config.apiKey, config.apiSecret);

// ##################### TESTING CLASS METHODS #####################

// client.getAccountInfo().then((mp) => console.log(mp));
// client.exchangeInfo().then((mp) => console.log(mp));
// client.getBalances().then((mp) => console.log(mp));
// client.getMarketPrice('ETHBTC').then((mp) => console.log(mp));
// client.testNewOrders().then((mp) => console.log(mp));
// client.priceInUSD("ETHBTC").then((mp) => console.log(mp));

// client.placeSellOrder("ETHBTC").then((mp) => console.log(mp));
// client.placeBuyOrder("ETHBTC").then((mp) => console.log(mp));
// client.cancelOrder(client.getOperationDetails()).then((mp) => console.log(mp));
// client.getOperationDetails().then((mp) => console.log(mp));