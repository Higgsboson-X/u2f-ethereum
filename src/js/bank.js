window.qs = require('query-string');
window.sha256 = require('js-sha256').sha256;

window.ethBankAddr = qs.parse(window.location.search).addr;
window.userAddr = qs.parse(window.location.search).user;

window.ethBank = window.bankContract.at(ethBankAddr);

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
        _policy: 'strict',
        _expire: 24 * 3600 * 1000,
        _transferHistory: {},

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

window.inputExpire = function() {

    console.log('show');

    var checked = document.getElementById('u2f-policy-history-sel').checked;
    var expire = document.getElementById('u2f-policy-history-expire-form');

    console.log(checked);
    if (checked) {
        expire.innerHTML = '<label for="u2f-policy-history-expire-form" class="control-label"><i>History Lifetime (Integer Only) [h]</i></label>' + 
                           '<input type="text" id="u2f-policy-history-expire" class="form-control" name="u2f-policy-history-expire" value="' + Account._expire / (3600 * 1000) + '"/>';
    }
    else {
        expire.innerHTML = '';
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

    if (Account._policy == 'history') {
        $('#u2f-policy-strict-sel').attr('checked', false);
        $('#u2f-policy-history-sel').attr('checked', true);
        inputExpire();
    }

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
        e.preventDefault();

    	window.Account._limit = customLimit;

        var changed = false;

        if (!changed) {
            changed = true;
            ethBank.setLimit(customLimit, {from: userAddr}, (e, txn) => {
                console.log(e, txn);
            });

            $('#usage-userInfo-custom-limit-form').val(customLimit);
            updateAccount();
            userInfo();
        }

	});

    $('#u2f_form').find('button[type="submit"]').on('click', async function(e) { // if submit button is clicked

        var strict = document.getElementById('u2f-policy-strict-sel').checked;
        var history = document.getElementById('u2f-policy-history-sel').checked;

        var expire = document.getElementById('u2f-policy-history-expire').value;

        console.log(strict, history, expire);

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
                        await ethBank.setU2FPolicy(strict, expire, {from: userAddr}, (e, txn) => {
                            console.log(e, txn);
                            if (e) {
                                alert(e);
                            }
                            else if (changed) {
                                return;
                            }
                            else {
                                changed = true;
                                Account._policy = strict ? 'strict' : 'history';
                                Account._expire = expire * 3600 * 1000; // in milliseconds;
                                updateAccount();
                                userInfo();
                            }
                        });

                    });
                }
                
            });
        }

        $('#u2f-policy-history-expire').val(expire);

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

        console.log('time: ', Date.now() - parseInt(Account._transferHistory[to]));

        // check whether the history has expired;
        if (Account._transferHistory[to] != null && (Date.now() - parseInt(Account._transferHistory[to])) >= parseInt(Account._expire)) {
            Account._transferHistory[to] = null;
            console.log('1');
        }

    	var authenticated = false;
    	var confirmed = false;

        console.log('transfer history: ', Account._transferHistory[to]);

    	if (parseInt(amount) > parseInt(Account._limit) && !authenticated && (Account._policy == 'strict' || (Account._policy == 'history' && Account._transferHistory[to] == null))) {

            console.log('2');

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
                                console.log(Date.now());
                                Account._transferHistory[to] = Date.now();

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
                    // Account._transferHistory[to] = Date.now();

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
			device = '{"version": "NA", "appId": "NA"}';
		}
		else {
			device = hex2a(key.slice(2, key.length));
		}
		var verified;
		await ethBank._lastVerified(async (e, ver) => {
			console.log(ver);
			if (e || ver == null || ver == 'undefined' || ver == '0x') {
				verified = '{"counter": "NA", "keyHandle": "NA"}';
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


