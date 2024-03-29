window.sha256 = require('js-sha256').sha256;

// window.compiledRegister = require('../../build/contracts/Register.json');
// window.compiledAuthenticate = require('../../build/contracts/Authenticate.json');
window.compiledManager = require('../../build/contracts/Manager.json');

const Web3 = require('web3');
// const qs = require('query-string');

window.addEventListener('load', async () => {
    if (window.ethereum) {
        window.web3 = new Web3(ethereum);
        try {
            await ethereum.enable();
        } catch (error) {
            console.log("Please give access to wallet " + error)
        }
    } else {
        if (window.web3) {
            window.web3 = new Web3(window.web3.currentProvider);
        }
        else {
            window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
        }
    }
});

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

// window.registerLib = window.web3.eth.contract(compiledRegister.abi);
// window.authenticateLib = window.web3.eth.contract(compiledAuthenticate.abi);
window.managerContract = window.web3.eth.contract(compiledManager.abi);

console.log(managerContract);

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

    url = './myAccount?user=' + user + '&addr=' + _users[user]._contract;
    window.location.href = url;

}


function register() {

    data = getFormData('#register_form');

    console.log(data);

    document.getElementById('register_form').reset();

    var user = data.user_username.toLowerCase();

    var address;

    address = data.user_contract_addr.toLowerCase();
    manager = managerContract.at(address);

    manager.registerForUser({from: user}, (e, txn) => {
        if (e) {
            console.log(e);
        }
        console.log(txn);
        var account = {
            _password: sha256(user + data.user_password),
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

    // changed: user._password = sha256(username + password)
    if (sha256(data.user_username.toLowerCase() + data.user_password) != window._users[data.user_username.toLowerCase()]._password) {
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

    if (data.user_contract_addr.toLowerCase() == null || data.user_contract_addr.toLowerCase() == '') {
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