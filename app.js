var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var config = require('./config');
var base58 = require('./base58.js');

// grab the url model
var Url = require('./models/url');

var mongo_uri = process.env.MONGODB_URI || 'mongodb://' + config.db.host + '/' + config.db.name;
mongoose.connect(mongo_uri, function (err, res) {
  if (err) {
  console.log ('ERROR connecting to: ' + mongo_uri + '. ' + err);
  } else {
  console.log ('Succeeded connected to: ' + mongo_uri);
  }
});

//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(allowCrossDomain);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.post('/api/shorten', function(req, res){
  var longUrl = req.body.url;
  var shortUrl = '';
  var host_name = process.env.HEROKU_URL || config.webhost;
        console.log(host_name)

  // check if url already exists in database
  Url.findOne({long_url: longUrl}, function (err, doc){
    if (doc){
      shortUrl = host_name + base58.encode(doc._id);

      // the document exists, so we return it without creating a new entry
      res.send({'shortUrl': shortUrl, 'subPath': base58.encode(doc._id)});
    } else {
      // since it doesn't exist, let's go ahead and create it:
      var newUrl = Url({
        long_url: longUrl
      });

      // save the new link
      newUrl.save(function(err) {
        if (err){
          console.log(err);
        }
        
        shortUrl = host_name + base58.encode(newUrl._id);

        res.send({'shortUrl': shortUrl, 'subPath': base58.encode(doc._id)});
      });
    }

  });

});

app.get('/:encoded_id', function(req, res){

  var base58Id = req.params.encoded_id;

  var id = base58.decode(base58Id);

  // check if url already exists in database
  Url.findOne({_id: id}, function (err, doc){
    if (doc) {
      res.redirect(doc.long_url);
    } else {
      res.redirect(config.webhost);
    }
  });

});

app.post('/:encoded_id', function(req, res) {
  var base58Id = req.params.encoded_id;
  var id = base58.decode(base58Id);

  Url.findOne({_id: id}, function(err, doc) {
    if (doc) {
      res.send({'encodedXml': doc.long_url});
    } else {
      res.send({'error': err});
    }
  });
});

var server = app.listen(process.env.PORT || 3000, function(){
  var port = process.env.PORT || 3000;
  console.log('Server listening on port ' + port);
});
