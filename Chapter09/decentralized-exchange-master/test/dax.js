const assert = require('assert')
const DAX = artifacts.require('DAX.sol')
const ERC20 = artifacts.require('ERC20.sol')
const emptyBytes = 0x0000000000000000000000000000000000000000
let dax = {}
let token = {}
let hydroToken = {}
let batToken = {}
let transaction

contract('DAX', accounts => {
    beforeEach(async () => {
        token = await ERC20.new()
        console.log('Deployed token', token.address)
        hydroToken = await ERC20.new()
        console.log('Hydro token deployed', hydroToken.address)
        batToken = await ERC20.new()
        console.log('Bat token deployed', batToken.address)
        dax = await DAX.new()
        console.log('Deployed DAX', dax.address)

        dax.TransferOrder().on('data', newEvent => {
            console.log('New event', newEvent)
        })
    })
    it('Should whitelist 2 tokens BAT and HYDRO', async () => {
        const tokenBytes = fillBytes32WithSpaces('TOKEN')
        const pairBytes = [fillBytes32WithSpaces('BAT'), fillBytes32WithSpaces('HYDRO')]
        const pairAddresses = [batToken.address, hydroToken.address]

        console.log('Whitelisting tokens...')
        transaction = dax.whitelistToken(tokenBytes, token.address, pairBytes, pairAddresses)
        await awaitConfirmation(transaction)
        const isWhitelisted = await dax.isTokenSymbolWhitelisted(tokenBytes)
        const validPairs = await dax.getTokenPairs(tokenBytes)
        assert.ok(isWhitelisted, 'The token must be whitelisted')
        assert.deepEqual(pairBytes, validPairs, 'The token pairs added must be valid')
    })
    it('Should deposit tokens correctly and create a valid Escrow contract', async () => {
        const tokenAddress = token.address
        const amount = 100

        // Whitelist the tokens before anything
        console.log('Whitelisting tokens...')
        const tokenBytes = fillBytes32WithSpaces('TOKEN')
        const pairBytes = [fillBytes32WithSpaces('BAT'), fillBytes32WithSpaces('HYDRO')]
        const pairAddresses = [batToken.address, hydroToken.address]
        transaction = dax.whitelistToken(tokenBytes, token.address, pairBytes, pairAddresses)
        await awaitConfirmation(transaction)
        const isWhitelisted = await dax.isTokenSymbolWhitelisted(tokenBytes)
        const validPairs = await dax.getTokenPairs(tokenBytes)
        assert.ok(isWhitelisted, 'The token must be whitelisted')
        assert.deepEqual(pairBytes, validPairs, 'The token pairs added must be valid')

        // Deposit the tokens
        console.log('Depositing tokens...')
        transaction = token.approve(dax.address, amount)
        await awaitConfirmation(transaction)
        transaction = dax.depositTokens(tokenAddress, amount)
        await awaitConfirmation(transaction)
        const escrowAddress = await dax.escrowByUserAddress(accounts[0])
        const balance = parseInt(await token.balanceOf(escrowAddress))
        assert.ok(escrowAddress != emptyBytes, 'The escrow address must be set')
        assert.equal(balance, amount, 'The balance must be equal to the amount of tokens deposited')
    })
    it('Should extract tokens successfully after a deposit', async () => {
        const tokenAddress = token.address
        const amount = 100
        const initialTokens = parseInt(await token.balanceOf(accounts[0]))

        // Whitelist the tokens before anything
        console.log('Whitelisting tokens...')
        const tokenBytes = fillBytes32WithSpaces('TOKEN')
        const pairBytes = [fillBytes32WithSpaces('BAT'), fillBytes32WithSpaces('HYDRO')]
        const pairAddresses = [batToken.address, hydroToken.address]
        transaction = dax.whitelistToken(tokenBytes, token.address, pairBytes, pairAddresses)
        await awaitConfirmation(transaction)
        const isWhitelisted = await dax.isTokenSymbolWhitelisted(tokenBytes)
        const validPairs = await dax.getTokenPairs(tokenBytes)
        assert.ok(isWhitelisted, 'The token must be whitelisted')
        assert.deepEqual(pairBytes, validPairs, 'The token pairs added must be valid')

        // Do the token deposit
        console.log('Depositing tokens...')
        transaction = token.approve(dax.address, amount)
        await awaitConfirmation(transaction)
        transaction = dax.depositTokens(tokenAddress, amount)
        await awaitConfirmation(transaction)
        const escrowAddress = await dax.escrowByUserAddress(accounts[0])
        const balance = parseInt(await token.balanceOf(escrowAddress))
        assert.equal(balance, amount, 'The escrow contract must have received enough tokens')
        assert.equal(parseInt(await token.balanceOf(accounts[0])), initialTokens - amount, 'You must deposit the tokens succesfully first')

        // Extract the tokens
        transaction = dax.extractTokens(tokenAddress, amount)
        await awaitConfirmation(transaction)
        assert.equal(parseInt(await token.balanceOf(accounts[0])), initialTokens, 'You must have the same balance as when you started')
    })
    it('Should create a buy limit order succesfully', async () => {
        const type = fillBytes32WithSpaces('buy')
        const firstSymbol = fillBytes32WithSpaces('TOKEN')
        const secondSymbol = fillBytes32WithSpaces('HYDRO')
        const quantity = 100
        const pricePerToken = 40
        const secondSymbolPrice = quantity * pricePerToken
        const initialHydroTokens = parseInt(await hydroToken.balanceOf(accounts[0]))

        // Whitelist the tokens before anything
        console.log('Whitelisting tokens...')
        const tokenBytes = fillBytes32WithSpaces('TOKEN')
        const pairBytes = [fillBytes32WithSpaces('BAT'), fillBytes32WithSpaces('HYDRO')]
        const pairAddresses = [batToken.address, hydroToken.address]
        transaction = dax.whitelistToken(tokenBytes, token.address, pairBytes, pairAddresses)
        await awaitConfirmation(transaction)
        const isWhitelisted = await dax.isTokenSymbolWhitelisted(tokenBytes)
        const validPairs = await dax.getTokenPairs(tokenBytes)
        assert.ok(isWhitelisted, 'The token must be whitelisted')
        assert.deepEqual(pairBytes, validPairs, 'The token pairs added must be valid')

        // Deposit the tokens
        console.log('Depositing tokens...')
        transaction = hydroToken.approve(dax.address, secondSymbolPrice)
        await awaitConfirmation(transaction)
        transaction = dax.depositTokens(hydroToken.address, secondSymbolPrice)
        await awaitConfirmation(transaction)
        const escrowAddress = await dax.escrowByUserAddress(accounts[0])
        const balance = parseInt(await hydroToken.balanceOf(escrowAddress))
        assert.equal(balance, secondSymbolPrice, 'The escrow contract must have received enough tokens')
        assert.equal(parseInt(await hydroToken.balanceOf(accounts[0])), initialHydroTokens - secondSymbolPrice, 'You must deposit the tokens succesfully first')

        transaction = dax.limitOrder(type, firstSymbol, secondSymbol, quantity, pricePerToken)
        await awaitConfirmation(transaction)
        const counter = parseInt(await dax.orderIdCounter())
        const buyOrdersFirst = await dax.buyOrders(0)

        assert.ok(counter == 1, 'The counter must increase after a succesful limit order creation')
        assert.equal(buyOrdersFirst.price, pricePerToken, 'The price per token should be set')
        assert.equal(buyOrdersFirst.quantity, quantity, 'The price per token should be set')
        assert.equal(buyOrdersFirst.orderType, type, 'The order type should be set')
    })
    it('Should create a sell limit order succesfully', async () => {
        const type = fillBytes32WithSpaces('sell')
        const firstSymbol = fillBytes32WithSpaces('TOKEN')
        const secondSymbol = fillBytes32WithSpaces('HYDRO')
        const quantity = 500
        const pricePerToken = 10
        const firstSymbolPrice = quantity * pricePerToken
        const initialTokens = parseInt(await token.balanceOf(accounts[0]))

        // Whitelist the tokens before anything
        console.log('Whitelisting tokens...')
        const tokenBytes = fillBytes32WithSpaces('TOKEN')
        const pairBytes = [fillBytes32WithSpaces('BAT'), fillBytes32WithSpaces('HYDRO')]
        const pairAddresses = [batToken.address, hydroToken.address]
        transaction = dax.whitelistToken(tokenBytes, token.address, pairBytes, pairAddresses)
        await awaitConfirmation(transaction)
        const isWhitelisted = await dax.isTokenSymbolWhitelisted(tokenBytes)
        const validPairs = await dax.getTokenPairs(tokenBytes)
        assert.ok(isWhitelisted, 'The token must be whitelisted')
        assert.deepEqual(pairBytes, validPairs, 'The token pairs added must be valid')

        // Deposit the tokens
        console.log('Depositing tokens...')
        transaction = token.approve(dax.address, firstSymbolPrice)
        await awaitConfirmation(transaction)
        transaction = dax.depositTokens(token.address, firstSymbolPrice)
        await awaitConfirmation(transaction)
        const escrowAddress = await dax.escrowByUserAddress(accounts[0])
        const balance = parseInt(await token.balanceOf(escrowAddress))
        assert.equal(balance, firstSymbolPrice, 'The escrow contract must have received enough tokens')
        assert.equal(parseInt(await token.balanceOf(accounts[0])), initialTokens - firstSymbolPrice, 'You must deposit the tokens succesfully first')

        transaction = dax.limitOrder(type, firstSymbol, secondSymbol, quantity, pricePerToken)
        await awaitConfirmation(transaction)
        const counter = parseInt(await dax.orderIdCounter())
        const sellOrdersFirst = await dax.sellOrders(0)

        assert.ok(counter == 1, 'The counter must increase after a succesful limit order creation')
        assert.equal(sellOrdersFirst.price, pricePerToken, 'The price per token should be set')
        assert.equal(sellOrdersFirst.quantity, quantity, 'The price per token should be set')
        assert.equal(sellOrdersFirst.orderType, type, 'The order type should be set')
    })
    it('Should fill a partial market order', async () => {
        // 1. Create a limit order to sell 500 token to buy 5000 hydro total (10 each) approve 500 token
        // 2. Create a market order to buy 100 token to sell 1000 hydro total (10 each) approve 1000 hydro
        // 3. Check that the first user has 400 token and 1000 hydro (previously 0)
        // 4. Check that the second user has 100 token and 0 hydro (previously 1000)

        // When the myOrder.type == sell or _type == buy
        // myOrder.owner send quantityToFill[] of _firstSymbol to msg.sender
        // msg.sender send quantityToFill[] * myOwner.price of _secondSymbol to myOrder.owner

        // When the myOrder.type == buy or _type == sell
        // myOrder.owner send quantityToFill[] * myOwner.price of _secondSymbol to msg.sender
        // msg.sender send quantityToFill[] of _firstSymbol to myOrder.owner

        // 1- First create the limit order
        const type = fillBytes32WithSpaces('sell')
        const firstSymbol = fillBytes32WithSpaces('TOKEN')
        const secondSymbol = fillBytes32WithSpaces('HYDRO')
        const quantity = 500
        const pricePerToken = 10
        let firstUserInitialTokenBalance = parseInt(await token.balanceOf(accounts[0]))
        let firstUserInitialHydroBalance = parseInt(await hydroToken.balanceOf(accounts[0]))
        let secondUserInitialTokenBalance = parseInt(await token.balanceOf(accounts[1]))
        let secondUserInitialHydroBalance = parseInt(await hydroToken.balanceOf(accounts[1]))

        // 1- Whitelisting for limit order
        console.log('Whitelisting tokens...')
        const tokenBytes = fillBytes32WithSpaces('TOKEN')
        const pairBytes = [fillBytes32WithSpaces('BAT'), fillBytes32WithSpaces('HYDRO')]
        const pairAddresses = [batToken.address, hydroToken.address]
        transaction = dax.whitelistToken(tokenBytes, token.address, pairBytes, pairAddresses)
        await awaitConfirmation(transaction)
        const isWhitelisted = await dax.isTokenSymbolWhitelisted(tokenBytes)
        const validPairs = await dax.getTokenPairs(tokenBytes)
        assert.ok(isWhitelisted, 'The token must be whitelisted')
        assert.deepEqual(pairBytes, validPairs, 'The token pairs added must be valid')

        // 1- Deposit for first user limit order
        console.log('Depositing tokens...')
        transaction = token.approve(dax.address, quantity)
        await awaitConfirmation(transaction)
        transaction = dax.depositTokens(token.address, quantity)
        await awaitConfirmation(transaction)
        const escrowAddress = await dax.escrowByUserAddress(accounts[0])
        const balance = parseInt(await token.balanceOf(escrowAddress))
        assert.equal(balance, quantity, 'The escrow contract must have received enough tokens')
        assert.equal(parseInt(await token.balanceOf(accounts[0])), firstUserInitialTokenBalance - quantity, 'You must deposit the tokens succesfully first')

        // 1- Limit order
        console.log('Deploying limit order...')
        transaction = dax.limitOrder(type, firstSymbol, secondSymbol, quantity, pricePerToken)
        await awaitConfirmation(transaction)
        const counter = parseInt(await dax.orderIdCounter())
        const sellOrdersFirst = await dax.sellOrders(0)
        assert.ok(counter == 1, 'The counter must increase after a succesful limit order creation')
        assert.equal(sellOrdersFirst.price, pricePerToken, 'The price per token should be set')
        assert.equal(sellOrdersFirst.quantity, quantity, 'The price per token should be set')
        assert.equal(sellOrdersFirst.orderType, type, 'The order type should be set')
        // End limit order

        // 2- Create the market order
        const typeMarket = fillBytes32WithSpaces('buy')
        const firstSymbolMarket = fillBytes32WithSpaces('TOKEN')
        const secondSymbolMarket = fillBytes32WithSpaces('HYDRO')
        const quantityToBuy = 100 // TOKEN
        const requiredQuantityToSell = 1000 // HYDRO
        const initialTokensMarket = parseInt(await token.balanceOf(accounts[1]))

        // 2- Deposit the tokens to give in exchange for what you want to market
        console.log('Depositing tokens...')
        // Transfer to the second user
        transaction = hydroToken.transfer(accounts[1], requiredQuantityToSell, {
            from: accounts[0]
        })

        // Important to update the initial balance since we are giving some to the 2º user for testing
        firstUserInitialHydroBalance = parseInt(await hydroToken.balanceOf(accounts[0]))

        await awaitConfirmation(transaction)
        transaction = hydroToken.approve(dax.address, requiredQuantityToSell, {
            from: accounts[1]
        })
        await awaitConfirmation(transaction)
        transaction = dax.depositTokens(hydroToken.address, requiredQuantityToSell, {
            from: accounts[1]
        })
        await awaitConfirmation(transaction)
        const escrowAddressTwo = await dax.escrowByUserAddress(accounts[1])
        const balanceTwo = parseInt(await hydroToken.balanceOf(escrowAddressTwo))
        assert.equal(balanceTwo, requiredQuantityToSell, 'The escrow contract must have received enough tokens')
        assert.equal(parseInt(await hydroToken.balanceOf(accounts[1])), 0, 'You must deposit the tokens succesfully first')

        // 2- Create the market order
        console.log('Creating market order...')
        transaction = dax.marketOrder(typeMarket, firstSymbolMarket, secondSymbolMarket, quantityToBuy, {
            from: accounts[1]
        })
        await awaitConfirmation(transaction)

        // 3- Check the first user balance 400 token and 1000 hydro (previously 10k)
        const firstUserFinalTokenBalance = parseInt(await token.balanceOf(accounts[0]))
        const firstUserFinalHydroBalance = parseInt(await hydroToken.balanceOf(accounts[0]))
        const secondUserFinalTokenBalance = parseInt(await token.balanceOf(accounts[1]))
        const secondUserFinalHydroBalance = parseInt(await hydroToken.balanceOf(accounts[1]))

        assert.equal(firstUserFinalTokenBalance, firstUserInitialTokenBalance - 500, 'The first user has to have 500 tokens less after the market order (which is exactly what he deposited when creating the limit order)')
        assert.equal(firstUserFinalHydroBalance, firstUserInitialHydroBalance + requiredQuantityToSell, 'The first user has to have 1000 hydro after the market order')

        // 4- Check the second user has 100 token and 0 hydro (previously 1000)
        assert.equal(secondUserFinalTokenBalance, secondUserInitialTokenBalance + 100, 'The second user has to have 100 tokens extra after the market order')
        assert.equal(secondUserFinalHydroBalance, 0, 'The second user has to have 0 hydro after the market order')
    })
    it('Should fill a complete market order', async () => {
        // 1. Create a limit order to sell 500 token to buy 5000 hydro total (10 each) approve 500 token
        // 2. Create a market order to buy 500 token to sell 5000 hydro total (10 each) approve 5000 hydro
        // 3. Check that the first user has 0 token and 5000 hydro (previously 0)
        // 4. Check that the second user has 500 token and 0 hydro (previously 5000)

        // When the myOrder.type == sell or _type == buy
        // myOrder.owner send quantityToFill[] of _firstSymbol to msg.sender
        // msg.sender send quantityToFill[] * myOwner.price of _secondSymbol to myOrder.owner

        // When the myOrder.type == buy or _type == sell
        // myOrder.owner send quantityToFill[] * myOwner.price of _secondSymbol to msg.sender
        // msg.sender send quantityToFill[] of _firstSymbol to myOrder.owner

        // 1- First create the limit order
        const type = fillBytes32WithSpaces('sell')
        const firstSymbol = fillBytes32WithSpaces('TOKEN')
        const secondSymbol = fillBytes32WithSpaces('HYDRO')
        const quantity = 500
        const pricePerToken = 10
        let firstUserInitialTokenBalance = parseInt(await token.balanceOf(accounts[0]))
        let firstUserInitialHydroBalance = parseInt(await hydroToken.balanceOf(accounts[0]))
        let secondUserInitialTokenBalance = parseInt(await token.balanceOf(accounts[1]))
        let secondUserInitialHydroBalance = parseInt(await hydroToken.balanceOf(accounts[1]))

        // 1- Whitelisting for limit order
        console.log('Whitelisting tokens...')
        const tokenBytes = fillBytes32WithSpaces('TOKEN')
        const pairBytes = [fillBytes32WithSpaces('BAT'), fillBytes32WithSpaces('HYDRO')]
        const pairAddresses = [batToken.address, hydroToken.address]
        transaction = dax.whitelistToken(tokenBytes, token.address, pairBytes, pairAddresses)
        await awaitConfirmation(transaction)
        const isWhitelisted = await dax.isTokenSymbolWhitelisted(tokenBytes)
        const validPairs = await dax.getTokenPairs(tokenBytes)
        assert.ok(isWhitelisted, 'The token must be whitelisted')
        assert.deepEqual(pairBytes, validPairs, 'The token pairs added must be valid')

        // 1- Deposit for first user limit order
        console.log('Depositing tokens...')
        transaction = token.approve(dax.address, quantity)
        await awaitConfirmation(transaction)
        transaction = dax.depositTokens(token.address, quantity)
        await awaitConfirmation(transaction)
        const escrowAddress = await dax.escrowByUserAddress(accounts[0])
        const balance = parseInt(await token.balanceOf(escrowAddress))
        assert.equal(balance, quantity, 'The escrow contract must have received enough tokens')
        assert.equal(parseInt(await token.balanceOf(accounts[0])), firstUserInitialTokenBalance - quantity, 'You must deposit the tokens succesfully first')

        // 1- Limit order
        console.log('Deploying limit order...')
        transaction = dax.limitOrder(type, firstSymbol, secondSymbol, quantity, pricePerToken)
        await awaitConfirmation(transaction)
        const counter = parseInt(await dax.orderIdCounter())
        const sellOrdersFirst = await dax.sellOrders(0)
        assert.ok(counter == 1, 'The counter must increase after a succesful limit order creation')
        assert.equal(sellOrdersFirst.price, pricePerToken, 'The price per token should be set')
        assert.equal(sellOrdersFirst.quantity, quantity, 'The price per token should be set')
        assert.equal(sellOrdersFirst.orderType, type, 'The order type should be set')
        // End limit order

        // 2- Create the market order
        const typeMarket = fillBytes32WithSpaces('buy')
        const firstSymbolMarket = fillBytes32WithSpaces('TOKEN')
        const secondSymbolMarket = fillBytes32WithSpaces('HYDRO')
        const quantityToBuy = 500 // TOKEN
        const requiredQuantityToSell = 5000 // HYDRO
        const initialTokensMarket = parseInt(await token.balanceOf(accounts[1]))

        // 2- Deposit the tokens to give in exchange for what you want to market
        console.log('Depositing tokens...')
        // Transfer to the second user
        transaction = hydroToken.transfer(accounts[1], requiredQuantityToSell, {
            from: accounts[0]
        })

        // Important to update the initial balance since we are giving some to the 2º user for testing
        firstUserInitialHydroBalance = parseInt(await hydroToken.balanceOf(accounts[0]))

        await awaitConfirmation(transaction)
        transaction = hydroToken.approve(dax.address, requiredQuantityToSell, {
            from: accounts[1]
        })
        await awaitConfirmation(transaction)
        transaction = dax.depositTokens(hydroToken.address, requiredQuantityToSell, {
            from: accounts[1]
        })
        await awaitConfirmation(transaction)
        const escrowAddressTwo = await dax.escrowByUserAddress(accounts[1])
        const balanceTwo = parseInt(await hydroToken.balanceOf(escrowAddressTwo))
        assert.equal(balanceTwo, requiredQuantityToSell, 'The escrow contract must have received enough tokens')
        assert.equal(parseInt(await hydroToken.balanceOf(accounts[1])), 0, 'You must deposit the tokens succesfully first')

        // 2- Create the market order
        console.log('Creating market order...')
        transaction = dax.marketOrder(typeMarket, firstSymbolMarket, secondSymbolMarket, quantityToBuy, {
            from: accounts[1]
        })
        await awaitConfirmation(transaction)

        // 3- Check the first user balance 400 token and 1000 hydro (previously 10k)
        const firstUserFinalTokenBalance = parseInt(await token.balanceOf(accounts[0]))
        const firstUserFinalHydroBalance = parseInt(await hydroToken.balanceOf(accounts[0]))
        const secondUserFinalTokenBalance = parseInt(await token.balanceOf(accounts[1]))
        const secondUserFinalHydroBalance = parseInt(await hydroToken.balanceOf(accounts[1]))

        assert.equal(firstUserFinalTokenBalance, firstUserInitialTokenBalance - 500, 'The first user has to have 500 tokens less after the market order (which is exactly what he deposited when creating the limit order)')
        assert.equal(firstUserFinalHydroBalance, firstUserInitialHydroBalance + requiredQuantityToSell, 'The first user has to have 1000 hydro after the market order')

        // 4- Check the second user has 100 token and 0 hydro (previously 1000)
        assert.equal(secondUserFinalTokenBalance, secondUserInitialTokenBalance + 500, 'The second user has to have 100 tokens extra after the market order')
        assert.equal(secondUserFinalHydroBalance, 0, 'The second user has to have 0 hydro after the market order')
    })
})

function awaitConfirmation(transaction) {
    let number = 0
    return new Promise((resolve, reject) => {
        transaction.on('confirmation', number => {
            if(number == 1) resolve()
        })
    })
}

// To test bytes32 functions
function fillBytes32WithSpaces(name) {
    let nameHex = web3.utils.toHex(name)
    for(let i = nameHex.length; i < 66; i++) {
        nameHex = nameHex + '0'
    }
    return nameHex
}
