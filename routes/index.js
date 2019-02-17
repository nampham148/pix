var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var router = express.Router();
const axios = require('axios');
const {Storage} = require('@google-cloud/storage');
const vision = require('@google-cloud/vision');
var helpers = require("utils");

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

router.post('/health', function(req, res, next) {
  console.log("reach health");
  console.log(req.files);
  var fileBuffer = req.files.file.data;

  var stream = require('stream');

  // Initiate the source, convert buffer to a stream
  var bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  const projectId = process.env.PROJECT_ID;

  const storage = new Storage({
    projectId: projectId,
  });

  var bucket = storage.bucket("pixie-health");
  var image_file_name = req.files.file.name;
  var remoteWriteStream = bucket.file(image_file_name).createWriteStream();

  bufferStream.pipe(remoteWriteStream)
    .on('error', function(err) {
      console.log(err);
    })
    .on('finish', function() {
      console.log("successfully uploaded");
      const client = new vision.ImageAnnotatorClient();

      const request = {
        image: {
          source: {imageUri: `gs://pixie-health/${image_file_name}`}
        }
      };

      client
        .textDetection(request)
        .then(response => {
          let texts = response[0].fullTextAnnotation.text.split("\n");
          console.log(texts);
          for (i in texts) {
            if (texts[i].endsWith("steps")){
              console.log(texts[i].split(" ")[0]);
              break;
            }
          }
        })
        .catch(err => {
          console.error(err);
        });

    });

  res.redirect("/");
});

/*router.get('/health', function(req, res, next) {
  params = {
      redirect_uri: process.env.HEALTH_CALLBACK,
      prompt: "consent",
      response_type: "code",
      client_id: process.env.GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/fitness.activity.read+https://www.googleapis.com/auth/fitness.activity.write",
      access_type: "offline"
    };
  res.redirect(helpers.urlFormation(params));
});

router.get("/health-callback", function(req, res, next) {
  console.log(req.query);
  console.log("health-callback");
  console.log(req.query.code);
  console.log(helpers.urlencode(req.query.code));

  axios.post("https://www.googleapis.com/oauth2/v4/token", {
      code: helpers.urlencode(req.query.code),
      redirect_uri: helpers.urlencode("http://localhost:3000/health-callback"),
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      scope: '',
      grant_type: "authorization_code"
  }, {
    headers: {
      "content-type":  "application/x-www-form-urlencoded",
      "Content-length": "300"
    }
  })
  .then(response => {
    console.log(response);
  })
  .catch(error => {
    console.log(error);
  })

  res.redirect("/");
});*/


module.exports = router;
