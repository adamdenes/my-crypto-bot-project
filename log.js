const logger = (operation, msg, severity) => {
    /*
    [BALANCE] USD Balance = 22.15$
    [BUY] Bought 0.002 BTC for 22.15 USD
    [PRICE] Last Operation Price updated to 11,171.40 (BTC/USD)
    [ERROR] Could not perform SELL operation - Insufficient balanc
    */
    const timeInUTC = new Date();
    const localTime = timeInUTC.toISOString().split('T')[0] + 'T' + timeInUTC.toLocaleTimeString();
    console.log(`${localTime} - [${severity.toUpperCase()}]: [${operation.toUpperCase()}] ${msg}`);
};

module.exports = { logger };