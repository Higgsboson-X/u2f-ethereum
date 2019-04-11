window.compiledRegister = require('../../build/contracts/Register.json');
window.compiledAuthenticate = require('../../build/contracts/Authenticate.json');
window.compiledBank = require('../../build/contracts/Bank.json');

const Web3 = require('web3');
// const qs = require('query-string');

if (window.web3) {
    window.web3 = new Web3(window.web3.currentProvider);
}
else {
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
}

var defaultAccount = window.web3.eth.accounts[0];

try {
    window._users = JSON.parse(localStorage.getItem('users'));
}
catch(e) {
    console.log(e);
    window._users = {};
    localStorage.setItem('users', JSON.stringify(window._users));
}

if (window._users == null) {
    window._users = {};
}

/*
    address: {_password, _contract};
*/

window.registerLib = window.web3.eth.contract(compiledRegister.abi);
window.authenticateLib = window.web3.eth.contract(compiledAuthenticate.abi);
window.bankContract = window.web3.eth.contract(compiledBank.abi);

console.log(bankContract);

/*
// Deploy bank factory or set address;
if (localStorage.getItem('factory') != null && localStorage.getItem('factory') != 'undefined') {
    window.bankFactory = bankFactoryContract.at(localStorage.getItem('factory'));
    console.log(bankFactory);
}
else {
    var factory = bankFactoryContract.new({from: defaultAccount}, (e, addr) => {
        console.log(e, addr);
        var address;
        console.log('txn: ', factory.transactionHash);
        web3.eth.getTransactionReceipt(factory.transactionHash, (err, receipt) => {
            if (err) {
                console.log(err);
            }
            console.log(receipt);
            address = receipt.contractAddress;
            window.bankFactory = bankFactoryContract.at(address);
            console.log(bankFactory);
            localStorage.setItem('factory', address);
        });
    });
}
*/



// ======================================================================================================================== //

window.resetAll = function() {

    localStorage.clear();
    window._users = {};

}


window.clearAll = function() {

    localStorage.setItem('users', null);
    window._users = {};

}

window.updateUsers = function() {

    localStorage.setItem('users', JSON.stringify(window._users));

}


// ======================================================================================================================== //


// redirect to bank page;
function login() {

    data = getFormData('#login_form');
    console.log(data);

    document.getElementById('login_form').reset();

    $('#dialog').removeClass('dialog-effect-in').removeClass('shakeit');
    $('#dialog').addClass('dialog-effect-out');

    $('#successful_login').addClass('active');

    var user = data.user_username.toLowerCase();

    url = './myBank?user=' + user + '&addr=' + _users[user]._contract;
    window.location.href = url;

}

window.showOption = function(name) {

    if (name == 'yes') {
        $('#user_contract_addr_input').css('visibility', 'visible');
    }
    else {
        $('#user_contract_addr_input').css('visibility', 'hidden');
    }

}




