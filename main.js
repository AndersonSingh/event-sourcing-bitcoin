const SERVER = "http://localhost:3000";

$("#add-exchange-button").click(function(){
  add_exchange();
});


function update_exchanges_table(exchanges){

  var body = "<tbody>";

  for(var exchange_id in exchanges){
    var row = "<tr>";
    row += "<th scope='row'>" + exchanges[exchange_id]['exchange_id'] + "</th>";
    row += "<td>" + exchanges[exchange_id]['exchange_name'] + "</td>";
    row += "<td>" + exchanges[exchange_id]['accounts'].length + "</td>";
    row += "</tr>";

    body += row; 
  }

  body += "</tbody>";

  $('table#exchanges-table tbody').replaceWith(body);

}

function add_exchange(){
  $.ajax({
        url: SERVER + '/api/events/add_exchange',
        type: 'POST',
        dataType: 'json',
        data: $('form#add-exchange-form').serialize(),
        success: function(data) {
          console.log('Successfully added the exchange to the server.');
          console.log(data);
          update_exchanges_table(data['exchanges']);

        },
        error: function(xhrstr, status, err){
          console.log('An error occurred adding the exchange, see information below.');
        	console.log(err);
        	console.log(status);
        }
    });
}


