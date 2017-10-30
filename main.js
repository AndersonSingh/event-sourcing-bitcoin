const SERVER = "http://localhost:3000";

  var account_selectors_to_update = {
    '#add_account_form #account_selector' : '#add_account_form #exchange_selector',
    '#add_wallet_form #account_selector' : '#add_wallet_form #exchange_selector',
    '#transfer_form #account_selector_one' : '#transfer_form #exchange_selector_one' ,
    '#transfer_form #account_selector_two' : '#transfer_form #exchange_selector_two'
  };


$(document).ready(function(){

  var socket = io.connect();
    
  socket.emit('request_exchanges', {});

  socket.on('exchanges_list', function(data){
    update_exchange_selectors(data);    
  });        


  /* handles updating the display with new accounts being added. */

  socket.on('new_accounts_added', function(data){
    update_account_selector('#add_wallet_form #account_selector', '#add_wallet_form #exchange_selector');
    update_account_selector('#transfer_form #account_selector_one', '#transfer_form #exchange_selector_one');
    update_account_selector('#transfer_form #account_selector_two', '#transfer_form #exchange_selector_two');
  });

  /* handles updating the display with new wallets being added. */
  socket.on('new_wallets_added', function(data){
    update_wallet_selector('#transfer_form #wallet_selector_one', '#transfer_form #account_selector_one', '#transfer_form #exchange_selector_one');
    update_wallet_selector('#transfer_form #wallet_selector_two', '#transfer_form #account_selector_two', '#transfer_form #exchange_selector_two');
  });

  /* requests new exchange summary from the server. */
  socket.on('request_summary_list', function(data){
    var exchange_id = $("#exchange_summary_form #exchange_selector").val();
    update_exchange_summary_table(exchange_id);
  });

  /* demonstrate event sourcing logs. */
  socket.on('events_list', function(data){

    var events_list = JSON.parse(data);

    console.log(events_list);

    var content = "";

    for(var i = 0; i < events_list.length; i++){
      content += events_list[i] + '\n';
    }

    $("#events_textarea").html(content);
  });

  /* handles addition of new exchange. */
  $("#add_exchange_button").click(function(){

    $.ajax({
          url: SERVER + '/api/events/add_exchange',
          type: 'POST',
          dataType: 'json',
          data: $('form#add_exchange_form').serialize(),
          success: function(data) {

            var status = data['status'];

            if(status == 'completed'){
              console.log('Successfully added the exchange to the server.');

              var exchange_id = data['exchange_id'];

              $("#add_exchange_form_messages").html("<div class='alert alert-success' role='alert'>Added Exchange Sucessfully. <br>" + exchange_id + "</div>");

              socket.emit('request_exchanges', {});

            }
            else{
              $("#add_exchange_form_messages").html("<div class='alert alert-danger' role='alert'>Invalid Exchange Name.</div>");              
            }
          },
          error: function(xhrstr, status, err){

            console.log('An error occurred adding the exchange, see information below.');
            console.log(err);

            $("#add_exchange_form_messages").html("<div class='alert alert-danger' role='alert'>An Error Occurred.</div>");

          }
      });
  });

  /* handles the addition of a new account to a bitcoin exchange. */
  $("#add_account_button").click(function(){

    $.ajax({
      url: SERVER + '/api/events/add_account',
      type: 'POST',
      dataType: 'json',
      data: $('form#add_account_form').serialize(),
      success: function(data) {

        var status = data['status'];

        if(status == 'completed'){
          console.log('Successfully added the account to the server.');

          var account_id = data['account_id'];

          $("#add_account_form_messages").html("<div class='alert alert-success' role='alert'>Added Account Sucessfully. <br>" + account_id + "</div>");

          socket.emit('update_exchange_summary', {});

        }
        else{
          $("#add_account_form_messages").html("<div class='alert alert-danger' role='alert'>Invalid First Name / Last Name / Exchange.</div>");
        }

        },
        error: function(xhrstr, status, err){
        console.log('An error occurred adding the account, see information below.');
        console.log(err);

        $("#add_account_form_messages").html("<div class='alert alert-danger' role='alert'>An Error Occurred.</div>");

        }
    });

  });

  /* handles addition of new wallet. */

  $("#add_wallet_button").click(function(){

    $.ajax({
      url: SERVER + '/api/events/add_wallet',
      type: 'POST',
      dataType: 'json',
      data: $('form#add_wallet_form').serialize(),
      success: function(data) {

        var status = data['status'];

        if(status == 'completed'){
          console.log('Successfully added the wallet to the server.');

          var wallet_id = data['wallet_id'];

          $("#add_wallet_form_messages").html("<div class='alert alert-success' role='alert'>Added Wallet Sucessfully. <br>" + wallet_id + "</div>");

          socket.emit('update_exchange_summary', {});

        }
        else{
          $("#add_wallet_form_messages").html("<div class='alert alert-danger' role='alert'>Invalid Balance / Exchange / Account.</div>");
        }

      },
      error: function(xhrstr, status, err){
        console.log('An error occurred adding the exchange, see information below.');
        console.log(err);

        $("#add_wallet_form_messages").html("<div class='alert alert-danger' role='alert'>An Error Occurred.</div>");

      }
    });

  });


  $("#transfer_bitcoin_button").click(function(){

    $.ajax({
      url: SERVER + '/api/events/transfer',
      type: 'POST',
      dataType: 'json',
      data: $('form#transfer_form').serialize(),
      success: function(data) {

        var status = data['status'];

        if(status == 'completed'){

          $("#transfer_form_messages").html("<div class='alert alert-success' role='alert'>Transferred Bitcoin Sucessfully.</div>");

          socket.emit('update_exchange_summary', {});
          socket.emit('request_exchanges', {});

        }
        else{
          $("#transfer_form_messages").html("<div class='alert alert-danger' role='alert'>Invalid Transfer Information.</div>");
        }
      },
      error: function(xhrstr, status, err){
        console.log('An error occurred adding the exchange, see information below.');
        console.log(err);

        $("#transfer_form_messages").html("<div class='alert alert-danger' role='alert'>An Error Occurred.</div>");

      }
    });

  });

  $("#wipe_state_button").click(function(){
    socket.emit('wipe_state_request', {});
  }); 

  $("#rebuild_state_button").click(function(){
    socket.emit('rebuild_state_request', {});
  });

});


