var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
//var http = require('http').Server(app);
//var io = require('socket.io')(http);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var productsRouter = require('./routes/product');
var orderRouter = require('./routes/order');

// DataBase 
// var mysql = require("mysql");
var mysql = require('promise-mysql');
const config = require('./config/development_config');

var con = mysql.createPool({
  host: config.mysql.host,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
  connectionLimit: 10,
  port: 8889
});

// con.connect(function (err) {
//   if (err) {
//     console.log('connecting error');
//     return;
//   }
//   console.log('connecting success');
// });

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/apidoc', express.static('apidoc'));


// app.get('/', function (req, res) {
//   res.sendFile(__dirname + '/chat/socket.html');
// });
app.get('/send.png', function (req, res) {
  res.sendFile(__dirname + '/chat/send.png');
});
app.get('/male.png', function (req, res) {
  res.sendFile(__dirname + '/chat/male.png');
});
app.get('/female.png', function (req, res) {
  res.sendFile(__dirname + '/chat/female.png');
});

var socketApi = require('./config/socketApi');
var io = socketApi.io;

var usocket = {}, user = []; //for new user
var typing_user = []; //for typing user list
io.on('connection', function (socket) {
  socket.join('chat_room');
  io.in('chat_room').clients((error, clients) => {
    if (error) throw error;
    // Returns an array of client IDs like ["Anw2LatarvGVVXEIAAAD"]
  });
  socket.on('client_message', function (msg) {
    socket.to('chat_room').emit('message', msg);
  });
  socket.on('new user', (username, gender) => {
    if (!(username in usocket)) {
      socket.username = username;
      socket.gender = gender;
      usocket[username] = socket;
      var new_user = {}
      new_user.username = username;
      new_user.gender = gender;
      user.push(new_user);
      socket.to('chat_room').emit("save_user_to_vue", user)
      console.log(user);
    }
  })
  socket.on('typing', (username, msg) => {
    if (!(typing_user.includes(username))) {
      // socket.username = username;
      // typing_socket[username] = socket;
      typing_user.push(username);
      socket.to('chat_room').emit("save_typing_user_to_vue", typing_user)
      console.log("typing=>", typing_user);
    } else {
      if (!msg) {
        typing_user.splice(typing_user.indexOf(username), 1);
        socket.to('chat_room').emit("save_typing_user_to_vue", typing_user)
      }
    }
  })
  socket.on('disconnect', function () {
    //移除
    if (socket.username in usocket) {
      delete (usocket[socket.username]);
      user.splice(user.indexOf(socket.username), 1);
      socket.to('chat_room').emit("save_user_to_vue", user)
    }
    if (typing_user.includes(socket.username)) {
      typing_user.splice(typing_user.indexOf(socket.username), 1);
      socket.to('chat_room').emit("save_typing_user_to_vue", typing_user)
    }
    console.log(user);
  })
});

// db state
app.use(function (req, res, next) {
  req.con = con;
  next();
});

app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/order', orderRouter);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
