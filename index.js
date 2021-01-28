const config = require("./config.json");
const helper = require("./helper.js");
const fetch = require("node-fetch");
const crypto = require("crypto");

const base = "https://api.binance.com/";

class Client {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.serverTime = 0;
        this.order = {} // for options see helper.js
        this.operation = {
            BUY: 0,
            SELL: 1,
            BUY_DIP_THRESHOLD: 0.02, // buy if price decreased more than TH
            BUY_UPWARD_TREND_THRESHOLD: 0.01, // buy if price increased more than TH
            SELL_PROFIT_THRESHOLD: 0.02, // sell if price increased above TH
            SELL_STOP_LOSS_THRESHOLD: 0.01, // stop loss
        }
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
        return Object.keys(obj).reduce((a, k) => {
            if (obj[k] !== undefined) {
                a.push(k + '=' + encodeURIComponent(obj[k]))
            }
            return a;
        }, []).join('&');
    }

    async priceInUSD(cryptoPriceInBTC, cryptoPriceInUSDT) {
        const currentPrices = await Promise.all([
            this.getMarketPrice(cryptoPriceInBTC),
            this.getMarketPrice(cryptoPriceInUSDT)
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
        const response = await this.getRequest(`${base}api/v3/time`);
        return response.serverTime;
    }

    async exchangeInfo() {
        const response = await this.getRequest(`${base}api/v3/exchangeInfo`);
        return response;
    }

    async testConnectivity() {
        const response = await this.getRequest(`${base}api/v3/ping`);
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

        const response = await this.getRequest(`${base}api/v3/account?${query}&signature=${signature}`,
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

        const response = await this.postRequest(`${base}api/v3/order/test?${query}&signature=${sig}`,
            {
                method: 'POST',
                headers: {
                    "X-MBX-APIKEY": this.apiKey,
                    "Content-type": "x-www-form-urlencoded",
                },
            });

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
            `${base}api/v3/ticker/price${param}`
        );
        return marketPrice;
    }

    async placeSellOrder(sym, sell = "SELL", orderType = "LIMIT", tif = "GTC") {
        // TODO:
        //  1. Calculate the amount to sell (based on some threshold
        //     you set e.g. 50% of total balance)
        const priceInfo = await Promise.all([
            this.priceInUSD("ETHBTC", "BTCUSDT"),
            this.getBalances(),
            this.getMarketPrice()
        ]);

        const currentPrice = priceInfo[0];
        const freeCrypto = priceInfo[1][0].free;
        const marketPrice = priceInfo[2].price;
        let pt = +marketPrice + (marketPrice * this.operation.SELL_PROFIT_THRESHOLD);
        let sl = +marketPrice - (marketPrice * this.operation.SELL_STOP_LOSS_THRESHOLD);
        // console.log('current price in USD: ' + currentPrice)
        // console.log('marketprice: ' + marketPrice)
        // console.log('available for trading ETH: ' + freeCrypto)
        // console.log('sell 2% of available: ' + freeCrypto * 0.02)
        // console.log(`sell if marketprice * sellTH reached: ' + ${pt.toFixed(6)}`)
        // console.log(`set stop loss if marketprice * sell_SL_TH reached: ' + ${sl.toFixed(3)}`)

        //  2. Send a POST request to exchange API to do a SELL operation
        const serverTime = await this.adjustTimestamp(this.getServerTime());
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

        const response = await this.postRequest(`${base}api/v3/order?${query}&signature=${sig}`,
        {
            method: 'POST',
            headers: {
                "X-MBX-APIKEY": this.apiKey,
                "Content-type": "x-www-form-urlencoded",
            },
        });

        console.log(response);
        return response.price;
        // RETURN: price at operation execution
    }

    async placeBuyOrder() {
        // TODO:
        //  1. Calculate the amount to buy (based on some threshold
        //     you set e.g. 50% of total balance)

        // calculateBuy()

        //  2. Send a POST request to exchange API to do a BUY operation
        // RETURN: price at operation execution
    }

    async getOperationDetails(operationId = "ETHBTC") {
        const serverTime = await this.adjustTimestamp(this.getServerTime());
        const query = this.queryString({ symbol: operationId, recvWindow: 5000, timestamp: serverTime });
        const sig = this.signature(query);

        // TODO: GET request to API for the details of an operation (operationId / orderId ???)
        const response = await this.getRequest(`${base}api/v3/openOrders?${query}&signature=${sig}`,
            {
                method: 'GET',
                headers: {
                    "X-MBX-APIKEY": this.apiKey,
                    "Content-type": "x-www-form-urlencoded",
                },
            });
        return response;
    }
}

const client = new Client(config.apiKey, config.apiSecret);
// client.getAccountInfo().then((mp) => console.log(mp));
// client.exchangeInfo().then((mp) => console.log(mp));
// client.getBalances().then((mp) => console.log(mp));
// client.getMarketPrice('ETHBTC').then((mp) => console.log(mp));
// client.testNewOrders().then((mp) => console.log(mp));
// client.getOperationDetails("ETHBTC").then((mp) => console.log(mp));
// client.priceInUSD("ETHBTC", "BTCUSDT").then((mp) => console.log(mp));

client.placeSellOrder("ETHBTC").then((mp) => console.log(mp));
