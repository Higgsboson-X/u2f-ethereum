const compiledServer = require('../build/contracts/Server.json');
const base64url = require('base64url');
const sha256 = require('js-sha256').sha256;

const u2fc = require('u2f-api');
const random = require('randomstring');

const TIME_OUT = 1000;

const Web3 = require('web3');

const web3 = new Web3(Web3.givenProvider || "http://127.0.0.1:8545");

var u2fServer = new web3.eth.Contract(compiledServer.abi);


if (localStorage.getItem('server') != null) {
    u2fServer.options.address = localStorage.getItem('server');
}


console.log(u2fServer);

const GAS = 8000000;



// ======================================================================================================================== //


document.getElementById('server').addEventListener('submit', configServer);

function configServer(e) {

    serverAddr = document.getElementById('serverAddr').value;
    console.log('Setting server address: ', serverAddr);

    u2fServer.options.address = serverAddr;

    localStorage.setItem('server', serverAddr);

    console.log(u2fServer);

    fetchRequests();
    document.getElementById('server').reset();
    e.preventDefault();

}




// ======================================================================================================================== //



/*
    Status:
        - Failed;
        - Pending;
        - Confirmed;
*/


document.getElementById('register').addEventListener('submit', userRegister);


function userRegister(e) {

    var addr = document.getElementById('enrollAddress').value;
    var appId = window.location.origin;

    console.log(appId, addr);

    var id = random.generate(32);
    var request = 'NA',
        response = 'NA',
        status = 'ERROR';
    var type = 'Register';

    u2fEnroll(appId, addr)
    .then((req) => {
        request = req;
        console.log(req);
        return new Promise((resolve) => {
            resolve(req);
        });
    })
    .then(async (req) => {
        var res = await u2fTokenRegister(req);
        console.log(res);
        return new Promise((resolve) => {
            resolve(res);
        });
    })
    .then(async (res) => {
        response = await u2fBind(appId, addr, res);
        console.log(response);
        return new Promise((resolve) => {
            resolve();
        });
    })
    .then(() => {
        status = 'Confirmed';
    })
    .catch((e) => {
        status = 'Failed';
        console.log(e);
    })
    .finally(() => {
        var record = {
            _id: id,
            _type: type,
            _address: addr,
            _request: request,
            _response: response,
            _status: status,
            _appId: appId
        }

        if (JSON.parse(localStorage.getItem('records')) === null) {
            var records = [];
            records.push(record);
            localStorage.setItem('records', JSON.stringify(records));
        }
        else{
            var records = JSON.parse(localStorage.getItem('records'));
            records.push(record);
            localStorage.setItem('records', JSON.stringify(records));
        }
        fetchRequests();
    });

    document.getElementById('register').reset();
    e.preventDefault();
    

}


/*
async function userRegister(e) {

    var addr = document.getElementById('enrollAddress').value;
    var appId = window.location.origin;

    console.log(appId, addr);

    var id = random.generate(32);
    var request = 'NA',
        response = 'NA',
        status = 'ERROR';
    var type = 'Register';

    try {
        request = await u2fEnroll(appId, addr);
        console.log(request);
        var res = await u2fTokenRegister(request);
        console.log(res);
        response = await u2fBind(appId, addr, res);
        console.log(response);
        status = 'Confirmed';
    }
    catch (e) {
        status = 'Failed';
        console.log(e);
    }

    var record = {
        _id: id,
        _type: type,
        _address: addr,
        _request: request,
        _response: response,
        _status: status,
        _appId: appId
    }

    if (JSON.parse(localStorage.getItem('records')) === null) {
        var records = [];
        records.push(record);
        localStorage.setItem('records', JSON.stringify(records));
    }
    else{
        var records = JSON.parse(localStorage.getItem('records'));
        records.push(record);
        localStorage.setItem('records', JSON.stringify(records));
    }
    fetchRequests();

    document.getElementById('register').reset();
    e.preventDefault();

}
*/


document.getElementById('sign').addEventListener('submit', userSign);



