"use strict";

const Account = require('../models/Account');

class AddAccountEvent {
    constructor(exchange_id, account_id, first_name, last_name) {
    	this.exchange_id = exchange_id; 
        this.account_id = account_id;
        this.first_name = first_name;
        this.last_name = last_name;  
        this.name = 'AddAccountEvent';
    }

    process(app_state) {
        app_state['exchanges'][this.exchange_id]['accounts'][this.account_id] = new Account(this.account_id, this.first_name, this.last_name);
    }
}

module.exports = AddAccountEvent;