window.qs = require('query-string');

window.ethManagerAddr = qs.parse(window.location.search).addr;
window.userAddr = qs.parse(window.location.search).user;

window.base64url = require('base64url');
window.sha256 = require('js-sha256').sha256;

window.u2fc = require('u2f-api');
window.random = require('randomstring');

window.client = require('./client');
window.vk = require('./virtual-key');

window.TIME_OUT = 30;
window.GAS = 8000000;
window.PROMPT_REG_PEND_SHOW = 'Insert Yubico key in a USB port and click `Continue` to complete registration.';
window.PROMPT_REG_COMP_SHOW = 'Click `View` to see registered key.';
// window.PROMPT_REG_COMP_HIDE = 'Click `Hide` to hide registered key.';
window.PROMPT_AUT_PEND_SHOW = 'Insert Yubico key in a USB port and click `Continue` to complete authentication.';
window.PROMPT_AUT_COMP_SHOW = 'Click `View` to see verification.';
// window.PROMPT_AUT_COMP_HIDE = 'Click `Hide` to hide verification.';

window.compiledManager = require('../../build/contracts/Manager.json');

const Web3 = require('web3');

if (window.web3) {
    window.web3 = new Web3(window.web3.currentProvider);
}
else {
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
}

window.managerContract = window.web3.eth.contract(compiledManager.abi);

window.ethManager = window.managerContract.at(ethManagerAddr);
console.log(ethManager);



// ======================================================================================================================== //


window.deleteU2FRecord = function(id) {

    for (var i = 0; i < window.Account._u2fRecords.length; i++) {
        if (window.Account._u2fRecords[i]._id == id) {
            window.Account._u2fRecords.splice(i, 1);
            break;
        }
    }

    updateAccount();

    fetchU2FRequests();

}


window.clearU2FAll = function() {

    if (Account._u2fRecords == null || Account._u2fRecords == []) {
        return;
    }

    window.Account._u2fRecords = [];
    updateAccount();

    fetchU2FRequests();

}


window.fetchU2FRequests = function() {

    var records = Account._u2fRecords;
    var recordList = document.getElementById('usage-registerKey-records');

    recordList.innerHTML = '';

    if (records === null || records == []) {
        return;
    }
    
    for (var i = 0; i < records.length; i++) {
        
        var id = records[i]._id;
        var type = records[i]._type;
        var addr = records[i]._address;
        var details = records[i]._details;
        var status = records[i]._status;
        var appId = records[i]._appId;

        var additional;

        if (type == 'Register') {
            if (status == 'Pending') {
                additional = '<a href="#" class="btn btn-primary" onclick="confirmRegistration(\''+id+'\')">Continue</a>  ';
                if (details == PROMPT_REG_PEND_SHOW) {
                    additional += '<a href="#" class="btn btn-warning" onclick="updateRegisterRequest(\''+id+'\')">View</a>  ';
                }
                else {
                    additional += '<a href="#" class="btn btn-warning" onclick="hideDetails(\''+id+'\')">Hide</a>  ';
                }
            }
            else if (status == 'Confirmed') {
                if (details == PROMPT_REG_COMP_SHOW) {
                    additional = '<a href="#" class="btn btn-warning" onclick="updateDevice(\''+id+'\')">View</a>  ';
                }
                else {
                    additional = '<a href="#" class="btn btn-warning" onclick="hideDetails(\''+id+'\')">Hide</a>  ';
                }
            }
            else {
                additional = '';
            }
        }
        else if (type == 'Sign') {
            if (status == 'Pending') {
                additional = '<a href="#" class="btn btn-primary" onclick="confirmAuthentication(\''+id+'\')">Continue</a>  ';
                if (details == PROMPT_AUT_PEND_SHOW) {
                    additional += '<a href="#" class="btn btn-warning" onclick="updateSignRequest(\''+id+'\')">View</a>  ';
                }
                else {
                    additional += '<a href="#" class="btn btn-warning" onclick="hideDetails(\''+id+'\')">Hide</a>  ';
                }
            }
            else if (status == 'Confirmed') {
                if (details == PROMPT_AUT_COMP_SHOW) {
                    additional = '<a href="#" class="btn btn-warning" onclick="updateLastVerified(\''+id+'\')">View</a>  ';
                }
                else {
                    additional = '<a href="#" class="btn btn-warning" onclick="hideDetails(\''+id+'\')">Hide</a>  ';
                }
            }
            else {
                additional = '';
            }
        }

        recordList.innerHTML += '<div class="col-sm-12 col-md-12 well">' +
                                '<h3>Record ID: ' + id + '</h3>' +
                                '<p><span class="label label-default">' + type + '</span>' + ' ' +
                                '<span class="label label-info">' + status + '</span></p>' +
                                '<p><span class="glyphicon glyphicon-user"></span> ' + addr + '</p>'+
                                '<p><span class="glyphicon glyphicon-tag"></span> ' + appId + '</p>'+
                                '<h6>Details: ' + details + '</h6>' +
                                additional + 
                                '<a href="#" class="btn btn-danger" onclick="deleteU2FRecord(\''+id+'\')">Delete</a>' +
                                '</div>';

    }

}




