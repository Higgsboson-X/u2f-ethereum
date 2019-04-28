window.qs = require('query-string');
window.sha256 = require('js-sha256').sha256;

window.ethManagerAddr = qs.parse(window.location.search).addr;
window.userAddr = qs.parse(window.location.search).user;

// window.ethManager = window.managerContract.at(ethManagerAddr);


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

if (Account == null || Account == {} || Account._managerAddr != ethManagerAddr) {

	window.Account = {

		_managerAddr: ethManagerAddr,
		_limit: 10000,
        _policy: 'strict',
        _expire: 24 * 3600 * 1000,
        _pendingTxns: [],
        _transferHistory: {},

		_lock: false,
		_registered: false,

		_u2fRecords: [],

		// contacted address;
		_recentTxnAddr: [],
		// transactions;
		_recentTxns: [],

		// times, amount;
		_totalTransfer: [0, 0],
        // available policies;
        _policyList: ['strict', 'history']

	}

    $('#u2f-policy-history-sel').attr('checked', false);
    $('#u2f-policy-strict-sel').attr('checked', true);

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

window.onunload = function() {null};


// ======================================================================================================================== //

// user;

window.inputPolicy = function() {

    console.log('show');

    var history = document.getElementById('policy-history-sel').checked;
    var form = document.getElementById('policy-history-form');

    console.log(history);

    if (history) {
        form.innerHTML = '<label for="policy-history-form" class="control-label"><i>History Lifetime (Integer Only) [h]</i></label>' + 
                         '<input type="text" id="policy-history-expire" class="form-control" name="policy-history-expire" value="' + Account._expire / (3600 * 1000) + '"/>';
    }
    
    else {
        form.innerHTML = '';
    }

}


window.userInfo = function() {

	console.log('userInfo');
	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	var user = document.getElementById('usage-userInfo-basics-user');
	user.innerHTML = '';
	user.innerHTML += '<input type="text" readonly class="form-control" value="' + 
						userAddr + 
						'">';

	var manager = document.getElementById('usage-userInfo-basics-manager');
	manager.innerHTML = '';
	manager.innerHTML += '<input type="text" class="form-control" id="usage-userInfo-basics-manager-form" value="' + 
						ethManagerAddr + 
						'">';

	var limit = document.getElementById('usage-userInfo-custom-limit');
	limit.innerHTML = '';
	limit.innerHTML += '<input type="text" class="form-control" id="usage-userInfo-custom-limit-form" value="' + 
						Account._limit + 
						'">';

    if (Account._policy == 'strict') {
        $('#policy-strict-sel').attr('checked', true);
        $('#policy-history-sel').attr('checked', false);
        inputPolicy();
    }
    else if (Account._policy == 'history') {
        $('#policy-strict-sel').attr('checked', false);
        $('#policy-history-sel').attr('checked', true);
        inputPolicy();
    }

	$('#basics_form').find('button[type="submit"]').on('click', function(e) { // if submit button is clicked

    	var ethManagerAddr = document.getElementById('usage-userInfo-basics-manager-form').value.toLowerCase();
    	console.log('change bank', ethManagerAddr);
    	window.Account._managerAddr = ethManagerAddr;

    	window.ethManager = window.managerContract.at(ethManagerAddr);

    	$('#usage-userInfo-custom-manager-form').val(ethManagerAddr);
    	window.Account = null;
    	updateAccount();
    	e.preventDefault();

    	url = './myAccount?user=' + userAddr + '&addr=' + ethManagerAddr;
    	window.location.href = url;

	});

	$('#custom_form').find('button[type="submit"]').on('click', function(e) { // if submit button is clicked

    	var customLimit = document.getElementById('usage-userInfo-custom-limit-form').value;
    	console.log('change limit', customLimit);
        e.preventDefault();

    	window.Account._limit = customLimit;

        var changed = false;

        if (!changed) {
            changed = true;
            ethManager.setLimit(customLimit, {from: userAddr}, (e, txn) => {
                console.log(e, txn);
                userInfo();
            });

            $('#usage-userInfo-custom-limit-form').val(customLimit);
            updateAccount();
        }

	});

    $('#policy_form').find('button[type="submit"]').on('click', async function(e) { // if submit button is clicked

        var strict = document.getElementById('policy-strict-sel').checked;
        var history = document.getElementById('policy-history-sel').checked;

        var policy;
        if (strict) {
            policy = 0;
        }
        else if (history) {
            policy = 1;
        }

        var expire = document.getElementById('policy-history-expire').value;

        console.log(policy, expire);

        e.preventDefault();

        var authenticated = false;
        var confirmed = false;

        if (!authenticated) {
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
                        var changed = false;
                        if (expire == null) {
                            expire = Account._expire;
                        }
                        await ethManager.setPolicy(policy, expire, {from: userAddr}, (e, txn) => {
                            console.log(e, txn);
                            if (e) {
                                alert(e);
                            }
                            else if (changed) {
                                return;
                            }
                            else {
                                changed = true;
                                Account._policy = Account._policyList[policy];
                                Account._expire = expire * 3600 * 1000; // in milliseconds;
                                updateAccount();
                                userInfo();
                            }
                        });

                    });
                }
                
            });
        }

        $('#policy-history-expire').val(expire);
        
    });


	$("div[id*='usage-userInfo']").show();

}


