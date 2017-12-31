'use strict';

var Alexa = require('alexa-sdk');
var google = require('googleapis');
var every = require('every-moment');
var wait = require('wait-one-moment');
var grpc = require('grpc')
var path = require('path');

// Google Assistant SDK object
var assistant = null;

// create JSON string to hold config
var config = {};

// Get Google Credentials from Evironment Variables
var OAuth2 = google.auth.OAuth2; // from googleapis module
const VERSION_NUMBER = '1.1';
var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;
var REDIRECT_URL = process.env.REDIRECT_URL;
var API_ENDPOINT = process.env.API_ENDPOINT;
var ALEXA_APP_ID = process.env.ALEXA_APP_ID;

var oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

// load assistant API proto and bind using grpc
const protoDescriptor = grpc.load({
    file: 'google/assistant/embedded/v1alpha2/embedded_assistant.proto',
    root: path.resolve(__dirname, 'submodules/googleapis')
});

const EmbeddedAssistantClient = protoDescriptor.google.assistant.embedded.v1alpha2.EmbeddedAssistant;
const embedded_assistant = protoDescriptor.google.assistant.embedded.v1alpha2;
const callCreds = new grpc.Metadata();

// used by Google Assistant SDK
var conversation_State = Buffer.alloc(0);

var handlers = {
    // Sent when the user invokes your skill without providing a specific intent.
    'LaunchRequest': () => {
        // Check for required environment variables and throw spoken error if not present
        if (!CLIENT_ID) {
            this.emit(':tell', 'ERROR! Client ID is not set')
        }
        if (!CLIENT_SECRET) {
            this.emit(':tell', 'ERROR! Client Secret is not set')
        }
        if (!REDIRECT_URL) {
            this.emit(':tell', 'ERROR! Redirect URL is not set')
        }
        if (!API_ENDPOINT) {
            this.emit(':tell', 'ERROR! API endpoint is not set')
        }

        if (!this.event.session || !this.event.session.user.accessToken) {
            this.emit(':tellWithLinkAccountCard', "You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.");
        } else {
            this.emit(':ask', "How may I help?");
        };
    },

    'SearchIntent': (overrideText) => {
        console.log('Starting Search Intent')

        // Check for required environment variables and throw spoken error if not present
        if (!CLIENT_ID) {
            this.emit(':tell', 'ERROR! Client ID is not set')
        }
        if (!CLIENT_SECRET) {
            this.emit(':tell', 'ERROR! Client Secret is not set')
        }
        if (!REDIRECT_URL) {
            this.emit(':tell', 'ERROR! Redirect URL is not set')
        }
        if (!API_ENDPOINT) {
            this.emit(':tell', 'ERROR! API endpoint is not set')
        }

        console.log(this.event);
        console.log(this.emit);

        if (!this.event.session || !this.event.session.user.accessToken) {
            this.emit(':tellWithLinkAccountCard', "You must link your Google account to use this skill. Please use the link in the Alexa app to authorise your Google Account.");
            return;
        }

        var alexaUtteranceText = overrideText || this.event.request.intent.slots.search.value;
        console.log('Input text to be processed is "' + alexaUtteranceText + '"');

        console.log('Starting Google Assistant')
        console.log(this.event.session.user.accessToken);

        // authenticate against OAuth using session accessToken
        oauth2Client.setCredentials({
            access_token: this.event.session.user.accessToken
        });
        const callCreds = grpc.credentials.createFromGoogleCredential(oauth2Client);
        const channelCreds = grpc.credentials.createSsl(null);
        const combinedCreds = grpc.credentials.combineChannelCredentials(channelCreds, callCreds);
        assistant = new EmbeddedAssistantClient(API_ENDPOINT, combinedCreds);

        // Create new GRPC stub to communicate with Assistant API
        const conversation = assistant.assist(callCreds, {});

        // Deal with errors from Google API
        // These aren't necessarily all bad unless they are fatal
        conversation.on('error', (err) => {
            console.log('***There was a Google error**' + err);
        });
        conversation.on('end', () => {
            console.log('End of response from GRPC stub');
        });

        // Deal with responses from API
        conversation.on('data', (assistResponse) => {
            console.log(assistResponse);

            // Deal with RESULTS TYPE
            if (assistResponse.result) {
                console.log('Result received');
                if (assistResponse.result.spoken_request_text) {
                    console.log('Request text is: ' + JSON.stringify(assistResponse.result.spoken_request_text));
                }
                if (assistResponse.result.spoken_response_text) {
                    console.log('Response text is: ' + JSON.stringify(assistResponse.result.spoken_response_text));
                    this.emit(':tell', assistResponse.result.spoken_response_text);
                }
                if (assistResponse.result.microphone_mode) {
                    if (assistResponse.result.microphone_mode === 'CLOSE_MICROPHONE') {
                        console.log('closing microphone');
                        microphoneOpen = false;
                    } else if (assistResponse.result.microphone_mode === 'DIALOG_FOLLOW_ON') {
                        console.log('keeping microphone open');
                        microphoneOpen = true;
                    }
                }
                if (assistResponse.result.conversation_state) {
                    console.log('Conversation state changed');
                    conversation_State = assistResponse.result.conversation_state;
                }
            }

            // Look for "END_OF_UTTERANCE" event
            if (assistResponse.event_type && assistResponse.event_type === 'END_OF_UTTERANCE') {
                console.log('End of Utterance received');
                conversation.end();
            }
        })

        console.log("Creating Audio config");
        console.log('Current ConversationState is', conversation_State);

        var assistRequest = {
            config: {
                audio_out_config: {
                    encoding: 1,
                    sample_rate_hertz: 16000,
                    volume_percentage: 100
                },
                dialog_state_in: {
                    language_code: "en-US"
                },
                text_query: alexaUtteranceText
            }
        };
        if (conversation_State.length < 1) {
            console.log('Prior ConverseResponse detected');
            assistRequest.config.dialog_state_in.conversation_State = conversation_State;
        }

        // Send request to Google Assistant API
        conversation.write(assistRequest);
    },

    // Google Assistant will keep the conversation thread open even if we don't give a response to an ask.
    // We need to close the conversation if an ask response is not given (which will end up here)
    // The easiset way to do this is to just send a stop command and this will close the conversation for us
    // (this is against Amazons guides but we're not submitting this!)
    'Unhandled': () => {
        console.log('Unhandled event');
        if (microphoneOpen) {
            this.emit('SearchIntent', 'STOP');
        }
    },

    'AMAZON.StopIntent': () => {
        console.log('Stop Intent')
        if (microphoneOpen) {
            this.emit('SearchIntent', 'STOP');
        }
    },

    'AMAZON.CancelIntent': () => {
        console.log('Cancel Intent');
        if (microphoneOpen) {
            this.emit('SearchIntent', 'CANCEL');
        }
    },

    'SessionEndedRequest': () => {
        console.log(`Session has ended with reason ${this.event.request.reason}`)
        if (microphoneOpen) {
            this.emit('SearchIntent', 'STOP');
        }
    }
};

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.appId = ALEXA_APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
