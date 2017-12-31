'use strict';

/* adapted from https://gist.github.com/oprog/f7761f9c8034c0ee276b01233dd9a6b7 */
const express = require("express");
const bodyParser = require('body-parser');
const context = require('aws-lambda-mock-context');

// alexa-assistant.js contains the lambda function for Alexa as in https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs
const alexaAssistant = require('./alexa-assistant');

const PORT = process.env.PORT || 5000;

// your service will be available on <YOUR_IP>/alexa
express()
	.use(bodyParser.json({ type: 'application/json' }))
	.get('/alexa/', (req, res) => {
		return res.status(200).type('txt').send("hello world");
	})
	.post('/alexa/', (req, res) => {
	    const ctx = context();
	    lambda.handler(req.body, ctx);
	    ctx.Promise
	        .then(resp => {  return res.status(200).json(resp); })
	        .catch(err => {  console.log(err); })
	})
	.listen(PORT, () => console.log(`Listening on ${ PORT }`));
