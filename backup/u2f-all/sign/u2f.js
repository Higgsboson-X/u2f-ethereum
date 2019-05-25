const compiledServer = require('../../build/contracts/Server.json');
const base64url = require('base64url');
const sha256 = require('js-sha256').sha256;

const u2fc = require('u2f-api');
const random = require('randomstring');

const TIME_OUT = 30;

const Web3 = require('web3');

if (window.web3) {
    window.web3 = new Web3(window.web3.currentProvider);
}
else {
    window.web3 = new Web3('http://127.0.0.1:8545');
}

var u2fServerContract = window.web3.eth.contract(compiledServer.abi);

console.log(u2fServerContract);

window.u2fServer = null;

if (localStorage.getItem('server') != null) {
    window.u2fServer = u2fServerContract.at(localStorage.getItem('server'));
    console.log(u2fServer);
}


const GAS = 8000000;
const PROMPT = 'Click `View` to see details.';



// ======================================================================================================================== //


document.getElementById('server').addEventListener('submit', configServer);

function configServer(e) {

    serverAddr = document.getElementById('serverAddr').value;
    console.log('Setting server address: ', serverAddr);

    window.u2fServer = u2fServerContract.at(serverAddr);

    localStorage.setItem('server', serverAddr);

    console.log(u2fServer);

    updateRequest();

    document.getElementById('server').reset();
    e.preventDefault();

}


// ======================================================================================================================== //


document.getElementById('sign').addEventListener('submit', beginAuthentication);

function beginAuthentication(e) {

    var address = document.getElementById('enrollAddress').value;
    var appId = window.location.origin;

    var request = PROMPT;
    var response = 'NA';
    var verification = 'NA';
    var status = 'Pending';

    console.log(appId, address);

    u2fSign(appId, address)
    .then((req) => {

        request = req;

    }, (e) => {

        status = 'Failed';
        request = '[Sign request error] ' + e.message;
        
    })
    .finally(() => {

        var record = {
            _address: address,
            _request: request,
            _response: response,
            _verification: verification,
            _status: status,
            _appId: appId
        }

        localStorage.setItem('record', JSON.stringify(record));

        updateRequest();
    });
    
    document.getElementById('sign').reset();

    e.preventDefault();


}


window.confirmAuthentication = function() {

    var record = JSON.parse(localStorage.getItem('record'));

    if (record === null || record._status != 'Pending') {
        console.log('[ERROR] no sign request.');
    }

    u2fc.isSupported()
    .then((support) => {

        console.log('support: ', support);

        u2fc.sign([JSON.parse(record._request)], TIME_OUT)
        .then(async (res) => {

            record._response = JSON.stringify(res);
            record._verification = PROMPT;

            console.log(res);
            
            await u2fVerify(record._appId, record._address, record._response)
            .then((ver) => {
                record._verification = ver;
                record._status = 'Confirmed';
            }, (error) => {
                record._verification = '[ERROR] ' + error.message;
                record._status = 'Failed';
            });

        }, (err) => {

            record._response = '[ERROR] ' + err.metaData.code + '-' + err.metaData.type;
            console.log(err);
            console.log('code: ', err.metaData.code);
            console.log('type: ', err.metaData.type);

        })
        .finally(() => {
            localStorage.setItem('record', JSON.stringify(record));
            updateRequest();
        });

    }, (e) => {

        console.log(e);
        console.log('code: ', e.metaData.code);
        console.log('type: ', e.metaData.type);

    });

}




window.updateInfo = async function() {

    var record = JSON.parse(localStorage.getItem('record'));

    if (record === null || record._status == 'Failed') {
        return;
    }

    if (record._request == PROMPT) {
        var request = await getSignRequest(record._address);
        record._request = hex2a(request.slice(2, request.length));
    }

    if (record._verification == PROMPT) {
        var verification = await getLastVerified(record._address);
        record._verification = hex2a(verification.slice(2, verification.length));
        record._status = 'Confirmed';
    }

    localStorage.setItem('record', JSON.stringify(record));
    updateRequest();


}



// ======================================================================================================================== //



function u2fSign(appId, address) {

    return new Promise((resolve, reject) => {

        u2fServer.sign(appId, {from: address}, async (e, txn) => {
            if (e) {
                console.log(e);
                reject(e);
            }

            console.log('tansaction hash: ', txn);

            u2fServer.getSign({from: address}, (err, request) => {
                if (err) {
                    console.log(err);
                    reject(err);
                }

                request = hex2a(request.slice(2, request.length));

                console.log('request: ', request);
                resolve(request);

            });

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


        u2fServer.client(decodedClientData, appId, 1, {from: address}, (e, challengeParameter) => {

            if (e) {
                console.log(e);
                reject(e);
            }

            console.log(challengeParameter);
            challengeParameter = challengeParameter.slice(2, challengeParameter.length);

            u2fServer.verify(appId, challengeParameter, decodedSignatureData, keyHandle, {from: address}, (err, txn) => {

                if (err) {
                    console.log(err);
                    reject(err);
                }

                console.log('transaction hash: ', txn);

                u2fServer.getVerified({from: address}, (error, verification) => {

                    if (error) {
                        console.log(error);
                        reject(error);
                    }

                    verification = hex2a(verification.slice(2, verification.length));

                    console.log('verification: ', verification);
                    resolve(verification);

                });

            });

        });
        

    });

}

// ======================================================================================================================== //



function getSignRequest(address) {

    return new Promise((resolve, reject) => {

        u2fServer.getSign({from: address}, (e, request) => {

            if (e) {
                reject(e);
            }
            resolve(request);

        });
        
    });

}


function getLastVerified(address) {

    return new Promise((resolve, reject) => {

        u2fServer.getVerified({from: address}, (e, verification) => {

            if (e) {
                reject(e);
            }
            resolve(verification);

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

