const X509 = require('jsrsasign').X509;
const KEYUTIL = require('jsrsasign').KEYUTIL;
const crypto = require('jsrsasign').CryptoJS;
const RNG = require('jsrsasign').KJUR.crypto.Util.getRandomHexOfNbytes;
const KJUR = require('jsrsasign').KJUR;
const ECDSA = KJUR.crypto.ECDSA;
const elliptic = require('elliptic');
const sha256 = require('js-sha256').sha256;
const keccak256 = require('js-sha3').keccak256;
const base64url = require('base64url');
const ethereumjs = require('ethereumjs-util');

const _registerType = 'navigator.id.finishEnrollment';
const _authenticateType = 'navigator.id.getAssertion';

// seck256k1;
// eccrypto = require("eccrypto");

// generate a new virtual u2f token;
function genNewU2FKey() {

	// secp256k1;
	// var ec = new KJUR.crypto.ECDSA({'curve': 'secp256r1'});
	var ec = new KJUR.crypto.ECDSA({'curve': 'secp256k1'});
	var ecKey = ec.generateKeyPairHex();

	var u2fKey = {
		_ec: ec,
		_ecKey: ecKey,
		_secret: crypto.enc.Hex.stringify(crypto.SHA256(ecKey)),
		_counter: 0
	}

	return u2fKey;

}


function stringifyU2FKey(u2fToken, passwd='pass') {

	var key = {
		_encryptedPKCS8PEM: KEYUTIL.getPEM(u2fToken._ec, 'PKCS8PRV', passwd),
		_ecKeyStr: u2fToken._ecKey,
		_secret: u2fToken._secret,
		_counter: u2fToken._counter
	};

	key = JSON.stringify(key);

	return key;

}

function parseU2FKeyStr(keyStr, passwd='pass') {

	var dict = JSON.parse(keyStr);
	var u2fKey = {
		_ec: KEYUTIL.getKeyFromEncryptedPKCS8PEM(dict._encryptedPKCS8PEM, passwd),
		_ecKey: dict._ecKeyStr,
		_secret: dict._secret,
		_counter: dict._counter
	};

	return u2fKey;

}



// generate a key pair for the app;
function genKeyForApp(u2fToken, appId, nonce) {

	// same as challenge?
	var message = sha256(appId) + nonce;

	// private key for the app;
	var hash = crypto.HmacSHA256(message, u2fToken._secret);
	var prvKey = crypto.enc.Hex.stringify(hash);

	message = prvKey + sha256(appId);

	// keyHandle;
	hash = crypto.HmacSHA256(message, u2fToken._secret);
	var keyHandle = nonce + crypto.enc.Hex.stringify(hash);

	subjectKey = {
		_prvKey: prvKey,
		_pubKey: null,
		_keyHandle: keyHandle
	}

	return subjectKey;

}

// use decoded clientData;
// return registrationData;
function registerSign(u2fToken, appId, clientData) {

	if (JSON.parse(clientData)['origin'] != appId) {
		console.log('Wrong appId.');
		return 'error';
	}
	if (JSON.parse(clientData)['typ'] != _registerType) {
		console.log('Wrong type.');
		return 'error';
	}

	var appParameter  = sha256(appId);
	var chalParameter = sha256(clientData);

	// var certKey = u2fToken._ecKey.pubKeyObj.pubKeyHex;
	var certKey = u2fToken._ecKey.ecpubhex;

	// secp256r1;
	// var ec = new elliptic.ec('p256');
	// secp256k1;
	var ec = new elliptic.ec('secp256k1');

	var nonce = RNG(32);
	// var nonce = 'd2b9a13d7cd75dc5c538529e0924e524a2abe1d68309fc5e131287cbd0089189'; // For TEST;
	var subjectKey = genKeyForApp(u2fToken, appId, nonce);

	var keyPair = ec.keyFromPrivate(subjectKey._prvKey);
	subjectKey._pubKey = keyPair.getPublic().encode('hex');

	var data = '00' + appParameter + chalParameter + subjectKey._keyHandle + subjectKey._pubKey;
	
	// secp256r1;
	/*
	data = Buffer.from(data, 'hex');
	var signature = u2fToken._ec.signHex(sha256(data), u2fToken._ecKey.ecprvhex);
	*/
	data = '\x19Ethereum Signed Message:\n' + data.length + data;
	var hash = keccak256(data);
	console.log('data: ', data, 'hash: ', hash);
	var sig = ethereumjs.secp256k1.sign(Buffer.from(hash, 'hex'), Buffer.from(u2fToken._ecKey.ecprvhex, 'hex'));
	var signature = sig.signature.toString('hex') + (sig.recovery + 27).toString(16);

	console.log(signature);

	console.log('publicKey, ', subjectKey._pubKey);
	console.log('keyHandle, ', subjectKey._keyHandle);

	// keyHandle and certKey has short lengths;
	// keyHandleLength = 128;
	// certKeyLength = 130;
	keyHandleLen = parseInt(subjectKey._keyHandle.length / 2);
	certKeyLen = parseInt(certKey.length / 2);
	var registrationData = '05' + subjectKey._pubKey + keyHandleLen.toString(16) + subjectKey._keyHandle + certKeyLen.toString(16) + certKey + signature;

	console.log(registrationData);

	return base64url.encode(Buffer.from(registrationData, 'hex'));

}