function register() {

    data = getFormData('#register_form');

    console.log(data);

    document.getElementById('login_form').reset();

    var user = data.user_username.toLowerCase();

    var address;

    if (data.user_contract_addr != '') {
        address = data.user_contract_addr.toLowerCase();
        bank = bankContract.at(address);

        var account = {
            _password: data.user_password,
            _contract: address
        }

        window._users[user] = account;

        console.log('registered: ', user, account);

        updateUsers();

        $('#dialog').removeClass('dialog-effect-in').removeClass('shakeit');
        $('#dialog').addClass('dialog-effect-out');
      
        $('#successful_registration').addClass('active');

        return;
    }

    
    var regexRegister = /__Register_+/;
    var regexAuthenticate = /__Authenticate_+/;

    var deployedRegister = false;
    var deployedAuthenticate = false;
    var deployedBank = false;

    // deploy register library;
    var register = registerLib.new({data: compiledRegister.bytecode, from: user}, (registerE, registerAddr) => {

        console.log('register: ', registerE, registerAddr);

        console.log('txn: ', register.transactionHash);

        if (!registerE && !deployedRegister) {

            deployedRegister = true;

            web3.eth.getTransactionReceipt(register.transactionHash, (registerErr, registerReceipt) => {

                if (registerErr) {
                    console.log(registerErr);
                }
                console.log(registerReceipt);
                var registerAddress = registerReceipt.contractAddress;

                // deploy authenticate library;
                var authenticate = authenticateLib.new({data: compiledAuthenticate.bytecode, from: user}, (authenticateE, authenticateAddr) => {

                    console.log('authenticate: ', authenticateE, authenticateAddr);

                    console.log('txn: ', authenticate.transactionHash);

                    if (!authenticateE && !deployedAuthenticate) {

                        deployedAuthenticate = true;

                        web3.eth.getTransactionReceipt(authenticate.transactionHash, (authenticateErr, authenticateReceipt) => {

                            if (authenticateErr) {
                                console.log(authenticateErr);
                            }
                            console.log(authenticateReceipt);
                            var authenticateAddress = authenticateReceipt.contractAddress;

                            // link register and authenticate library to bank bytecode;
                            var bankBytecode = compiledBank.bytecode;
                            while (bankBytecode.match(regexRegister)) {
                                bankBytecode = bankBytecode.replace(bankBytecode.match(regexRegister)[0], registerAddress.replace('0x', ''));
                            }
                            while (bankBytecode.match(regexAuthenticate)) {
                                bankBytecode = bankBytecode.replace(bankBytecode.match(regexAuthenticate)[0], authenticateAddress.replace('0x', ''));
                            }

                            // console.log(bankBytecode);

                            var bank = bankContract.new({data: bankBytecode, from: user}, (bankE, bankAddr) => {

                                console.log('bank: ', bankE, bankAddr);

                                console.log('txn: ', bank.transactionHash);

                                if (!bankE && !deployedBank) {

                                    deployedBank = true;

                                    web3.eth.getTransactionReceipt(bank.transactionHash, (bankErr, bankReceipt) => {

                                        if (bankErr) {
                                            console.log(bankErr);
                                        }
                                        console.log(bankReceipt);
                                        address = bankReceipt.contractAddress;

                                        var account = {
                                            _password: data.user_password,
                                            _contract: address
                                        }

                                        window._users[user] = account;

                                        console.log('registered: ', user, account);

                                        updateUsers();

                                        $('#dialog').removeClass('dialog-effect-in').removeClass('shakeit');
                                        $('#dialog').addClass('dialog-effect-out');
      
                                        $('#successful_registration').addClass('active');

                                    });
                                }

                            });

                        });

                    }

                });

            });

        }

    });
    

}

// ======================================================================================================================== //


// The "getFormData()" function retrieves the names and values of each input field in the form; 
window.getFormData = function(form) {

    var data = {};
    $(form).find('input, select').each(function() {
        if (this.tagName.toLowerCase() == 'input') {
            if (this.type.toLowerCase() == 'checkbox') {
                data[this.name] = this.checked;
            } 
            else if (this.type.toLowerCase() != 'submit') {
                data[this.name] = this.value;
            }
        } 
        else {
            data[this.name] = this.value;
        }

    });
      
    return data;

}

// The "addFormError()" function, when called, adds the "error" class to the form-group that wraps around the "formRow" attribute;
function addFormError(formRow, errorMsg) {
    var errorMSG = '<span class="error-msg">' + errorMsg + '</span>';
    $(formRow).parents('.form-group').addClass('has-error');
    $(formRow).parents('.form-group').append(errorMSG);
    
    $('#dialog').removeClass('dialog-effect-in');
    $('#dialog').addClass('shakeit');
    setTimeout(function() {
        $('#dialog').removeClass('shakeit');
    }, 300);
}

// FORM HANDLER:

