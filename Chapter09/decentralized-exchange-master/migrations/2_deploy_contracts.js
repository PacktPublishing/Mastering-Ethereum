const DAX = artifacts.require('./DAX.sol')
const ERC20 = artifacts.require('./ERC20.sol')

module.exports = async (deployer, network) => {
    if(network != 'live'){
        console.log('Deploying contracts...')
        // await deployer.then(() => {
        //     return ERC20.new('Basic attention token', 'BAT', {
        //         gas: 8e6
        //     })
        // }).then(deployedToken => {
        //     console.log('BAT token address', deployedToken.address)
        //     return ERC20.new('Water', 'WAT', {
        //         gas: 8e6
        //     })
        // }).then(deployedWater => {
        //     console.log('WAT token address', deployedWater.address)
        // })

        console.log('DAX', await deployer.deploy(DAX, { gas: 8e6 }))
    }
}

// Deploy 2 tokens that will be our pairs