// return signatureData;
function authenticateSign(u2fToken, appId, keyHandle, publicKey, clientData) {

	if (JSON.parse(clientData)['origin'] != appId) {
		console.log('Wrong appId.');
		return 'error';
	}
	if (JSON.parse(clientData)['typ'] != _authenticateType) {
		console.log('Wrong type.');
		return 'error';
	}


	// verify information via keyHandle, 32 + 32 bytes;
	var nonce = keyHandle.slice(0, 64);
	var macIn = keyHandle.slice(64, 128);


	var subjectKey = genKeyForApp(u2fToken, appId, nonce);
	var message = subjectKey._prvKey + sha256(appId);

	// keyHandle;
	var hash = crypto.HmacSHA256(message, u2fToken._secret);

	if (macIn != crypto.enc.Hex.stringify(hash)) {
		console.log('Wrong key handle.');
		return 'error';
	}


	var appParameter = sha256(appId);
	var chalParameter = sha256(clientData);

	// secp256r1;
	// var ec = new elliptic.ec('p256');
	// secp256k1;
	var ec = new elliptic.ec('secp256k1');

	var keyPair = ec.keyFromPrivate(subjectKey._prvKey);
	subjectKey._pubKey = keyPair.getPublic().encode('hex');

	if (subjectKey._pubKey != publicKey) {
		console.log('Wrong public key.');
		return 'error';
	}

	counterStr = '00000000';

	u2fToken._counter++;

	counter = u2fToken._counter.toString(16);
	counterStr = counterStr.slice(0, counterStr.length - counter.length).concat(counter);

	var userPresence='01';

	var data = appParameter + userPresence + counterStr + chalParameter;

	// signature should be signed with subject's key;
	// secp256r1;
	/*
	data = Buffer.from(data, 'hex');
	var signature = Buffer(keyPair.sign(sha256(data)).toDER()).toString('hex');
	*/

	//sepc256k1;
	data = '\x19Ethereum Signed Message:\n' + data.length + data;
	hash = keccak256(data);
	console.log('data: ', data, 'hash: ', hash);
	var sig = ethereumjs.secp256k1.sign(Buffer.from(hash, 'hex'), Buffer.from(subjectKey._prvKey, 'hex'));
	var signature = sig.signature.toString('hex') + (sig.recovery + 27).toString(16);

	var signatureData = userPresence + counterStr + signature;

	return base64url.encode(Buffer.from(signatureData, 'hex'));


}

module.exports = {

	genNewU2FKey, 
	genKeyForApp,
	registerSign,
	authenticateSign,

	stringifyU2FKey,
	parseU2FKeyStr

};


// test;
/*
// register;
var u2fToken = genNewU2FKey();
var appId = 'https://localhost:3000';
var clientData = '{ "challenge": "X05iEJyCfAhlRTFmMb1d9HqgOXfWeff1_fACv6KV5fo", "origin": "https://localhost:3000", "typ": "navigator.id.finishEnrollment" }';
var registrationData = registerSign(u2fToken, appId, clientData);

console.log(registrationData);

// authenticate;
clientData = '{ "challenge": "UIVEQ5lFiG0le9MEuSrQNsB0YiePWTMx-bZtyIaxCko", "origin": "https://localhost:3000", "typ": "navigator.id.getAssertion" }';
var keyHandle = 'd2b9a13d7cd75dc5c538529e0924e524a2abe1d68309fc5e131287cbd00891893b3269e2e42fc39eaee482e9eadb54dfe208612acea1c80dcfdf23c54f0c8f6f';
var publicKey = '04a16679342f1c20a1d45d3db0e17dc8bd7f943c055b1da0e42ed831826c38a7bfc46add3b8277cfb555d3fdd0a9b29e80663540967f0a8ce315f440171e3ed2e2';
var signatureData = authenticateSign(u2fToken, appId, keyHandle, publicKey, clientData);

console.log(signatureData);

var pem = stringifyU2FKey(u2fToken, 'pass');
console.log(pem);

var recovered = parseU2FKeyStr(pem, 'pass');
console.log(recovered);
*/