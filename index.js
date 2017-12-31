'use strict';
var express = require("express");
var bodyParser = require('body-parser');
var context = require('aws-lambda-mock-context');

// lambda.js contains the lambda function for Alexa as in https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs
var alexaAssistant = require('./alexa-assistant');

var PORT = process.env.port || 8080;

var app = express();

app.use(bodyParser.json({ type: 'application/json' }));

// your service will be available on <YOUR_IP>/alexa
app.post('/alexa/', function (req, res) {
    var ctx = context();
    lambda.handler(req.body, ctx);
    ctx.Promise
        .then(resp => {  return res.status(200).json(resp); })
        .catch(err => {  console.log(err); })
});

app.listen(PORT);
console.log("Listening on port " + PORT + ", try http://localhost:" + PORT + "/test");
