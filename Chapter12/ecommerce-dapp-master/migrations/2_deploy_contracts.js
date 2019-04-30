const Token = artifacts.require("./EcommerceToken.sol")
const Ecommerce = artifacts.require("./Ecommerce.sol")
let token

module.exports = function(deployer, network, accounts) {
    deployer.deploy(
        Token,
        { gas: 8e6 }
    ).then(tokenInstance => {
        token = tokenInstance
        return deployer.deploy(Ecommerce, token.address, {
            gas: 8e6
        })
    }).then(async ecommerce => {
        await token.contract.methods.setEcommerce(ecommerce.address).send({
            from: accounts[0]
        })
        console.log('Is set?', await token.contract.methods.isEcommerceSet().call())
        console.log('Deployed both!')
    })
}
