const config = require('./config.json');
const helper = require('./helper.js');
const fetch = require('node-fetch');
const crypto = require('crypto');

const base = 'https://api.binance.com/';


class Client {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.serverTime = this.checkServerTime();
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

    signature(query) {
        return crypto.createHmac('sha256', this.apiSecret).update('timestamp=' + query).digest('hex');
    }

    async checkServerTime() {
        try {
            const response = await fetch(base + 'api/v3/time');
            if (response.ok) {
                const jsonResponse = await response.json();
                return jsonResponse.serverTime;
            }
            throw new Error('Request failed!');
        } catch (error) {
            console.log(error);
        }
    }

    async exchangeInfo() {
        try {
            const response = await fetch(base + 'api/v3/exchangeInfo');
            if (response.ok) {
                const jsonResponse = await response.json();
                return jsonResponse;
            }
            throw new Error('Request failed!');
        } catch (error) {
            console.log(error);
        }
    }

    async testConnectivity() {
        try {
            const response = await fetch(base + 'api/v3/ping');
            if (response.ok) {
                const jsonResponse = await response.json();
                return jsonResponse;
            }
            throw new Error('Request failed!');
        } catch (error) {
            console.log(error);
        }
    }

    offset(server, date) {
        return server - date;
    }
}

const client = new Client(config.apiKey, config.apiSecret);

async function getAccountInfo() {
    try {
        const serverTime = await client.serverTime;
        const currentTime = new Date().getTime();
        const offset = client.offset(serverTime, currentTime);
        const useServerTime = offset < 0 ? serverTime - offset : serverTime + offset;
        const signature = client.signature(useServerTime);
        
        const response = await fetch(base + 'api/v3/account' + '?' + 'timestamp=' + useServerTime + '&signature=' + signature, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': client.apiKey,
                'Content-type': 'x-www-form-urlencoded'
            }
        });
        const jsonResponse = await response.json();
        
        if (response.ok) {
            console.log(jsonResponse)
            return jsonResponse;
        }
        throw new Error('Request failed!');
    } catch (error) {
        console.log(error);
    }
}

getAccountInfo();

const operation = {
    _BUY: 0,
    _SELL: 1,
    BUY_DIP_THRESHOLD: 0.02,            // buy if price decreased more than TH
    BUY_UPWARD_TREND_THRESHOLD: 0.02,   // buy if price increased more than TH
    SELL_PROFIT_THRESHOLD: 0.02,        // sell if price increased above TH
    SELL_STOP_LOSS_THRESHOLD: 0.02,     // stop loss

    get BUY() {
        return this._BUY;
    },

    get SELL() {
        return this._SELL;
    }
};

const getBalances = () => {
    // TODO: GET request to exchange API for your account's balances
    // RETURN: balances

};

const getMarketPrice = () => {
    // TODO: GET request to exchange API for current price of the asset
    // RETURN: market price

};

const placeSellOrder = () => {
    // TODO:
    //  1. Calculate the amount to sell (based on some threshold
    //     you set e.g. 50% of total balance)
    //  2. Send a POST request to exchange API to do a SELL operation
    // RETURN: price at operation execution

};

const placeBuyOrder = () => {
    // TODO:
    //  1. Calculate the amount to buy (based on some threshold
    //     you set e.g. 50% of total balance)
    //  2. Send a POST request to exchange API to do a BUY operation
    // RETURN: price at operation execution

};

const getOperationDetails = (operationId) => {
    // TODO: GET request to API for the details of an operation
    // RETURN: details of the operation

};