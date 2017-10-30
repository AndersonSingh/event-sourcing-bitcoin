
var express = require("express");
var app = express();
var router = express.Router();
var path = __dirname + '/views/';


var server = app.listen(process.env.PORT || 3000, function(){
	console.log("Bitcoin Trading Platform is running.\n");
});

var io = require('socket.io').listen(server);



const uuidv1 = require('uuid/v1');

const AddExchangeEvent = require('./js/events/AddExchangeEvent');
const AddAccountEvent = require('./js/events/AddAccountEvent');
const AddWalletEvent = require('./js/events/AddWalletEvent');
const TransferBitcoinsEvent = require('./js/events/TransferBitcoinsEvent');

const StateEventManager = require('./js/server/StateEventManager');
const MaterializedViewsManager = require('./js/server/MaterializedViewsManager');



var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var azure = require('azure-storage');
var request = require('request');

var tableSvc = azure.createTableService();


var manager = new StateEventManager(azure, tableSvc);

var materializedViewsManager = new MaterializedViewsManager(azure, tableSvc);

/* bad design, fix later with promises.*/

tableSvc.createTableIfNotExists('EventStore', function(error, result, response){
	if(!error){
		console.log('created EventStore table or it has already been created.');

        tableSvc.createTableIfNotExists('ViewsExchangeAccounts', function(error, result, response){
          if(!error){
            console.log('created ViewsExchangeAccounts table or it has been created already.');

            manager.process_events(function(){
            	console.log('initial processing of events.');
            });
          }
          else{
          	console.log(error);
          }
        });
	}
	else{
		console.log(error);
	}

});


/* socket.io to handle eventual consistency. */

io.sockets.on('connection', function (socket) {


  var events_list = manager.get_app_events_list();
  socket.emit('events_list', JSON.stringify(events_list));

  socket.on('request_exchanges', function (data) {

	var state = manager.get_app_state();

	var response_obj = {};

	var exchanges = state['exchanges'];

	for(var exchange_id in exchanges){
		response_obj[exchange_id] = exchanges[exchange_id]['exchange_name'];
	}

    io.sockets.emit('exchanges_list', response_obj);
  });


 socket.on('request_accounts', function(data){

 	var exchange_id = data['exchange_id'];
 	var selector = data['selector'];


	var state = manager.get_app_state();

	var accounts = state['exchanges'][exchange_id]['accounts'];

	var response_obj = {};

	response_obj['selector'] = selector; 
	response_obj['accounts'] = {};

	for(var account_id in accounts){
		response_obj['accounts'][account_id] = accounts[account_id]['first_name'] + ' - ' + accounts[account_id]['last_name'] ;
	}

	socket.emit('accounts_list', response_obj);	
 });


 socket.on('update_exchange_summary', function(data){
 	io.sockets.emit('request_summary_list', {});
 });

 socket.on('wipe_state_request', function(data){

 	manager.wipe_app_state();


	var state = manager.get_app_state();

	var response_obj = {};

	var exchanges = state['exchanges'];

	for(var exchange_id in exchanges){
		response_obj[exchange_id] = exchanges[exchange_id]['exchange_name'];
	}

    io.sockets.emit('exchanges_list', response_obj);

	var events_list = manager.get_app_events_list();
	io.sockets.emit('events_list', JSON.stringify(events_list));

	io.sockets.emit('request_summary_list', {});

 });

 socket.on('rebuild_state_request', function(){


	manager.process_events(function(){
		var state = manager.get_app_state();

		var events_list = manager.get_app_events_list();

		var exchanges = state['exchanges'];

		var response_obj = {};

		for(var exchange_id in exchanges){
			response_obj[exchange_id] = exchanges[exchange_id]['exchange_name'];
		}

		io.sockets.emit('exchanges_list', response_obj);

		io.sockets.emit('events_list', JSON.stringify(events_list));

		io.sockets.emit('request_summary_list', {});
	});

 });

});


router.use(function (req,res,next) {
  console.log("/" + req.method);
  next();
});

router.get("/",function(req,res){
  res.sendFile(path + "index.html");
});


app.use("/",router);

app.use("/main.js", function(req, res){
	res.sendFile(__dirname + "/main.js");
});


app.post('/api/events/add_exchange', function(req, res){

	var exchange_name = req.body.exchange_name;

	if(!exchange_name){
		return res.send({'status' : 'failed'});
	}
	else{

	var exchange_id = uuidv1();

		manager.append_event(JSON.stringify(new Date().getTime()), new AddExchangeEvent(exchange_id, exchange_name), function(){

			manager.process_events(function(){
				var state = manager.get_app_state();

				var events_list = manager.get_app_events_list();

				var exchanges = state['exchanges'];

				var response_obj = {};

				for(var exchange_id in exchanges){
					response_obj[exchange_id] = exchanges[exchange_id]['exchange_name'];
				}


				io.sockets.emit('exchanges_list', response_obj);

				io.sockets.emit('events_list', JSON.stringify(events_list));

				return res.send({'status' : 'completed', 'exchange_id' : exchange_id});
			});

		});

	}
});


