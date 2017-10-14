"use strict";

class Exchange {
    constructor(exchange_id, exchange_name) {
    	this.exchange_id = exchange_id;
    	this.exchange_name = exchange_name;
    	this.accounts = {};
    }
}

module.exports = Exchange;