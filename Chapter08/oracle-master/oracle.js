const Web3 = require('web3')
const fs = require('fs')
const path = require('path')
const infura = 'wss://ropsten.infura.io/ws/v3/f7b2c280f3f440728c2b5458b41c663d'
let contractAddress
let contractInstance
let web3
let privateKey
let myAddress

// To generate the private key and address needed to sign transactions
function generateAddressesFromSeed(seed) {
    let bip39 = require("bip39");
    let hdkey = require('ethereumjs-wallet/hdkey');
    let hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(seed));
    let wallet_hdpath = "m/44'/60'/0'/0/0";
    let wallet = hdwallet.derivePath(wallet_hdpath).getWallet();
    let address = '0x' + wallet.getAddress().toString("hex");
    let myPrivateKey = wallet.getPrivateKey().toString("hex");
    myAddress = address
    privateKey = '0x' + myPrivateKey
}

// Setup web3 and start listening to events
function start() {
    const mnemonic = fs.readFileSync(".secret").toString().trim()
    generateAddressesFromSeed(mnemonic)

    // Note that we use the WebsocketProvider because the previous HttpProvider is outdated and doesn't allow subscriptions
    web3 = new Web3(new Web3.providers.WebsocketProvider(infura))
    const ABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'build', 'contracts', 'Oracle.json')))
    contractAddress = ABI.networks['3'].address
    contractInstance = new web3.eth.Contract(ABI.abi, contractAddress)

    console.log('Listening to events...')
    // Listen to the generate random event for executing the __callback() function
    const subscription = contractInstance.events.GenerateRandom()
    subscription.on('data', newEvent => {
        callback(newEvent.returnValues.sequence)
    })

    // Listen to the ShowRandomNumber() event that gets emmited after the callback
    const subscription2 = contractInstance.events.ShowRandomNumber()
    subscription2.on('data', newEvent => {
        console.log('Received random number! Sequence:', newEvent.returnValues.sequence, 'Random generated number:', newEvent.returnValues.number)
    })
}

// To send a transaction to run the generateRandom function
function generateRandom() {
    const encodedGenerateRandom = contractInstance.methods.generateRandom().encodeABI()
    const tx = {
        from: myAddress,
        gas: 6e6,
        gasPrice: 5,
        to: contractAddress,
        data: encodedGenerateRandom,
        chainId: 3
    }

    web3.eth.accounts.signTransaction(tx, privateKey).then(signed => {
        console.log('Generating transaction...')
        web3.eth.sendSignedTransaction(signed.rawTransaction)
            .on('receipt', result => {
                console.log('Generate random transaction confirmed!')
            })
            .catch(error => console.log(error))
    })
}

// To generate random numbers between 1 and 100 and execute the __callback function from the smart contract
function callback(sequence) {
    const generatedNumber = Math.floor(Math.random() * 100 + 1)

    const encodedCallback = contractInstance.methods.__callback(sequence, generatedNumber).encodeABI()
    const tx = {
        from: myAddress,
        gas: 6e6,
        gasPrice: 5,
        to: contractAddress,
        data: encodedCallback,
        chainId: 3
    }

    web3.eth.accounts.signTransaction(tx, privateKey).then(signed => {
        console.log('Generating transaction...')
        web3.eth.sendSignedTransaction(signed.rawTransaction)
            .on('receipt', result => {
                console.log('Callback transaction confirmed!')
            })
            .catch(error => console.log(error))
    })
}

start()
