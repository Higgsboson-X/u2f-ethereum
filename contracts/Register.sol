pragma solidity >=0.4.21 <0.5.0;

import "./Utils.sol";
import "./EllipticCurve.sol";
import "./Base64.sol";

import "./Global.sol";

library Register {


	// ================================================================================================== //
	// registration;


	/*
	- IN: appId, registeredKeys;
	- OUT: [appId, registerRequests[version, challenge], registeredKeys];
	*/
	function beginRegistration(string appId, uint randNonce) public view returns (string) {

		string memory challenge = string(Base64.websafeEncode(Base64.bytes32ToBytes(Tools.random32(randNonce))));

		Tools.Dict memory dict;
		dict._fields = new string[](3);
		dict._data = new string[](3);

		dict._fields[0] = 'challenge';
		dict._fields[1] = 'version';
		dict._fields[2] = 'appId';

		dict._data[0] = challenge;
		dict._data[1] = Global.getVersion();
		//! Fixing might be unnecessary!
		// dict._data[2] = Base64.fixOrigin(appId);
		dict._data[2] = appId;

		string memory request = Tools.dictToJson(dict);

		return request;

	}

	// pubKey, keyHandle should be decoded;
	function completeRegistration(bytes challengeParameter, string pubKey, string keyHandle, string certKey, string signature, string facet) public pure returns (bytes) {

		// bytes memory decodedClientData = Base64.fromHex(decodedClientDataStr);
		
		// Global.validateClientData(string(request), string(decodedClientData), Global.getRegisterType(), facet);

		// verify response and application parameter;
		return registerVerify(Base64.fromHex(pubKey), Base64.fromHex(keyHandle), Base64.fromHex(certKey), Base64.fromHex(signature), facet, challengeParameter);

	}

    /*
     +-------------------------------------------------------------------+
     | 1 |     65    | 1 |    L    |    implied               | 64       |
     +-------------------------------------------------------------------+
     0x05
     public key (first byte 0x04)
     key handle length
     key handle
     attestation cert
     signature
   */
	function registerVerify(bytes pubKey, bytes keyHandle, bytes certKey, bytes signature, string appId, bytes challengeParameter) public pure returns (bytes) {

		// verify;
		// IN: appParameter, challengeParameter, keyHandle, pubKey;
		bytes memory verifyData = getRegisterVerifyData(Base64.bytes32ToBytes(sha256(bytes(appId))), challengeParameter, keyHandle, pubKey);

		// IN: signature, verifyData, pk from certificate;
		require(Global.verifyECDSA(signature, verifyData, certKey) == 0, "Invalid signature.");

	    Tools.Dict memory device;

		device._fields = new string[](4);
		device._data = new string[](4);

		device._fields[0] = 'version';
		device._fields[1] = 'keyHandle';
		device._fields[2] = 'appId';
		device._fields[3] = 'publicKey';

		device._data[0] = Global.getVersion();
		//! removed websafe encode/decode;
		// device._data[1] = string(Base64.websafeEncode(keyHandle));
		device._data[1] = Base64.bytesToHexStr(keyHandle);
		device._data[2] = appId;
		// device._data[3] = string(Base64.websafeEncode(pubKey));
		device._data[3] = Base64.bytesToHexStr(pubKey);

		string memory deviceRegistrationData = Tools.dictToJson(device);

		return bytes(deviceRegistrationData);

	}


	function getRegisterVerifyData(bytes appPara, bytes challengeParameter, bytes keyHandle, bytes pubKey) internal pure returns (bytes) {

		bytes memory verifyData = new bytes(1 + appPara.length + challengeParameter.length + keyHandle.length + pubKey.length);

		verifyData[0] = byte(0);
		uint k = 1;
		for (uint i = 0; i < appPara.length; i++) {
			verifyData[k++] = appPara[i];
		}
		for (i = 0; i < challengeParameter.length; i++) {
			verifyData[k++] = challengeParameter[i];
		}
		for (i = 0; i < keyHandle.length; i++) {
			verifyData[k++] = keyHandle[i];
		}
		for (i = 0; i < pubKey.length; i++) {
			verifyData[k++] = pubKey[i];
		}

		return verifyData;

	}

}
