/* eslint-disable no-console */
const fs = require('fs');
const fetch = require('node-fetch');

// async ... await GET
const getData = async (url, data = {}) => {
    try {
        const response = await fetch(url, data);
        if (response.ok) {
            const jsonResponse = await response.json();
            return jsonResponse;
        }
        throw new Error('Request failed!');
    } catch (error) {
        console.log(error);
    }
};

// async ... await POST
const postData = async (url, data) => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (response.ok) {
            const jsonResponse = await response.json();
            return jsonResponse;
        }
        throw new Error('Request failed!');
    } catch (error) {
        console.log(error);
    }
};

// make query string
const queryString = (obj) =>
    Object.keys(obj)
        .reduce((a, k) => {
            if (obj[k] !== undefined) {
                a.push(`${k}=${encodeURIComponent(obj[k])}`);
            }
            return a;
        }, [])
        .join('&');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const offset = (server, date) => server - date;

const killProc = () => {
    console.log(`Process exit ${process.pid}`);
    process.exit(0);
};

const now = (time, interval) => {
    // 1m: new Date() - (1000 * 60)
    // 3m: new Date() - (1000 * 60 * 3)
    // 5m: new Date() - (1000 * 60 * 5)
    // 15m: new Date() - (1000 * 60 * 15)
    // 1h: new Date() - (1000 * 60 * 60)
    // 4h: new Date() - (1000 * 60 * 60 * 4)
    // 1d: new Date() - (1000 * 60 * 60 * 24)
    const number = interval.substring(0, interval.length - 1);
    const letter = interval.substring(interval.length - 1);

    switch (letter) {
        case 'm':
            return time - 1000 * 60 * parseInt(number);
        case 'h':
            return time - 1000 * 60 * 60 * parseInt(number);
        case 'd':
            return time - 1000 * 60 * 60 * 24 * parseInt(number);
        case 'w':
            return time - 1000 * 60 * 60 * 24 * 7 * parseInt(number);
        default:
            break;
    }
};

const convertMarketData = (source) => {
    // OHLCV data conversion + date
    if (Array.isArray(source)) {
        return {
            time: source.map((t) => t[0]),
            open: source.map((o) => o[1]),
            high: source.map((h) => h[2]),
            low: source.map((l) => l[3]),
            close: source.map((c) => c[4]),
            volume: source.map((v) => v[5]),
        };
    }
    // For true Object converison in case convertArrToJson() is used!
    return {
        time: Object.values(source).map((t) => (t.openTime ? t.openTime : t.O)),
        open: Object.values(source).map((o) => (o.open ? o.open : o.o)),
        high: Object.values(source).map((h) => (h.high ? h.high : h.h)),
        low: Object.values(source).map((l) => (l.low ? l.low : l.l)),
        close: Object.values(source).map((c) => (c.close ? c.close : c.c)),
        volume: Object.values(source).map((v) => (v.volume ? v.volume : v.v)),
    };
};

const readMarketData = async (json) => {
    const fileContent = await new Promise((resolve, reject) =>
        fs.readFile(json, (err, data) => {
            if (err) {
                return reject(err);
            }
            return resolve(data);
        })
    );
    const content = JSON.parse(fileContent);
    return convertMarketData(content);
};

module.exports = { getData, postData, queryString, sleep, offset, killProc, now, convertMarketData, readMarketData };
