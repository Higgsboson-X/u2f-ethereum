(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';
var token = '%[a-f0-9]{2}';
var singleMatcher = new RegExp(token, 'gi');
var multiMatcher = new RegExp('(' + token + ')+', 'gi');

function decodeComponents(components, split) {
	try {
		// Try to decode the entire string first
		return decodeURIComponent(components.join(''));
	} catch (err) {
		// Do nothing
	}

	if (components.length === 1) {
		return components;
	}

	split = split || 1;

	// Split the array in 2 parts
	var left = components.slice(0, split);
	var right = components.slice(split);

	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
}

function decode(input) {
	try {
		return decodeURIComponent(input);
	} catch (err) {
		var tokens = input.match(singleMatcher);

		for (var i = 1; i < tokens.length; i++) {
			input = decodeComponents(tokens, i).join('');

			tokens = input.match(singleMatcher);
		}

		return input;
	}
}

function customDecodeURIComponent(input) {
	// Keep track of all the replacements and prefill the map with the `BOM`
	var replaceMap = {
		'%FE%FF': '\uFFFD\uFFFD',
		'%FF%FE': '\uFFFD\uFFFD'
	};

	var match = multiMatcher.exec(input);
	while (match) {
		try {
			// Decode as big chunks as possible
			replaceMap[match[0]] = decodeURIComponent(match[0]);
		} catch (err) {
			var result = decode(match[0]);

			if (result !== match[0]) {
				replaceMap[match[0]] = result;
			}
		}

		match = multiMatcher.exec(input);
	}

	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
	replaceMap['%C2'] = '\uFFFD';

	var entries = Object.keys(replaceMap);

	for (var i = 0; i < entries.length; i++) {
		// Replace all decoded components
		var key = entries[i];
		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
	}

	return input;
}

module.exports = function (encodedURI) {
	if (typeof encodedURI !== 'string') {
		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
	}

	try {
		encodedURI = encodedURI.replace(/\+/g, ' ');

		// Try the built in decoder first
		return decodeURIComponent(encodedURI);
	} catch (err) {
		// Fallback to a more advanced decoder
		return customDecodeURIComponent(encodedURI);
	}
};

},{}],2:[function(require,module,exports){
'use strict';
const strictUriEncode = require('strict-uri-encode');
const decodeComponent = require('decode-uri-component');
const splitOnFirst = require('split-on-first');

function encoderForArrayFormat(options) {
	switch (options.arrayFormat) {
		case 'index':
			return key => (result, value) => {
				const index = result.length;
				if (value === undefined) {
					return result;
				}

				if (value === null) {
					return [...result, [encode(key, options), '[', index, ']'].join('')];
				}

				return [
					...result,
					[encode(key, options), '[', encode(index, options), ']=', encode(value, options)].join('')
				];
			};

		case 'bracket':
			return key => (result, value) => {
				if (value === undefined) {
					return result;
				}

				if (value === null) {
					return [...result, [encode(key, options), '[]'].join('')];
				}

				return [...result, [encode(key, options), '[]=', encode(value, options)].join('')];
			};

		case 'comma':
			return key => (result, value, index) => {
				if (!value) {
					return result;
				}

				if (index === 0) {
					return [[encode(key, options), '=', encode(value, options)].join('')];
				}

				return [[result, encode(value, options)].join(',')];
			};

		default:
			return key => (result, value) => {
				if (value === undefined) {
					return result;
				}

				if (value === null) {
					return [...result, encode(key, options)];
				}

				return [...result, [encode(key, options), '=', encode(value, options)].join('')];
			};
	}
}

function parserForArrayFormat(options) {
	let result;

	switch (options.arrayFormat) {
		case 'index':
			return (key, value, accumulator) => {
				result = /\[(\d*)\]$/.exec(key);

				key = key.replace(/\[\d*\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = {};
				}

				accumulator[key][result[1]] = value;
			};

		case 'bracket':
			return (key, value, accumulator) => {
				result = /(\[\])$/.exec(key);
				key = key.replace(/\[\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = [value];
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};

		case 'comma':
			return (key, value, accumulator) => {
				const isArray = typeof value === 'string' && value.split('').indexOf(',') > -1;
				const newValue = isArray ? value.split(',') : value;
				accumulator[key] = newValue;
			};

		default:
			return (key, value, accumulator) => {
				if (accumulator[key] === undefined) {
					accumulator[key] = value;
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};
	}
}

function encode(value, options) {
	if (options.encode) {
		return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

function decode(value, options) {
	if (options.decode) {
		return decodeComponent(value);
	}

	return value;
}

function keysSorter(input) {
	if (Array.isArray(input)) {
		return input.sort();
	}

	if (typeof input === 'object') {
		return keysSorter(Object.keys(input))
			.sort((a, b) => Number(a) - Number(b))
			.map(key => input[key]);
	}

	return input;
}

function extract(input) {
	const queryStart = input.indexOf('?');
	if (queryStart === -1) {
		return '';
	}

	return input.slice(queryStart + 1);
}

function parse(input, options) {
	options = Object.assign({
		decode: true,
		arrayFormat: 'none'
	}, options);

	const formatter = parserForArrayFormat(options);

	// Create an object with no prototype
	const ret = Object.create(null);

	if (typeof input !== 'string') {
		return ret;
	}

	input = input.trim().replace(/^[?#&]/, '');

	if (!input) {
		return ret;
	}

	for (const param of input.split('&')) {
		let [key, value] = splitOnFirst(param.replace(/\+/g, ' '), '=');

		// Missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		value = value === undefined ? null : decode(value, options);

		formatter(decode(key, options), value, ret);
	}

	return Object.keys(ret).sort().reduce((result, key) => {
		const value = ret[key];
		if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
			// Sort object keys, not values
			result[key] = keysSorter(value);
		} else {
			result[key] = value;
		}

		return result;
	}, Object.create(null));
}

exports.extract = extract;
exports.parse = parse;

exports.stringify = (object, options) => {
	if (!object) {
		return '';
	}

	options = Object.assign({
		encode: true,
		strict: true,
		arrayFormat: 'none'
	}, options);

	const formatter = encoderForArrayFormat(options);
	const keys = Object.keys(object);

	if (options.sort !== false) {
		keys.sort(options.sort);
	}

	return keys.map(key => {
		const value = object[key];

		if (value === undefined) {
			return '';
		}

		if (value === null) {
			return encode(key, options);
		}

		if (Array.isArray(value)) {
			return value
				.reduce(formatter(key), [])
				.join('&');
		}

		return encode(key, options) + '=' + encode(value, options);
	}).filter(x => x.length > 0).join('&');
};

exports.parseUrl = (input, options) => {
	const hashStart = input.indexOf('#');
	if (hashStart !== -1) {
		input = input.slice(0, hashStart);
	}

	return {
		url: input.split('?')[0] || '',
		query: parse(extract(input), options)
	};
};

},{"decode-uri-component":1,"split-on-first":3,"strict-uri-encode":4}],3:[function(require,module,exports){
'use strict';

module.exports = (string, separator) => {
	if (!(typeof string === 'string' && typeof separator === 'string')) {
		throw new TypeError('Expected the arguments to be of type `string`');
	}

	if (separator === '') {
		return [string];
	}

	const separatorIndex = string.indexOf(separator);

	if (separatorIndex === -1) {
		return [string];
	}

	return [
		string.slice(0, separatorIndex),
		string.slice(separatorIndex + separator.length)
	];
};

},{}],4:[function(require,module,exports){
'use strict';
module.exports = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);

},{}],5:[function(require,module,exports){
window.qs = require('query-string');

window.ethBankAddr = qs.parse(window.location.search).addr;
window.userAddr = qs.parse(window.location.search).user;


/*

	recentTxnAddr = [{
	
		_address,
		_lastTxnTimeStamp,
		_largestTxnAmount,
		_accumulatedTxns,

	}]

	recentTxns = [hash]

*/
window.Account = JSON.parse(localStorage.getItem(userAddr));

if (Account == null || Account == {} || Account._bankAddr != ethBankAddr) {

	window.Account = {

		_bankAddr: ethBankAddr,
		_limit: 10000,

		_lock: false,
		_registered: false,

		_u2fRecords: [],

		// contacted address;
		_recentTxnAddr: [],
		// transactions;
		_recentTxns: [],

		// times, amount;
		_totalDeposit: [0, 0],
		_totalWithdraw: [0, 0],
		_totalTransfer: [0, 0]

	}

	window.localStorage.setItem(userAddr, JSON.stringify(Account));

}


$("div[id*='usage']").hide();
$("div[id*='prompt']").hide();

// ======================================================================================================================== //


window.updateAccount = function() {

	window.localStorage.setItem(userAddr, JSON.stringify(Account));

}


window.clearAccount = function() {

	window.localStorage.setItem(userAddr, null);

}


window.resetAccounts = function() {

	window.localStorage.clear();

}


// logout, prevent backward;
window.preventBack = function() {

	window.history.forward();

}

setTimeout("preventBack()", 0);

window.onunload=function() {null};


// ======================================================================================================================== //

// user;

window.userInfo = function() {

	console.log('userInfo');
	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	var user = document.getElementById('usage-userInfo-basics-user');
	user.innerHTML = '';
	user.innerHTML += '<input type="text" readonly class="form-control" value="' + 
						userAddr + 
						'">';

	var bank = document.getElementById('usage-userInfo-basics-bank');
	bank.innerHTML = '';
	bank.innerHTML += '<input type="text" class="form-control" id="usage-userInfo-basics-bank-form" value="' + 
						ethBankAddr + 
						'">';

	var limit = document.getElementById('usage-userInfo-custom-limit');
	limit.innerHTML = '';
	limit.innerHTML += '<input type="text" class="form-control" id="usage-userInfo-custom-limit-form" value="' + 
						Account._limit + 
						'">';

	$('#basics_form').find('button[type="submit"]').on('click', function(e) { // if submit button is clicked

    	var ethBankAddr = document.getElementById('usage-userInfo-basics-bank-form').value.toLowerCase();
    	console.log('change bank', ethBankAddr);
    	window.Account._bankAddr = ethBankAddr;

    	window.ethBank = window.bankContract.at(ethBankAddr);

    	$('#usage-userInfo-custom-bank-form').val(ethBankAddr);
    	window.Account = null;
    	updateAccount();
    	e.preventDefault();

    	url = './myBank?user=' + userAddr + '&addr=' + ethBankAddr;
    	window.location.href = url;

	});

	$('#custom_form').find('button[type="submit"]').on('click', function(e) { // if submit button is clicked

    	var customLimit = document.getElementById('usage-userInfo-custom-limit-form').value;
    	console.log('change limit', customLimit);
    	window.Account._limit = customLimit;

    	ethBank.setLimit(customLimit, {from: userAddr}, (e, txn) => {
    		console.log(e, txn);
    	});

    	$('#usage-userInfo-custom-limit-form').val(customLimit);
    	updateAccount();
    	e.preventDefault();

	});


	$("div[id*='usage-userInfo']").show();

}


window.userPassword = function() {

	console.log('userPassword');
	// url = './?user=' + userAddr + '&password=true';
	// window.location.href = url;

}


window.userLogout = function() {

	console.log('userLogout');
	window.location.replace('./');

}



// ======================================================================================================================== //

window.promptRegister = function() {

	console.log('notregistered');
	$("div[id*='usage']").hide();

	$("div[id*='main']").show();

	$("#main-prompt-lock").hide();

}

window.promptLock = function() {

	console.log('locked');
	$("div[id*='usage']").hide();

	$("div[id*='main']").show();

	$('#main-prompt-register').hide();

}


// functions;

window.funcDeposit = function() {

	console.log('funcDeposit');

	if (!Account._registered) {
		promptRegister();
		return;
	}

	if (Account._lock) {
		promptLock();
		return;
	}

	// modifies: Account._recentTxns, Account._recentTxnAddr, Account._totalDeposit;
	$('#deposit_form').find('button[type="submit"]').on('click', async function(e) { // if submit button is clicked

		e.preventDefault();

    	var amount = document.getElementById('usage-deposit-form-value').value;
    	console.log('deposit', amount);

    	document.getElementById('deposit_form').reset();

    	if (amount == null || parseInt(amount) <= 0 || amount == '') {
			return;
		}

    	var authenticated = false;
    	var confirmed = false;

    	if (parseInt(amount) > parseInt(Account._limit) && !authenticated) {

    		authenticated = true;

    		await beginAuthentication(async (err, id) => {
    			if (err) {
    				alert('[ERROR] Signature request error.');
    			}
    			else if (!confirmed) {
    				confirmed = true;
    				await confirmAuthentication(id, async (signed) => {
    					if (!signed) {
    						alert('[ERROR] Signature verification error.');
    						return;
    					}
    					var deposited = false;
    					await ethBank.deposit(amount, {from: userAddr, value: web3.toWei(amount, "wei")}, (e, txn) => {
    						console.log(e, txn);
    						if (e) {
    							alert(e);
    						}
    						else if (deposited) {
    							return;
    						}
    						else {
    							deposited = true;
    							Account._recentTxns.splice(0, 0, txn);
    							Account._totalDeposit[0] += 1;
    							Account._totalDeposit[1] = parseInt(Account._totalDeposit[1]) + parseInt(amount);

    							var found = false;
                                var date = new Date();
    							var time = '[' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '] ' + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    							var i;
    							for (i = 0; i < Account._recentTxnAddr.length; i++) {
    								if (Account._recentTxnAddr[i]._address == ethBankAddr) {
    									found = true;
    									window.Account._recentTxnAddr[i]._lastTxnTimeStamp = time;
    									window.Account._recentTxnAddr[i]._largestTxnAmount = parseInt(Account._recentTxnAddr[i]._largestTxnAmount) > parseInt(amount) ? parseInt(Account._recentTxnAddr[i]._largestTxnAmount) : parseInt(amount);
    									window.Account._recentTxnAddr[i]._accumulatedTxns += 1;
    									updateAccount();
    									break;
    								}
    							}
    							if (!found) {
    								
    								var addr = {
	
										_address: ethBankAddr,
										_lastTxnTimeStamp: time,
										_largestTxnAmount: amount,
										_accumulatedTxns: 1

									};
									window.Account._recentTxnAddr.splice(0, 0, addr);
									updateAccount();
								}
								
    						}
    					});

    				});
    			}
    			
    		});
    	}

    	else {
    		var deposited = false;
    		await ethBank.deposit(amount, {from: userAddr, value: web3.toWei(amount, "wei")}, (e, txn) => {
    			
    			console.log(e, txn);
    			if (e) {
    				alert(e);
    				return;
    			}
    			else if (deposited) {
    				return;
    			}
    			else {
    				deposited = true;
    				Account._recentTxns.splice(0, 0, txn);
    				Account._totalDeposit[0] += 1;
    				Account._totalDeposit[1] = parseInt(Account._totalDeposit[1]) + parseInt(amount);
    				
    				var found = false;
                    var date = new Date();
    				var time = '[' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '] ' + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    				var i;
    				for (i = 0; i < Account._recentTxnAddr.length; i++) {
    					if (Account._recentTxnAddr[i]._address == ethBankAddr) {
    						found = true;
    						window.Account._recentTxnAddr[i]._lastTxnTimeStamp = time;
    						window.Account._recentTxnAddr[i]._largestTxnAmount = parseInt(Account._recentTxnAddr[i]._largestTxnAmount) > parseInt(amount) ? parseInt(Account._recentTxnAddr[i]._largestTxnAmount) : parseInt(amount);
    						window.Account._recentTxnAddr[i]._accumulatedTxns += 1;
    						updateAccount();
   							break;
    					}
    				}
    				if (!found) {
    					
    					var addr = {

							_address: ethBankAddr,
							_lastTxnTimeStamp: time,
							_largestTxnAmount: amount,
							_accumulatedTxns: 1

						};
						window.Account._recentTxnAddr.splice(0, 0, addr);
						updateAccount();
					}
    			}
    		});

    	}

    	

	});

	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	$("div[id*='usage-deposit']").show();


}


window.funcWithdraw = function() {

	console.log('funcWithdraw');

	if (!Account._registered) {
		promptRegister();
		return;
	}

	if (Account._lock) {
		promptLock();
		return;
	}

	// modifies: Account._recentTxns, Account._recentTxnAddr, Account._totalDeposit;
	$('#withdraw_form').find('button[type="submit"]').on('click', async function(e) { // if submit button is clicked

		e.preventDefault();

    	var amount = document.getElementById('usage-withdraw-form-value').value;
    	console.log('withdraw', amount);

    	document.getElementById('withdraw_form').reset();

    	if (amount == null || parseInt(amount) <= 0 || amount == '') {
			return;
		}

    	var authenticated = false;
    	var confirmed = false;

    	if (parseInt(amount) > parseInt(Account._limit) && !authenticated) {

    		authenticated = true;

    		await beginAuthentication(async (err, id) => {
    			if (err) {
    				alert('[ERROR] Signature request error.');
    			}
    			else if (!confirmed) {
    				confirmed = true;
    				await confirmAuthentication(id, async (signed) => {
    					if (!signed) {
    						alert('[ERROR] Signature verification error.');
    						return;
    					}
    					var withdrawn = false;
    					await ethBank.withdraw(amount, {from: userAddr}, (e, txn) => {
    						console.log(e, txn);
    						if (e) {
    							alert(e);
    						}
    						else if (withdrawn) {
    							return;
    						}
    						else {
    							withdrawn = true;
    							Account._recentTxns.splice(0, 0, txn);
    							Account._totalWithdraw[0] += 1;
    							Account._totalWithdraw[1] = parseInt(Account._totalWithdraw[1]) + parseInt(amount);

    							var found = false;
                                var date = new Date();
    							var time = '[' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '] ' + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    							var i;
    							for (i = 0; i < Account._recentTxnAddr.length; i++) {
    								if (Account._recentTxnAddr[i]._address == ethBankAddr) {
    									found = true;
    									window.Account._recentTxnAddr[i]._lastTxnTimeStamp = time;
    									window.Account._recentTxnAddr[i]._largestTxnAmount = parseInt(Account._recentTxnAddr[i]._largestTxnAmount) > parseInt(amount) ? parseInt(Account._recentTxnAddr[i]._largestTxnAmount) : parseInt(amount);
    									window.Account._recentTxnAddr[i]._accumulatedTxns += 1;
    									updateAccount();
    									break;
    								}
    							}
    							if (!found) {
    								
    								var addr = {
	
										_address: ethBankAddr,
										_lastTxnTimeStamp: time,
										_largestTxnAmount: amount,
										_accumulatedTxns: 1

									};
									window.Account._recentTxnAddr.splice(0, 0, addr);
									updateAccount();
								}
								
    						}
    					});

    				});
    			}
    			
    		});
    	}

    	else {
    		var withdrawn = false;
    		await ethBank.withdraw(amount, {from: userAddr}, (e, txn) => {
    			
    			console.log(e, txn);
    			if (e) {
    				alert(e);
    				return;
    			}
    			else if (withdrawn) {
    				return;
    			}
    			else {
    				withdrawn = true;
    				Account._recentTxns.splice(0, 0, txn);
    				Account._totalWithdraw[0] += 1;
    				Account._totalWithdraw[1] = parseInt(Account._totalWithdraw[1]) + parseInt(amount);
    				
    				var found = false;
                    var date = new Date();
    				var time = '[' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '] ' + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    				var i;
    				for (i = 0; i < Account._recentTxnAddr.length; i++) {
    					if (Account._recentTxnAddr[i]._address == ethBankAddr) {
    						found = true;
    						window.Account._recentTxnAddr[i]._lastTxnTimeStamp = time;
    						window.Account._recentTxnAddr[i]._largestTxnAmount = parseInt(Account._recentTxnAddr[i]._largestTxnAmount) > parseInt(amount) ? parseInt(Account._recentTxnAddr[i]._largestTxnAmount) : parseInt(amount);
    						window.Account._recentTxnAddr[i]._accumulatedTxns += 1;
    						updateAccount();
   							break;
    					}
    				}
    				if (!found) {
    					
    					var addr = {

							_address: ethBankAddr,
							_lastTxnTimeStamp: time,
							_largestTxnAmount: amount,
							_accumulatedTxns: 1

						};
						window.Account._recentTxnAddr.splice(0, 0, addr);
						updateAccount();
					}
    			}
    		});

    	}

	});

	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	$("div[id*='usage-withdraw']").show();

}


window.funcTransfer = function() {

	console.log('funcTransfer');

	if (!Account._registered) {
		promptRegister();
		return;
	}

	if (Account._lock) {
		promptLock();
		return;
	}

	// modifies: Account._recentTxns, Account._recentTxnAddr, Account._totalDeposit;
	$('#transfer_form').find('button[type="submit"]').on('click', async function(e) { // if submit button is clicked

		e.preventDefault();

		var to = document.getElementById('usage-transfer-form-to').value
    	var amount = document.getElementById('usage-transfer-form-value').value;
    	console.log('to', to);
    	console.log('transfer', amount);

    	document.getElementById('transfer_form').reset();

    	if (to == '' || to == null || amount == null || parseInt(amount) <= 0 || amount == '') {
    		return;
    	}

    	var authenticated = false;
    	var confirmed = false;

    	if (parseInt(amount) > parseInt(Account._limit) && !authenticated) {

    		authenticated = true;

    		await beginAuthentication(async (err, id) => {
    			if (err) {
    				alert('[ERROR] Signature request error.');
    			}
    			else if (!confirmed) {
    				confirmed = true;
    				await confirmAuthentication(id, async (signed) => {
    					if (!signed) {
    						alert('[ERROR] Signature verification error.');
    						return;
    					}
    					var transferred = false;
    					await ethBank.transferViaBank(to, amount, {from: userAddr}, (e, txn) => {
    						console.log(e, txn);
    						if (e) {
    							alert(e);
    						}
    						else if (transferred) {
    							return;
    						}
    						else {
    							transferred = true;
    							Account._recentTxns.splice(0, 0, txn);
    							Account._totalTransfer[0] += 1;
    							Account._totalTransfer[1] = parseInt(Account._totalTransfer[1]) + parseInt(amount);

    							var found = false;
                                var date = new Date();
    							var time = '[' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '] ' + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    							var i;
    							for (i = 0; i < Account._recentTxnAddr.length; i++) {
    								if (Account._recentTxnAddr[i]._address == to) {
    									found = true;
    									window.Account._recentTxnAddr[i]._lastTxnTimeStamp = time;
    									window.Account._recentTxnAddr[i]._largestTxnAmount = parseInt(Account._recentTxnAddr[i]._largestTxnAmount) > parseInt(amount) ? parseInt(Account._recentTxnAddr[i]._largestTxnAmount) : parseInt(amount);
    									window.Account._recentTxnAddr[i]._accumulatedTxns += 1;
    									updateAccount();
    									break;
    								}
    							}
    							if (!found) {
    								
    								var addr = {
	
										_address: to,
										_lastTxnTimeStamp: time,
										_largestTxnAmount: amount,
										_accumulatedTxns: 1

									};
									window.Account._recentTxnAddr.splice(0, 0, addr);

									updateAccount();
								}
								
    						}
    					});

    				});
    			}
    			
    		});
    	}

    	else {
    		var transferred = false;
    		await ethBank.transferViaBank(to, amount, {from: userAddr}, (e, txn) => {
    			
    			console.log(e, txn);
    			if (e) {
    				alert(e);
    				return;
    			}
    			else if (transferred) {
    				return;
    			}
    			else {
    				transferred = true;
    				Account._recentTxns.splice(0, 0, txn);
    				Account._totalTransfer[0] += 1;
    				Account._totalTransfer[1] = parseInt(Account._totalTransfer[1]) + parseInt(amount);
    				
    				var found = false;
                    var date = new Date();
    				var time = '[' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '] ' + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    				var i;
    				for (i = 0; i < Account._recentTxnAddr.length; i++) {
    					if (Account._recentTxnAddr[i]._address == to) {
    						found = true;
    						window.Account._recentTxnAddr[i]._lastTxnTimeStamp = time;
    						window.Account._recentTxnAddr[i]._largestTxnAmount = parseInt(Account._recentTxnAddr[i]._largestTxnAmount) > parseInt(amount) ? parseInt(Account._recentTxnAddr[i]._largestTxnAmount) : parseInt(amount);
    						window.Account._recentTxnAddr[i]._accumulatedTxns += 1;
    						updateAccount();
   							break;
    					}
    				}
    				if (!found) {
    					
    					var addr = {

							_address: to,
							_lastTxnTimeStamp: time,
							_largestTxnAmount: amount,
							_accumulatedTxns: 1

						};
						window.Account._recentTxnAddr.splice(0, 0, addr);
						updateAccount();
					}
    			}
    		});

    	}

	});

	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	$("div[id*='usage-transfer']").show();

}


window.funcLockAccount = function() {

	console.log('funcLockAccount');

	if (!Account._registered) {
		promptRegister();
		return;
	}

	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	$("div[id*='usage-lock']").show();

	if (Account._lock) {
		$('#usage-lock-lock').hide();
	}
	else {
		$('#usage-lock-unlock').hide();
	}

}


window.lockAccount = async function() {

	console.log('lock account');

	var confirmed = false;

    await beginAuthentication(async (err, id) => {
    	if (err) {
    		alert('[ERROR] Signature request error.');
    	}
    	else if (!confirmed) {
    		confirmed = true;
    		await confirmAuthentication(id, async (signed) => {
    			if (!signed) {
    				alert('[ERROR] Signature verification error.');
    				return;
    			}
    			await ethBank.lockBank({from: userAddr}, (e, txn) => {
    				console.log(e, txn);
    				if (e) {
    					alert(e);
    				}
    				else {
    					
    					window.Account._lock = true;
    					updateAccount();
    					funcLockAccount();
								
    				}
    			});

    		});
    	}
    			
    });

}


window.unlockAccount = async function() {

	console.log('unlock account');

	var confirmed = false;

    await beginAuthentication(async (err, id) => {
    	if (err) {
    		alert('[ERROR] Signature request error.');
    	}
    	else if (!confirmed) {
    		confirmed = true;
    		await confirmAuthentication(id, async (signed) => {
    			if (!signed) {
    				alert('[ERROR] Signature verification error.');
    				return;
    			}
    			await ethBank.unlockBank({from: userAddr}, (e, txn) => {
    				console.log(e, txn);
    				if (e) {
    					alert(e);
    				}
    				else {
    					
    					window.Account._lock = false;
    					updateAccount();
    					funcLockAccount();
								
    				}
    			});

    		});
    	}
    			
    });

}


// ======================================================================================================================== //


window.registerKey = function() {

	console.log('registerKey');
	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	fetchU2FRequests();

	$("div[id*='usage-registerKey']").show();

	$('#prompt-register').css('visibility', 'hidden');

}



window.myETHBank = async function() {

	console.log('myETHBank');
	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	// status;
	await ethBank._lock(async (e, lock) => {
		window.Account._lock = lock;
		var balance;
		await ethBank.getBalance({from: userAddr}, async (e, bal) => {
			console.log(balance);
			balance = parseInt(bal);

			var status = document.getElementById('usage-myBank-status');
			status.innerHTML = '';
			status.innerHTML += '<h3>Status</h3>' + 
								'<dl class="dl-horizontal">' + 
								'<dt>Owner</dt><dd>' + userAddr + '</dd>' + 
								'<dt>Bank</dt><dd>' + ethBankAddr + '</dd>' + 
								'<dt>Locked</dt><dd>' + Account._lock + '</dd>' + 
								'<dt>Balance</dt><dd>' + balance + ' Wei</dd>';
			updateAccount();
		});
	});
	
	// u2f;
	var device;
	await ethBank._registeredKey(async (e, key) => {
		console.log(key);
		if (e || key == null || key == 'undefined' || key == '0x') {
			device = 'NA';
		}
		else {
			device = hex2a(key.slice(2, key.length));
		}
		var verified;
		await ethBank._lastVerified(async (e, ver) => {
			console.log(ver);
			if (e || ver == null || ver == 'undefined' || ver == '0x') {
				verified = 'NA';
			}
			else {
				verified = hex2a(ver.slice(2, ver.length));
			}
			console.log(device);
			var u2f = document.getElementById('usage-myBank-u2f');
			u2f.innerHTML = '';
			u2f.innerHTML += '<h3>U2F</h3>' + 
					 		 '<dl class="dl-horizontal">' + 
					 		 '<dt>Registered</dt><dd>' + Account._registered + '</dd>' + 
					 		 '<dt>Transfer Limit</dt><dd>' + Account._limit + ' Wei</dd>' + 
					 		 '<dt>Registered Key Info</dt><dd>' + JSON.parse(device)['version'] + '<br>' +
					 		 JSON.parse(device)['appId'] + '</dd>' + 
					 		 '<dt>Counter</dt><dd>' + JSON.parse(verified)['counter'] + '</dd>';
		});
	});
	
	var txns = document.getElementById('usage-myBank-txns');
	txns.innerHTML = '';
	txns.innerHTML += '<h3>Transactions</h3>' + 
					  '<table class="table table-hover">' + 
					  '<thead><tr>' + 
					  '<th>Events</th><th>Count</th><th>Amount [Wei]</th>' + 
					  '</tr></thead>' + 
					  '<tbody>' + 
					  '<tr><td>Deposit</td><td>' + Account._totalDeposit[0] + '</td><td>' + Account._totalDeposit[1] + '</td></tr>' + 
					  '<tr><td>Withdraw</td><td>' + Account._totalWithdraw[0] + '</td><td>' + Account._totalWithdraw[1] + '</td></tr>' + 
					  '<tr><td>Transfer</td><td>' + Account._totalTransfer[0] + '</td><td>' + Account._totalTransfer[1] + '</td></tr>' + 
					  '</tbody></table>';


	$("div[id*='usage-myBank']").show();

}


window.recentTxns = async function() {

	console.log('recentTxns');
	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	var list = document.getElementById('usage-recentTxns-list');
	list.innerHTML = '';
	var receipt;
	var i, txn;

	for (i = 0; i < Account._recentTxns.length; i++) {
		txn = Account._recentTxns[i];
		list.innerHTML += '<div class="well"><h3><span class="glyphicon glyphicon-tag"></span><i>Transaction Hash</i>: <br></h3>' + txn + '' +
						  '<div id="usage-recentTxns-list-' + i + '">Click `Receipt` to get the transaction receipt.</div>' +
						  '<div><button class="btn btn-primary" onclick="showTxn(\''+i+'\')">Receipt</button></div>' + 
						  '</div>';
	}

	$("div[id*='usage-recentTxns']").show();

}



window.showTxn = function(id) {

	console.log('show transaction: ', id);

	web3.eth.getTransactionReceipt(window.Account._recentTxns[id], (e, rcpt) => {
		if (e) {
			console.log(e);
			receipt = '[ERROR] Recept error.';
		}
		else {
			receipt = JSON.stringify(rcpt);
		}
		var detail = document.getElementById('usage-recentTxns-list-' + id);
		detail.innerHTML = receipt;
	});

}


window.clearRecentTxns = function() {

	Account._recentTxns = [];
	updateAccount();
	recentTxns();

}


async function recentAddrHelper(callback) {

	var additional = '';

	var addr;
	for (var i = 0; i < Account._recentTxnAddr.length; i++) {
		addr = Account._recentTxnAddr[i];
		additional += '<tr><td>' + addr._lastTxnTimeStamp + '</td><td>' + addr._accumulatedTxns + '</td><td>' + addr._largestTxnAmount + ' Wei</td></tr>'
	}

	console.log(additional);

	callback(additional);

}


window.recentAddr = async function() {

	console.log('recentAddr');
	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	window.Account._recentTxnAddr.sort(recentAddrComp);
	console.log(Account._recentTxnAddr);
	var list = document.getElementById('usage-recentTxnAddr-list');
	var str = '';
	str += '<table class="table table-hover">' + 
	 	   '<thead><tr>' + 
		   '<th>Last Transaction Time</th><th>Count</th><th>Largest Txn Amount</th>' + 
		   '</tr></thead><tbody>';

	await recentAddrHelper((res) => {
		str += res + '</tbody><table>';
		// console.log(str);
		list.innerHTML = str;
	});

	$("div[id*='usage-recentTxnAddr']").show();
	
}

// recent address: {_count, _largestTxnAmount, _lastTxnTimeStanp (date)};

function recentAddrComp(a, b) {

	if (parseInt(a._largestTxnAmount) > parseInt(b._largestTxnAmount)) {
		return -1;
	}
	else if (parseInt(a._largestTxnAmount) < parseInt(b._largestTxnAmount)) {
		return 1;
	}
	else {
		return 0;
	}

}


window.clearRecentTxnAddr = function() {

	Account._recentTxnAddr = [];
	updateAccount();
	recentAddr();

}



},{"query-string":2}]},{},[5]);
