var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')
var logger = require('morgan');
var hbs = require( 'express-handlebars');
var flash = require('flash');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var expressSession = require('express-session');

var indexRouter = require('./routes/index');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
require('dotenv').config()

var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());



app.use('/', indexRouter);

// passport config
var Account = require('./models/account');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());


// mongoose
mongoose.connect('mongodb://localhost/pix');


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

app.engine('hbs', hbs( {
  extname: 'hbs',
  defaultView: 'default',
  layoutsDir: __dirname + '/views/layouts/',
  partialsDir: __dirname + '/views/partials/',
  helpers: {
    add: function(x, y) {return x+y;},
    equal: function(x, y) {return x == y},
    render_text: function(pig, if_win) {
      var win = {
        "Scout": "You defeated the pig scout with your fierce look! Piece of cake!",
        "Archer": "Where did that arrow go? You were too fast the pig archer couldn’t even aim at you!",
        "Knight": "What was on your menu last night? A pig warrior!",
        "Warmonger": "You took down the pig warmonger! No more pigs for a while!"
      }

      var lose = {
        "Scout": "You tripped over a rock while charging toward the pig scout! What a shame!",
        "Archer": "You fearlessly charged at the pig archer, but took an arrow to the knee!",
        "Knight": "Did you leave your sword at home again? The pig warrior certainly had some good laugh at you!",
        "Warmonger": "You encountered the pig warmonger and ran for your life!"
      }

      console.log(win);

      if (if_win) {
        return win[pig];
      } else {
        return lose[pig];
      }
    }
  }
}));

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