function userSign(e) {

    var addr = document.getElementById('signAddress').value;
    var appId = window.location.origin;

    console.log(appId, addr);

    var id = random.generate(32);
    var request = 'NA',
        response = 'NA',
        status = 'ERROR';
    var type = 'Sign';

    u2fSign(appId, addr)
    .then((req) => {
        request = req;
        return req;
    })
    .then(async (req) => {
        var res = await u2fTokenSign(req);
        console.log(res);
        return res;
    })
    .then(async (res) => {
        response = await u2fVerify(appId, addr, res);
        console.log(response);
    })
    .then(() => {
        status = 'Confirmed';
    })
    .catch((e) => {
        status = 'Failed';
        console.log(e);
    })
    .finally(() => {
        var record = {
            _id: id,
            _type: type,
            _address: addr,
            _request: request,
            _response: response,
            _status: status,
            _appId: appId
        }

        if (JSON.parse(localStorage.getItem('records')) === null) {
            var records = [];
            records.push(record);
            localStorage.setItem('records', JSON.stringify(records));
        }
        else{
            var records = JSON.parse(localStorage.getItem('records'));
            records.push(record);
            localStorage.setItem('records', JSON.stringify(records));
        }
        fetchRequests();
    });
    
    document.getElementById('sign').reset();
    e.preventDefault();

}

/*
async function userSign(e) {

    var addr = document.getElementById('signAddress').value;
    var appId = window.location.origin;

    console.log(appId, addr);

    var id = random.generate(32);
    var request = 'NA',
        response = 'NA',
        status = 'ERROR';
    var type = 'Sign';

    try {
        request = await u2fSign(appId, addr);
        var res = await u2fTokenSign(request);
        response = await u2fVerify(appId, addr, res);
        status = 'Confirmed';
    }
    catch (e) {
        status = 'Failed';
        console.log(e);
    }

    var record = {
        _id: id,
        _type: type,
        _address: addr,
        _request: request,
        _response: response,
        _status: status,
        _appId: appId
    }

    if (JSON.parse(localStorage.getItem('records')) === null) {
        var records = [];
        records.push(record);
        localStorage.setItem('records', JSON.stringify(records));
    }
    else{
        var records = JSON.parse(localStorage.getItem('records'));
        records.push(record);
        localStorage.setItem('records', JSON.stringify(records));
    }
    fetchRequests();

    document.getElementById('register').reset();
    e.preventDefault();

}
*/

// ======================================================================================================================== //


function u2fTokenRegister(request) {

    return new Promise((resolve, reject) => {

        var response;

        u2fc.isSupported()
        .then((support) => {

            console.log('support: ', support);

            if (!support) {
                reject('Not supported.');
            }

            u2fc.register([JSON.parse(request)], [], TIME_OUT)
            .then((res) => {
                response = JSON.stringify(res);
                resolve(response);
            }, (err) => {
                response = '[ERROR]-' + err.metaData.code + '-' + err.metaData.type;
                console.log(err);
                console.log('code: ', err.metaData.code);
                console.log('type: ', err.metaData.type);
                reject(response);
            });

        }, (e) => {
            response = '[ERROR]-' + e.metaData.code + '-' + e.metaData.type;
            console.log(e);
            console.log('code: ', e.metaData.code);
            console.log('type: ', e.metaData.type);
            reject(response);
        });

    });

}



function u2fTokenSign(request) {

    return new Promise((resolve, reject) => {

        var response;

        u2fc.isSupported()
        .then((support) => {

            console.log('support: ', support);

            if (!support) {
                reject('Not supported.');
            }

            u2fc.sign([JSON.parse(request)], [], TIME_OUT)
            .then((res) => {
                response = JSON.stringify(res);
                resolve(response);
            }, (err) => {
                response = '[ERROR]-' + err.metaData.code + '-' + err.metaData.type;
                console.log(err);
                console.log('code: ', err.metaData.code);
                console.log('type: ', err.metaData.type);
                reject(response);
            });

        }, (e) => {
            response = '[ERROR]-' + e.metaData.code + '-' + e.metaData.type;
            console.log(e);
            console.log('code: ', e.metaData.code);
            console.log('type: ', e.metaData.type);
            reject(response);
        });

    });

}






// ======================================================================================================================== //



