const Client = require("./index")
const config = require("./config.json");


const binance = new Client(config.apiKey, config.apiSecret);
console.log(binance.apiKey)