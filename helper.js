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

module.exports = { getData, postData, queryString, sleep, offset };
