const vk = require('./virtual-key');
const base64url = require('base64url');

const _version = 'U2F_V2';

function u2fRegisterClient(request, u2fToken) {

	return new Promise((resolve, reject) => {

		requestDict = JSON.parse(request);
		// {version, challenge, appId};
		if (requestDict['version'] != _version) {
			console.log('Wrong version.');
			var error = {

			}
			reject('Wrong version.');
		}

		var clientData = {
			'typ': 'navigator.id.finishEnrollment',
			'challenge': requestDict['challenge'],
			'origin': requestDict['appId']
		};

		clientData = JSON.stringify(clientData);
		var registrationData = vk.registerSign(u2fToken, requestDict['appId'], clientData);

		if (registrationData == 'error') {
			reject('U2F token signature error.');
		}

		var response = {
			'registrationData': registrationData,
			'clientData': base64url.encode(clientData)
		};

		resolve(JSON.stringify(response));

	});

}


function u2fAuthenticateClient(request, u2fToken) {

	return new Promise((resolve, reject) => {

		var requestDict = JSON.parse(request);
		// {keyHandle, version, challenge, appId, publicKey};
		if (requestDict['version'] != _version) {
			console.log('Wrong version.');
			resolve('Wrong version.');
		}

		var clientData = {
			'typ': 'navigator.id.getAssertion',
			'challenge': requestDict['challenge'],
			'origin': requestDict['appId']
		};

		clientData = JSON.stringify(clientData);

		var appId = requestDict['appId'];
		var keyHandle = base64url.toBuffer(requestDict['keyHandle']).toString('hex');
		var publicKey = base64url.toBuffer(requestDict['publicKey']).toString('hex');

		var signatureData = vk.authenticateSign(u2fToken, appId, keyHandle, publicKey, clientData);

		if (signatureData == 'error') {
			reject('U2F token signature error.');
		}

		var response = {
			'signatureData': signatureData,
			'clientData': base64url.encode(clientData),
			'keyHandle': requestDict['keyHandle']
		};

		resolve(JSON.stringify(response));

	});

}


module.exports = {

	u2fRegisterClient,
	u2fAuthenticateClient

};


// test;

/*
var u2fToken = vk.genNewU2FKey();
var registerRequest = '{"challenge": "X05iEJyCfAhlRTFmMb1d9HqgOXfWeff1_fACv6KV5fo", "version": "U2F_V2", "appId": "https://localhost:3000"}';
var registerResponse = u2fRegisterClient(registerRequest, u2fToken);

console.log(registerResponse);

var authenticateRequest = '{"version": "U2F_V2", "keyHandle": "0rmhPXzXXcXFOFKeCSTlJKKr4daDCfxeExKHy9AIkYk7Mmni5C_Dnq7kgunq21Tf4ghhKs6hyA3P3yPFTwyPbw", "challenge": "UIVEQ5lFiG0le9MEuSrQNsB0YiePWTMx-bZtyIaxCko", "appId": "https://localhost:3000", "publicKey": "BKFmeTQvHCCh1F09sOF9yL1_lDwFWx2g5C7YMYJsOKe_xGrdO4J3z7VV0_3QqbKegGY1QJZ_CozjFfRAFx4-0uI"}'
var authenticateResponse = u2fAuthenticateClient(authenticateRequest, u2fToken);

console.log(authenticateResponse);
*/
