/* eslint-disable no-console */
const { fork } = require('child_process');
const express = require('express');

const app = express();
const bodyParser = require('body-parser');

const Bot = require('./telegramBot.js');
const config = require('../config.json');
const { logger } = require('../log.js');

const port = 16666;
const url = 'https://api.telegram.org/bot';

const testBot = new Bot(config.telegramToken, url);
// testBot.getMe().then(r => console.log(r));
// testBot.getUpdates().then(r => console.log(r));
// testBot.deleteWebhook(config.webhook);
testBot.setWebhook(config.webhook);
testBot.getWebhookInfo().then((r) => console.log(r));
let procPid = 0;

app.use(bodyParser.json());

app.post('/hook', (req, res) => {
    // console.log(req.body);
    let chatId = null;
    let msg = null;

    // Handle messages when they stuck in 'edited' state...
    if (req.body.message === undefined) {
        chatId = req.body.edited_message.chat.id;
        msg = req.body.edited_message.text || req.body.edited_message.sticker.emoji;
    } else {
        chatId = req.body.message.chat.id;
        msg = req.body.message.text || req.body.message.sticker.emoji;
    }

    console.log(`chat_id: ${chatId}, text: ${msg}`);

    testBot.replyKeyboard = {
        keyboard: [['/hello'], ['/start', '/stop'], ['/status', '/balance']],
        resize_keyboard: true,
        one_time_keyboard: false,
        force_reply: true,
    };

    testBot.sendMessage(chatId, '', testBot.replyKeyboard).catch((error) => res.send(error));

    if (!msg.startsWith('/')) {
        res.status(200).send({});
    } else if (msg.match(/\/hello/gi)) {
        testBot
            .sendMessage(chatId, `Hi, @${req.body.message.chat.username} 👋`, {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    } else if (msg.match(/\/start/gi)) {
        testBot
            .sendMessage(chatId, 'Start trading! ✅', testBot.replyKeyboard)
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));

        // Start the application in a different process
        const start = fork(`${__dirname}/../main.js`, { silent: true });
        // console.log(`Forked start process PID: ${start.pid}`);

        start.on('exit', (code) => {
            // console.log(`Child process 'START' exited with code ${code}`);
            logger('PARENT', `Child process 'START' exited with code ${code}`, 'telegram');
        });

        start.on('message', (message) => {
            // console.log(`PARENT: message from child: my PID is '${message}'`);
            logger('PARENT', `PARENT: message from child: my PID is '${message}'`, 'telegram');
            procPid = message;
        });

        start.send({ cmd: 'START' });

        // start.stdout.on('data', (data) => {
        //     console.log(`startBot() : ${data}`);
        // });
    } else if (msg.match(/\/stop/gi)) {
        // Stop the application in a different process
        const stop = fork(`${__dirname}/../main.js`, { silent: true });
        // console.log(`Forked stop process PID: ${stop.pid}`);

        stop.on('exit', (code) => {
            // console.log(`Child process 'STOP' exited with code ${code}`);
            logger('PARENT', `Child process 'STOP' exited with code ${code}`, 'telegram');
        });

        stop.on('message', (message) => {
            // console.log(`PARENT: message from child: '${message}'`);
            logger('PARENT', `PARENT: message from child: '${message}'`, 'telegram');
        });

        stop.send({ cmd: 'STOP', pid: procPid });

        // stop.stdout.on('data', (data) => {
        //     console.log(`stopBot() : ${data}`);
        // });
        testBot
            .sendMessage(chatId, 'Stop trading! ❌', testBot.replyKeyboard)
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    } else if (msg.match(/\/status/gi)) {
        const status = fork(`${__dirname}/../main.js`, { silent: true });
        // console.log(`Forked status process PID: ${status.pid}`);

        status.on('exit', (code) => {
            // console.log(`Child process 'STATUS' exited with code ${code}`);
            logger('PARENT', `Child process 'STATUS' exited with code ${code}`, 'telegram');
        });

        status.on('message', (message) => {
            if (message === undefined) status.kill('SIGKILL');
            // console.log(`PARENT: message from child: '${message.side}'`);
            logger('PARENT', `PARENT: message from child: '${message.side}'`, 'telegram');

            const displayMsg = `<pre>----------------------\nSymbol  :   ${message.symbol}\nPrice   :   ${Number(
                message.price
            ).toFixed(2)}\nQuantity:   ${message.origQty}\nOrderId :   ${message.orderId}\nSide    :   ${
                message.side
            }</pre>`.trim();
            testBot
                .sendMessage(chatId, displayMsg, testBot.replyKeyboard, 'HTML')
                .then((r) => res.status(200).send(r))
                .catch((error) => res.send(error));
        });

        status.send({ cmd: 'STATUS' });

        // status.stdout.on('data', (data) => {
        //     console.log(`getOperationDetails() : ${data}`);
        // });
    } else if (msg.match(/\/balance/gi)) {
        const balance = fork(`${__dirname}/../main.js`, { silent: true });
        // console.log(`Forked balance process PID: ${balance.pid}`);

        balance.on('exit', (code) => {
            // console.log(`Child process 'BALANCE' exited with code ${code}`);
            logger('PARENT', `Child process 'BALANCE' exited with code ${code}`, 'telegram');
        });

        balance.on('message', (message) => {
            // console.log(`PARENT: message from child: '${message}'`);
            logger('PARENT', `PARENT: message from child: '${message}'`, 'telegram');

            const displayMsg = `Balance: $${Number(message).toFixed(2)}💰`;
            testBot
                .sendMessage(chatId, displayMsg, testBot.replyKeyboard, 'HTML')
                .then((r) => res.status(200).send(r))
                .catch((error) => res.send(error));
        });

        balance.send({ cmd: 'BALANCE' });
    } else {
        testBot
            .sendMessage(chatId, 'Unknown command... 😕', testBot.replyKeyboard)
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
