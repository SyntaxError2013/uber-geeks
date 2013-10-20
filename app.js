// Include the required modules
var express = require('express');
var websocket = require('socket.io');
var http = require('http');
var ejs = require('ejs');
var mysql = require('mysql');
var fs = require('fs');
var url = require('url');
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

var getOnlineUsers = function (cb) {
  connection.query("SELECT DISTINCT uid FROM identities WHERE '" + new Date().getTime() + "' < last_seen + 3600000 ", function (err, rows) {
    if (err) {
      console.log(err);
    }
    else if (rows) {
      cb(rows);
    }
  });
}

var getUserDetails = function (uid, cb) {
  if (typeof uid == 'number') {
    connection.query("SELECT * FROM users WHERE uid = '" + uid + "'", function (err, rows) {
      if (err) {
        console.log(err);
      }
      else if (rows[0]) {
        cb(rows[0]);
      }
      else {
        cb(rows);
      }
    });
  }
  else {
    var str = '';
    for (var i=0; i<uid.length; i++) {
      str = str + uid[i].uid + ',';
    }
    str = str + '99999';
    connection.query("SELECT * FROM users WHERE uid in (" + str + ")", function (err, rows) {
      if (err) {
        console.log(err);
      }
      else if(rows) {
        cb(rows);
      }
    });
  }
}

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
  if (typeof req.session.uid === "undefined") {
    res.redirect('/login');
  }
  else {
    getUserDetails(req.session.uid, function(user) {
      getOnlineUsers(function(onlineUsers) {
        getUserDetails(onlineUsers, function(onlineUsersDetails) {
          res.render('index', {
            user: user,
            online: onlineUsersDetails
          });
        });
      });
    });
  }
});

app.get('/test', function (req, res) {
  if(typeof req.session.uid === "undefined")
    res.redirect('/login')
  else
    res.sendfile(__dirname + '/public/test.html');
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
            fs.mkdir(__dirname + '/public/uploads/' + rows[0].uid, 0777, function (err) {
              if (err) {
                console.log(err);
              }
              else {
                console.log("Directory Created!");
              }
            });
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
        res.send("Done!");
      }
    });
  }
});

app.get('/macs', function (req, res) {
  if(typeof req.session.uid === "undefined") {
    res.redirect('/login')
  }
  else {
    getUserDetails(req.session.uid, function(user) {
      connection.query("SELECT mac, type FROM identities WHERE uid = '0'", function (err, rows) {
        if (err) {
          res.send(err);
        }
        else {
          res.render('macs', {
            user: user,
            macs: rows
          });
        }
      });
    })
  }
});

app.post('/macs', function (req, res) {
  var mac = req.body.mac;
  var type = req.body.type;
  connection.query("SELECT * FROM identities WHERE mac = '" + mac + "'", function (err, rows) {
    if (err) {
      res.send(err);
    }
    else if(rows[0]) {
      connection.query("UPDATE identities SET last_seen = " + new Date().getTime() + " WHERE mac = '" + mac + "'", function (err, rows) {
        if (err) {
          res.send(err);
        }
        else {
          res.end();
        }
      });
    }
    else {
      connection.query("INSERT INTO identities(uid, mac, type) VALUES ('" + 0 + "', '" + mac + "', '" + type + "')", function (err, rows) {
        if (err) {
          res.send(err);
        }
        else {
          connection.query("UPDATE identities SET last_seen = " + new Date().getTime() + " WHERE mac = '" + mac + "'", function (err, rows) {
            if (err) {
              res.send(err);
            }
            else {
              res.end();
            }
          });
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
        var user = rows[0];
        connection.query("SELECT * FROM files WHERE uid = '" + id + "'", function (err, rows) {
          if (err) {
            res.send(err);
          }
          else {
            if (id == req.session.uid) {
              res.render('user', {
                user: user,
                files: rows,
                self: true
              });
            }
            else {
              res.render('user', {
                user: user,
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

app.post('/file', function (req, res) {
  if (typeof req.session.uid === "undefined") {
    res.redirect('/login');
  }
  else {
    fs.readFile(req.files.file.path, function (err, data) {
      var newPath = __dirname + "/public/uploads/" + req.session.uid + '/' + req.files.file.name;
      fs.writeFile(newPath, data, function (err) {
        connection.query("INSERT INTO files(uid, filename, relative_link, type, uploaded_at) VALUES ('" + req.session.uid + "', '" + req.files.file.name + "', '/', '" + req.files.file.type + "', '" + new Date().getTime() + "')", function (err, rows) {
          if (err) {
            res.send(err);
          }
          else {
            res.end();
          }
        });
      });
    });
    res.end();
  }
});

app.get('/file/:id', function (req, res) {
  if (typeof req.session.uid === "undefined") {
    res.redirect('/login');
  }
  else {
    connection.query("SELECT * FROM files WHERE fid = '" + req.params.id + "'", function (err, rows) {
      if (err) {
        res.send(err);
      }
      else {
        var uid = rows[0].uid;
        var file = __dirname + '/public/uploads/' + uid + '/' + rows[0].filename;
        fs.exists(file, function(exists) {
          if (exists) {
            res.sendfile(file);
          }
          else {
            res.send("File does not exist!");
          }
        });   
      }
    });
  }
});

app.get('/search', function(req, res) {
  var q = req.query.q;
  getUserDetails(req.session.uid, function (user) {
    connection.query("SELECT * FROM files WHERE filename LIKE '%" + q + "%'", function (err, rows) {
      res.render('search', {
        user: user,
        files: rows
      });
    });
  });
});

io.sockets.on('connection', function (socket) {
  socket.emit('hello', {msg: "Hello World!1"});  
  socket.on('broadcast', function(data) {
    connection.query("SELECT * FROM files WHERE fid = '" + data.fileid + "'", function (err, rows) {
      var filedata = rows;
      connection.query("SELECT username FROM users WHERE uid = '" + rows[0].uid + "'", function (err, rows) {
        io.sockets.emit('newfile', {filedata: filedata, username: rows[0]});
      });
    });
  });
});

app.all('*', function (req, res) {
  res.writeHead(404);
  res.end("Page not found!");
});

// Start the server
server.listen(3000);