app.post('/api/events/add_account', function(req, res){

	var exchange_id = req.body.exchange_id;
	var account_id = uuidv1();

	var first_name = req.body.first_name; 
	var last_name = req.body.last_name;

	var state = manager.get_app_state(); 

	if(!(exchange_id in state['exchanges'])){
		exchange_id = "";
	}

	if(first_name && last_name && exchange_id){
		manager.append_event(JSON.stringify(new Date().getTime()), new AddAccountEvent(exchange_id, account_id, first_name, last_name), function(){

			manager.process_events(function(){

				var events_list = manager.get_app_events_list();

				var state = manager.get_app_state();

				materializedViewsManager.update_view_account_summary(exchange_id, account_id, first_name, last_name, 0);

				io.sockets.emit('new_accounts_added', {});

				io.sockets.emit('events_list', JSON.stringify(events_list));

				return res.send({'status' : 'completed', 'account_id' : account_id});

			});


		});
	}
	else{
		return res.send({'status' : 'failed'});
	}

});


app.post('/api/events/add_wallet', function(req, res){

	/* get the information needed to create a new wallet for user. */

	var exchange_id = req.body.exchange_id;

	var account_id = req.body.account_id; 

	var wallet_id = uuidv1();

	var init_balance = req.body.init_balance; 


	var state = manager.get_app_state();

	if(!(exchange_id in state['exchanges'])){
		exchange_id = "";
	}

	if( (exchange_id in state['exchanges']) && !(account_id in state['exchanges'][exchange_id]['accounts'])){
		account_id = "";
	}

	init_balance = parseFloat(init_balance);


	if(isNaN(init_balance)){
		init_balance = ""; 
	}
	
	if(exchange_id && account_id && init_balance){

		manager.append_event(JSON.stringify(new Date().getTime()), new AddWalletEvent(exchange_id, account_id, wallet_id, wallet_id, init_balance), function(){


			manager.process_events(function(){

				var events_list = manager.get_app_events_list();

				var state = manager.get_app_state();

				/* we should update the materialized view for this user account on this particular exchange. */

				var wallets_obj = state['exchanges'][exchange_id]['accounts'][account_id]['wallets'];
				
				var first_name = state['exchanges'][exchange_id]['accounts'][account_id]['first_name'];
				var last_name = state['exchanges'][exchange_id]['accounts'][account_id]['last_name'];

				var total_balance = 0;

				for(var _wallet_id in wallets_obj){
					total_balance += parseFloat(wallets_obj[_wallet_id]['balance']);
				}


				materializedViewsManager.update_view_account_summary(exchange_id, account_id, first_name, last_name, total_balance);

				io.sockets.emit('new_wallets_added', {});
				io.sockets.emit('events_list', JSON.stringify(events_list));


				res.send({'status': 'completed', 'wallet_id' : wallet_id});


			});
		

		});

	}
	else{
		return res.send({'status' : 'failed'});
	}

});


