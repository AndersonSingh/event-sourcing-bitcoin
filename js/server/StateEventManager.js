"use strict";

const AddExchangeEvent = require('../events/AddExchangeEvent');
const AddAccountEvent = require('../events/AddAccountEvent');
const AddWalletEvent = require('../events/AddWalletEvent');
const TransferBitcoinsEvent = require('../events/TransferBitcoinsEvent');


class StateEventManager {
    constructor(azure, tableService) {

        this.azure = azure; 

        this.tableSvc = tableService;

    	this.app_state = {};
        this.events_list = [];
    }

    get_app_state(){
    	return this.app_state; 
    }

    get_app_events_list(){
        return this.events_list; 
    }

    wipe_app_state(){
    	this.app_state = {};
        this.events_list = [];
    }


    append_event(row_id, event, callback){

        var str_event = JSON.stringify(event);


        var task = {
          PartitionKey: {'_': 'event'},
          RowKey: {'_': row_id},
          EventData: {'_': str_event}
        };

        this.tableSvc.insertEntity('EventStore',task, function (error, result, response) {
          if(!error){
            console.log('pushed event to event store.');
            if(callback) callback();
          }
        });
    }

    process_events(callback){

    	/* we will wipe the entire state and recreate it. */
    	/* maybe replace this with a snapshot implementation in the future. */
    	this.wipe_app_state();

        var query = new this.azure.TableQuery()
        .where('PartitionKey eq ?', 'event');

        var app_state = this.app_state; 

        this.events_list = [];
        
        var events_list = this.events_list; 

        this.tableSvc.queryEntities('EventStore', query, null, function(error, result, response) {
          if(!error) {

            var entries = result['entries'];

            entries.sort(function(x, y){
                return x['RowKey']['_'] - y['RowKey']['_'];
            });


            for(var i = 0; i < entries.length; i++){

                var entry = entries[i].EventData['_']; 

                events_list.push(entry);


                entry = JSON.parse(entry);

                if(entry['name'] == 'AddExchangeEvent'){
                    new AddExchangeEvent(entry['exchange_id'], entry['exchange_name']).process(app_state);
                }
                else if(entry['name'] == 'AddAccountEvent'){
                    new AddAccountEvent(entry['exchange_id'], entry['account_id'],
                        entry['first_name'], entry['last_name']).process(app_state);
                }
                else if(entry['name'] == 'AddWalletEvent'){
                    new AddWalletEvent(
                        entry['exchange_id'], entry['account_id'],
                        entry['wallet_id'], entry['wallet_id'],
                        entry['init_balance']).process(app_state);
                }
                else if(entry['name'] == 'TransferBitcoinsEvent'){
                    new TransferBitcoinsEvent(
                        entry['transfer_id'], entry['exchange_1_id'], 
                        entry['account_1_id'], entry['wallet_1_id'],
                        entry['exchange_2_id'], entry['account_2_id'],
                        entry['wallet_2_id'], entry['transfer_amount']).process(app_state);
                }
            }

            if(callback) callback();

          }

        });

    }
}

module.exports = StateEventManager;