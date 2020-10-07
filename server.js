const express = require('express');
const app = new express();
var bodyParser = require('body-parser');
var port = process.env.PORT || 8000;

app.set('port', port);

app.get('/', function(request, response){
    response.sendFile(__dirname + '\\index.html');
});

app.listen(port, function(){
    console.log("running" );
  });