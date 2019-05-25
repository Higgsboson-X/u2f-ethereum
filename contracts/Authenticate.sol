pragma solidity >=0.4.21 <0.5.0;

import "./Utils.sol";
import "./EllipticCurve.sol";
import "./Base64.sol";

import "./Global.sol";


library Authenticate {


	function beginAuthentication(string appId, bytes device, uint randNonce) public view returns (string) {

		string memory challenge = string(Base64.websafeEncode(Base64.bytes32ToBytes(Tools.random32(randNonce))));

		Tools.Dict memory dict;

		dict._fields = new string[](5);
		dict._data = new string[](5);

		dict._fields[0] = 'version';
		dict._fields[1] = 'keyHandle';
		dict._fields[2] = 'challenge';
		dict._fields[3] = 'appId';

		dict._fields[4] = 'publicKey';

		dict._data[0] = Global.getVersion();
		dict._data[1] = Tools.getField('keyHandle', string(device), Global.getMaxNum());
		dict._data[2] = challenge;
		// dict._data[3] = Base64.fixOrigin(appId);
		dict._data[3] = appId;

		dict._data[4] = Tools.getField('publicKey', string(device), Global.getMaxNum());

		string memory json = Tools.dictToJson(dict);

		return json;

	}

	// changed decodedSignatureData to bytes;
	function completeAuthentication(bytes request, bytes challengeParameter, bytes decodedSignatureData, string keyHandle, string facet) public pure returns (bytes) {

        // bytes memory decodedClientData = Base64.fromHex(decodedClientDatastr);

		// validate client data;
		// Global.validateClientData(string(request), string(decodedClientData), Global.getSignType(), facet);

		// get keyHandle;
		// string memory keyHandle = Tools.getField('keyHandle', string(response), Global.getMaxNum());

		// app parameter;
		bytes memory appParameter = Base64.bytes32ToBytes(sha256(bytes(facet)));

		string memory publicKey = Tools.getField('publicKey', string(request), Global.getMaxNum());

		bytes memory counter;
		bytes memory userPresence;

		(counter, userPresence) = authenticateVerify(decodedSignatureData, appParameter, Base64.fromHex(publicKey), challengeParameter);

		Tools.Dict memory information;

		information._fields = new string[](3);
		information._data = new string[](3);

		information._fields[0] = 'keyHandle';
		information._fields[1] = 'touch';
		information._fields[2] = 'counter';

		information._data[0] = keyHandle;
		information._data[1] = Base64.bytesToString(userPresence);
		information._data[2] = Base64.bytesToString(counter);

		return bytes(Tools.dictToJson(information));

	}

	/*
     +-----------------------------------+
     | 1 |     4     |      implied      |
     +-----------------------------------+
     user presence
     counter
     signature
   */
	function authenticateVerify(bytes data, bytes appParameter, bytes publicKey, bytes challengeParameter) internal pure returns (bytes, bytes) {

		// bytes memory data = Base64.websafeDecode(bytes(Tools.getField('signatureData', response, Global.getMaxNum())));
		bytes memory userPresence;
		(userPresence, data) = Base64.getPopBytes(1, data);

		bytes memory counter;
		(counter, data) = Base64.getPopBytes(4, data);

		bytes memory verifyData = getAuthenticateVerifyData(appParameter, userPresence, counter, challengeParameter);

		// IN: signature, verifyData, publicKey;
		require(Global.verifyECDSA(data, verifyData, publicKey) == 0, "Invalid signature.");

		return (counter, userPresence);

	}


	function getAuthenticateVerifyData(bytes appParameter, bytes userPresence, bytes counter, bytes challengeParameter) internal pure returns (bytes) {

		bytes memory verifyData = new bytes(appParameter.length + userPresence.length + counter.length + challengeParameter.length);
		uint k = 0;
		for (uint i = 0; i < appParameter.length; i++) {
			verifyData[k++] = appParameter[i];
		}
		for (i = 0; i < userPresence.length; i++) {
			verifyData[k++] = userPresence[i];
		}
		for (i = 0; i < counter.length; i++) {
			verifyData[k++] = counter[i];
		}
		for (i = 0; i < challengeParameter.length; i++) {
			verifyData[k++] = challengeParameter[i];
		}

		return verifyData;

	}


}
