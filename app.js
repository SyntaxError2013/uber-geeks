// Include the required modules
var express = require('express');
var websocket = require('socket.io');
var http = require('http');
var ejs = require('ejs');
var mysql = require('mysql');
var config = require('./config/config.js');

// Make instances of express and websockets
var app = express();
var server = http.createServer(app);
var io = websocket.listen(server);

app.set('port', process.env.PORT || 3000);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({secret: 'Avada Kedavra'}));
app.use(app.router);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  if(typeof req.session.uid === "undefined")
    res.redirect('/login');
  else
    res.send('Hello World!');
});

app.get('/login', function(req, res) {
  res.sendfile(__dirname + '/public/login.html');
});


// Start the server
server.listen(3000);