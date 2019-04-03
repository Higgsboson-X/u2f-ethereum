pragma solidity >=0.4.21 <0.5.0;

import "./Utils.sol";
import "./Base64.sol";

import "./Global.sol";
import "./Register.sol";
import "./Authenticate.sol";


contract Bank {

// ======================================================================================================================== //

// Server;

	uint _randNonce;
	
	bytes public _enroll;
	bytes public _sign;
	bytes public _registeredKey;
	bytes public _lastVerified;

	address public _owner;

	uint _limit;

	bool public _lock;
	bool public _registered;
	bool public _signed;

	event Deposit(address owner, address bank, uint amount);
	event Withdraw(address owner, address bank, uint amount);
	event Transfer(address from, address to, uint amount);
	event Freeze(address owner, address bank);

	event RegistrationRequest(address user, string request, string appId);
	event RegistrationComplete(address user, string device, string appId);
	event SignRequest(address user, string request, string appId);
	event SignComplete(address user, string information, string appId);

	constructor() public {

		_owner = msg.sender;

		_limit = 10000;
		_lock = false;
		_registered = false;
		_signed = false;

		_randNonce = 0;

	}

	modifier onlyOwner {

		require(msg.sender == _owner, "Option granted only to owner.");
		_;

	}

	modifier checkReady {

		require(_registered && !_lock, "Not registered or locked.");
		_;

	}

	modifier checkSigned {

		require(_signed, "Not signed.");
		_;

	}

	function client(string clientData, string appId, uint typ) public view returns (bytes) {
	    
	    bytes memory challengeParameter;
	    
	    if (typ == 0) {
	        require(_enroll.length > 0, "No current registration request.");
	        challengeParameter = Global.validateClientData(string(_enroll), string(Base64.fromHex(clientData)), Global.getRegisterType(), appId);
	    }
	    
	    else {
	        require(_sign.length > 0, "No current Authentication request.");
	        challengeParameter = Global.validateClientData(string(_sign), string(Base64.fromHex(clientData)), Global.getSignType(), appId);
	    }
	    
	    return challengeParameter;
	    
	}
	

	function enroll(string appId) public onlyOwner {

		string memory request = Register.beginRegistration(appId, _randNonce++);
		_enroll = bytes(request);

		emit RegistrationRequest(msg.sender, request, appId);

	}


    // decoded and parsed response with format validation;
	function bind(string appId, string challengeParameter, string pubKey, string keyHandle, string certKey, string signature) public onlyOwner {

        // require(format, "Invalid registration data.");
        
		require(_enroll.length > 0, "No current registration request.");
		
		// decodedClientData = string(Base64.fromHex(decodedClientData));
		
		// bytes memory cert;
		bytes memory device = Register.completeRegistration(Base64.fromHex(challengeParameter), pubKey, keyHandle, certKey, signature, appId);

		delete _enroll;
		
		_registeredKey = device;

		_registered = true;
		
		emit RegistrationComplete(msg.sender, string(device), appId);

	}

	function sign(string appId) public onlyOwner {

		require(_registeredKey.length > 0, "No registered key.");

		// Might include algorithms for finding a key with the correct version;
		string memory request = Authenticate.beginAuthentication(appId, _registeredKey, _randNonce++);

		_sign = bytes(request);

		emit SignRequest(msg.sender, request, appId);

	}

    // decoded and parsed signature data;
	function verify(string appId, string challengeParameter, string decodedSignatureData, string keyHandle) public onlyOwner {

		require(_sign.length > 0, "No current registration request.");
		
		// decodedClientData = string(Base64.fromHex(decodedClientData));
		
		// bytes memory challengeParameter = Global.validateClientData(string(_users[msg.sender].sign), decodedClientData, Global.getSignType(), appId);
		

		bytes memory message;

		message = Authenticate.completeAuthentication(_sign, Base64.fromHex(challengeParameter), decodedSignatureData, keyHandle, appId);

		delete _sign;

		_lastVerified = message;

		_signed = true;
		
		emit SignComplete(msg.sender, string(message), appId);

	}

// ======================================================================================================================== //

	function setLimit(uint limit) public onlyOwner {

		_limit = limit;

	}


	function lockBank() public onlyOwner checkSigned {

		_lock = true;
		_signed = false;

	}

	function unlockBank() public onlyOwner checkSigned {

		_lock = false;
		_signed = false;

	}

	// Get balance;
	function getBalance() public view onlyOwner returns (uint) {

		return address(this).balance;

	}

	// Get address;
	function getAddr() public view onlyOwner returns (address) {

		return address(this);

	}

	function clearSign() public onlyOwner {

		_signed = false;

	}

	// FUNCTIONS;

	// Deposit;
	function deposit(uint amount) public payable onlyOwner checkReady {

		require(msg.value == amount);

		emit Deposit(msg.sender, address(this), amount);

	}

	// Withdraw;
	function withdraw(uint amount) public payable onlyOwner checkReady {

		require(amount > 0, "Withdraw amount should be positive.");
		require(amount <= address(this).balance, "Not enough balance.");

		if (amount > _limit) {
			require(_signed, "Authentication required.");
			_signed = false;
		}

		msg.sender.transfer(amount);
		emit Withdraw(msg.sender, address(this), amount);

	}

	// Transfer;
	function transferViaBank(address to, uint amount) public payable onlyOwner checkReady {

		require(amount <= address(this).balance, "Not enough balance.");

		if (amount > _limit) {
			require(_signed, "Authentication required.");
			_signed = false;
		}

		to.transfer(amount);

	}


}