var express = require("express");
var https = require("https");
var mongoose = require("mongoose");
var endpointLong = 'https://www.googleapis.com/customsearch/v1?key=AIzaSyDHdc2Ujnyc4e5f9loQ0YAb1s9dLQultUM&cx=017083764109313544345:fdrxz5rsa-m&searchType=image&q=';

var app = express();

mongoose.connect('mongodb://localhost/imgSearch', function(err, success){
  if(err)throw err;
  console.log('Connect succesfully to Mongo DB');
});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connect succesfully to Mongo DB');
});

var querySchema = mongoose.Schema({
  queryName: String 
}, {
  timestamps: true
});

var queryModel = mongoose.model ('queryModel', querySchema);

app.get('/', function(req, res) {
  res.set('Content-Type','text/html');
  res.sendFile(process.cwd()+'/client/index.html');
});

app.get('/favicon.ico', function(req, res) {
  res.set('Content-Type','image/x-icon');
  res.end();
});

app.get('/recent', function(req, res) {
  //retrieve recent searches in mongo
  var recentArr = [];
  queryModel.find().limit(10).sort({_id: -1}).exec(function(err, queries){
    if(err) throw err;
    queries.forEach(function(item){
      
      recentArr.push(JSON.parse('{"term": "'+item.queryName+'", "when": "'+item.createdAt+'"}'));
    });
    res.set('Content-Type','application/json').send(recentArr);
  });
  
});

app.get('/*', function(req, res) {
  //save recent searches in mongo
  var query = req.path.slice(1).replace('%20','+');
  var insert = new queryModel({queryName: query });
  insert.save(function(err, success){
    if (err) throw err;
    console.log('db entry added');
    queryModel.find(function(err, queries){
      if (err) throw err;
      console.log(queries);
    });
  });
  //check for offset
  var offset = req.query.offset;
  console.log('offset = '+offset);
  if(offset && offset !== '0') query += ('&start='+(10*Number(offset)));
  
  
  //request and parse Google Search API
  var body ='';
  https.get(endpointLong+query, function(response){
    response.on('data', function(d) {
      body +=d;
    });
    response.on('end', function() {
      console.log('data received');
      var arr= [];
      body = JSON.parse(body);
      body["items"].forEach(function(item){
        arr.push('{"url": "'+item.link+'", "snippet": "'+item.title+'", "thumbnail" :"'+item.image.thumbnailLink+'", "context": "'+item.image.contextLink+'"}');
      });
      res.end('['+arr.toString()+']');
    });
  });
  
  
});

app.listen(process.env.PORT, process.env.IP);


//custom search ID\cx: 017083764109313544345:fdrxz5rsa-m
// append the query parameter key=AIzaSyDHdc2Ujnyc4e5f9loQ0YAb1s9dLQultUM
// endpoint: https://www.googleapis.com/customsearch/v1?parameters
//full request: GET https://www.googleapis.com/customsearch/v1?key=AIzaSyDHdc2Ujnyc4e5f9loQ0YAb1s9dLQultUM&cx=017083764109313544345:fdrxz5rsa-m&searchType="image"&q=lectures

