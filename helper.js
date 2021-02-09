/* eslint-disable no-console */
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

module.exports = { getData, postData, queryString, sleep, offset, killProc, now };
