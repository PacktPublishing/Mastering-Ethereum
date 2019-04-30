// We need a system that allows people to trade different pairs of ERC20 tokens. Only approved tokens will be tradable since we don't want to clutter the system with an endless list of unused tokens. As a proof of concept, we'll trade only ETH - HYDRO since hydro is a famous ERC20 token that has a test token available outside the mainnet in rinkeby.

// Functions that we need:
/*
    1. Constructor to setup the owner
    2. Fallback non-payable function to reject ETH from direct transfers since we only want people to use the functions designed to trade a specific pair
    3. Function to extract tokens from this contract in case someone mistakenly sends ERC20 to the wrong function
    4. Function to create whitelist a token by the owner
    5. Function to create market orders
    6. Function to create limit orders
 */

pragma solidity ^0.5.4;

import './Escrow.sol';

contract DAX {
    event TransferOrder(bytes32 _type, address indexed from, address indexed to, bytes32 tokenSymbol, uint256 quantity);
    enum OrderState {OPEN, CLOSED}

    struct Order {
        uint256 id;
        address owner;
        bytes32 orderType;
        bytes32 firstSymbol;
        bytes32 secondSymbol;
        uint256 quantity;
        uint256 price;
        uint256 timestamp;
        OrderState state;
    }

    Order[] public buyOrders;
    Order[] public sellOrders;
    Order[] public closedOrders;
    uint256 public orderIdCounter;
    address public owner;
    address[] public whitelistedTokens;
    bytes32[] public whitelistedTokenSymbols;
    address[] public users;

    // Token address => isWhitelisted or not
    mapping(address => bool) public isTokenWhitelisted;
    mapping(bytes32 => bool) public isTokenSymbolWhitelisted;
    mapping(bytes32 => bytes32[]) public tokenPairs; // A token symbol pair made of 'FIRST' => 'SECOND'
    mapping(bytes32 => address) public tokenAddressBySymbol; // Symbol => address of the token
    mapping(uint256 => Order) public orderById; // Id => trade object
    mapping(uint256 => uint256) public buyOrderIndexById; // Id => index inside the buyOrders array
    mapping(uint256 => uint256) public sellOrderIndexById; // Id => index inside the sellOrders array
    mapping(address => address) public escrowByUserAddress; // User address => escrow contract address

    modifier onlyOwner {
        require(msg.sender == owner, 'The sender must be the owner for this function');
        _;
    }

    /// @notice Users should not send ether to this contract
    function () external {
        revert();
    }

    constructor () public {
        owner = msg.sender;
    }

    /// @notice To whitelist a token so that is tradable in the exchange
    /// @dev If the transaction reverts, it could be because of the quantity of token pairs, try reducing the number and breaking the transaction into several pieces
    /// @param _symbol The symbol of the token
    /// @param _token The token to whitelist, for instance 'TOK'
    /// @param _tokenPairSymbols The token pairs to whitelist for this new token, for instance: ['BAT', 'HYDRO'] which will be converted to ['TOK', 'BAT'] and ['TOK', 'HYDRO']
    /// @param _tokenPairAddresses The token pair addresses to whitelist for this new token, for instance: ['0x213...', '0x927...', '0x128...']
    function whitelistToken(bytes32 _symbol, address _token, bytes32[] memory _tokenPairSymbols, address[] memory _tokenPairAddresses) public onlyOwner {
        require(_token != address(0), 'You must specify the token address to whitelist');
        require(IERC20(_token).totalSupply() > 0, 'The token address specified is not a valid ERC20 token');
        require(_tokenPairAddresses.length == _tokenPairSymbols.length, 'You must send the same number of addresses and symbols');

        isTokenWhitelisted[_token] = true;
        isTokenSymbolWhitelisted[_symbol] = true;
        whitelistedTokens.push(_token);
        whitelistedTokenSymbols.push(_symbol);
        tokenAddressBySymbol[_symbol] = _token;
        tokenPairs[_symbol] = _tokenPairSymbols;

        for(uint256 i = 0; i < _tokenPairAddresses.length; i++) {
            address currentAddress = _tokenPairAddresses[i];
            bytes32 currentSymbol = _tokenPairSymbols[i];
            tokenPairs[currentSymbol].push(_symbol);
            if(!isTokenWhitelisted[currentAddress]) {
                isTokenWhitelisted[currentAddress] = true;
                isTokenSymbolWhitelisted[currentSymbol] = true;
                whitelistedTokens.push(currentAddress);
                whitelistedTokenSymbols.push(currentSymbol);
                tokenAddressBySymbol[currentSymbol] = currentAddress;
            }
        }
    }

    /// @notice To store tokens inside the escrow contract associated with the user accounts as long as the users made an approval beforehand
    /// @dev It will revert is the user doesn't approve tokens beforehand to this contract
    /// @param _token The token address
    /// @param _amount The quantity to deposit to the escrow contracc
    function depositTokens(address _token, uint256 _amount) public {
        require(isTokenWhitelisted[_token], 'The token to deposit must be whitelisted');
        require(_token != address(0), 'You must specify the token address');
        require(_amount > 0, 'You must send some tokens with this deposit function');
        require(IERC20(_token).allowance(msg.sender, address(this)) >= _amount, 'You must approve() the quantity of tokens that you want to deposit first');
        if(escrowByUserAddress[msg.sender] == address(0)) {
            Escrow newEscrow = new Escrow(address(this));
            escrowByUserAddress[msg.sender] = address(newEscrow);
            users.push(msg.sender);
        }
        IERC20(_token).transferFrom(msg.sender, escrowByUserAddress[msg.sender], _amount);
    }

    /// @notice To extract tokens
    /// @param _token The token address to extract
    /// @param _amount The amount of tokens to transfer
    function extractTokens(address _token, uint256 _amount) public {
        require(_token != address(0), 'You must specify the token address');
        require(_amount > 0, 'You must send some tokens with this deposit function');
        Escrow(escrowByUserAddress[msg.sender]).transferTokens(_token, msg.sender, _amount);
    }

    /// @notice To create a market order by filling one or more existing limit orders at the most profitable price given a token pair, type of order (buy or sell) and the amount of tokens to trade, the _quantity is how many _firstSymbol tokens you want to buy if it's a buy order or how many _firstSymbol tokens you want to sell at market price
    /// @param _type The type of order either 'buy' or 'sell'
    /// @param _firstSymbol The first token to buy or sell
    /// @param _secondSymbol The second token to create a pair
    /// @param _quantity The amount of tokens to sell or buy
    function marketOrder(bytes32 _type, bytes32 _firstSymbol, bytes32 _secondSymbol, uint256 _quantity) public {
        require(_type.length > 0, 'You must specify the type');
        require(isTokenSymbolWhitelisted[_firstSymbol], 'The first symbol must be whitelisted');
        require(isTokenSymbolWhitelisted[_secondSymbol], 'The second symbol must be whitelisted');
        require(_quantity > 0, 'You must specify the quantity to buy or sell');
        require(checkValidPair(_firstSymbol, _secondSymbol), 'The pair must be a valid pair');

        // Fills the latest market orders up until the _quantity is reached
        uint256[] memory ordersToFillIds;
        uint256[] memory quantitiesToFillPerOrder;
        uint256 currentQuantity = 0;
        if(_type == 'buy') {
            ordersToFillIds = new uint256[](sellOrders.length);
            quantitiesToFillPerOrder = new uint256[](sellOrders.length);
            // Loop through all the sell orders until we fill the quantity
            for(uint256 i = 0; i < sellOrders.length; i++) {
                ordersToFillIds[i] = sellOrders[i].id;
                if((currentQuantity + sellOrders[i].quantity) > _quantity) {
                    quantitiesToFillPerOrder[i] =  _quantity - currentQuantity;
                    break;
                }
                currentQuantity += sellOrders[i].quantity;
                quantitiesToFillPerOrder[i] = sellOrders[i].quantity;
            }
        } else {
            ordersToFillIds = new uint256[](buyOrders.length);
            quantitiesToFillPerOrder = new uint256[](buyOrders.length);
            for(uint256 i = 0; i < buyOrders.length; i++) {
                ordersToFillIds[i] = buyOrders[i].id;
                if((currentQuantity + buyOrders[i].quantity) > _quantity) {
                    quantitiesToFillPerOrder[i] =  _quantity - currentQuantity;
                    break;
                }
                currentQuantity += buyOrders[i].quantity;
                quantitiesToFillPerOrder[i] = buyOrders[i].quantity;
            }
        }

        // When the myOrder.type == sell or _type == buy
        // myOrder.owner send quantityToFill[] of _firstSymbol to msg.sender
        // msg.sender send quantityToFill[] * myOwner.price of _secondSymbol to myOrder.owner

        // When the myOrder.type == buy or _type == sell
        // myOrder.owner send quantityToFill[] * myOwner.price of _secondSymbol to msg.sender
        // msg.sender send quantityToFill[] of _firstSymbol to myOrder.owner

        // Close and fill orders
        for(uint256 i = 0; i < ordersToFillIds.length; i++) {
            Order memory myOrder = orderById[ordersToFillIds[i]];

            // If we fill the entire order, mark it as closed
            if(quantitiesToFillPerOrder[i] == myOrder.quantity) {
                myOrder.state = OrderState.CLOSED;
                closedOrders.push(myOrder);
            }
            myOrder.quantity -= quantitiesToFillPerOrder[i];
            orderById[myOrder.id] = myOrder;

            if(_type == 'buy') {
                // If the limit order is a buy order, send the firstSymbol to the creator of the limit order which is the buyer
                Escrow(escrowByUserAddress[myOrder.owner]).transferTokens(tokenAddressBySymbol[_firstSymbol], msg.sender, quantitiesToFillPerOrder[i]);
                Escrow(escrowByUserAddress[msg.sender]).transferTokens(tokenAddressBySymbol[_secondSymbol], myOrder.owner, quantitiesToFillPerOrder[i] * myOrder.price);

                sellOrders[sellOrderIndexById[myOrder.id]] = myOrder;

                emit TransferOrder('sell', escrowByUserAddress[myOrder.owner], msg.sender, _firstSymbol, quantitiesToFillPerOrder[i]);
                emit TransferOrder('buy', escrowByUserAddress[msg.sender], myOrder.owner, _secondSymbol, quantitiesToFillPerOrder[i] * myOrder.price);
            } else {
                // If this is a buy market order or a sell limit order for the opposite, send firstSymbol to the second user
                Escrow(escrowByUserAddress[myOrder.owner]).transferTokens(tokenAddressBySymbol[_secondSymbol], msg.sender, quantitiesToFillPerOrder[i] * myOrder.price);
                Escrow(escrowByUserAddress[msg.sender]).transferTokens(tokenAddressBySymbol[_firstSymbol], myOrder.owner, quantitiesToFillPerOrder[i]);

                buyOrders[buyOrderIndexById[myOrder.id]] = myOrder;

                emit TransferOrder('buy', escrowByUserAddress[myOrder.owner], msg.sender, _secondSymbol, quantitiesToFillPerOrder[i] * myOrder.price);
                emit TransferOrder('sell', escrowByUserAddress[msg.sender], myOrder.owner, _firstSymbol, quantitiesToFillPerOrder[i]);
            }
        }
    }

    /// @notice To create a market order given a token pair, type of order, amount of tokens to trade and the price per token. If the type is buy, the price will determine how many _secondSymbol tokens you are willing to pay for each _firstSymbol up until your _quantity or better if there are more profitable prices. If the type if sell, the price will determine how many _secondSymbol tokens you get for each _firstSymbol
    /// @param _type The type of order either 'buy' or 'sell'
    /// @param _firstSymbol The first symbol to deal with
    /// @param _secondSymbol The second symbol that you want to deal
    /// @param _quantity How many tokens you want to deal, these are _firstSymbol tokens
    /// @param _pricePerToken How many tokens you get or pay for your other symbol, the total quantity is _pricePerToken * _quantity
    function limitOrder(bytes32 _type, bytes32 _firstSymbol, bytes32 _secondSymbol, uint256 _quantity, uint256 _pricePerToken) public {
        address userEscrow = escrowByUserAddress[msg.sender];
        address firstSymbolAddress = tokenAddressBySymbol[_firstSymbol];
        address secondSymbolAddress = tokenAddressBySymbol[_secondSymbol];

        require(firstSymbolAddress != address(0), 'The first symbol has not been whitelisted');
        require(secondSymbolAddress != address(0), 'The second symbol has not been whitelisted');
        require(isTokenSymbolWhitelisted[_firstSymbol], 'The first symbol must be whitelisted to trade with it');
        require(isTokenSymbolWhitelisted[_secondSymbol], 'The second symbol must be whitelisted to trade with it');
        require(userEscrow != address(0), 'You must deposit some tokens before creating orders, use depositToken()');
        require(checkValidPair(_firstSymbol, _secondSymbol), 'The pair must be a valid pair');

        Order memory myOrder = Order(orderIdCounter, msg.sender, _type, _firstSymbol, _secondSymbol, _quantity, _pricePerToken, now, OrderState.OPEN);
        orderById[orderIdCounter] = myOrder;
        if(_type == 'buy') {
            // Check that the user has enough of the second symbol if he wants to buy the first symbol at that price
            require(IERC20(secondSymbolAddress).balanceOf(userEscrow) >= _quantity, 'You must have enough second token funds in your escrow contract to create this buy order');

            buyOrders.push(myOrder);

            // Sort existing orders by price the most efficient way possible, we could optimize even more by creating a buy array for each token
            uint256[] memory sortedIds = sortIdsByPrices('buy');
            delete buyOrders;
            buyOrders.length = sortedIds.length;
            for(uint256 i = 0; i < sortedIds.length; i++) {
                buyOrders[i] = orderById[sortedIds[i]];
                buyOrderIndexById[sortedIds[i]] = i;
            }
        } else {
            // Check that the user has enough of the first symbol if he wants to sell it for the second symbol
            require(IERC20(firstSymbolAddress).balanceOf(userEscrow) >= _quantity, 'You must have enough first token funds in your escrow contract to create this sell order');

            // Add the new order
            sellOrders.push(myOrder);

            // Sort existing orders by price the most efficient way possible, we could optimize even more by creating a sell array for each token
            uint256[] memory sortedIds = sortIdsByPrices('sell');
            delete sellOrders; // Reset orders
            sellOrders.length = sortedIds.length;
            for(uint256 i = 0; i < sortedIds.length; i++) {
                sellOrders[i] = orderById[sortedIds[i]];
                sellOrderIndexById[sortedIds[i]] = i;
            }
        }

        orderIdCounter++;
    }

    /// @notice Sorts the selected array of Orders by price from lower to higher if it's a buy order or from highest to lowest if it's a sell order
    /// @param _type The type of order either 'sell' or 'buy'
    /// @return uint256[] Returns the sorted ids
    function sortIdsByPrices(bytes32 _type) public view returns (uint256[] memory) {
        Order[] memory orders;
        if(_type == 'sell') orders = sellOrders;
        else orders = buyOrders;

        uint256 length = orders.length;
        uint256[] memory orderedIds = new uint256[](length);
        uint256 lastId = 0;
        for(uint i = 0; i < length; i++) {
            if(orders[i].quantity > 0) {
                for(uint j = i+1; j < length; j++) {
                    // If it's a buy order, sort from lowest to highest since we want the lowest prices first
                    if(_type == 'buy' && orders[i].price > orders[j].price) {
                        Order memory temporaryOrder = orders[i];
                        orders[i] = orders[j];
                        orders[j] = temporaryOrder;
                    }
                    // If it's a sell order, sort from highest to lowest since we want the highest sell prices first
                    if(_type == 'sell' && orders[i].price < orders[j].price) {
                        Order memory temporaryOrder = orders[i];
                        orders[i] = orders[j];
                        orders[j] = temporaryOrder;
                    }
                }
                orderedIds[lastId] = orders[i].id;
                lastId++;
            }
        }

        return orderedIds;
    }


    /// @notice Checks if a pair is valid
    /// @param _firstSymbol The first symbol of the pair
    /// @param _secondSymbol The second symbol of the pair
    /// @return bool If the pair is valid or not
    function checkValidPair(bytes32 _firstSymbol, bytes32 _secondSymbol) public view returns(bool) {
        bytes32[] memory pairs = tokenPairs[_firstSymbol];

        for(uint256 i = 0; i < pairs.length; i++){
            if(pairs[i] == _secondSymbol) return true;
        }
        return false;
    }

    /// @notice Returns the token pairs
    /// @param _token To get the array of token pair for that selected token
    /// @return bytes32[] An array containing the pairs
    function getTokenPairs(bytes32 _token) public view returns(bytes32[] memory) {
        return tokenPairs[_token];
    }

    /// @notice To get an order from the arrays of orders
    /// @param _type The type of order to get
    /// @param _index The index of the order to get
    /// @return Order The order struct
    function getOrder(bytes32 _type, uint256 _index) public view returns(uint256, address, bytes32, bytes32, bytes32, uint256, uint256, uint256, OrderState) {
        Order memory myOrder;
        if(_type == 'buy') {
             myOrder = buyOrders[_index];
        } else if(_type == 'sell') {
            myOrder = sellOrders[_index];
        } else if(_type == 'closed') {
            myOrder = closedOrders[_index];
        }
        return (myOrder.id, myOrder.owner, myOrder.orderType, myOrder.firstSymbol, myOrder.secondSymbol, myOrder.quantity, myOrder.price, myOrder.timestamp, myOrder.state);
    }

    /// @notice To get the length of the specified order array
    /// @param _type The type of order
    /// @return uint256 The number of elements inside that order
    function getOrderLength(bytes32 _type) public view returns(uint256) {
        if(_type == 'buy') {
            return buyOrders.length;
        } else if(_type == 'sell') {
            return sellOrders.length;
        } else if(_type == 'closed') {
            return closedOrders.length;
        }
    }

    /// @notice To get all the whitelisted symbols
    /// @return bytes32[] The array of symbols
    function getWhitelistedTokenSymbols() public view returns(bytes32[] memory) {
        return whitelistedTokenSymbols;
    }
}
