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
// testBot.deleteWebhook(config.webhook).then((r) => console.log(r));
testBot.setWebhook(config.webhook).then((r) => console.log(r));
// testBot.getWebhookInfo().then((r) => console.log(r));

app.use(bodyParser.json());

app.post('/hook', (req, res) => {
    // console.log(req.body);
    const chatId = req.body.message.chat.id;
    const msg = req.body.message.text || req.body.message.sticker.emoji;
    console.log(`chat_id: ${chatId}, text: ${msg}`);

    testBot.replyKeyboard = {
        keyboard: [['/hello', '/start', '/stop', '/status']],
        resize_keyboard: true,
        one_time_keyboard: false,
        force_reply: true,
    };

    testBot.sendMessage(chatId, '', testBot.replyKeyboard).catch((error) => res.send(error));

    if (!msg.startsWith('/')) {
        res.status(200).send({});
    } else if (msg.match(/\/hello/gi)) {
        testBot
            .sendMessage(chatId, 'Hi! 👋', {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    } else if (msg.match(/\/start/gi)) {
        testBot
            .sendMessage(chatId, 'Start trading! ✅', {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    } else if (msg.match(/\/stop/gi)) {
        testBot
            .sendMessage(chatId, 'Stop trading! ❌', {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    } else if (msg.match(/\/status/gi)) {
        testBot
            .sendMessage(chatId, 'Current status! ❓', {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    } else {
        testBot
            .sendMessage(chatId, 'Unknown command... 😕', {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