// ======================================================================================================================== //



window.beginRegistration = async function() {

    var address = userAddr;
    var appId = window.location.origin;

    var details;
    var status = 'Pending';
    var id = random.generate(32);

    console.log(appId, address);

    u2fEnroll(appId, address)
    .then((req) => {

        details = PROMPT_REG_PEND_SHOW;

    }, (e) => {

        status = 'Failed';
        details = '[Register request error] ' + e.message;
        
    })
    .finally(() => {

        var record = {
            _id: id,
            _type: 'Register',
            _address: address,
            _details: details,
            _status: status,
            _appId: appId
        }

        if (Account._u2fRecords == null || Account._u2fRecords == []) {
            var records = [];
            records.push(record);
            window.Account._u2fRecords = records;
            updateAccount();
        }
        else{
            var records = window.Account._u2fRecords;
            var found = false;
            for (var i = 0; i < records.length; i++) {
                if (records[i]._address == address && records[i]._type == 'Register' && records[i]._status == 'Pending') {
                    records[i] = record;
                    found = true;
                }
            }
            if (!found) {
                records.push(record);
            }
            window.Account._u2fRecords = records;
            updateAccount();
        }
        fetchU2FRequests();
    });
    
}


window.beginAuthentication = async function(callback) {

    var address = userAddr;
    var appId = window.location.origin;

    var details;
    var status = 'Pending';
    var id = random.generate(32);

    console.log(appId, address);

    u2fSign(appId, address)
    .then((req) => {

        details = PROMPT_AUT_PEND_SHOW;

    }, (e) => {

        status = 'Failed';
        details = '[Sign request error] ' + e.message;

        callback(e, null);
        
    })
    .finally(() => {

        var record = {
            _id: id,
            _type: 'Sign',
            _address: address,
            _details: details,
            _status: status,
            _appId: appId
        }

        if (Account._u2fRecords == null || Account._u2fRecords == []) {
            var records = [];
            records.push(record);
            window.Account._u2fRecords = records;
            updateAccount();
        }
        else{
            var records = window.Account._u2fRecords;
            var found = false;
            for (var i = 0; i < records.length; i++) {
                if (records[i]._address == address && records[i]._type == 'Sign' && records[i]._status == 'Pending') {
                    records[i] = record;
                    found = true;
                }
            }
            if (!found) {
                records.push(record);
            }
            window.Account._u2fRecords = records;
            updateAccount();
        }
        fetchU2FRequests();

        callback(null, id);
    });

}

// ======================================================================================================================== //


window.confirmRegistration = async function(id) {

    console.log('confirm registration: ', id);

    for (var i = 0; i < window.Account._u2fRecords.length; i++) {
        if (window.Account._u2fRecords[i]._id == id) {

            var address = window.Account._u2fRecords[i]._address;
            var appId = window.Account._u2fRecords[i]._appId;
            var request = await getRegisterRequest(userAddr);

            console.log(request);

            request = hex2a(request.slice(2, request.length));

            var u2fToken = vk.parseU2FKeyStr(Account._u2fTokenStr);

            client.u2fRegisterClient(request, u2fToken)
            .then(async (response) => {

                console.log(response);
            
                await u2fBind(appId, address, response)
                .then((dev) => {
                    window.Account._u2fRecords[i]._details = PROMPT_REG_COMP_SHOW;
                    window.Account._u2fRecords[i]._status = 'Confirmed';
                }, (error) => {
                    window.Account._u2fRecords[i]._details = '[ERROR] ' + error.message;
                    window.Account._u2fRecords[i]._status = 'Failed';
                });

            }, (err) => {

                window.Account._u2fRecords[i]._details = '[ERROR] ' + err;
                window.Account._u2fRecords[i]._status = 'Failed';
                console.log(err);
                console.log('code: ', err.metaData.code);
                console.log('type: ', err.metaData.type);

            })
            .finally(() => {
                if (window.Account._u2fRecords[i]._status == 'Confirmed') {
                    window.Account._registered = true;
                }
                fetchU2FRequests();
                updateAccount();
            });

            break;
        }
    }

}


