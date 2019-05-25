pragma solidity >=0.4.21 <0.5.0;

import "./Utils.sol";
import "./Base64.sol";

import "./Global.sol";
import "./Register.sol";
import "./Authenticate.sol";


contract Manager {

	// ======================================================================================================================== //

	// server;
	uint _randNonce;

	struct Txn {

		address _to;
		uint _amount;
		uint _validTime;

	}

	struct User {
		bool _known;
		// u2f data;
		bytes _enroll;
		bytes _sign;
		bytes _registeredKey;
		bytes _lastVerified;
		// policy data;
		uint _policy;
		/*
			0: strict;
			1: history;
		*/
		uint _expire;
		uint _pendingTime;

		uint _limit;
		// account data;
		bool _lock;
		bool _registered;
		bool _signed;
		// history;
		mapping(address => uint) _txnHistory;
		// delayed transaction;
		Txn[] _pendingTxns;
	}

	mapping(address => User) _users;
	address _owner;

	// event Transfer(address from, address to, uint amount);
	event Lock(address owner, address manager);
	event Unlock(address owner, address manager);

	event RegistrationRequest(address user, string request, string appId);
	event RegistrationComplete(address user, string device, string appId);
	event SignRequest(address user, string request, string appId);
	event SignComplete(address user, string information, string appId);

	constructor() public {
		_randNonce = 0;
		_owner = msg.sender;
	}

	modifier onlyOwner {

		require(msg.sender == _owner, "Option granted only to owner.");
		_;

	}

	modifier onlyKnownUser {

		require(_users[msg.sender]._known, "Unrecognized user.");
		_;

	}

	modifier checkReady {

		require(_users[msg.sender]._registered && !_users[msg.sender]._lock, "Not registered or locked.");
		_;

	}

	modifier checkSigned {

		require(_users[msg.sender]._signed, "Not signed.");
		_users[msg.sender]._signed = false;
		_;

	}

	function close() onlyOwner public {

		selfdestruct(_owner);

	}

	function getUserInfo() onlyKnownUser public view returns (bool known, uint policy, uint expire, uint limit, bool lock, bool registered, bool signed) {

		known = _users[msg.sender]._known;
		policy = _users[msg.sender]._policy;
		expire = _users[msg.sender]._expire;
		limit = _users[msg.sender]._limit;
		lock = _users[msg.sender]._lock;
		registered = _users[msg.sender]._registered;
		signed = _users[msg.sender]._signed;

	}

	function getUserU2F() onlyKnownUser public view returns (bytes enroll, bytes registeredKey, bytes sign, bytes lastVerified) {

		enroll = _users[msg.sender]._enroll;
		registeredKey = _users[msg.sender]._registeredKey;
		sign = _users[msg.sender]._sign;
		lastVerified = _users[msg.sender]._lastVerified;

	}

	function getUserHistory(address to) public view returns (uint history) {

		history =  _users[msg.sender]._txnHistory[to];

	}

	// ======================================================================================================================== //

	// u2f;
	// changed decodedClientData to bytes;
	function client(bytes clientData, string appId, uint typ) onlyKnownUser public view returns (bytes) {
	    
	    bytes memory challengeParameter;
	    
	    if (typ == 0) {
	        require(_users[msg.sender]._enroll.length > 0, "No current registration request.");
	        challengeParameter = Global.validateClientData(string(_users[msg.sender]._enroll), string(clientData), Global.getRegisterType(), appId);
	    }
	    
	    else {
	        require(_users[msg.sender]._sign.length > 0, "No current Authentication request.");
	        challengeParameter = Global.validateClientData(string(_users[msg.sender]._sign), string(clientData), Global.getSignType(), appId);
	    }
	    
	    return challengeParameter;
	    
	}
	

	function enroll(string appId) onlyKnownUser public {

		string memory request = Register.beginRegistration(appId, _randNonce++);
		_users[msg.sender]._enroll = bytes(request);

		emit RegistrationRequest(msg.sender, request, appId);

	}


    // decoded and parsed response with format validation;
	function bind(string appId, bytes challengeParameter, bytes pubKey, bytes keyHandle, bytes certKey, bytes signature) onlyKnownUser public {
        
		require(_users[msg.sender]._enroll.length > 0, "No current registration request.");
				
		bytes memory device = Register.completeRegistration(challengeParameter, pubKey, keyHandle, certKey, signature, appId);

		delete _users[msg.sender]._enroll;
		
		_users[msg.sender]._registeredKey = device;

		_users[msg.sender]._registered = true;
		
		emit RegistrationComplete(msg.sender, string(device), appId);

	}

	function sign(string appId) onlyKnownUser public {

		require(_users[msg.sender]._registeredKey.length > 0, "No registered key.");

		// Might include algorithms for finding a key with the correct version;
		string memory request = Authenticate.beginAuthentication(appId, _users[msg.sender]._registeredKey, _randNonce++);

		_users[msg.sender]._sign = bytes(request);

		emit SignRequest(msg.sender, request, appId);

	}

    // decoded and parsed signature data;
	function verify(string appId, bytes challengeParameter, bytes decodedSignatureData, string keyHandle) onlyKnownUser public {

		require(_users[msg.sender]._sign.length > 0, "No current registration request.");
		
		bytes memory message;

		message = Authenticate.completeAuthentication(_users[msg.sender]._sign, challengeParameter, decodedSignatureData, keyHandle, appId);

		delete _users[msg.sender]._sign;

		_users[msg.sender]._lastVerified = message;

		_users[msg.sender]._signed = true;
		
		emit SignComplete(msg.sender, string(message), appId);

	}


	// ======================================================================================================================== //

	// users;
	function registerForUser() public {

		_users[msg.sender]._known = true;
		_users[msg.sender]._expire = 24;
		_users[msg.sender]._pendingTime = 24;
		_users[msg.sender]._limit = 10000;

	}

	function setLimit(uint limit) onlyKnownUser public {

		_users[msg.sender]._limit = limit;

	}

	function setPolicy(uint policy, uint expire, uint pendingTime) onlyKnownUser checkSigned public {

		_users[msg.sender]._policy = policy;
		_users[msg.sender]._expire = expire;
		_users[msg.sender]._pendingTime = pendingTime;

	}

	function lockAccount() onlyKnownUser checkSigned public {

		_users[msg.sender]._lock = true;

		emit Lock(msg.sender, address(this));

	}

	function unlockAccount() onlyKnownUser checkSigned public {

		_users[msg.sender]._lock = false;

		emit Unlock(msg.sender, address(this));

	}

	// ======================================================================================================================== //
	// function;
	function transferViaManager(address to, uint amount) checkReady public payable {

		require(amount <= msg.value, "Not enough balance sent.");

		if (amount > _users[msg.sender]._limit) {
			if ((_users[msg.sender]._policy == 0) ||
				(_users[msg.sender]._policy == 1 && (_users[msg.sender]._txnHistory[to] == 0 || now >= _users[msg.sender]._txnHistory[to] + _users[msg.sender]._expire * 1 hours))) {
				
				require(_users[msg.sender]._signed, "Authentication required.");
				_users[msg.sender]._signed = false;
				_users[msg.sender]._txnHistory[to] = now;
			}
			if (amount > 2 * _users[msg.sender]._limit) {

				Txn memory txn = Txn({_to: to, _amount: amount, _validTime: now + _users[msg.sender]._pendingTime * 1 hours});
				_users[msg.sender]._pendingTxns.push(txn);

				return;
			}
		}

		to.transfer(amount);

	}

	function validatePendingTxns() checkReady public payable {

		uint validated = 0;
		uint i = 0;
		for (i = 0; i < _users[msg.sender]._pendingTxns.length; i++) {

			if (_users[msg.sender]._pendingTxns[i]._validTime <= now) {

				require(_users[msg.sender]._pendingTxns[i]._amount <= address(this).balance, "Not enough balance.");

				_users[msg.sender]._pendingTxns[i]._to.transfer(_users[msg.sender]._pendingTxns[i]._amount);
				validated++;

			}

		}

		for (i = 0; i < (_users[msg.sender]._pendingTxns.length - validated); i++) {
			_users[msg.sender]._pendingTxns[i] = _users[msg.sender]._pendingTxns[i + validated];
		}

		_users[msg.sender]._pendingTxns.length -= validated;

	}

	function cancelPendingTxn(uint id) checkReady public payable {

		require(_users[msg.sender]._pendingTxns[id]._amount <= address(this).balance, "Not enough balance.");

		msg.sender.transfer(_users[msg.sender]._pendingTxns[id]._amount);

		uint i;
		for (i = id; i < _users[msg.sender]._pendingTxns.length - 1; i++) {
			_users[msg.sender]._pendingTxns[i] = _users[msg.sender]._pendingTxns[i + 1];
		}

		_users[msg.sender]._pendingTxns.length--;

	}

	function clearPendingTxns() checkReady public payable {

		uint i;
		uint amount = 0;
		for (i = 0; i < _users[msg.sender]._pendingTxns.length; i++) {

			amount += _users[msg.sender]._pendingTxns[i]._amount;

		}

		require(amount <= address(this).balance, "Not enough balance.");

		msg.sender.transfer(amount);

		delete _users[msg.sender]._pendingTxns;
		
	}


}