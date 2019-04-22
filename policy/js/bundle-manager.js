(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';
var token = '%[a-f0-9]{2}';
var singleMatcher = new RegExp(token, 'gi');
var multiMatcher = new RegExp('(' + token + ')+', 'gi');

function decodeComponents(components, split) {
	try {
		// Try to decode the entire string first
		return decodeURIComponent(components.join(''));
	} catch (err) {
		// Do nothing
	}

	if (components.length === 1) {
		return components;
	}

	split = split || 1;

	// Split the array in 2 parts
	var left = components.slice(0, split);
	var right = components.slice(split);

	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
}

function decode(input) {
	try {
		return decodeURIComponent(input);
	} catch (err) {
		var tokens = input.match(singleMatcher);

		for (var i = 1; i < tokens.length; i++) {
			input = decodeComponents(tokens, i).join('');

			tokens = input.match(singleMatcher);
		}

		return input;
	}
}

function customDecodeURIComponent(input) {
	// Keep track of all the replacements and prefill the map with the `BOM`
	var replaceMap = {
		'%FE%FF': '\uFFFD\uFFFD',
		'%FF%FE': '\uFFFD\uFFFD'
	};

	var match = multiMatcher.exec(input);
	while (match) {
		try {
			// Decode as big chunks as possible
			replaceMap[match[0]] = decodeURIComponent(match[0]);
		} catch (err) {
			var result = decode(match[0]);

			if (result !== match[0]) {
				replaceMap[match[0]] = result;
			}
		}

		match = multiMatcher.exec(input);
	}

	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
	replaceMap['%C2'] = '\uFFFD';

	var entries = Object.keys(replaceMap);

	for (var i = 0; i < entries.length; i++) {
		// Replace all decoded components
		var key = entries[i];
		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
	}

	return input;
}

module.exports = function (encodedURI) {
	if (typeof encodedURI !== 'string') {
		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
	}

	try {
		encodedURI = encodedURI.replace(/\+/g, ' ');

		// Try the built in decoder first
		return decodeURIComponent(encodedURI);
	} catch (err) {
		// Fallback to a more advanced decoder
		return customDecodeURIComponent(encodedURI);
	}
};

},{}],2:[function(require,module,exports){
(function (process,global){
/**
 * [js-sha256]{@link https://github.com/emn178/js-sha256}
 *
 * @version 0.9.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2017
 * @license MIT
 */
/*jslint bitwise: true */
(function () {
  'use strict';

  var ERROR = 'input is invalid type';
  var WINDOW = typeof window === 'object';
  var root = WINDOW ? window : {};
  if (root.JS_SHA256_NO_WINDOW) {
    WINDOW = false;
  }
  var WEB_WORKER = !WINDOW && typeof self === 'object';
  var NODE_JS = !root.JS_SHA256_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
  if (NODE_JS) {
    root = global;
  } else if (WEB_WORKER) {
    root = self;
  }
  var COMMON_JS = !root.JS_SHA256_NO_COMMON_JS && typeof module === 'object' && module.exports;
  var AMD = typeof define === 'function' && define.amd;
  var ARRAY_BUFFER = !root.JS_SHA256_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var EXTRA = [-2147483648, 8388608, 32768, 128];
  var SHIFT = [24, 16, 8, 0];
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  var OUTPUT_TYPES = ['hex', 'array', 'digest', 'arrayBuffer'];

  var blocks = [];

  if (root.JS_SHA256_NO_NODE_JS || !Array.isArray) {
    Array.isArray = function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    };
  }

  if (ARRAY_BUFFER && (root.JS_SHA256_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
    ArrayBuffer.isView = function (obj) {
      return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
    };
  }

  var createOutputMethod = function (outputType, is224) {
    return function (message) {
      return new Sha256(is224, true).update(message)[outputType]();
    };
  };

  var createMethod = function (is224) {
    var method = createOutputMethod('hex', is224);
    if (NODE_JS) {
      method = nodeWrap(method, is224);
    }
    method.create = function () {
      return new Sha256(is224);
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createOutputMethod(type, is224);
    }
    return method;
  };

  var nodeWrap = function (method, is224) {
    var crypto = eval("require('crypto')");
    var Buffer = eval("require('buffer').Buffer");
    var algorithm = is224 ? 'sha224' : 'sha256';
    var nodeMethod = function (message) {
      if (typeof message === 'string') {
        return crypto.createHash(algorithm).update(message, 'utf8').digest('hex');
      } else {
        if (message === null || message === undefined) {
          throw new Error(ERROR);
        } else if (message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        }
      }
      if (Array.isArray(message) || ArrayBuffer.isView(message) ||
        message.constructor === Buffer) {
        return crypto.createHash(algorithm).update(new Buffer(message)).digest('hex');
      } else {
        return method(message);
      }
    };
    return nodeMethod;
  };

  var createHmacOutputMethod = function (outputType, is224) {
    return function (key, message) {
      return new HmacSha256(key, is224, true).update(message)[outputType]();
    };
  };

  var createHmacMethod = function (is224) {
    var method = createHmacOutputMethod('hex', is224);
    method.create = function (key) {
      return new HmacSha256(key, is224);
    };
    method.update = function (key, message) {
      return method.create(key).update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createHmacOutputMethod(type, is224);
    }
    return method;
  };

  function Sha256(is224, sharedMemory) {
    if (sharedMemory) {
      blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      this.blocks = blocks;
    } else {
      this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    if (is224) {
      this.h0 = 0xc1059ed8;
      this.h1 = 0x367cd507;
      this.h2 = 0x3070dd17;
      this.h3 = 0xf70e5939;
      this.h4 = 0xffc00b31;
      this.h5 = 0x68581511;
      this.h6 = 0x64f98fa7;
      this.h7 = 0xbefa4fa4;
    } else { // 256
      this.h0 = 0x6a09e667;
      this.h1 = 0xbb67ae85;
      this.h2 = 0x3c6ef372;
      this.h3 = 0xa54ff53a;
      this.h4 = 0x510e527f;
      this.h5 = 0x9b05688c;
      this.h6 = 0x1f83d9ab;
      this.h7 = 0x5be0cd19;
    }

    this.block = this.start = this.bytes = this.hBytes = 0;
    this.finalized = this.hashed = false;
    this.first = true;
    this.is224 = is224;
  }

  Sha256.prototype.update = function (message) {
    if (this.finalized) {
      return;
    }
    var notString, type = typeof message;
    if (type !== 'string') {
      if (type === 'object') {
        if (message === null) {
          throw new Error(ERROR);
        } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        } else if (!Array.isArray(message)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
            throw new Error(ERROR);
          }
        }
      } else {
        throw new Error(ERROR);
      }
      notString = true;
    }
    var code, index = 0, i, length = message.length, blocks = this.blocks;

    while (index < length) {
      if (this.hashed) {
        this.hashed = false;
        blocks[0] = this.block;
        blocks[16] = blocks[1] = blocks[2] = blocks[3] =
          blocks[4] = blocks[5] = blocks[6] = blocks[7] =
          blocks[8] = blocks[9] = blocks[10] = blocks[11] =
          blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }

      if (notString) {
        for (i = this.start; index < length && i < 64; ++index) {
          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = this.start; index < length && i < 64; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }

      this.lastByteIndex = i;
      this.bytes += i - this.start;
      if (i >= 64) {
        this.block = blocks[16];
        this.start = i - 64;
        this.hash();
        this.hashed = true;
      } else {
        this.start = i;
      }
    }
    if (this.bytes > 4294967295) {
      this.hBytes += this.bytes / 4294967296 << 0;
      this.bytes = this.bytes % 4294967296;
    }
    return this;
  };

  Sha256.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex;
    blocks[16] = this.block;
    blocks[i >> 2] |= EXTRA[i & 3];
    this.block = blocks[16];
    if (i >= 56) {
      if (!this.hashed) {
        this.hash();
      }
      blocks[0] = this.block;
      blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    }
    blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
    blocks[15] = this.bytes << 3;
    this.hash();
  };

  Sha256.prototype.hash = function () {
    var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6,
      h = this.h7, blocks = this.blocks, j, s0, s1, maj, t1, t2, ch, ab, da, cd, bc;

    for (j = 16; j < 64; ++j) {
      // rightrotate
      t1 = blocks[j - 15];
      s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3);
      t1 = blocks[j - 2];
      s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10);
      blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0;
    }

    bc = b & c;
    for (j = 0; j < 64; j += 4) {
      if (this.first) {
        if (this.is224) {
          ab = 300032;
          t1 = blocks[0] - 1413257819;
          h = t1 - 150054599 << 0;
          d = t1 + 24177077 << 0;
        } else {
          ab = 704751109;
          t1 = blocks[0] - 210244248;
          h = t1 - 1521486534 << 0;
          d = t1 + 143694565 << 0;
        }
        this.first = false;
      } else {
        s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        ab = a & b;
        maj = ab ^ (a & c) ^ bc;
        ch = (e & f) ^ (~e & g);
        t1 = h + s1 + ch + K[j] + blocks[j];
        t2 = s0 + maj;
        h = d + t1 << 0;
        d = t1 + t2 << 0;
      }
      s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10));
      s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7));
      da = d & a;
      maj = da ^ (d & b) ^ ab;
      ch = (h & e) ^ (~h & f);
      t1 = g + s1 + ch + K[j + 1] + blocks[j + 1];
      t2 = s0 + maj;
      g = c + t1 << 0;
      c = t1 + t2 << 0;
      s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10));
      s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7));
      cd = c & d;
      maj = cd ^ (c & a) ^ da;
      ch = (g & h) ^ (~g & e);
      t1 = f + s1 + ch + K[j + 2] + blocks[j + 2];
      t2 = s0 + maj;
      f = b + t1 << 0;
      b = t1 + t2 << 0;
      s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10));
      s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7));
      bc = b & c;
      maj = bc ^ (b & d) ^ cd;
      ch = (f & g) ^ (~f & h);
      t1 = e + s1 + ch + K[j + 3] + blocks[j + 3];
      t2 = s0 + maj;
      e = a + t1 << 0;
      a = t1 + t2 << 0;
    }

    this.h0 = this.h0 + a << 0;
    this.h1 = this.h1 + b << 0;
    this.h2 = this.h2 + c << 0;
    this.h3 = this.h3 + d << 0;
    this.h4 = this.h4 + e << 0;
    this.h5 = this.h5 + f << 0;
    this.h6 = this.h6 + g << 0;
    this.h7 = this.h7 + h << 0;
  };

  Sha256.prototype.hex = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
      h6 = this.h6, h7 = this.h7;

    var hex = HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
      HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
      HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
      HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
      HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
      HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
      HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
      HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
      HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
      HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
      HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
      HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
      HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] +
      HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
      HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
      HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
      HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] +
      HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] +
      HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] +
      HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F] +
      HEX_CHARS[(h5 >> 28) & 0x0F] + HEX_CHARS[(h5 >> 24) & 0x0F] +
      HEX_CHARS[(h5 >> 20) & 0x0F] + HEX_CHARS[(h5 >> 16) & 0x0F] +
      HEX_CHARS[(h5 >> 12) & 0x0F] + HEX_CHARS[(h5 >> 8) & 0x0F] +
      HEX_CHARS[(h5 >> 4) & 0x0F] + HEX_CHARS[h5 & 0x0F] +
      HEX_CHARS[(h6 >> 28) & 0x0F] + HEX_CHARS[(h6 >> 24) & 0x0F] +
      HEX_CHARS[(h6 >> 20) & 0x0F] + HEX_CHARS[(h6 >> 16) & 0x0F] +
      HEX_CHARS[(h6 >> 12) & 0x0F] + HEX_CHARS[(h6 >> 8) & 0x0F] +
      HEX_CHARS[(h6 >> 4) & 0x0F] + HEX_CHARS[h6 & 0x0F];
    if (!this.is224) {
      hex += HEX_CHARS[(h7 >> 28) & 0x0F] + HEX_CHARS[(h7 >> 24) & 0x0F] +
        HEX_CHARS[(h7 >> 20) & 0x0F] + HEX_CHARS[(h7 >> 16) & 0x0F] +
        HEX_CHARS[(h7 >> 12) & 0x0F] + HEX_CHARS[(h7 >> 8) & 0x0F] +
        HEX_CHARS[(h7 >> 4) & 0x0F] + HEX_CHARS[h7 & 0x0F];
    }
    return hex;
  };

  Sha256.prototype.toString = Sha256.prototype.hex;

  Sha256.prototype.digest = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
      h6 = this.h6, h7 = this.h7;

    var arr = [
      (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,
      (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,
      (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,
      (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,
      (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF,
      (h5 >> 24) & 0xFF, (h5 >> 16) & 0xFF, (h5 >> 8) & 0xFF, h5 & 0xFF,
      (h6 >> 24) & 0xFF, (h6 >> 16) & 0xFF, (h6 >> 8) & 0xFF, h6 & 0xFF
    ];
    if (!this.is224) {
      arr.push((h7 >> 24) & 0xFF, (h7 >> 16) & 0xFF, (h7 >> 8) & 0xFF, h7 & 0xFF);
    }
    return arr;
  };

  Sha256.prototype.array = Sha256.prototype.digest;

  Sha256.prototype.arrayBuffer = function () {
    this.finalize();

    var buffer = new ArrayBuffer(this.is224 ? 28 : 32);
    var dataView = new DataView(buffer);
    dataView.setUint32(0, this.h0);
    dataView.setUint32(4, this.h1);
    dataView.setUint32(8, this.h2);
    dataView.setUint32(12, this.h3);
    dataView.setUint32(16, this.h4);
    dataView.setUint32(20, this.h5);
    dataView.setUint32(24, this.h6);
    if (!this.is224) {
      dataView.setUint32(28, this.h7);
    }
    return buffer;
  };

  function HmacSha256(key, is224, sharedMemory) {
    var i, type = typeof key;
    if (type === 'string') {
      var bytes = [], length = key.length, index = 0, code;
      for (i = 0; i < length; ++i) {
        code = key.charCodeAt(i);
        if (code < 0x80) {
          bytes[index++] = code;
        } else if (code < 0x800) {
          bytes[index++] = (0xc0 | (code >> 6));
          bytes[index++] = (0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
          bytes[index++] = (0xe0 | (code >> 12));
          bytes[index++] = (0x80 | ((code >> 6) & 0x3f));
          bytes[index++] = (0x80 | (code & 0x3f));
        } else {
          code = 0x10000 + (((code & 0x3ff) << 10) | (key.charCodeAt(++i) & 0x3ff));
          bytes[index++] = (0xf0 | (code >> 18));
          bytes[index++] = (0x80 | ((code >> 12) & 0x3f));
          bytes[index++] = (0x80 | ((code >> 6) & 0x3f));
          bytes[index++] = (0x80 | (code & 0x3f));
        }
      }
      key = bytes;
    } else {
      if (type === 'object') {
        if (key === null) {
          throw new Error(ERROR);
        } else if (ARRAY_BUFFER && key.constructor === ArrayBuffer) {
          key = new Uint8Array(key);
        } else if (!Array.isArray(key)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(key)) {
            throw new Error(ERROR);
          }
        }
      } else {
        throw new Error(ERROR);
      }
    }

    if (key.length > 64) {
      key = (new Sha256(is224, true)).update(key).array();
    }

    var oKeyPad = [], iKeyPad = [];
    for (i = 0; i < 64; ++i) {
      var b = key[i] || 0;
      oKeyPad[i] = 0x5c ^ b;
      iKeyPad[i] = 0x36 ^ b;
    }

    Sha256.call(this, is224, sharedMemory);

    this.update(iKeyPad);
    this.oKeyPad = oKeyPad;
    this.inner = true;
    this.sharedMemory = sharedMemory;
  }
  HmacSha256.prototype = new Sha256();

  HmacSha256.prototype.finalize = function () {
    Sha256.prototype.finalize.call(this);
    if (this.inner) {
      this.inner = false;
      var innerHash = this.array();
      Sha256.call(this, this.is224, this.sharedMemory);
      this.update(this.oKeyPad);
      this.update(innerHash);
      Sha256.prototype.finalize.call(this);
    }
  };

  var exports = createMethod();
  exports.sha256 = exports;
  exports.sha224 = createMethod(true);
  exports.sha256.hmac = createHmacMethod();
  exports.sha224.hmac = createHmacMethod(true);

  if (COMMON_JS) {
    module.exports = exports;
  } else {
    root.sha256 = exports.sha256;
    root.sha224 = exports.sha224;
    if (AMD) {
      define(function () {
        return exports;
      });
    }
  }
})();

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":7}],3:[function(require,module,exports){
'use strict';
const strictUriEncode = require('strict-uri-encode');
const decodeComponent = require('decode-uri-component');
const splitOnFirst = require('split-on-first');

function encoderForArrayFormat(options) {
	switch (options.arrayFormat) {
		case 'index':
			return key => (result, value) => {
				const index = result.length;
				if (value === undefined) {
					return result;
				}

				if (value === null) {
					return [...result, [encode(key, options), '[', index, ']'].join('')];
				}

				return [
					...result,
					[encode(key, options), '[', encode(index, options), ']=', encode(value, options)].join('')
				];
			};

		case 'bracket':
			return key => (result, value) => {
				if (value === undefined) {
					return result;
				}

				if (value === null) {
					return [...result, [encode(key, options), '[]'].join('')];
				}

				return [...result, [encode(key, options), '[]=', encode(value, options)].join('')];
			};

		case 'comma':
			return key => (result, value, index) => {
				if (!value) {
					return result;
				}

				if (index === 0) {
					return [[encode(key, options), '=', encode(value, options)].join('')];
				}

				return [[result, encode(value, options)].join(',')];
			};

		default:
			return key => (result, value) => {
				if (value === undefined) {
					return result;
				}

				if (value === null) {
					return [...result, encode(key, options)];
				}

				return [...result, [encode(key, options), '=', encode(value, options)].join('')];
			};
	}
}

function parserForArrayFormat(options) {
	let result;

	switch (options.arrayFormat) {
		case 'index':
			return (key, value, accumulator) => {
				result = /\[(\d*)\]$/.exec(key);

				key = key.replace(/\[\d*\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = {};
				}

				accumulator[key][result[1]] = value;
			};

		case 'bracket':
			return (key, value, accumulator) => {
				result = /(\[\])$/.exec(key);
				key = key.replace(/\[\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = [value];
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};

		case 'comma':
			return (key, value, accumulator) => {
				const isArray = typeof value === 'string' && value.split('').indexOf(',') > -1;
				const newValue = isArray ? value.split(',') : value;
				accumulator[key] = newValue;
			};

		default:
			return (key, value, accumulator) => {
				if (accumulator[key] === undefined) {
					accumulator[key] = value;
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};
	}
}

function encode(value, options) {
	if (options.encode) {
		return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

function decode(value, options) {
	if (options.decode) {
		return decodeComponent(value);
	}

	return value;
}

function keysSorter(input) {
	if (Array.isArray(input)) {
		return input.sort();
	}

	if (typeof input === 'object') {
		return keysSorter(Object.keys(input))
			.sort((a, b) => Number(a) - Number(b))
			.map(key => input[key]);
	}

	return input;
}

function extract(input) {
	const queryStart = input.indexOf('?');
	if (queryStart === -1) {
		return '';
	}

	return input.slice(queryStart + 1);
}

function parse(input, options) {
	options = Object.assign({
		decode: true,
		arrayFormat: 'none'
	}, options);

	const formatter = parserForArrayFormat(options);

	// Create an object with no prototype
	const ret = Object.create(null);

	if (typeof input !== 'string') {
		return ret;
	}

	input = input.trim().replace(/^[?#&]/, '');

	if (!input) {
		return ret;
	}

	for (const param of input.split('&')) {
		let [key, value] = splitOnFirst(param.replace(/\+/g, ' '), '=');

		// Missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		value = value === undefined ? null : decode(value, options);

		formatter(decode(key, options), value, ret);
	}

	return Object.keys(ret).sort().reduce((result, key) => {
		const value = ret[key];
		if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
			// Sort object keys, not values
			result[key] = keysSorter(value);
		} else {
			result[key] = value;
		}

		return result;
	}, Object.create(null));
}

exports.extract = extract;
exports.parse = parse;

exports.stringify = (object, options) => {
	if (!object) {
		return '';
	}

	options = Object.assign({
		encode: true,
		strict: true,
		arrayFormat: 'none'
	}, options);

	const formatter = encoderForArrayFormat(options);
	const keys = Object.keys(object);

	if (options.sort !== false) {
		keys.sort(options.sort);
	}

	return keys.map(key => {
		const value = object[key];

		if (value === undefined) {
			return '';
		}

		if (value === null) {
			return encode(key, options);
		}

		if (Array.isArray(value)) {
			return value
				.reduce(formatter(key), [])
				.join('&');
		}

		return encode(key, options) + '=' + encode(value, options);
	}).filter(x => x.length > 0).join('&');
};

exports.parseUrl = (input, options) => {
	const hashStart = input.indexOf('#');
	if (hashStart !== -1) {
		input = input.slice(0, hashStart);
	}

	return {
		url: input.split('?')[0] || '',
		query: parse(extract(input), options)
	};
};

},{"decode-uri-component":1,"split-on-first":4,"strict-uri-encode":5}],4:[function(require,module,exports){
'use strict';

module.exports = (string, separator) => {
	if (!(typeof string === 'string' && typeof separator === 'string')) {
		throw new TypeError('Expected the arguments to be of type `string`');
	}

	if (separator === '') {
		return [string];
	}

	const separatorIndex = string.indexOf(separator);

	if (separatorIndex === -1) {
		return [string];
	}

	return [
		string.slice(0, separatorIndex),
		string.slice(separatorIndex + separator.length)
	];
};

},{}],5:[function(require,module,exports){
'use strict';
module.exports = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);

},{}],6:[function(require,module,exports){
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

window.inputExpire = function() {

    console.log('show');

    var checked = document.getElementById('policy-history-sel').checked;
    var expire = document.getElementById('policy-history-expire-form');

    console.log(checked);
    if (checked) {
        expire.innerHTML = '<label for="policy-history-expire-form" class="control-label"><i>History Lifetime (Integer Only) [h]</i></label>' + 
                           '<input type="text" id="policy-history-expire" class="form-control" name="policy-history-expire" value="' + Account._expire / (3600 * 1000) + '"/>';
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

    if (Account._policy == 'history') {
        $('#policy-strict-sel').attr('checked', false);
        $('#policy-history-sel').attr('checked', true);
        inputExpire();
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
    					await ethManager.transferViaManager(to, amount, {from: userAddr, value: amount}, (e, txn) => {
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
    		await ethManager.transferViaManager(to, amount, {from: userAddr, value: amount}, (e, txn) => {
    			
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



},{"js-sha256":2,"query-string":3}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[6]);
