pragma solidity >=0.4.21 <0.5.0;


library Base64 {
    
    uint constant _batchSize = 200;
    
    // ok;
	function getPopBytes(uint l, bytes b) internal pure returns (bytes, bytes) {

		bytes memory newBytes = new bytes(b.length - l);
		bytes memory popBytes = new bytes(l);

		uint k = 0;
		for (uint i = 0; i < popBytes.length; i++) {
			popBytes[i] = b[k++];
		}
		for (i = 0; i < newBytes.length; i++) {
			newBytes[i] = b[k++];
		}

		return (popBytes, newBytes);

	}


	function bytesToUint(bytes b) internal pure returns (uint) {

		uint num;

		for (uint i = 0; i < b.length; i++) {
			num += uint(b[i]) * (2**(8 * (b.length - (i + 1))));
		}

		return num;

	}
	
	function uintToString(uint num) internal pure returns (string) {
	    
        if (num == 0) {
            return "0";
        }
        
        uint t = num;
        uint length;
        
        while (t != 0) {
            length++;
            t /= 10;
        }
        
        bytes memory b = new bytes(length);
        length = length - 1;
        
        while (num != 0) {
            b[length--] = uintToAscii(num % 10);
            num /= 10;
        }
        
        return string(b);
    }
    
    function bytesToString(bytes b) internal pure returns (string) {
        
        return uintToString(bytesToUint(b));
        
    }


	function concatenateBytes(bytes b1, bytes b2) internal pure returns (bytes) {

		bytes memory newBytes = new bytes(b1.length + b2.length);
		uint k = 0;
		for (uint i = 0; i < b1.length; i++) {
			newBytes[k++] = b1[i];
		}
		for (i = 0; i < b2.length; i++) {
			newBytes[k++] = b2[i];
		}

		return newBytes;

	}

	
	function uintToAscii(uint number) internal pure returns(byte) {
        
        if (number < 10) {
            return byte(48 + number);
        } 
        else if (number < 16) {
            return byte(87 + number);
        } 
        else {
            revert();
        }
        
    }
    
    
    function bytes32ToBytes (bytes32 data) internal pure returns (bytes) {
        
        bytes memory bytesString = new bytes(32);
        uint remainder;
        uint num = uint(data);
        
        for (uint j=0; j < 32; j++) {
            remainder = num % (2**(8 * (31 - j)));
            bytesString[j] = byte((num - remainder) / (2**(8 * (31 - j))));
            num = remainder;
        }
        
        return bytesString;
    
    }
    
    
    function findSubBytes(bytes b, bytes target) internal pure returns (uint) {

        uint j = 0;
        bool found = false;
    	for (uint i = 0; i <= b.length - target.length; i++) {
    		if (b[i] == target[0]) {
    		    found = true;
    		    if (target.length == 1) {
    		        return i;
    		    }
    			for (j = 1; j < target.length; j++) {
    				if (!(target[j] == b[i + j])) {
    				    found = false;
    					break;
    				}
    			}
    		}
    		if (found){

    			return i;
    		}
    	}

    	return b.length;

    }
    
    
    function fixOrigin(string origin) internal pure returns (string) {
        
        bytes memory b1 = hex"2f2f";
        bytes memory b2 = hex"5c5c2f5c5c2f";
        
        bytes memory remain = bytes(origin);
        
        uint pos = findSubBytes(remain, b1);
        
        if (pos == remain.length) {
            return origin;
        }
        
        // uint pos = 5;
        
        bytes memory fix;
        
        (fix, remain) = getPopBytes(pos, remain);
        fix = concatenateBytes(fix, b2);
        (, remain) = getPopBytes(b1.length, remain);
        fix = concatenateBytes(fix, remain);
        
        return string(fix);
        
    }
    
    
    function fromHexChar(uint c) internal pure returns (uint) {

    	if (byte(c) >= byte('0') && byte(c) <= byte('9')) {
        	return c - uint(byte('0'));
    	}

    	if (byte(c) >= byte('a') && byte(c) <= byte('f')) {
        	return 10 + c - uint(byte('a'));
    	}

    	if (byte(c) >= byte('A') && byte(c) <= byte('F')) {
        	return 10 + c - uint(byte('A'));
    	}

	}

	// Convert an hexadecimal string to raw bytes
	function fromHex(string s) internal pure returns (bytes) {

    	bytes memory ss = bytes(s);

    	require(ss.length % 2 == 0); // length must be even

    	bytes memory r = new bytes(ss.length / 2);

    	for (uint i=0; i<ss.length/2; ++i) {
        	r[i] = byte(fromHexChar(uint(ss[2*i])) * 16 + fromHexChar(uint(ss[2*i+1])));
    	}

    	return r;

	}
    

	function base64Encode(bytes data) internal pure returns (bytes) {

		bytes memory b64Hash = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		bytes memory threeBytes = new bytes(3);
		bytes memory char = new bytes(1);
		bytes memory encodedBytes = "";

		uint num;
		uint i;
		uint remainder;

		while (data.length >= 3) {

			(threeBytes, data) = getPopBytes(3, data);

			num = bytesToUint(threeBytes);

			for (i = 0; i < 4; i++) {
				remainder = num % 64**(3 - i);
				char[0] = b64Hash[uint((num - remainder) / 64**(3 - i))];
				encodedBytes = concatenateBytes(encodedBytes, char);
				num = remainder;
			}

		}

		if (data.length == 0) {
			
			return encodedBytes;
		}
		else if (data.length == 1) {
			num = bytesToUint(data);
			num *= 256**2;
			for (i = 0; i < 2; i++) {
				remainder = num % 64**(3 - i);
				char[0] = b64Hash[uint(num - remainder) / 64**(3 - i)];
				encodedBytes = concatenateBytes(encodedBytes, char);
				num = remainder;
			}
			char[0] = byte("=");
			for (i = 0; i < 2; i++) {
				encodedBytes = concatenateBytes(encodedBytes, char);
			}

			return encodedBytes;
		}
		else {
			num = bytesToUint(data);
			num *= 256;
			for (i = 0; i < 3; i++) {
				remainder = num % 64**(3 - i);
				char[0] = b64Hash[uint(num - remainder) / 64**(3 - i)];
				encodedBytes = concatenateBytes(encodedBytes, char);
				num = remainder;
			}
			char[0] = byte("=");
			encodedBytes = concatenateBytes(encodedBytes, char);

			return encodedBytes;
		}

	}


	function base64Decode(bytes data) internal pure returns (bytes) {

		int8[128] memory b64Back = [

			-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    		-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 
    		-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
    		52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1,  0, -1, -1,
    		-1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 
    		15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, 
    		-1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 
    		41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1

    	];

    	uint j;
    	uint num;
    	uint remainder;
    	uint len = uint(data.length / 4);
    	int8 ind;

    	bytes memory decodedBytes = "";
    	bytes memory threeBytes = new bytes(4);
    	bytes memory char = new bytes(1);
    	
    	for (uint i = 0; i < len; i++) {
    		num = 0;
    		(threeBytes, data) = getPopBytes(4, data);
    		for (j = 0; j < 4; j++) {
    		    ind = b64Back[uint(threeBytes[j])];
    		    require(ind >= 0, "Invalid index.");
    			num += uint(ind) * 64**(3 - j);
    		}
    		for (j = 0; j < 3; j++) {
    			remainder = num % 256**(2 - j);
    			char[0] = byte((num - remainder) / 256**(2 - j));
    			
    			if (uint(char[0]) == 0 && i == len - 1) {
    			    continue;
    			}
    			
    			decodedBytes = concatenateBytes(decodedBytes, char);
    			num = remainder;
    		}
    	}
    	
    	return decodedBytes;

	}


	function websafeEncodeBatch(bytes data) internal pure returns (bytes) {

		bytes memory newBytes = base64Encode(data);
		uint count = 0;
		for (uint i = 0; i < newBytes.length; i++) {
			if (newBytes[i] == byte("+")) {
				newBytes[i] = byte("-");
			}
			else if (newBytes[i] == byte("/")) {
				newBytes[i] = byte("_");
			}
			else if (newBytes[i] == byte("=")) {
				count++;
			}
		}

		bytes memory encodedBytes = new bytes(newBytes.length - count);
		for (i = 0; i < encodedBytes.length; i++) {
			encodedBytes[i] = newBytes[i];
		}

		return encodedBytes;

	}


	function websafeDecodeBatch(bytes data) internal pure returns (bytes) {

		// require(isMatch(string(data)), "Invalid character(s)");
		for (uint i = 0; i < data.length; i++) {
			if (data[i] == byte("-")) {
				data[i] = byte("+");
			}
			else if (data[i] == byte("_")) {
				data[i] = byte("/");
			}
		}
		uint append = uint(-data.length % 4);
		bytes memory char = new bytes(1);
		char[0] = byte("=");
		for (i = 0; i < append; i++) {
			data = concatenateBytes(data, char);
		}

		return base64Decode(data);

	}
	
	
	function byBatch(bytes data, uint id) internal pure returns (bytes) {
	    
	    function(bytes memory) internal pure returns (bytes memory) alg;
	    if (id == 0) {
	        alg = websafeEncodeBatch;
	    }
	    else {
	        alg = websafeDecodeBatch;
	    }
	    
	    if (data.length > _batchSize) {
	        return alg(data);
	    }
	    
	    bytes memory result = "";
	    bytes memory batch;
	    
	    uint numBatches = uint(data.length / _batchSize);
	    bool remain = true;
	    if (data.length % _batchSize == 0) {
	        remain = false;
	    }
	    
	    uint k;
	    for (uint i = 0; i < numBatches; i++) {
	        batch = new bytes(_batchSize);
	        for (k = 0; k < _batchSize; k++) {
	            batch[k] = data[i * _batchSize + k];
	        }
	        result = concatenateBytes(result, alg(batch));
	    }
	    if (remain) {
	        uint size = data.length % _batchSize;
	        batch = new bytes(size);
	        for (k = 0; k < size; k++) {
	            batch[k] = data[numBatches * _batchSize + k];
	        }
	        result = concatenateBytes(result, alg(batch));
	    }
	    
	    return result;
	    
	}
	
	
	function websafeEncode(bytes data) internal pure returns (bytes) {
	    
	    return byBatch(data, 0);
	    
	}
	
	function websafeDecode(bytes data) internal pure returns (bytes) {
	    
	    return byBatch(data, 1);
	    
	}
    
}