app.post('/api/events/transfer', function(req, res){

	var sender_exchange_id = req.body.sender_exchange_id; 
	var sender_account_id = req.body.sender_account_id; 
	var sender_wallet_id = req.body.sender_wallet_id; 

	var receiver_exchange_id = req.body.receiver_exchange_id; 
	var receiver_account_id = req.body.receiver_account_id; 
	var receiver_wallet_id = req.body.receiver_wallet_id;


	var transfer_amount = req.body.transfer_amount; 

	var transfer_id = uuidv1(); 

	var state = manager.get_app_state(); 
	var events_list = manager.get_app_events_list();

	transfer_amount = parseFloat(transfer_amount);


	if(isNaN(transfer_amount)){
		transfer_amount = ""; 
	}

	var sender_temp = 0; 

	/* validation, ignore this. */
	if(sender_exchange_id in state['exchanges']){

		if(sender_account_id in state['exchanges'][sender_exchange_id]['accounts']){

			if(!(sender_wallet_id in state['exchanges'][sender_exchange_id]['accounts'][sender_account_id]['wallets'])){sender_wallet_id = "";}
			else{sender_temp = state['exchanges'][sender_exchange_id]['accounts'][sender_account_id]['wallets'][sender_wallet_id]['balance']; }
		}
		else{
			sender_account_id == "";
		}
	}
	else{
		sender_exchange_id = "";
	}

	if(receiver_exchange_id in state['exchanges']){

		if(receiver_account_id in state['exchanges'][receiver_exchange_id]['accounts']){

			if(!(receiver_wallet_id in state['exchanges'][receiver_exchange_id]['accounts'][receiver_account_id]['wallets'])){receiver_wallet_id = "";}
		}
		else{
			receiver_account_id == "";
		}
	}
	else{
		receiver_exchange_id = "";
	}


	if((sender_temp >= transfer_amount) && transfer_amount && sender_exchange_id && sender_account_id && sender_wallet_id && receiver_exchange_id && receiver_account_id && receiver_wallet_id){

		manager.append_event(JSON.stringify(new Date().getTime()), new TransferBitcoinsEvent(transfer_id, sender_exchange_id, sender_account_id, sender_wallet_id, receiver_exchange_id, receiver_account_id, receiver_wallet_id, transfer_amount), function(){

			manager.process_events(function(){

				var state = manager.get_app_state();

				var sender_wallets_obj = state['exchanges'][sender_exchange_id]['accounts'][sender_account_id]['wallets'];

				var sender_first_name = state['exchanges'][sender_exchange_id]['accounts'][sender_account_id]['first_name'];
				var sender_last_name = state['exchanges'][sender_exchange_id]['accounts'][sender_account_id]['last_name'];

				var sender_balance = 0; 

				for(var _wallet_id in sender_wallets_obj){
					sender_balance += parseFloat(sender_wallets_obj[_wallet_id]['balance']);
				}

				var receiver_wallets_obj = state['exchanges'][receiver_exchange_id]['accounts'][receiver_account_id]['wallets'];

				var receiver_first_name = state['exchanges'][receiver_exchange_id]['accounts'][receiver_account_id]['first_name'];
				var receiver_last_name = state['exchanges'][receiver_exchange_id]['accounts'][receiver_account_id]['last_name'];


				var receiver_balance = 0; 

				for(var _wallet_id in receiver_wallets_obj){
					receiver_balance += parseFloat(receiver_wallets_obj[_wallet_id]['balance']);
				}


				materializedViewsManager.update_view_account_summary(sender_exchange_id, sender_account_id, sender_first_name, sender_last_name, sender_balance);
				materializedViewsManager.update_view_account_summary(receiver_exchange_id, receiver_account_id, receiver_first_name, receiver_last_name, receiver_balance);

				var events_list = manager.get_app_events_list();

				io.sockets.emit('events_list', JSON.stringify(events_list));


				return res.send({'status' : 'completed'});
			});
		});

	}
	else{
		return res.send({'status' : 'failed'});
	}
	
});

app.get('/api/exchanges', function(req, res){

	var state = manager.get_app_state();

	var response_obj = {};

	var exchanges = state['exchanges'];

	for(var exchange_id in exchanges){
		response_obj[exchange_id] = exchanges[exchange_id]['exchange_name'];
	}

	res.send(response_obj);
});


/* get all the accounts for an exchange from the server. */
app.get('/api/exchanges/:exchange_id/accounts', function(req, res){

	var exchange_id = req.params.exchange_id;


	if(exchange_id !== "null"){

		var state = manager.get_app_state();

		var response_obj = {};

		var accounts = state['exchanges'][exchange_id]['accounts'];

		for(var account_id in accounts){
			response_obj[account_id] = accounts[account_id]['first_name'] + ' - ' + accounts[account_id]['last_name'] ;
		}

		return res.send(response_obj);
		
	}	

	return res.send({'status' : 'completed'});
});


app.get('/api/exchanges/:exchange_id/accounts/:account_id/wallets', function(req, res){

	var exchange_id = req.params.exchange_id;
	var account_id = req.params.account_id; 

	if(exchange_id !== "null" && account_id !== "null"){

		var state = manager.get_app_state();

		var response_obj = {};

		var wallets = state['exchanges'][exchange_id]['accounts'][account_id]['wallets'];

		for(var wallet_id in wallets){
			response_obj[wallet_id] = 'Balance: ' + wallets[wallet_id].balance + ' - ' + wallets[wallet_id].wallet_address;
		}

		return res.send(response_obj);
	}

	return res.send({'status' : 'completed'});

});

app.get('/api/exchange/:exchange_id/summary_accounts', function(req, res){

	var exchange_id = req.params.exchange_id;

	materializedViewsManager.get_view_exchange_accounts_summary(exchange_id, function(data){
		res.send(data.entries);
	});

});


/* error path. */
app.use("*",function(req,res){
  res.sendFile(path + "error.html");
});

// app.listen(3000,function(){
//   console.log("Bitcoin Trading Platform is running on port 3000.\n");
// });