pragma solidity >=0.4.21 <0.5.0;

import "./EllipticCurve.sol";
import "./Base64.sol";
import "./Utils.sol";

library Global {

	string constant _registerType = 'navigator.id.finishEnrollment';
	string constant _signType = 'navigator.id.getAssertion';

	bytes constant _prefix = hex"3059301306072a8648ce3d020106082a8648ce3d030107034200";

	string constant _version = 'U2F_V2';

	uint constant _maxNum = 11;

	function getRegisterType() internal pure returns (string) {

		return _registerType;

	}

	function getSignType() internal pure returns (string) {

		return _signType;

	}

	function getPrefix() internal pure returns (bytes) {

		return _prefix;

	}

	function getVersion() internal pure returns (string) {

		return _version;

	}

	function getMaxNum() internal pure returns (uint) {

		return _maxNum;

	}

	/*
	bytes32[6] _toFix = [

		bytes32(0x349bca1031f8c82c4ceca38b9cebf1a69df9fb3b94eed99eb3fb9aa3822d26e8),
		bytes32(0xdd574527df608e47ae45fbba75a2afdd5c20fd94a02419381813cd55a2a3398f),
		bytes32(0x1d8764f0f7cd1352df6150045c8f638e517270e8b5dda1c63ade9c2280240cae),
		bytes32(0xd0edc9a91a1677435a953390865d208c55b3183c6759c9b5a7ff494c322558eb),
		bytes32(0x6073c436dcd064a48127ddbf6032ac1a66fd59a0c24434f070d4e564c124c897),
		bytes32(0xca993121846c464d666096d35f13bf44c1b05af205f9b4a1e00cf6cc10c5e511)

	];
	*/

	// _u2fRegisterRequestFields = ['challenge', 'version', 'appId'];
	// _registerResponseFields = ['registrationData', 'clientData'];
	// _clientDataFields = ['typ', 'challenge', 'origin'];
	// _deviceRegistrationFields = ['version', 'keyHandle', 'appId', publicKey];
	// _u2fSignRequestFields = ['keyHandle', 'version', 'challenge', 'appId', 'publicKey'];
	// _signResponseFields = ['signatureData', 'clientData', 'keyHandle'];
	// _signatureFields = ['keyHandle', 'touch', 'counter'];


    // ok;
	function validateClientData(string request, string clientData, string typ, string facet) internal pure returns (bytes) {

		// validate type;
		require(keccak256(bytes(Tools.getField('typ', clientData, getMaxNum()))) == keccak256(bytes(typ)), "Wrong type.");

		// validate challenge;
		string memory requestChallenge = Tools.getField('challenge', request, getMaxNum());
		string memory clientChallenge = Tools.getField('challenge', clientData, getMaxNum());

		require(keccak256(bytes(requestChallenge)) == keccak256(bytes(clientChallenge)), "Wrong challenge.");

		// validate facet;
		if (bytes(facet).length != 0) {
			require(keccak256(bytes(Tools.getField('origin', clientData, getMaxNum()))) == keccak256(bytes(facet)), "Invalid facet.");
		}
		
		return Base64.bytes32ToBytes(sha256(bytes(clientData)));

	}


/*
    function validateClientData(bytes request, bytes clientData, string typ, string facet) public pure returns (uint) {

		// validate type;
		if (keccak256(bytes(Tools.getField('typ', string(clientData), getMaxNum()))) != keccak256(bytes(typ))) {
		    return 1;
		}

		// validate challenge;
		string memory requestChallenge = Tools.getField('challenge', string(request), getMaxNum());
		string memory clientChallenge = Tools.getField('challenge', string(clientData), getMaxNum());

		if (keccak256(bytes(requestChallenge)) != keccak256(bytes(clientChallenge))) {
		    return 2;
		}

		// validate facet;
		if (keccak256(bytes(Tools.getField('origin', string(clientData), getMaxNum()))) != keccak256(bytes(facet))) {
		    return 3;
		}
		
		return 0;

	}
*/


	function parseRS(bytes signature) internal pure returns (uint, uint) {

		uint r;
		uint s;
		bytes memory pop;

		(pop, signature) = Base64.getPopBytes(1, signature);
		require(pop[0] == 0x30, "0x30.");

		(pop, signature) = Base64.getPopBytes(1, signature);
		require(uint(pop[0]) == signature.length, "Unequal total length.");

		(pop, signature) = Base64.getPopBytes(1, signature);
		require(pop[0] == 0x02, "0x02.");

		(pop, signature) = Base64.getPopBytes(1, signature);
		(pop, signature) = Base64.getPopBytes(uint(pop[0]), signature);
		r = Base64.bytesToUint(pop);

		(pop, signature) = Base64.getPopBytes(1, signature);
		require(pop[0] == 0x02, "0x02.");

		(pop, signature) = Base64.getPopBytes(1, signature);
		(pop, signature) = Base64.getPopBytes(uint(pop[0]), signature);
		s = Base64.bytesToUint(pop);

		return (r, s);

	}

	function verifyECDSA(bytes signature, bytes verifyData, bytes pubKey) internal pure returns (uint) {
	    
		require(pubKey[0] == 0x04, "Invalid public key.");

		uint x = 0;
		uint y = 0;
		uint r;
		uint s;

		(r, s) = parseRS(signature);

		uint k = 1;
		uint i;
		for (i = 0; i < 32; i++) {
			x += uint(pubKey[k++]) * 2**(8 * (31 - i));
		}
		for (i = 0; i < 32; i++) {
			y += uint(pubKey[k++]) * 2**(8 * (31 - i));
		}

		uint verified = EllipticCurve.validateSignature(sha256(verifyData), [r, s], [x, y]);

		return verified;

	}



}