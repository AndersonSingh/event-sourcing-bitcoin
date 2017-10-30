"use strict";

class Wallet {
    constructor(wallet_id, wallet_address, init_balance) {
        this.wallet_id = wallet_id;
        this.wallet_address = wallet_address;
        this.balance = parseFloat(init_balance); 
    }
}

module.exports = Wallet;