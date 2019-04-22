# U2F-Ethereum
ETH bank and manager DApp using U2F-Solidity.

## Overview
This is a personal bank DApp which uses U2F-solidity for 2nd factor authentication. The bank helps users manage their funds and features functions including deposit, withdraw, transfer, and lock account in case of insecurities. The users can set a limit for deposit, withdraw, and transfer. When the total value involved in these functions exceed the limit, the user's 2nd factor authentication is required.

The client side of U2F uses [u2f-api](https://www.npmjs.com/package/u2f-api) and [MetaMask](https://metamask.io/) for injected web3 module.

## Dependencies and Node Modules
- Solidity - 0.4.24 (solc-js)
- Truffle v5.0.8
- Node v8.10.0
- Web3.js v0.20.7 (injected by MetaMask)
- Ganache CLI v6.4.1 (ganache-core: 2.5.3)
- npm 3.5.2
- lite-server
- base64url
- js-sha256
- u2f-api
- randomstring
- query-string
- MetaMask

## Setup
To setup the server, run the following commands.

Start ganache-cli:
```
$ ganache-cli -l 8000000
```

Install and open the MetaMask extension in Chrome. Set the network to be `127.0.0.1:8545`(localhost) and import your account via private key. (You can use any account provided by `ganache-cli`, but be sure to use the same account for registration and authentication.)

![metamask setup](https://github.com/Higgsboson-X/u2f-solidity/blob/master/images/7.png "MetaMask Setup")

In a separate terminal:
```
$ npm run dev
```

If you want to deploy the Bank contract by yourself, in a separate terminal:
```
$ truffle console --network ganache
> migrate --reset
```

Then the smart contrats and the libraries will be deployed and the details will be displayed like the following:
```
Deploying 'Bank'
------------------
> transaction hash: [hash]
> Blocks:           Seconds: 0
> contract address: [address]
> account:          [account]
> balance:          [balance]
> gas used:         [gas]
> gas price:        [price]
> value sent:       0 ETH
> total cost:       [cost]
```
Then you will need the `[address]` value in the following steps.

## Usage

### Register and Login
When first entering the DApp, you will need to register for your personal ETH bank. In the register form, provide your account address and setup your password. You can choose to provide your deployed contract address (the `[address]` value in the previous section), or ask to deploy a bank contract via registration. Three confirmations of transaction are required if contract address is not provided.

![register](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/1.png "Register for ETH Bank")

### Register U2F Key
In the first run, U2F key registration is required to unlock all the functions. 

![u2f registration required](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/2.png "U2F Registration Required")

But you are able to set the limit and change the address of the contract in the `Account` -> `Info` page, with other information displayed. (Each time the address of the contract is changed, a U2F registration is required to unlock the functions.)

![user profile](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/4.png "User Profile")

On the same page, users are able to customize their own U2F policy. This function is available only after U2F registration.
- `strict`: a U2F authentication is required whenever the transferred value exceeds transfer limit.
- `history`: a U2F authentication is required only when the transferred value exceeds transfer limit and, either the recipient is an unknown address or the history expires.

![u2f policy](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/13.png "U2F Policy")

To register your U2F token, go to the `Register U2F Key` page and begin registration. After the registration request is generated, it will be shown at the bottom of this page. Make sure to insert your U2F token and click `Continue` to complete registration. Then the registration should be confirmed and you can view the details in the same record panel.

![u2f registration confirmed](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/3.png "U2F Registration Confirmed")

### Deposit, Withdraw, and Transfer
After successfully registering your U2F token, you can deposit, withdraw, and transfer using the bank. Go to the corresponding page, input necessary information, and click the button. If the value exceeds the transfer limit, U2F signature is requires. Note that the signing process is different from the registration process and is not separated. Namely, before clicking the `Deposit`, `Withdraw`, or the `Transfer` button, make sure that your U2F token has already been properly inserted. Then you will need to confirm transactions in MetaMask. (One for values not exceeding limit and three for values exceeding limit.)

![deposit](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/5.png "Deposit")

### Lock Account
You can lock your account in the `Lock Account` page using U2F token. 

![lock](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/9.png "Lock")

After locking the account, all functions of the ETH bank will be locked (the same as before U2F registration). This secures users' funds when others steal their private keys.

![locked](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/10.png "Locked")

To unlock the account, go to the same page and unlock with U2F token.

### Other Information
In addition to basic functionalities, other information is also provided.

In `My ETH Bank` page, information about the bank including status, U2F and transactions, is displayed. 

![my eth bank](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/7.png "My ETH Bank")

You can view recent transactions in `Recent Transactions` page, where transaction hashes are listed. To view the detailed receipt, click `Receipt` button in the transaction record that you are interested in.

![recent txns](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/11.png "Recent Txns")

In the `Recent Transaction Address` page, transaction records with recent interacted addresses are listed as tables. The first row displays the interacted address with the largest transaction amount, the second row displays the interacted address with the second largest transaction amount and so on.

![recent txn address](https://github.com/Higgsboson-X/u2f-ethereum/blob/master/images/12.png "Recent Txn Address")

## U2F-Ethereum-Manager
The policy version of ETH manager is an alternative version of ETH bank. It allows multiple users to register on a single smart contract, but does not include deposit and withdraw functions. Namely, it does not explicitly stores tokens for the user, but only serves as a manager that handles transactions for the registered user.

The user interface is similar to the bank version, but requires a `Manager Address` in the register page. This address is obtained by running
```
$ truffle console --network ganache
> migrate --reset
```
and copy the address of deployed `Manager.sol`.

## Notes
1. The authentication records can be found in the `Register U2F Key` page.
2. More policies might be explored in future development.
