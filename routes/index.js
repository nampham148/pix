var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {layout: 'default'});
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
