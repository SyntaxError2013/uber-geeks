// Include the required modules
var express = require('express');
var websocket = require('socket.io');
var http = require('http');
var ejs = require('ejs');

// Make instances of express and websockets
var app = express();
var server = http.createServer(app);
var io = websocket.listen(server);

app.get('/', function(req, res) {
  res.send('Hello World!');
});

// Start the server
server.listen(3000);