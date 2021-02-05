/* eslint-disable no-console */
const { fork } = require('child_process');
const express = require('express');

const app = express();
const bodyParser = require('body-parser');

const Bot = require('./telegramBot.js');
const config = require('./config.json');
const { logger } = require('./log.js');

const port = 16666;
const url = 'https://api.telegram.org/bot';

const testBot = new Bot(config.telegramToken, url);
// testBot.getMe().then(r => console.log(r));
// testBot.getUpdates().then(r => console.log(r));
// testBot.deleteWebhook(config.webhook).then((r) => console.log(r));
testBot.setWebhook(config.webhook);
// testBot.getWebhookInfo().then((r) => console.log(r));
let procPid = 0;

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
            .sendMessage(chatId, `Hi, @${req.body.message.chat.username} 👋`, {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));
    } else if (msg.match(/\/start/gi)) {
        testBot
            .sendMessage(chatId, 'Start trading! ✅', {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));

        // Start the application in a different process
        const start = fork(`${__dirname}/main.js`, { silent: true });

        start.on('exit', (code) => {
            console.log(`Child process exited with code ${code}`);
            logger('PARENT', `Child process exited with code ${code}`, 'telegram');
        });

        start.on('message', (message) => {
            console.log(`PARENT: message from child: ${message}`);
            logger('PARENT', `PARENT: message from child: ${message}`, 'telegram');
            procPid = message;
        });

        start.send({ cmd: 'START' });

        start.stdout.on('data', (data) => {
            console.log(`startBot() : ${data}`);
        });

        // const start = spawn('node', ['args.js', '--start']);
        // console.log(`Spawned child pid: ${start.pid}`);

        // start.stdout.on('data', (data) => {
        //     console.log(`stdout: ${data}`);
        // });

        // start.stderr.on('data', (data) => {
        //     console.error(`stderr: ${data}`);
        // });

        // start.on('error', (error) => {
        //     console.error(`error: ${error.message}`);
        // });

        // start.on('close', (code) => {
        //     console.log(`child process exited with code ${code}`);
        // });

        // exec('node args.js --start', (error, stdout, stderr) => {
        //     if (error) {
        //         console.error(`error: ${error.message}`);
        //         return;
        //     }

        //     if (stderr) {
        //         console.error(`stderr: ${stderr}`);
        //         return;
        //     }

        //     console.log(`stdout:\n${stdout}`);
        // });
    } else if (msg.match(/\/stop/gi)) {
        testBot
            .sendMessage(chatId, 'Stop trading! ❌', {})
            .then((r) => res.status(200).send(r))
            .catch((error) => res.send(error));

        // Stop the application in a different process
        const stop = fork(`${__dirname}/main.js`, { silent: true });

        stop.on('exit', (code) => {
            console.log(`Child process exited with code ${code}`);
            logger('PARENT', `Child process exited with code ${code}`, 'telegram');
        });

        stop.on('message', (message) => {
            console.log(`PARENT: message from child: ${message}`);
            logger('PARENT', `PARENT: message from child: ${message}`, 'telegram');
        });

        stop.send({ cmd: 'STOP', pid: procPid });
        stop.stdout.on('data', (data) => {
            console.log(`stopBot() : ${data}`);
        });
        // const stop = spawn('node', ['args.js', '--stop']);
        // console.log(`Spawned child pid: ${stop.pid}`);

        // stop.stdout.on('data', (data) => {
        //     console.log(`stdout: ${data}`);
        // });

        // stop.stderr.on('data', (data) => {
        //     console.error(`stderr: ${data}`);
        // });

        // stop.on('error', (error) => {
        //     console.error(`error: ${error.message}`);
        // });

        // stop.on('close', (code) => {
        //     console.log(`child process exited with code ${code}`);
        // });

        // exec('node args.js --stop', (error, stdout, stderr) => {
        //     if (error) {
        //         console.error(`error: ${error.message}`);
        //         return;
        //     }

        //     if (stderr) {
        //         console.error(`stderr: ${stderr}`);
        //         return;
        //     }

        //     console.log(`stdout:\n${stdout}`);
        // });
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
