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

router.get('/gpa-image', function(req, res, next) {
  res.render('gpa_image', {layout: 'default'});
});

router.post('/gpa-image', function(req, res, next) {
  console.log("reach post");
  console.log(req.files);
  var fileBuffer = req.files.file.data;

  var stream = require('stream');

  // Initiate the source, convert buffer to a stream
  var bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  const {Storage} = require('@google-cloud/storage');
  const projectId = process.env.PROJECT_ID;

  const storage = new Storage({
    projectId: projectId,
  });

  var bucket = storage.bucket("pixie-gpa");
  var image_file_name = req.files.file.name;
  var remoteWriteStream = bucket.file(image_file_name).createWriteStream();

  bufferStream.pipe(remoteWriteStream)
    .on('error', function(err) {
      console.log(err);
    })
    .on('finish', function() {
      console.log("successfully uploaded");
      const vision = require('@google-cloud/vision');
      const client = new vision.ImageAnnotatorClient();

      const request = {
        image: {
          source: {imageUri: `gs://pixie-gpa/${image_file_name}`}
        }
      };

      client
        .textDetection(request)
        .then(response => {
          let texts = response[0].fullTextAnnotation.text.split("\n");
          console.log(texts);
          for (i in texts) {
            if (texts[i].startsWith("Semester GPI")){
              console.log(texts[i].split(":")[1].replace(/\s/g, ''));
              break;
            }
          }
        })
        .catch(err => {
          console.error(err);
        });

    });

  res.redirect("/");
})

module.exports = router;
