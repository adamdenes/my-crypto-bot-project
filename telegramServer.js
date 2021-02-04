const express = require('express');

const app = express();
const bodyParser = require('body-parser');

const Bot = require('./telegramBot.js');
const config = require('./config.json');

const port = 16666;
const url = 'https://api.telegram.org/bot';

const testBot = new Bot(config.telegramToken, url);

// testBot.getMe().then(r => console.log(r));
// testBot.getUpdates().then(r => console.log(r));
// testBot.setWebhook(config.webhook).then((r)=> console.log(r));
// testBot.getWebhookInfo().then(r => console.log(r));

app.use(bodyParser.json());

app.post('/hook', (req, res) => {
    // console.log(req.body);
    const chatId = req.body.message.chat.id;
    // console.log(chatId)
    const msg = req.body.message.text;
    console.log(msg);

    if (msg.match(/\/hello/gi)) {
        testBot.sendMessage(chatId, 'Hi! 👋”', {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    } else if (!msg.includes('/')) {
        res.status(200).send({});
    } else {
        testBot.sendMessage(chatId, 'Unknown command... 😕', {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