window.confirmAuthentication = async function(id, callback) {

    console.log('confirm authentication: ', id);

    for (var i = 0; i < window.Account._u2fRecords.length; i++) {
        if (window.Account._u2fRecords[i]._id == id) {

            var address = window.Account._u2fRecords[i]._address;
            var appId = window.Account._u2fRecords[i]._appId;
            var request = await getSignRequest(userAddr);

            console.log(request);

            request = editDataOut(hex2a(request.slice(2, request.length)), 'sign');

            var u2fToken = vk.parseU2FKeyStr(Account._u2fTokenStr);

            client.u2fAuthenticateClient(request, u2fToken)
            .then(async (response) => {

                console.log(response);
            
                await u2fVerify(appId, address, response)
                .then((dev) => {
                    window.Account._u2fRecords[i]._details = PROMPT_AUT_COMP_SHOW;
                    window.Account._u2fRecords[i]._status = 'Confirmed';

                    callback(true);
                }, (error) => {
                    window.Account._u2fRecords[i]._details = '[ERROR] ' + error.message;
                    window.Account._u2fRecords[i]._status = 'Failed';

                    callback(false);
                });

            }, (err) => {

                window.Account._u2fRecords[i]._details = '[ERROR] ' + err;
                window.Account._u2fRecords[i]._status = 'Failed';
                console.log(err);
                console.log('code: ', err.metaData.code);
                console.log('type: ', err.metaData.type);

                callback(false);

            })
            .finally(() => {
                fetchU2FRequests();
                updateAccount();
            });


            break;
        }
    }

}




// ======================================================================================================================== //


function editDataOut(data, type) {

    if (type == 'enroll') {
        return data;
    }

    else if (type == 'bind') {

        dict = JSON.parse(data);
        keyHandle = base64url.encode(Buffer.from(dict['keyHandle'], 'hex'));
        pubKey = base64url.encode(Buffer.from(dict['publicKey'], 'hex'));
        dict['keyHandle'] = keyHandle;
        dict['publicKey'] = pubKey;

        return JSON.stringify(dict);

    }

    else if (type == 'sign') {

        dict = JSON.parse(data);
        keyHandle = base64url.encode(Buffer.from(dict['keyHandle'], 'hex'));
        pubKey = base64url.encode(Buffer.from(dict['publicKey'], 'hex'));
        dict['keyHandle'] = keyHandle;
        dict['publicKey'] = pubKey;

        return JSON.stringify(dict);

    }

    else {

        // type = 'verify';

        dict = JSON.parse(data);
        keyHandle = base64url.encode(Buffer.from(dict['keyHandle'], 'hex'));
        dict['keyHandle'] = keyHandle;

        return JSON.stringify(dict);

    }

}


// ======================================================================================================================== //



function u2fEnroll(appId, address) {

    return new Promise((resolve, reject) => {

        ethManager.enroll(appId, {from: address}, async (e, txn) => {
            if (e) {
                console.log(e);
                reject(e);
            }

            console.log('tansaction hash: ', txn);

            ethManager.getUserU2F((err, result) => {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                var enroll = result[0];
                enroll = editDataOut(hex2a(enroll.slice(2, enroll.length)), 'enroll');

                console.log('request: ', enroll);
                resolve(enroll);

            });

        });

    });

}


