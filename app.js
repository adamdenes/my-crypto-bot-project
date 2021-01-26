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

const getOperationDetails = operationId => {
    // TODO: GET request to API for the details of an operation
    // RETURN: details of the operation

};