function u2fEnroll(appId, address) {

    return new Promise((resolve, reject) => {

        var details = {'type': 'register'};

        u2fServer.methods.enroll(appId).send({from: address, gas: GAS})
        .then((receipt) => {
            console.log('[OK] ', receipt);
            details['transactionHash'] = receipt['transactionHash'];
        }, (err) => {
            var message = err.message;
            var start = message.search('{');
            var end = message.length;
            var receipt = JSON.parse(message.slice(start, end));
            console.log('[ERROR] ', receipt);
            if (receipt['status'] == true) {
                details['transactionHash'] = receipt['transactionHash'];
            }
            else {
                reject(err);
            }
        })
        .finally(async () => {
            if (details['transactionHash'] != 'undefined') {
                var request = await getRegisterRequest(address);
                details['request'] = hex2a(request.slice(2, request.length));
                console.log(request);
            }
            console.log('[FINALLY] ', details);
            console.log('[JSON] ', JSON.stringify(details));

            resolve(details['request']);

        });

    });

}



function u2fBind(appId, address, response) {

    return new Promise((resolve, reject) => {

        var dict = JSON.parse(response);
        var clientData = dict['clientData'];
        var registrationData = dict['registrationData'];

        var decodedClientData = base64url.toBuffer(clientData).toString('hex');
        var buf = base64url.toBuffer(registrationData);

        if (buf[0] != 5) {
            reject('Preserved byte should be 0x05.');
        }

        var k = 1;

        var pubKey = buf.slice(k, k + 65).toString('hex');
        k += 65;

        var keyHandleLen = Buffer.from(buf.slice(k, k + 1), 'hex')[0];
        k++;

        var keyHandle = buf.slice(k, k + keyHandleLen).toString('hex');
        k += keyHandleLen;

        var certLen = parseTlvSize(buf.slice(k, buf.length));
        var cert = fixCert(buf.slice(k, k + certLen));
        k += certLen;

        var prefix = '3059301306072a8648ce3d020106082a8648ce3d030107034200';
        var certKey = cert.slice(cert.search(prefix) + prefix.length, cert.search(prefix) + prefix.length + 65 * 2);

        var signature = buf.slice(k, buf.length).toString('hex');

        var details = {'type': 'register'};


        u2fServer.methods.client(decodedClientData, appId, 0).call({from: address})
        .then((challengeParameter) => {

            console.log(challengeParameter);
            challengeParameter = challengeParameter.slice(2, challengeParameter.length);

            u2fServer.methods.bind(appId, challengeParameter, pubKey, keyHandle, certKey, signature).send({from: address, gas: GAS})
            .then((receipt) => {
                console.log('[OK] ', receipt);
                details['transactionHash'] = receipt['transactionHash'];
            }, (error) => {
                var message = error.message;
                var start = message.search('{');
                var end = message.length;
                var receipt = JSON.parse(message.slice(start, end));
                console.log('[ERROR] ', receipt);
                if (receipt['status'] == true) {
                    details['transactionHash'] = receipt['transactionHash'];
                }
                else {
                    reject(error);
                }
            })
            .finally(async () => {
                if (details['transactionHash'] != 'undefined') {
                    var device = await getRegisteredKey(address);
                    details['registeredKey'] = hex2a(device.slice(2, device.length));
                }
                console.log('[FINALLY] ', details);
                console.log('[JSON] ', JSON.stringify(details));
                resolve(details['registeredKey']);
            });
        }, (err) => {
            reject(err);
        });

    });

}


function u2fSign(appId, address) {

    return new Promise((resolve, reject) => {

        var details = {'type': 'authenticate'};

        u2fServer.methods.sign(appId).send({from: address, gas: GAS})
        .then((receipt) => {
            console.log('[OK] ', receipt);
            details['transactionHash'] = receipt['transactionHash'];
        }, (error) => {
            var message = error.message;
            var start = message.search('{');
            var end = message.length;
            var receipt = JSON.parse(message.slice(start, end));
            console.log('[ERROR] ', receipt);
            if (receipt['status'] == true) {
                details['transactionHash'] = receipt['transactionHash'];
            }
            else {
                reject(error);
            }
        })
        .finally(async () => {
            if (details['transactionHash'] != 'undefined') {
                var request = await getSignRequest(address);
                details['request'] = hex2a(request.slice(2, request.length));
            }
            console.log('[FINALLY] ', details);
            console.log('[JSON] ', JSON.stringify(details));

            resolve(details['request']);
        });

    });

}


