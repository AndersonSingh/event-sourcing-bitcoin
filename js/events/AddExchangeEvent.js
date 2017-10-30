"use strict";

const Exchange = require('../models/Exchange');

class AddExchangeEvent {
    constructor(exchange_id, exchange_name) {
        this.exchange_id = exchange_id;
        this.exchange_name = exchange_name;
        this.name = 'AddExchangeEvent';
    }

    process(app_state) {

    	console.log('sds');
    	console.log(this);

        if(app_state['exchanges'] == undefined) app_state['exchanges'] = {};

        app_state['exchanges'][this.exchange_id] = new Exchange(this.exchange_id, this.exchange_name);
    }
}

module.exports = AddExchangeEvent;