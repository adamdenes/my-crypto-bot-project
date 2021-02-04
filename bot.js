const { getData, postData, queryString } = require('./helper.js');
const config = require('./config.json');

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = 80;
const url = `https://api.telegram.org/bot${config.telegramToken}/`

const getMe = async () => {
    const response = await getData(url + 'getMe');
    return response;
};

const getUpdates = async () => {
    const response = await getData(url + 'getUpdates');
    return response.result.map(e => e);
};

const setWebhook = async () => {
    const query = queryString({ url: config.webhook });
    const response = await postData(url + 'setWebhook?' + query);
    return response;
}

// getMe().then(r => console.log(r));
// getUpdates().then(r => console.log(r));
// setWebhook().then(r => console.log(r));

// app.use(bodyParser.json());

// app.post('/', (req, res) => {
//     console.log(req.body);
//     const chatId = req.body.message.chat.id;
//     console.log(chatId)
//     res.send(req.body);
// });

// app.listen(port, () => {
//     console.log(`Listening on port ${port}`);
// });