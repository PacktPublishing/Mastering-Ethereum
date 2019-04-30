const HDWalletProvider = require('truffle-hdwallet-provider')
const infuraKey = "https://ropsten.infura.io/v3/8e12dd4433454738a522d9ea7ffcf2cc"

const fs = require('fs')
const mnemonic = fs.readFileSync(".secret").toString().trim()

module.exports = {
    networks: {
        development: {
            provider: () => new HDWalletProvider(mnemonic, 'http://localhost:8545'),
            network_id: '*',
        },
        ropsten: {
            provider: () => new HDWalletProvider(mnemonic, infuraKey),
            network_id: 3,       // Ropsten's id
            gas: 5500000,        // Ropsten has a lower block limit than mainnet
            confirmations: 2,    // # of confs to wait between deployments. (default: 0)
            timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
            skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
        }
    }
}