// form_name - This attribute ties the form-handler function to the form you want to submit through ajax. Requires an ID (ex: #myfamousid)
// custom_validation - 

function form_handler(form_name, custom_validation, success_message, error_message, success_function, error_function) {

    $(form_name).find('input[type="submit"]').on('click', function(e) { // if submit button is clicked

        window.onbeforeunload = null; // cancels the alert message for unsaved changes (if such function exists)

        $(form_name).find('.form-group .error-msg').remove();
        var submitButton = this;
        submitButton.disabled = true; // Disables the submit buttton until the rows pass validation or we get a response from the server.

        var form = $(form_name)[0];
        // The custom validation function must return true or false.
        if (custom_validation != null) {
            if (!custom_validation(form, getFormData(form))) {
                submitButton.disabled = false;
                return false;
            }
        }

        submitButton.disabled = false;

        if (success_function != null) {
            success_function();
        }

        e.preventDefault(); //STOP default action

    });

    $(document).click(function(e) { // Whenever the user clicks inside the form, the error messages will be removed.
        if ($(e.target).closest(form_name).length) {
            $(form_name).find('.form-group').removeClass('has-error');
            setTimeout(function() {
                $(form_name).find('.form-group .error-msg').remove();
            }, 300);
        }
        else {
          return;
        }
    });

}

// LOGIN FORM: Validation function
function validate_login_form(form, data) {

    if (data.user_username.toLowerCase() == "") {
        // if username variable is empty
        addFormError(form["user_username"], 'The account is invalid');
        return false; // stop the script if validation is triggered
    }

    if (window._users == null || window._users[data.user_username.toLowerCase()] == null) {
        addFormError(form["user_username"], 'The account has not been registered');
        return false; // stop the script if validation is triggered
    }

    if (data.user_password == "") {
        // if password variable is empty
        addFormError(form["user_password"], 'The password is invalid');
        return false; // stop the script if validation is triggered
    }

    if (data.user_password != window._users[data.user_username.toLowerCase()]._password) {
        addFormError(form["user_password"], 'Wrong password');
        return false; // stop the script if validation is triggered
    }

    return true;

}

// REGISTRATION FORM: Validation function
function validate_registration_form(form, data) {

    if (data.user_username.toLowerCase() == "") {
        // if username variable is empty
        addFormError(form["user_username"], 'The account is invalid');
        return false; // stop the script if validation is triggered
    }

    /*
    if (window._users != null && window._users[data.user_username] != null) {
        addFormError(form["user_username"], 'The account has already been registered');
        return false; // stop the script if validation is triggered
    }
    */

    if (data.user_password == "") {
        // if password variable is empty
        addFormError(form["user_password"], 'The password is invalid');
        return false; // stop the script if validation is triggered
    }

    if (data.user_cnf_password == "" || data.user_password != data.user_cnf_password) {
        // if password variable is empty
        addFormError(form["user_cnf_password"], "The passwords don't match");
        return false; // stop the script if validation is triggered
    }

    if (data[''] == 'yes' && (data.user_contract_addr.toLowerCase() == null || data.user_contract_addr.toLowerCase() == '')) {
        // if password variable is empty
        addFormError(form["user_contract_addr"], "Contract address is not provided");
        return false; // stop the script if validation is triggered
    }

    return true;

}

form_handler("#login_form", validate_login_form, null, null, login, null);
form_handler("#register_form", validate_registration_form, null, null, register, null);

var dialogBox = $('#dialog');

dialogBox.on('click', 'a.user-actions', function() {
    dialogBox.toggleClass('flip');
});

$('#successful_login, #successful_registration').on('click', 'a.dialog-reset', function() {
    $('#successful_login, #successful_registration').removeClass('active');
    dialogBox.removeClass('dialog-effect-out').addClass('dialog-effect-in');
    document.getElementById('login_form').reset();
    document.getElementById('register_form').reset();
});