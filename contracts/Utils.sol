pragma solidity >=0.4.21 <0.5.0;

import "./JsmnSolLib.sol";

// u2f utility library;

library Tools {

	struct Dict {

		string[] _fields;
		string[] _data;

	}
    
    // ok;
	function dictToJson(Dict dict) internal pure returns (string) {

		uint count = dict._fields.length;
		uint size = 6 * count + 2 * (count - 1) + 2;
		for (uint i = 0; i < count; i++) {
			size += bytes(dict._fields[i]).length;
			size += bytes(dict._data[i]).length;
		}

		bytes memory json = new bytes(size);
		uint k = 0;

		json[k++] = '{';
		for (uint field = 0; field < count; field++) {
			json[k++] = '"';
			for (i = 0; i < bytes(dict._fields[field]).length; i++) {
				json[k++] = bytes(dict._fields[field])[i];
			}
			json[k++] = '"';
			json[k++] = ':';
			json[k++] = ' ';
			json[k++] = '"';
			for (i = 0; i < bytes(dict._data[field]).length; i++) {
				json[k++] = bytes(dict._data[field])[i];
			}
			json[k++] = '"';

			if (field != count - 1) {
				json[k++] = ',';
				json[k++] = ' ';
			}
		}
		json[k++] = '}';

		return string(json);

	}

	function arrayToJson(string[] array) internal pure returns (string) {

		uint count = array.length;
		uint size = 2 + 2 * count + 2 * (count - 1);
		for (uint i = 0; i < array.length; i++) {
			size += bytes(array[i]).length;
		}

		bytes memory json = new bytes(size);
		uint k = 0;
		json[k++] = '[';
		for (uint id = 0; id < count; id++) {

			json[k++] = '"';
			for (i = 0; i < bytes(array[id]).length; i++) {
				json[k++] = bytes(array[id])[i];
			}
			json[k++] = '"';
			if (id != count - 1) {
				json[k++] = ',';
				json[k++] = ' ';
			}

		}
		json[k++] = ']';

		return string(json);

	}
	
    // ok;
	function getField(string field, string json, uint maxNum) internal pure returns (string) {

		uint returnValue;
		uint actualNum;
		JsmnSolLib.Token[] memory tokens;
		JsmnSolLib.Token memory t;
		string memory data;

		(returnValue, tokens, actualNum) = JsmnSolLib.parse(json, maxNum);

		require(returnValue == 0, "JSON parser not properly returned.");

		for (uint i = 0; i < actualNum; i++) {
			t = tokens[i];
			data = JsmnSolLib.getBytes(json, t.start, t.end);
			if (keccak256(bytes(field)) == keccak256(bytes(data))) {
				t = tokens[i + 1];
				data = JsmnSolLib.getBytes(json, t.start, t.end);

				return data;
			}
		}
		
		require(false, "Field not found.");

	}
	
	
    
    function random32(uint nonce) internal view returns (bytes32) {
        
        bytes32 random = bytes32(keccak256(abi.encodePacked(msg.sender, blockhash(block.number - 1), block.coinbase, block.difficulty, nonce)));
        // bytes32 random = bytes32(keccak256(abi.encodePacked(msg.sender, nonce)));
    
        return random;

    }


}






// ============================================================================================================ //
