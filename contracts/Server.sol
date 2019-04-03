pragma solidity >=0.4.21 <0.5.0;

import "./Utils.sol";
import "./Base64.sol";

import "./Global.sol";
import "./Register.sol";
import "./Authenticate.sol";


contract Server {

	struct UserData {

		bytes enroll;
		bytes sign;

		bytes registeredKey;
		bytes lastVerified;

	}

	uint _randNonce;
	
	uint _record;

	mapping(address => UserData) _users;
	// string _appId;
	// string _facet;
	// `http://demo.yubico.com` needs to be `http:\\/\\/demo.yubico.com` on Remix -> fixOrigin;

	event RegistrationRequest(address user, string request, string appId);
	event RegistrationComplete(address user, string device, string appId);
	event SignRequest(address user, string request, string appId);
	event SignComplete(address user, string information, string appId);
	

	constructor() public {

		_randNonce = 0;
		_record = 0;
		// _appId = appId;

	}


	function getEnroll() public view returns (bytes) {

		return _users[msg.sender].enroll;

	}


	function getSign() public view returns (bytes) {

		return _users[msg.sender].sign;

	}


	function getKey() public view returns (bytes) {

		return _users[msg.sender].registeredKey;

	}

	function getVerified() public view returns (bytes) {

		return _users[msg.sender].lastVerified;

	}


	function getParameters() public view returns (uint, uint) {

		return (_randNonce, _record);

	}
	
	
	function client(string clientData, string appId, uint typ) public view returns (bytes) {
	    
	    bytes memory challengeParameter;
	    
	    if (typ == 0) {
	        require(_users[msg.sender].enroll.length > 0, "No current registration request.");
	        challengeParameter = Global.validateClientData(string(_users[msg.sender].enroll), string(Base64.fromHex(clientData)), Global.getRegisterType(), appId);
	    }
	    
	    else {
	        require(_users[msg.sender].sign.length > 0, "No current Authentication request.");
	        challengeParameter = Global.validateClientData(string(_users[msg.sender].sign), string(Base64.fromHex(clientData)), Global.getSignType(), appId);
	    }
	    
	    return challengeParameter;
	    
	}
	



	function enroll(string appId) public {

		string memory request = Register.beginRegistration(appId, _randNonce++);
		_users[msg.sender].enroll = bytes(request);

		_record++;

		emit RegistrationRequest(msg.sender, request, appId);

	}


    // decoded and parsed response with format validation;
	function bind(string appId, string challengeParameter, string pubKey, string keyHandle, string certKey, string signature) public {

        // require(format, "Invalid registration data.");
        
		require(_users[msg.sender].enroll.length > 0, "No current registration request.");
		
		// decodedClientData = string(Base64.fromHex(decodedClientData));
		
		// bytes memory cert;
		bytes memory device = Register.completeRegistration(Base64.fromHex(challengeParameter), pubKey, keyHandle, certKey, signature, appId);

		delete _users[msg.sender].enroll;
		
		_users[msg.sender].registeredKey = device;
		
		_record++;

		emit RegistrationComplete(msg.sender, string(device), appId);

	}

	function sign(string appId) public {

		require(_users[msg.sender].registeredKey.length > 0, "No registered key.");

		// Might include algorithms for finding a key with the correct version;
		string memory request = Authenticate.beginAuthentication(appId, _users[msg.sender].registeredKey, _randNonce++);

		_users[msg.sender].sign = bytes(request);

		_record++;

		emit SignRequest(msg.sender, request, appId);

	}

    // decoded and parsed signature data;
	function verify(string appId, string challengeParameter, string decodedSignatureData, string keyHandle) public {

		require(_users[msg.sender].sign.length > 0, "No current registration request.");
		
		// decodedClientData = string(Base64.fromHex(decodedClientData));
		
		// bytes memory challengeParameter = Global.validateClientData(string(_users[msg.sender].sign), decodedClientData, Global.getSignType(), appId);
		

		bytes memory message;

		message = Authenticate.completeAuthentication(_users[msg.sender].sign, Base64.fromHex(challengeParameter), decodedSignatureData, keyHandle, appId);

		delete _users[msg.sender].sign;

		_users[msg.sender].lastVerified = message;
		
		_record++;

		emit SignComplete(msg.sender, string(message), appId);

	}


}