/* fetches new accounts when a new exchange is selected. */
$('#add_wallet_form #exchange_selector').on('change', function(){

  var exchange_id = this.value; 

  $.get(SERVER + '/api/exchanges/' + exchange_id + '/accounts', function(accounts){

    var content = "";

    for(var account_id in accounts){
      content += '<option value="'  + account_id + '">';
      content += accounts[account_id];
      content += '</option>';
    }

    $('#add_wallet_form #account_selector').html(content);

  });

});




$('#exchange_summary_form #exchange_selector').on('change', function() {
  update_exchange_summary_table(this.value);
})


$("#transfer_form #exchange_selector_one").on('change', function(){
  update_account_selector("#transfer_form #account_selector_one", "#transfer_form #exchange_selector_one", function(){
    update_wallet_selector("#transfer_form #wallet_selector_one", "#transfer_form #account_selector_one", "#transfer_form #exchange_selector_one");
  });
});


$("#transfer_form #account_selector_one").on('change', function(){
  update_wallet_selector("#transfer_form #wallet_selector_one", "#transfer_form #account_selector_one", "#transfer_form #exchange_selector_one");
});



$("#transfer_form #exchange_selector_two").on('change', function(){
  update_account_selector("#transfer_form #account_selector_two", "#transfer_form #exchange_selector_two", function(){
    update_wallet_selector("#transfer_form #wallet_selector_two", "#transfer_form #account_selector_two", "#transfer_form #exchange_selector_two");
  });
});


$("#transfer_form #account_selector_two").on('change', function(){
  update_wallet_selector("#transfer_form #wallet_selector_two", "#transfer_form #account_selector_two", "#transfer_form #exchange_selector_two");
});

