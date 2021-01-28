const fetch = require("node-fetch");
const crypto = require("crypto");


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
        const currentPrices = await Promise.all([
            this.getMarketPrice(cryptoPriceInQuote),
            this.getMarketPrice(cryptoPriceInQuote.slice(3) + "USDT"),
        ]);
        return currentPrices.reduce((acc, cp) => acc.price * cp.price);
    }

    async getRequest(endpoint, data = {}) {
        try {
            const response = await fetch(endpoint, data);
            // console.log(response)
            if (response.ok) {
                const jsonResponse = await response.json();
                return jsonResponse;
            }
            throw new Error("Request failed!");
        } catch (error) {
            console.log(error);
        }
    }

    async postRequest(endpoint, data) {
        try {
            const response = await fetch(endpoint, data);
            // console.log(response);
            if (response.ok) {
                const jsonResponse = await response.json();
                return jsonResponse;
            }
            throw new Error("Request failed!");
        } catch (error) {
            console.log(error);
        }
    }

    async getServerTime() {
        const response = await this.getRequest(`${this.base}api/v3/time`);
        return response.serverTime;
    }

    async exchangeInfo() {
        const response = await this.getRequest(`${this.base}api/v3/exchangeInfo`);
        return response;
    }

    async testConnectivity() {
        const response = await this.getRequest(`${this.base}api/v3/ping`);
        return response;
    }

    async adjustTimestamp(server) {
        const serverTime = await server;
        const currentTime = new Date().getTime();
        const offset = this.offset(serverTime, currentTime);
        const useServerTime =
            offset < 0 ? serverTime - offset : serverTime + offset;
        return useServerTime;
    }

    async getAccountInfo() {
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
        return response;
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
        const data = await this.getAccountInfo();
        const balances = data.balances
            .map((asset) => asset)
            .filter((value) => +value.free > 0);
        return balances;
    }

    async getMarketPrice(symbol = "ETHBTC") {
        const param = typeof symbol === "string" ? "?symbol=" + symbol : "";
        const marketPrice = await this.getRequest(
            `${this.base}api/v3/ticker/price${param}`
        );
        return marketPrice;
    }

    async placeSellOrder(sym, sell = "SELL", orderType = "LIMIT", tif = "GTC") {
        console.log('ATTEMPT TO SELL .....')
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
        console.log(response.price);
        return response.price;
    }

    async placeBuyOrder(sym, buy = "BUY", orderType = "LIMIT", tif = "GTC") {
        console.log('ATTEMPT TO BUY .....')
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
        console.log(response.price);
        return response.price;
    }

    async cancelOrder(operation) {
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
        return response;
    }

    async getOperationDetails() {
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
        return response;
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