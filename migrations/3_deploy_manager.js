var Register = artifacts.require("Register");
var Authenticate = artifacts.require("Authenticate");

var Manager = artifacts.require("Manager");

module.exports = function(deployer) {

    deployer.deploy(Register, {gas: 5000000});
    deployer.deploy(Authenticate, {gas: 6000000});

    deployer.link(Register, Manager);
    deployer.link(Authenticate, Manager);

    deployer.deploy(Manager, {gas: 8000000});


}
