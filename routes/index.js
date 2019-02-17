var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var Fight = require('../models/fight');
var router = express.Router();
const axios = require('axios');
const {Storage} = require('@google-cloud/storage');
const vision = require('@google-cloud/vision');
var schedule = require('node-schedule');

// REGEN MANA
/*var j = schedule.scheduleJob('0,30 * * * * *', function() {
  console.log("running cron job");
  Account.find({} , (err, users) => {
    if (err) {
      console.log(err);
    }

    users.map(user => {
      user.stamina = Math.min(150, user.stamina + user.stamina_regen);
      user.save();
    });
  });
});

// RESTART PROGRESS
var mana_j = schedule.scheduleJob('0 1 * * *', function(){
  Account.find({} , (err, users) => {
    if (err) {
      console.log(err);
    }

    users.map(user => {
      user.stamina_regen = 5;
      user.save();
    });
  });
});

// RESTART POWER
var power_j = schedule.scheduleJob('0 1 1 5,12 *', function() {
  Account.find({} , (err, users) => {
    if (err) {
      console.log(err);
    }

    users.map(user => {
      user.inherent_power = 100;
      user.save();
    });
  });
});*/

var isAuthenticated = function (req, res, next) {
  if (req.isAuthenticated())
    return next();
  res.redirect('/login');
}

router.get('/shop', isAuthenticated, function(req, res, next) {
	res.render('shop', { layout: 'default', user: req.user });
});

router.post('/shop', isAuthenticated, function(req, res, next) {
  console.log(req.body);
  var prices = {
    mana: 4,
    sword: 7,
    ultimate: 15 
  }
  var item = req.body.item;
  var quantity = parseInt(req.body.quantity);
  let cost = quantity * prices[item];
  var user = req.user;

  if (user.gold < cost) {
    res.render('shop', {layout: 'default', user: req.user, error: "You don't have enough gold!"});
    return;
  } else {
    if (item == "mana") {
      user.stamina = Math.min(150, user.stamina + 30);
    } else if (item == "sword") {
      user.bonus_power += 10;
    } else if (item == "ultimate") {
      user.empowered = true;
    }

    user.gold -= cost;
    user.save();

    res.redirect('/shop');
  }
});

// AUTHENTICATION
router.get('/', isAuthenticated, function(req, res, next) {
  res.render('index', { layout: 'default', user: req.user });
});

router.get('/login', function(req, res, next) {
  res.render('login', { layout: 'default', title: 'Pix v1.0'});
});

router.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/login', failureFlash: 'Invalid username or password'}));

router.get('/register', function(req, res, next) {
  res.render('register', { layout: 'default', title: 'Register' });
});

router.post('/register', function(req, res, next) {
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
		if (req.body.password != req.body.confpassword) {
		  return res.render('register', { layout: 'default', error: 'Password and confirm password does not match!'});
		}
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

// FIGHT!
router.post('/fight', isAuthenticated, function(req, res, next) {
  let user = req.user;

  if (user.stamina < 15) {
    res.render('index', {layout: 'default', error: "You don't have enough stamina! Start exercising!", user: req.user});
  } else {
    var pigs = ["Scout", "Archer", "Knight", "Warmonger"];
    var pig_power = [80, 105, 125, 160];
    var probs = [0.3, 0.3, 0.3, 0.1];
    var gold_drops = [0, 2, 4, 6];

    // 30% chance to meet the big boss
    var random = Math.random();
    var i = -1;
    while (random >= 0) {
      i++;
      random -= probs[i];
    }

    let monster_power = pig_power[i];
    let opponent_name = pigs[i] ;
    let fight_big_boss = (i == 3);
    let min_drop = gold_drops[i];

    var result_win;
    var gold_drop = 0;

    var base_power = user.inherent_power + user.bonus_power;
    console.log(base_power);

    if (fight_big_boss && !user.empowered) {
      // bound to lose if not empowered
      result_win = false;
    } else {
      // compare power
      var user_power = base_power * Math.random() + base_power * 0.5;
      if (user_power > monster_power) {
        result_win = true;
      } else {
        result_win = false;
      }
    }

    if (result_win) {
      // random a gold drop
      gold_drop = Math.floor(Math.random() * 4) + min_drop;
    }

    var fight = new Fight({
      user: user._id,
      opponent: opponent_name,
      result: result_win,
      gold_drop: gold_drop
    });

    fight.save(err => {
      console.log(err);
    });

    user.gold += gold_drop;
    user.stamina -= 15;
    user.save()

    console.log(opponent_name);
    console.log(user_power);
    console.log(result_win);
    console.log(gold_drop);

    res.redirect("/");
  }
});

// READ IMAGE
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