/* update ui with a new set of exchanges. */
function update_exchange_selectors(data){

  var exchange_selectors = [
    "#add_account_form #exchange_selector",
    "#add_wallet_form #exchange_selector",
    "#exchange_summary_form #exchange_selector",
    "#transfer_form #exchange_selector_one",
    "#transfer_form #exchange_selector_two"
  ];
    

  for(var i = 0; i < exchange_selectors.length; i++){

    var content = "";
      
    var selected_exchange_id = $(exchange_selectors[i]).val();


    for(var exchange_id in data){
      if(exchange_id == selected_exchange_id){
        content += '<option value="'  + exchange_id + '" selected>';
      }
      else{
        content += '<option value="'  + exchange_id + '">';
      }
      content += data[exchange_id];
      content += '</option>';
    }

    $(exchange_selectors[i]).html(content);

  }

  update_exchange_summary_table($("#exchange_summary_form #exchange_selector").val());

  update_account_selector("#add_wallet_form #account_selector", "#add_wallet_form #exchange_selector");

  update_account_selector("#transfer_form #account_selector_one", "#transfer_form #exchange_selector_one", function(){
    update_wallet_selector("#transfer_form #wallet_selector_one", "#transfer_form #account_selector_one", "#transfer_form #exchange_selector_one");
  });

  update_account_selector("#transfer_form #account_selector_two", "#transfer_form #exchange_selector_two", function(){
    update_wallet_selector("#transfer_form #wallet_selector_two", "#transfer_form #account_selector_two", "#transfer_form #exchange_selector_two");
  });

}



/* update ui with new set of accounts for a given exchange. */
function update_account_selector(account_selector, exchange_selector, callback){

  var exchange_id = $(exchange_selector).val();
  var selected_account_id = $(account_selector).val();

  $.get(SERVER + '/api/exchanges/' + exchange_id + '/accounts', function(accounts){
  
    var content = "";

    for(var account_id in accounts){

      if(account_id != 'status' && accounts[account_id] != 'completed'){

        if(account_id == selected_account_id){
          content += '<option value="'  + account_id + '" selected>';  
        }
        else{
          content += '<option value="'  + account_id + '">';
        }

        content += accounts[account_id];
        content += '</option>';
      }

    }

    $(account_selector).html(content);

    if(callback) callback();
  });

}

/* update ui with a new set of wallets for a given account, on a given exchange. */
function update_wallet_selector(wallet_selector, account_selector, exchange_selector){

  var exchange_id = $(exchange_selector).val();
  var account_id = $(account_selector).val();

  var selected_wallet_id = $(wallet_selector).val();


  $.get(SERVER + '/api/exchanges/' + exchange_id + '/accounts/' + account_id + '/wallets', function(wallets){

    var content = "";

    for(var wallet_id in wallets){

      if(wallet_id != 'status' && wallets[wallet_id] != 'completed'){
        if(wallet_id == selected_wallet_id){
          content += '<option value="'  + wallet_id + '" selected>';
        }
        else{
          content += '<option value="'  + wallet_id + '">';
        }

        content += wallets[wallet_id];
        content += '</option>';
      }
    }

    $(wallet_selector).html(content);

  });



}


function update_exchange_summary_table(exchange_id){

  $.get( SERVER + '/api/exchange/' + exchange_id + '/summary_accounts', function( accounts ) {

    var content = ""; 

    for(var i = 0; i < accounts.length; i++){
      content += "<tr>";
      content += "<td>" + accounts[i]['RowKey']['_'] + "</td>";
      content += "<td>" + accounts[i]['FirstName']['_'] + "</td>";
      content += "<td>" + accounts[i]['LastName']['_'] + "</td>";
      content += "<td>" + accounts[i]['Balance']['_'] + "</td>";
      content += "</tr>";
    }

    if(accounts.length == 0){
      content = "<tr><td>No Data</td><td>No Data</td><td>No Data</td><td>No Data</td></tr>";
    } 

    $("#table_exchanges_for_summary tbody").html(content);
  });
}


