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

// Create MySQL connection
var connection = mysql.createConnection({
  host: config.db_host,
  user: config.db_user,
  database: config.db_name,
  password: config.db_pass
});

connection.connect(function (err) {
  if (err) {
    console.log(err);
  }
});

// Config options
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

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  connection.query("SELECT uid, password FROM users WHERE username = '" + username + "'", function (err, rows) {
    if (err) {
      res.send(err);
    }
    else if (rows[0]) {
      req.session.uid = rows[0].uid;
      res.redirect('/');
    }
    else {
      res.send("Wrong credentials!");
    }
  });
});

app.post('/users', function(req, res) {
  if (req.body.password != req.body.cpassword) {
    res.send("Passwords do not match!");
  }
  else {
    connection.query("INSERT INTO users(username, email, password) VALUES('" + req.body.username + "', '" + req.body.email + "', '" + req.body.password + "'", function (err, rows) {
      if (err) {
        res.send(err);
      }
      else {
        connection.query("SELECT uid FROM users WHERE username = '" + req.body.username + "'", function (err, rows) {
          if (err) {
            res.send(err);
          }
          else {
            req.session.uid = rows[0].uid;
            res.redirect('/');
          }
        });
      }
    });
  }
});

// Start the server
server.listen(3000);