function u2fVerify(appId, address, response) {

    return new Promise((resolve, reject) => {

        var dict = JSON.parse(response);
        var clientData = dict['clientData'];
        var signatureData = dict['signatureData'];
        var keyHandle = dict['keyHandle'];

        var decodedClientData = base64url.toBuffer(clientData).toString('hex');
        var decodedSignatureData = base64url.toBuffer(signatureData).toString('hex');

        var details = {'type': 'authenticate'};

        u2fServer.methods.client(decodedClientData, appId, 1).call({from: address})
        .then((challengeParameter) => {
            console.log(challengeParameter);
            challengeParameter = challengeParameter.slice(2, challengeParameter.length);
        
            u2fServer.methods.verify(appId, challengeParameter, decodedSignatureData, keyHandle).send({from: address, gas: GAS})
            .then((receipt) => {
                console.log('[OK] ', receipt);
                details['transactionHash'] = receipt['transactionHash'];
            }, (error) => {
                var message = error.message;
                var start = message.search('{');
                var end = message.length;
                var receipt = JSON.parse(message.slice(start, end));
                console.log('[ERROR] ', receipt);
                if (receipt['status'] == true) {
                    details['transactionHash'] = receipt['transactionHash'];
                }
                else {
                    reject(error);
                }
            })
            .finally(async () => {
                if (details['transactionHash'] != 'undefined') {
                    var info = await getLastVerified(address);
                    details['info'] = hex2a(info.slice(2, info.length));
                }
                console.log('[FINALLY] ', details);
                console.log('[JSON] ', JSON.stringify(details));

                resolve(details['info']);
            });
        }, (err) => {
            reject(err);
        });

    });  

}


// ======================================================================================================================== //




function getRegisterRequest(address) {

    return new Promise(resolve => {
        u2fServer.methods.getEnroll().call({from: address})
        .then((result) => {
            resolve(result);
        });
    });

}



function getRegisteredKey(address) {

    return new Promise(resolve => {
        u2fServer.methods.getKey().call({from: address})
        .then((result) => {
            resolve(result);
        });
    });

}



function getSignRequest(address) {

    return new Promise(resolve => {
        u2fServer.methods.getSign().call({from: address})
        .then((result) => {
            resolve(result);
        });
    });

}


function getLastVerified(address) {

    return new Promise(resolve => {
        u2fServer.methods.getVerified().call({from: address})
        .then((result) => {
            resolve(result);
        });
    });

}


// ======================================================================================================================== //


function parseTlvSize(data) {

    var l = data[1];
    var n = 1;
    if (l > 0x80) {
        n = l - 0x80;
        l = 0;
        for (var i = 2; i < 2 + n; i++) {
            l = l * 256 + data[i];
        }
    }

    return 2 + n + l;

}

function hex2a(hexx) {

    var hex = hexx.toString();
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }

    return str;

}

function a2hex(str) {

    var arr = [];
    for (var i = 0, l = str.length; i < l; i ++) {
        var hex = Number(str.charCodeAt(i)).toString(16);
        arr.push(hex);
    }

    return arr.join('');

}


function fixCert(certBuf) {

    var toFix = [
        '349bca1031f8c82c4ceca38b9cebf1a69df9fb3b94eed99eb3fb9aa3822d26e8',
        'dd574527df608e47ae45fbba75a2afdd5c20fd94a02419381813cd55a2a3398f',
        '1d8764f0f7cd1352df6150045c8f638e517270e8b5dda1c63ade9c2280240cae',
        'd0edc9a91a1677435a953390865d208c55b3183c6759c9b5a7ff494c322558eb',
        '6073c436dcd064a48127ddbf6032ac1a66fd59a0c24434f070d4e564c124c897',
        'ca993121846c464d666096d35f13bf44c1b05af205f9b4a1e00cf6cc10c5e511'
    ];

    for (var i = 0; i < toFix.length; i++) {
        if (sha256(certBuf) == toFix[i]) {
            return certBuf.slice(0, certBuf.length - 257).toString('hex') + '00' + certBuf.slice(certBuf.length - 256 , cert.length).toString('hex');
        }
    }

    return certBuf.toString('hex');

}

