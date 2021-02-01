// async ... await GET
const getData = async () => {
    try {
        const response = await fetch("https://api-to-call.com/endpoint");
        if (response.ok) {
            const jsonResponse = await response.json();
            return jsonResponse;
        }
        throw new Error("Request failed!");
    } catch (error) {
        console.log(error);
    }
};

// async ... await POST
const postData = async () => {
    try {
        const response = await fetch("https://api-to-call.com/endpoint", {
            method: "POST",
            body: JSON.stringify({ id: 200 }),
        });

        if (response.ok) {
            const jsonResponse = await response.json();
            return jsonResponse;
        }
        throw new Error("Request failed!");
    } catch (error) {
        console.log(error);
    }
};

// make query string
const queryString = (obj) => {
    return Object.keys(obj).reduce((a, k) => { 
        if (obj[k] !== undefined) {
            a.push(k + '=' + encodeURIComponent(obj[k]))
        } 
        return a 
    }, []).join( '&' );
}

/** REPRESENTATION OF ORDER OBJECT
 * 
 *      this.order = {
 *           symbol: symbol,
            side: side,
            type: [
                "LIMIT", 
                "MARKET", 
                "STOP_LOSS", 
                "STOP_LOSS_LIMIT", 
                "TAKE_PROFIT", 
                "TAKE_PROFIT_LIMIT",
                "LIMIT_MAKER"
            ],
            timeInForce: timeInForce,
            quantity: quantity,
            quoteOrderQty: quoteOrderQty,
            price: price,
            newClientOrderId: newClientOrderId,
            stopPrice: stopPrice,
            icebergQty: icebergQty,
            newOrderRespType: ["ACK", "RESULT", "FULL"],
            recvWindow: 0,
            timestamp: timestamp
        }
 */

// const operation = {
//     _BUY: 0,
//     _SELL: 1,
//     BUY_DIP_THRESHOLD: 0.02, // buy if price decreased more than TH
//     BUY_UPWARD_TREND_THRESHOLD: 0.02, // buy if price increased more than TH
//     SELL_PROFIT_THRESHOLD: 0.02, // sell if price increased above TH
//     SELL_STOP_LOSS_THRESHOLD: 0.02, // stop loss

//     get BUY() {
//         return this._BUY;
//     },

//     get SELL() {
//         return this._SELL;
//     },
// };