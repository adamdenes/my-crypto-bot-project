const { getData, postData, queryString } = require('./helper.js');
const config = require('./config.json');
const fetch = require('node-fetch');

// Express initialization
const express = require('express');

const app = express();
const bodyParser = require('body-parser');

const port = 80;
const url = `https://api.telegram.org/bot${config.telegramToken}/`;

// Functions to test telegram API
const getMe = async () => {
    const response = await getData(`${url}getMe`);
    return response;
};

const getUpdates = async () => {
    const response = await getData(`${url}getUpdates`);
    return response.result.map((e) => e);
};

const setWebhook = async () => {
    const query = queryString({ url: config.webhook });
    const response = await postData(`${url}setWebhook?${query}`);
    return response;
};

// getMe().then(r => console.log(r));
// getUpdates().then(r => console.log(r));

// Set the webhook
setWebhook();

app.use(bodyParser.json());

app.post('/', (req, res) => {
    // console.log(req.body);
    const chatId = req.body.message.chat.id;
    // console.log(chatId)
    const msg = req.body.message.text;
    console.log(msg);
    if (msg.match(/\/hello/gi)) {
        const response = fetch(`${url}sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: 'Hi! 👋”' }),
        });

        res.status(200).send(response);
    } else if (!msg.includes('/')) {
        res.status(200).send({});
    } else {
        const response = fetch(`${url}sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: 'Unknown command... 😕' }),
        });

        res.status(200).send(response);
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
