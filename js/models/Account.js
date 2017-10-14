"use strict";

class Account {
    constructor(account_id, first_name, last_name) {
        this.account_id = account_id;
        this.first_name = first_name; 
        this.last_name = last_name; 
        this.wallets = {};
    }
}

module.exports = Account;