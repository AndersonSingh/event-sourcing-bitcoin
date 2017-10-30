"use strict";

/* trasfer bitcoins from  user 1 to user 2. */
class TransferBitcoinsEvent {
    constructor(transfer_id, exchange_1_id, account_1_id, wallet_1_id, exchange_2_id, account_2_id, wallet_2_id, transfer_amount) {
    	
        this.transfer_id = transfer_id; 

        this.exchange_1_id = exchange_1_id;
        this.exchange_2_id = exchange_2_id;

        this.account_1_id = account_1_id;
        this.account_2_id = account_2_id;

        this.wallet_1_id = wallet_1_id; 
        this.wallet_2_id = wallet_2_id; 

        this.transfer_amount = transfer_amount;

        this.name = 'TransferBitcoinsEvent';
    }

    process(app_state) {

        console.log('SEnder : ' + app_state['exchanges'][this.exchange_1_id]['accounts'][this.account_1_id]['wallets'][this.wallet_1_id]['balance']);

        app_state['exchanges'][this.exchange_1_id]['accounts'][this.account_1_id]['wallets'][this.wallet_1_id]['balance'] -= parseFloat(this.transfer_amount);
        app_state['exchanges'][this.exchange_2_id]['accounts'][this.account_2_id]['wallets'][this.wallet_2_id]['balance'] += parseFloat(this.transfer_amount);
    }
}

module.exports = TransferBitcoinsEvent;