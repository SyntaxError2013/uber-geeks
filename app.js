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
app.use(express.static(__dirname + '/public'));
app.use(app.router);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function (req, res) {
  if (typeof req.session.uid === "undefined")
    res.redirect('/login');
  else
    res.send('Hello World!');
});

app.get('/bootstrap/:file', function (req, res) {
  console.log(req.params.file);
  res.sendfile(__dirname + '/public/bootstrap' + req.params.file);
});

app.get('/login', function (req, res) {
  if (typeof req.session.uid === "undefined")
    res.sendfile(__dirname + '/public/login.html');
  else
    res.redirect('/');
});

app.get('/logout', function (req, res) {
  req.session.destroy();
  res.redirect('/login');
});

app.post('/login', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  connection.query("SELECT uid, password FROM users WHERE username = '" + username + "'", function (err, rows) {
    if (err) {
      res.send(err);
    }
    else if (rows[0] && rows[0].password == password) {
      req.session.uid = rows[0].uid;
      res.redirect('/');
    }
    else {
      res.send("Wrong credentials!");
    }
  });
});

app.post('/user', function (req, res) {
  console.log (req.body);
  if (req.body.password != req.body.cpassword) {
    res.send("Passwords do not match!");
  }
  else {
    connection.query("INSERT INTO users(username, email, password) VALUES('" + req.body.username + "', '" + req.body.email + "', '" + req.body.password + "')", function (err, rows) {
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

app.post('/user/mac', function (req, res) {
  if (typeof req.session.uid === "undefined") {
    res.redirect('/login');
  }
  else {
    var mac = req.body.mac;
    connection.query("UPDATE identities SET uid = '" + req.session.uid + "' WHERE mac = '" + mac + "'", function (err, rows) {
      if (err) {
        res.send(err);
      }
      else {
        res.redirect('/')
      }
    });
  }
});

app.get('/macs', function (req, res) {
  connection.query("SELECT mac, type FROM identities WHERE uid = '0'", function (err, rows) {
    if (err) {
      res.send(err);
    }
    else if (rows[0]) {
      res.render('macs', {
        rows: rows
      });
    }
    else {
      res.send("No unknown devices");
    }
  });
});

app.post('/temp', function (req, res) {
  console.log(req.body.mac + '    ' + req.body.type);
  res.end();
});

app.post('/macs', function (req, res) {
  var mac = req.body.mac;
  var type = req.body.type;
  connection.query("SELECT * FROM identities WHERE mac = '" + mac + "'", function (err, rows) {
    if (err) {
      res.send(err);
    }
    else if(rows[0]) {
      res.end();
    }
    else {
      connection.query("INSERT INTO identities(uid, mac, type) VALUES ('" + 0 + "', '" + mac + "', '" + type + "')", function (err, rows) {
        if (err) {
          res.send(err);
        }
        else {
          res.end();
        }
      }); 
    }
  });
});

app.get('/user/:id', function (req, res) {
  if (typeof req.session.uid === "undefined") {
    res.redirect('/');
  }
  else {
    var id = req.params.id;
    connection.query("SELECT * FROM users WHERE uid = '" + id + "'", function (err, rows) {
      if (err) {
        res.send(err);
      }
      else if (rows[0]) {
        var user_details = rows[0];
        connection.query("SELECT `files`.*, `identities`.* FROM `files`, `identities` WHERE `files`.uid = '" + id + "' AND `identities`.`uid` = '" + id + "'", function (err, rows) {
          if (err) {
            res.send(err);
          }
          else {
            if (id == req.session.uid) {
              res.render('user', {
                details: user_details,
                files: rows,
                self: true
              });
            }
            else {
              res.render('user', {
                details: user_details,
                files: rows,
                self: false
              });
            }
          }
        });
      }
      else {
        res.send("No such user!");
      }
    });
  }
});

app.all('*', function (req, res) {
  res.writeHead(404);
  res.end("Page not found!");
});

// Start the server
server.listen(3000);