function u2fBind(appId, address, response, virtual=true) {

    return new Promise((resolve, reject) => {

        var dict = JSON.parse(response);
        var clientData = dict['clientData'];
        var registrationData = dict['registrationData'];

        var decodedClientData = '0x' + base64url.toBuffer(clientData).toString('hex');
        var buf = base64url.toBuffer(registrationData);

        if (buf[0] != 5) {
            reject('Preserved byte should be 0x05.');
        }

        var k = 1;

        var pubKey = '0x' + buf.slice(k, k + 65).toString('hex');
        k += 65;

        var keyHandleLen = Buffer.from(buf.slice(k, k + 1), 'hex')[0];
        k++;

        var keyHandle = '0x' + buf.slice(k, k + keyHandleLen).toString('hex');
        k += keyHandleLen;

        var certKey;

        if (virtual) {
            var certKeyLen = Buffer.from(buf.slice(k, k + 1), 'hex')[0];
            k++;
            certKey = '0x' + buf.slice(k, k + certKeyLen).toString('hex');
            k += certKeyLen;
        }
        else {
            var certLen = parseTlvSize(buf.slice(k, buf.length));
            var cert = fixCert(buf.slice(k, k + certLen));
            k += certLen;

            var prefix = '3059301306072a8648ce3d020106082a8648ce3d030107034200';
            certKey = '0x' + cert.slice(cert.search(prefix) + prefix.length, cert.search(prefix) + prefix.length + 65 * 2);
        }

        var signature = '0x' + buf.slice(k, buf.length).toString('hex');
        // var r = '0x' + signature.slice(0, 32).toString('hex');
        // var s = '0x' + signature.slice(32, 64).toString('hex');
        // var v = signature[64];

        var details = {'type': 'register'};


        ethManager.client(decodedClientData, appId, 0, {from: address}, (e, challengeParameter) => {

            if (e) {
                console.log(e);
                reject(e);
            }

            console.log(challengeParameter);
            // challengeParameter = challengeParameter.slice(2, challengeParameter.length);

            ethManager.bind(appId, challengeParameter, pubKey, keyHandle, certKey, signature, {from: address}, (err, txn) => {

                if (err) {
                    console.log(err);
                    reject(err);
                }

                console.log('transaction hash: ', txn);

                ethManager.getUserU2F({from: address}, (error, result) => {

                    if (error) {
                        console.log(error);
                        reject(error);
                    }

                    var registeredKey = result[1];

                    registeredKey = editDataOut(hex2a(registeredKey.slice(2, registeredKey.length)), 'bind');

                    console.log('registered key: ', registeredKey);
                    resolve(registeredKey);

                });

            });

        });

    });

}



function u2fSign(appId, address) {

    return new Promise((resolve, reject) => {

        ethManager.sign(appId, {from: address}, async (e, txn) => {
            if (e) {
                console.log(e);
                reject(e);
            }

            console.log('tansaction hash: ', txn);

            ethManager.getUserU2F((err, result) => {
                if (err) {
                    console.log(err);
                    reject(err);
                }

                var sign = result[2];
                sign = editDataOut(hex2a(sign.slice(2, sign.length)), 'sign');

                console.log('request: ', sign);
                resolve(sign);

            });

        });

    });

}



function u2fVerify(appId, address, response) {

    return new Promise((resolve, reject) => {

        var dict = JSON.parse(response);
        var clientData = dict['clientData'];
        var signatureData = dict['signatureData'];
        var keyHandle = base64url.toBuffer(dict['keyHandle']).toString('hex');

        var decodedClientData = '0x' + base64url.toBuffer(clientData).toString('hex');
        var decodedSignatureData = '0x' + base64url.toBuffer(signatureData).toString('hex');


        ethManager.client(decodedClientData, appId, 1, {from: address}, (e, challengeParameter) => {

            if (e) {
                console.log(e);
                reject(e);
            }

            console.log(challengeParameter);
            // challengeParameter = challengeParameter.slice(2, challengeParameter.length);

            ethManager.verify(appId, challengeParameter, decodedSignatureData, keyHandle, {from: address}, (err, txn) => {

                if (err) {
                    console.log(err);
                    reject(err);
                }

                console.log('transaction hash: ', txn);

                ethManager.getUserU2F({from: address}, (error, result) => {

                    if (error) {
                        console.log(error);
                        reject(error);
                    }

                    var lastVerified = result[3];
                    lastVerified = editDataOut(hex2a(lastVerified.slice(2, lastVerified.length)), 'verify');

                    console.log('verification: ', lastVerified);
                    resolve(lastVerified);

                });

            });

        });
        
    });

}


