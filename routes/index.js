var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var router = express.Router();

var isAuthenticated = function (req, res, next) {
  if (req.isAuthenticated())
    return next();
  res.redirect('/');
}

router.get('/', function(req, res, next) {
  res.render('index', { layout: 'default', title: 'Login' });
});

router.get('/login', isAuthenticated, function(req, res, next) {
  res.render('login', { layout: 'default', user: req.user.username});
});

router.post('/login', passport.authenticate('local', {successRedirect: '/login', failureRedirect: '/', failureFlash: 'Invalid username or password'}));

router.get('/register', function(req, res, next) {
  res.render('register', { layout: 'default', title: 'Register' });
});

router.post('/register', function(req, res, next) {
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
          return res.render('register', { layout: 'default', error : err.message });
        }

        passport.authenticate('local')(req, res, function () {
            req.session.save(function (err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    });
});



router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});



module.exports = router;