window.userPassword = function() {

	console.log('userPassword');

    $("div[id*='main']").hide();
    $("div[id*='usage']").hide();

    $("div[id*='usage-password']").show();

    $('#password_form').find('button[type="submit"]').on('click', function(e) { // if submit button is clicked

        var cur_password = document.getElementById('usage-password-cur').value;
        var new_password = document.getElementById('usage-password-new').value;
        var cfn_password = document.getElementById('usage-password-cfn').value;

        console.log(cur_password, new_password, cfn_password);

        document.getElementById('password_form').reset();

        var users = JSON.parse(localStorage.getItem('users'));

        e.preventDefault();

        if (sha256(userAddr + cur_password) != users[userAddr]._password) {
            alert('Wrong current password.');
            e.preventDefault();
            return;
        }
        if (cfn_password != new_password) {
            alert('Password is not confirmed.');
            e.preventDefault();
            return;
        }

        users[userAddr]._password = sha256(userAddr + new_password);

        console.log(users);
        localStorage.setItem('users', JSON.stringify(users));

    });

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
        var pendingTime = document.getElementById('usage-transfer-form-delay-time').value;

        var delay = !(pendingTime == null || pendingTime == '' || pendingTime <= 0);

    	console.log('to', to);
    	console.log('transfer', amount);
        console.log('delay', delay);
        console.log('pendingTime', pendingTime);

    	document.getElementById('transfer_form').reset();

    	if (to == '' || to == null || amount == null || parseInt(amount) <= 0 || amount == '') {
    		return;
    	}

        console.log('time: ', Date.now() - parseInt(Account._transferHistory[to]));

        // check whether the history has expired;
        if (Account._transferHistory[to] != null && (Date.now() - parseInt(Account._transferHistory[to])) >= parseInt(Account._expire)) {
            Account._transferHistory[to] = null;
            console.log('1');
        }

    	if (parseInt(amount) > parseInt(Account._limit) && !authenticated && (Account._policy == 'strict' || (Account._policy == 'history' && Account._transferHistory[to] == null))) {

            console.log('2');

            var authenticated = false;
            var confirmed = false;

            console.log('transfer history: ', Account._transferHistory[to]);

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
    					await ethManager.transferViaManager(to, amount, pendingTime, {from: userAddr, value: amount}, (e, txn) => {
    						console.log(e, txn);
    						if (e) {
    							alert(e);
    						}
    						else if (transferred) {
    							return;
    						}
    						else {
                                console.log(Date.now());
                                Account._transferHistory[to] = Date.now();

    							transferred = true;

                                // update recent transactions;
    							Account._recentTxns.splice(0, 0, txn);
    							Account._totalTransfer[0] += 1;
    							Account._totalTransfer[1] = parseInt(Account._totalTransfer[1]) + parseInt(amount);

    							var found = false;
                                var date = new Date();
    							var time = '[' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '] ' + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    							
                                // pending transactions;
                                if (delay) {
                                    var pendingTxn = {
                                        _to: to,
                                        _amount: amount,
                                        _validTime: Date.now() + pendingTime,
                                        _createTime: time,
                                        _pendingTime: pendingTime
                                    }

                                    Account._pendingTxns.push(pendingTxn);
                                }
                                // update recent transaction address;
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
    		await ethManager.transferViaManager(to, amount, pendingTime, {from: userAddr, value: amount}, (e, txn) => {
    			
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

                    // upate recent transactions;
    				Account._recentTxns.splice(0, 0, txn);
    				Account._totalTransfer[0] += 1;
    				Account._totalTransfer[1] = parseInt(Account._totalTransfer[1]) + parseInt(amount);
    				
    				var found = false;
                    var date = new Date();
    				var time = '[' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '] ' + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    				
                    // pending transactions;
                    if (parseInt(amount) > parseInt(Account._limit) && delay) {

                        var pendingTxn = {
                            _to: to,
                            _amount: amount,
                            _validTime: Date.now() + pendingTime,
                            _createTime: time,
                            _pendingTime: pendingTime
                        }

                        Account._pendingTxns.push(pendingTxn);

                    }

                    // update recent transaction address;
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
    			await ethManager.lockAccount({from: userAddr}, (e, txn) => {
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
    			await ethManager.unlockAccount({from: userAddr}, (e, txn) => {
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



window.myAccount = async function() {

	console.log('myAccount');
	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	// status;
	await ethManager.getUserInfo(async (e, result) => {
		console.log(e, result);

        lock = result[4];

        window.Account._lock = lock;

		var status = document.getElementById('usage-myAccount-status');
		status.innerHTML = '';
		status.innerHTML += '<h3>Status</h3>' + 
							'<dl class="dl-horizontal">' + 
							'<dt>Owner</dt><dd>' + userAddr + '</dd>' + 
							'<dt>Manager</dt><dd>' + ethManagerAddr + '</dd>' + 
							'<dt>Locked</dt><dd>' + Account._lock + '</dd>';
		updateAccount();
	});
	
	// u2f;
	var device, verified;
	await ethManager.getUserU2F(async (e, result) => {
        console.log(result);
        var registeredKey = result[1];
		console.log(registeredKey);
		if (e || registeredKey == null || registeredKey == 'undefined' || registeredKey == '0x') {
			device = '{"version": "NA", "appId": "NA"}';
		}
		else {
			device = hex2a(registeredKey.slice(2, registeredKey.length));
		}
        console.log(device);
        var lastVerified = result[3];
		console.log(lastVerified);
		if (e || lastVerified == null || lastVerified == 'undefined' || lastVerified == '0x') {
			verified = '{"counter": "NA", "keyHandle": "NA"}';
		}
		else {
			verified = hex2a(lastVerified.slice(2, lastVerified.length));
		}
        console.log(verified);
		var u2f = document.getElementById('usage-myAccount-u2f');
		u2f.innerHTML = '';
		u2f.innerHTML += '<h3>U2F</h3>' + 
				 		 '<dl class="dl-horizontal">' + 
				 		 '<dt>Registered</dt><dd>' + Account._registered + '</dd>' + 
				 		 '<dt>Transfer Limit</dt><dd>' + Account._limit + ' Wei</dd>' + 
				 		 '<dt>Registered Key Info</dt><dd>' + JSON.parse(device)['version'] + '<br>' +
				 		 JSON.parse(device)['appId'] + '</dd>' + 
				 		 '<dt>Counter</dt><dd>' + JSON.parse(verified)['counter'] + '</dd>';
	});
	
	var txns = document.getElementById('usage-myAccount-txns');
	txns.innerHTML = '';
	txns.innerHTML += '<h3>Transactions</h3>' + 
					  '<table class="table table-hover">' + 
					  '<thead><tr>' + 
					  '<th>Events</th><th>Count</th><th>Amount [Wei]</th>' + 
					  '</tr></thead>' + 
					  '<tbody>' + 
					  '<tr><td>Transfer</td><td>' + Account._totalTransfer[0] + '</td><td>' + Account._totalTransfer[1] + '</td></tr>' + 
					  '</tbody></table>';


	$("div[id*='usage-myAccount']").show();

}


window.pendingTxns = function() {

    console.log('pendingTxns');
    $("div[id*='main']").hide();
    $("div[id*='usage']").hide();

    var list = document.getElementById('usage-pendingTxns-list');
    list.innerHTML = '';
    var i, txn;

    for (i = 0; i < Account._pendingTxns.length; i++) {
        txn = Account._pendingTxns[i];
        list.innerHTML += '<div class="col-sm-12 col-md-12 well"><h3> Pending Transaction ' + (i + 1) +
                          '<h6><span class="glyphicon glyphicon-user"></span> <i>Recipient</i>: ' + txn._to + '<br>' +
                          '<span class="glyphicon glyphicon-time"></span> <i>Created Time + Pending Time</i>: ' + txn._createTime + ' + ' + txn._pendingTime + ' [h]</h6>' +
                          '<div id="usage-pendingTxns-list-' + i + '">Click `Cancel` to cancel the transaction.</div>' +
                          '<div id="usage-pendingTxns-list-' + i + '-btn"><button class="btn btn-warning" onclick="cancelTxn(\''+i+'\')">Cancel</button></div>' + 
                          '</div>';
    }

    $("div[id*='usage-pendingTxns']").show();

}



window.clearPendingTxns = function() {

    if (Account._pendingTxns == []) {
        return;
    }

    ethManager.clearPendingTxns({from: userAddr}, (e, txn) => {

        console.log(e, txn);
        var list = document.getElementById('usage-pendingTxns-list');
        list.innerHTML = '';

        Account._pendingTxns = [];
        updateAccount();

        pendingTxns();

    });

}



window.cancelTxn = function(id) {

    ethManager.cancelPendingTxn(id, {from: userAddr}, (e, txn) => {

        console.log(e, txn);
        var button = document.getElementById('usage-pendingTxns-list-' + id + '-btn');
        button.innerHTML = '<button class="btn btn-default">Cancelled</button>';

        var prompt = document.getElementById('usage-pendingTxns-list-' + id);
        prompt.innerHTML = 'The transaction has been successfully cancelled.';

        Account._pendingTxns.splice(id, 1);
        updateAccount();

        pendingTxns();

    });

}


window.validatePendingTxns = function() {

    console.log('validatePendingTxns');

    var i, validTxns = [];

    for (i = 0; i < Account._pendingTxns.length; i++) {
        if (Account._pendingTxns[i]._validTime <= Date.now()) {
            validTxns.push(i);
        }
    }

    if (validTxns == []) {
        return;
    }

    ethManager.validatePendingTxns({from: userAddr}, (e, txn) => {

        console.log(e, txn);
        for (i = 0; i < validTxns.length; i++) {
            Account._pendingTxns.splice(i, 1);
        }

        updateAccount();

    });

}

// check valid pending transactions every 1 hour;
window.setInterval(validatePendingTxns, 60 * 60 * 1000);


window.recentTxns = async function() {

	console.log('recentTxns');
	$("div[id*='main']").hide();
	$("div[id*='usage']").hide();

	var list = document.getElementById('usage-recentTxns-list');
	list.innerHTML = '';
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


