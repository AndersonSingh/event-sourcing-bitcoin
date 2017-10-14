var express = require("express");
var app = express();
var router = express.Router();
var path = __dirname + '/views/';

const uuidv1 = require('uuid/v1');

const AddExchangeEvent = require('./js/events/AddExchangeEvent');
const AddAccountEvent = require('./js/events/AddAccountEvent');
const AddWalletEvent = require('./js/events/AddWalletEvent');
const TransferBitcoinsEvent = require('./js/events/TransferBitcoinsEvent');

const StateEventManager = require('./js/server/StateEventManager');


var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies



var manager = new StateEventManager();


function init_server(){

	exchange_1_id = uuidv1();
	exchange_2_id = uuidv1();

	account_1_id = uuidv1();
	account_2_id = uuidv1();

	wallet_1_id = uuidv1();
	wallet_2_id = uuidv1();


	var events = [
		new AddExchangeEvent(exchange_1_id, 'BitBank'),
		new AddExchangeEvent(exchange_2_id, 'BitArmy'),

		new AddAccountEvent(exchange_1_id, account_1_id, 'Anderson', 'Singh'),
		new AddAccountEvent(exchange_2_id, account_2_id, 'John', 'Doe'),

		new AddWalletEvent(exchange_1_id, account_1_id, wallet_1_id, '647800', 	50),
		new AddWalletEvent(exchange_2_id, account_2_id, wallet_2_id, '800400', 	20),

		new TransferBitcoinsEvent(exchange_1_id, exchange_2_id, account_1_id, account_2_id, wallet_1_id, wallet_2_id, 20)

	];

	/* place the events in the event store.  */

	for(var i = 0; i < events.length; i++){
		manager.append_event(events[i]);
	}

	manager.process_events();

	console.log(manager.get_app_state());
}

init_server();

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
	console.log('server got the exchange name: ' + exchange_name);

	manager.append_event(new AddExchangeEvent(uuidv1(), exchange_name));

	manager.process_events();

	var state = manager.get_app_state();

	console.log(state);

	res.send(state);

});

/* error path. */
app.use("*",function(req,res){
  res.sendFile(path + "error.html");
});

app.listen(3000,function(){
  console.log("Bitcoin Trading Platform is running on port 3000.\n");
});