// ======================================================================================================================== //


window.updateRegisterRequest = async function(id) {

    console.log('update register request: ', id);

    for (var i = 0; i < window.Account._u2fRecords.length; i++) {
        if (window.Account._u2fRecords[i]._id == id) {
            var address = window.Account._u2fRecords[i]._address;
            var device = await getRegisterRequest(address);

            window.Account._u2fRecords[i]._details = editDataOut(hex2a(device.slice(2, device.length)), 'enroll');

            updateAccount();
            fetchU2FRequests();

            break;
        }
    }

}


window.updateDevice = async function(id) {

    console.log('update device: ', id);

    for (var i = 0; i < window.Account._u2fRecords.length; i++) {
        if (window.Account._u2fRecords[i]._id == id) {
            var address = window.Account._u2fRecords[i]._address;
            var device = await getRegisteredKey(address);

            window.Account._u2fRecords[i]._details = editDataOut(hex2a(device.slice(2, device.length)), 'bind');

            updateAccount();
            fetchU2FRequests();

            break;
        }
    }

}


window.updateSignRequest = async function(id) {

    console.log('update sign request: ', id);

    for (var i = 0; i < window.Account._u2fRecords.length; i++) {
        if (window.Account._u2fRecords[i]._id == id) {
            var address = window.Account._u2fRecords[i]._address;
            var device = await getSignRequest(address);

            window.Account._u2fRecords[i]._details = editDataOut(hex2a(device.slice(2, device.length)), 'sign');

            updateAccount();
            fetchU2FRequests();

            break;
        }
    }

}


window.updateLastVerified = async function(id) {

    console.log('update verified: ', id);

    for (var i = 0; i < window.Account._u2fRecords.length; i++) {
        if (window.Account._u2fRecords[i]._id == id) {
            var address = window.Account._u2fRecords[i]._address;
            var verified = await getLastVerified(address);

            window.Account._u2fRecords[i]._details = editDataOut(hex2a(verified.slice(2, verified)), 'verify');

            updateAccount();
            fetchU2FRequests();

            break;
        }
    }

}


window.hideDetails = function(id) {

    console.log('hide details: ', id);

    for (var i = 0; i < window.Account._u2fRecords.length; i++) {
        if (window.Account._u2fRecords[i]._id == id) {
            var type = window.Account._u2fRecords[i]._type;
            var status = window.Account._u2fRecords[i]._status;

            if (type == 'Register') {
                if (status == 'Pending') {
                    window.Account._u2fRecords[i]._details = PROMPT_REG_PEND_SHOW;
                }
                else if (status == 'Confirmed') {
                    window.Account._u2fRecords[i]._details = PROMPT_REG_COMP_SHOW;
                }
            }
            if (type == 'Sign') {
                if (status == 'Pending') {
                    window.Account._u2fRecords[i]._details = PROMPT_AUT_PEND_SHOW;
                }
                else if (status == 'Confirmed') {
                    window.Account._u2fRecords[i]._details = PROMPT_AUT_COMP_SHOW;
                }
            }

            updateAccount();
            fetchU2FRequests();

            break;
        }
    }

}




// ======================================================================================================================== //



function getRegisterRequest(address) {

    return new Promise((resolve, reject) => {

        ethManager.getUserU2F({from: address}, (e, result) => {

            if (e) {
                reject(e);
            }

            var enroll = result[0];
            resolve(enroll);

        });

    });

}


function getRegisteredKey(address) {

    return new Promise((resolve, reject) => {

        ethManager.getUserU2F({from: address}, (e, result) => {

            if (e) {
                reject(e);
            }

            var registeredKey = result[1];
            resolve(registeredKey);

        });
        
    });

}


function getSignRequest(address) {

    return new Promise((resolve, reject) => {

        ethManager.getUserU2F({from: address}, (e, result) => {

            if (e) {
                reject(e);
            }

            var sign = result[2];
            resolve(sign);

        });
        
    });

}


function getLastVerified(address) {

    return new Promise((resolve, reject) => {

        ethManager.getUserU2F({from: address}, (e, result) => {

            if (e) {
                reject(e);
            }

            var lastVerified = result[3];
            resolve(lastVerified);

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

window.hex2a = function(hexx) {

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

