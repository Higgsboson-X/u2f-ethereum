var JsmnSolLib = artifacts.require("JsmnSolLib");
var EllipticCurve = artifacts.require("EllipticCurve");
var Base64 = artifacts.require("Base64");
var Global = artifacts.require("Global");
var Tools = artifacts.require("Tools");

var Register = artifacts.require("Register");
var Authenticate = artifacts.require("Authenticate");

var Bank = artifacts.require("Bank");

module.exports = function(deployer) {

/*
    deployer.deploy(JsmnSolLib, {overwrite: false});
    deployer.deploy(EllipticCurve, {overwrite: false});
    deployer.deploy(Base64, {overwrite: false});

    deployer.link(JsmnSolLib, Tools);
    deployer.deploy(Tools, {overwrite: false});

    deployer.link(EllipticCurve, Global);
    deployer.link(Base64, Global);
    deployer.deploy(Global, {overwrite: false});

    deployer.link(EllipticCurve, Register);
    deployer.link(Base64, Register);
    deployer.link(Tools, Register);
    deployer.link(Global, Register);
    deployer.deploy(Register, {overwrite: false, gas: 80000000});

    deployer.link(EllipticCurve, Authenticate);
    deployer.link(Base64, Authenticate);
    deployer.link(Tools, Authenticate);
    deployer.link(Global, Authenticate);
    deployer.deploy(Authenticate, {overwrite: false, gas: 80000000});

    deployer.link(Register, Server);
    deployer.link(Authenticate, Server);
    deployer.deploy(Server, {overwrite: false, gas: 80000000});
*/

/*
    deployer.deploy(Register, {overwrite: false, gas: 6000000});
    deployer.deploy(Authenticate, {overwrite: false, gas: 6000000});

    deployer.link(Register, Server);
    deployer.link(Authenticate, Server);

    deployer.deploy(Server, {overwrite: false, gas: 6000000});
*/


    deployer.deploy(Register, {gas: 5000000});
    deployer.deploy(Authenticate, {gas: 6000000});

    deployer.link(Register, Bank);
    deployer.link(Authenticate, Bank);

    deployer.deploy(Bank, {gas: 8000000});


}
