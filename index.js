'use strict';

/* adapted from https://gist.github.com/oprog/f7761f9c8034c0ee276b01233dd9a6b7 */
/*
const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');
const context = require('aws-lambda-mock-context');

// alexa-assistant.js contains the lambda function for Alexa as in https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs
const alexaAssistant = require('./alexa-assistant');

const PORT = process.env.PORT || 5000;

// your service will be available on <YOUR_IP>/alexa
express()
	.use(cors())
	.use(bodyParser())
	.post('/alexa/', (req, res) => {
	    const ctx = context();
	    console.log(req.body);
	    alexaAssistant.handler(req.body, ctx);
	    ctx.Promise
	        .then(resp => {  return res.status(200).json(resp); })
	        .catch(err => {  console.log(err); })
	})
	.listen(PORT, () => console.log(`Listening on ${ PORT }`));
*/

var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

const LambdaMockContext = require('aws-lambda-mock-context');
const Alexa = require('alexa-sdk');

var alexa = express();
alexa.use(cors());
alexa.use(bodyParser());

alexa.post('/', function(request, response) {

    var lambdaCtx = LambdaMockContext();

    const handlers = {
        'HelloWorldIntent': function() {
            this.emit(':tell', 'From Red Hat Mobile: Hello World!');
        },
        'AMAZON.HelpIntent': function() {
            this.emit(':tell', 'How can I help you?');
        },
        'AMAZON.StopIntent': function() {
            this.emit(':tell', 'Cheers!');
        },
        'AMAZON.CancelIntent': function() {
            this.emit(':tell', 'Cheers!');
        },
        'SessionEndedRequest': function() {
            this.emit(':tell', 'Good Bye!');
        },
        'Unhandled': function() {
            this.emit(':tell', 'What\'s up?');
        },
    };

    var alexa = Alexa.handler(request.body, lambdaCtx);
    alexa.registerHandlers(handlers);
    alexa.execute();

    lambdaCtx.Promise
        .then(resp => {
            return response.status(200).json(resp);
        })
        .catch(err => {
            console.log(err);
        })

});

app.listen(process.env.PORT || 5000);
