"use strict";

const Wallet = require('../models/Wallet');

class AddWalletEvent {
    constructor(exchange_id, account_id, wallet_id, wallet_address, init_balance) {
    	this.exchange_id = exchange_id; 
        this.account_id = account_id;

        this.init_balance = init_balance;
        this.wallet_id = wallet_id; 
        this.wallet_address = wallet_address; 

        this.name = 'AddWalletEvent';
    }

    process(app_state) {
        app_state['exchanges'][this.exchange_id]['accounts'][this.account_id]['wallets'][this.wallet_id] = new Wallet(this.wallet_id, this.wallet_address, this.init_balance);

    }
}

module.exports = AddWalletEvent;