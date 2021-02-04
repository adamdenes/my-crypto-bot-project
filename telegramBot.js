const fetch = require('node-fetch');
const { getData, postData, queryString } = require('./helper.js');

class Bot {
    constructor(token, url) {
        this.token = token;
        this.url = url;
    }

    get token() {
        return this._token;
    }

    set token(newToken) {
        if (!newToken instanceof String) {
            console.log(`Expected string, got ${typeof newToken}`);
        } else {
            this._token = newToken;
        }
    }

    get url() {
        return this._url;
    }

    set url(newUrl) {
        this._url = newUrl;
    }

    async getMe() {
        const response = await getData(`${this.url + this.token}/getMe`);
        return response;
    }

    async getUpdates() {
        const response = await getData(`${this.url + this.token}/getUpdates`);
        return response;
    }

    async getWebhookInfo(hook) {
        const query = queryString({ url: hook });
        const response = await getData(`${this.url + this.token}/getWebhookInfo?${query}`);
        return response;
    }

    async setWebhook(hook) {
        const query = queryString({ url: hook });
        const response = await postData(`${this.url + this.token}/setWebhook?${query}`);
        return response;
    }

    async sendMessage(chatId, text, reply_markup = {}) {
        try {
            const response = await fetch(`${this.url + this.token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: text, reply_markup: reply_markup})
            });
            
            if (response.ok) {
                const jsonString = response.json();
                return jsonString;
            }
        } catch (error) {
            console.log(error);  
        }
    }
}

module.exports = Bot;
