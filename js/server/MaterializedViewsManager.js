"use strict";

class MaterializedViewsManager {

    constructor(azure) {

        this.azure = azure;

        this.tableSvc = this.azure.createTableService();

        /* create table for exchange accounts summary. */
        this.tableSvc.createTableIfNotExists('ViewsExchangeAccounts', function(error, result, response){
          if(!error){
            console.log('created ViewsExchangeAccounts table or it has been created already.');
          }
        });
    }


    update_view_account_summary(exchange_id, account_id, first_name, last_name, balance){

        var task = {
          PartitionKey: {'_': exchange_id},
          RowKey: {'_': account_id},
          FirstName : {'_': first_name},
          LastName : {'_': last_name},
          Balance: {'_': balance}
        }; 

        this.tableSvc.insertOrReplaceEntity('ViewsExchangeAccounts',task, function (error, result, response) {
          if(!error){
            console.log('updated materialized view.');
          }
          else{
            console.log(error);
          }
        });

    }

    get_view_exchange_accounts_summary(exchange_id, callback){

        var query = new this.azure.TableQuery()
          .where('PartitionKey eq ?', exchange_id);


        this.tableSvc.queryEntities('ViewsExchangeAccounts',query, null, function(error, result, response) {
          if(!error) {
            callback(result);
          }
        });

    }

}

module.exports = MaterializedViewsManager;