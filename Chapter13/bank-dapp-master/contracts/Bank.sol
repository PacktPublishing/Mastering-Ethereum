pragma solidity ^0.5.5;

import './IERC20.sol';
import './usingOraclize.sol';

/// @notice The open source bank and lending platform for ERC-20 tokens and ETH
/// @author Merunas Grincalaitis <merunasgrincalaitis@gmail.com>
contract Bank is usingOraclize {
    /*
        We want the following features
        - A function to add money to the bank in the form of ERC-20 the bank will only give loans in ETH
        - A function to give ETH loans to people in exchange for their preferred tokens
        - To use Oraclize for getting the price of the tokens added to the platform
        - A whitelisting function to allow the owner to add operators that can close open loans if the price drops below 40%
        - A monitoring function to check the price of the token at the time the loan was given compared to the current price
        - A function to pay holders based on their token holdings monthly and if their tokens are used for loans
        - A function to display the current balance of tokens inside the platform
    */
    event CreatedLoan(uint256 indexed id, address indexed token, uint256 indexed borrowedEth, address receiver);
    event UpdatedLoanTokenPrice(uint256 indexed id, int256 indexed tokenPrice);

    struct Loan {
        uint256 id;
        address receiver;
        bytes32 queryId;
        address stakedToken;
        uint256 stakedTokenAmount;
        int256 initialTokenPrice;
        int256 currentTokenPrice;
        uint256 borrowedEth;
        uint256 createdAt;
        uint256 expirationDate;
        bool isOpen;
        string state; // It can be 'pending', 'started', 'expired', or 'paid'
    }
    struct Hold {
        uint256 id;
        address holder;
        uint256 date;
        uint256 quantity;
    }
    // User address => eth holding
    mapping(address => Hold[]) public holdings;
    // User address => amount of ETH currently lend for a particular user
    mapping(address => uint256) public lendEth;
    // Query id by oraclize => Loan
    mapping(bytes32 => Loan) public queryLoan;
    // Query id => The loan to update the current price to check for collaterals
    mapping(bytes32 => Loan) public queryUpdateLoanPrice;
    // Id => Loan
    mapping(uint256 => Loan) public loanById;
    // User address => loans by that user
    mapping(address => Loan[]) public userLoans;
    Loan[] public loans;
    Loan[] public closedLoans;
    address[] public holders;
    address[] public operators;
    address public owner;
    uint256 public lastId;
    uint256 public earnings;

    modifier onlyOwner {
        require(msg.sender == owner, 'This function can only be executed by the owner');
        _;
    }

    modifier onlyOwnerOrOperator {
        require(msg.sender == owner || checkExistingOperator(msg.sender), 'This function can only be executed by the owner or an approved operator');
        _;
    }

    constructor() public {
        owner = msg.sender;
        oraclize_setProof(proofType_Ledger);
    }

    /// @notice To add ETH funds to the bank, those funds may be used for loans and if so, the holder won't be able to extract those funds in exchange for a 5% total payment of their funds when the loan is closed
    function addFunds() public payable {
        require(msg.value > 0, 'You must send more than zero ether');
        if(!checkExistingHolder()) {
            holders.push(msg.sender);
        }
        if(holdingEth[msg.sender].holder != address(0)) {
            Hold memory hold = holdingEth[msg.sender];
            hold.investmentDates.push(now);
            hold.investmentQuantities.push(msg.value);
            holdingEth[msg.sender] = hold;
        } else {
            Hold memory hold = Hold(msg.sender, new uint256[](now), new uint256[](msg.value), new uint256[](now));
            holdingEth[msg.sender] = hold;
        }
    }

    /// @notice To get a loan for ETH in exchange for the any compatible token note that you need to send a small quantity of ETH to process this transaction at least 0.01 ETH so that the oracle can pay for the cost of requesting the token value
    /// @param _receivedToken The token that this contract will hold until the loan is payed
    /// @param _quantityToBorrow The quantity of ETH that you want to receive as the loan
    function loan(address _receivedToken, uint256 _quantityToBorrow) public payable {
        require(_quantityToBorrow > 0, 'You must borrow more than zero ETH');
        require(address(this).balance >= _quantityToBorrow, 'There are not enough ETH funds to lend you right now in this contract');
        require(msg.value >= 10 finney, 'You must pay at least 0.01 ETH to run this function so that it can read the current token price');

        string memory symbol = IERC20(_receivedToken).symbol();
        // Request the price in ETH of the token to receive the loan
        bytes32 queryId = oraclize_query(oraclize_query("URL", strConcat("json(https://api.bittrex.com/api/v1.1/public/getticker?market=ETH-", symbol, ").result.Bid"));)
        Loan memory l = Loan(lastId, msg.sender, queryId, _receivedToken, 0, 0, _quantityToBorrow, now, 0, false, 'pending');
        queryLoan[queryId] = l;
        loanById[lastId] = l;
        lastId++;
    }

    /// @notice The function that gets called by oraclize to get the price of the symbol to stake for the loan
    /// @param _queryId The unique query id generated when the oraclize event started
    /// @param _result The received token price with decimals as a string
    /// @param _proof The unique proof to confirm that this function has been called by a valid smart contract
    function __callback(
       bytes32 _queryId,
       string memory _result,
       bytes memory _proof
    ) public {
       require(msg.sender == oraclize_cbAddress(), 'The callback function can only be executed by oraclize');

       Loan memory l = queryUpdateLoanPrice[_queryId];
       Loan memory l = queryLoan[_queryId];
       if(l.receiver != address(0)) {
           updateLoanPrice(_result, _queryId);
       } else if(l.receiver != address(0)) {
           setLoan(_result, _queryId);
       }
    }

    /// @notice To update the price of a token used in a loan to close it if the value drops too low
    function updateLoanPrice(string _result, bytes32 _queryId) internal {
        Loan memory l = queryLoan[_queryId];
        int256 tokenPrice = parseInt(_result);
        l.currentTokenPrice = tokenPrice;

        loanById[l.id] = l;
        for(uint256 i = 0; i < userLoans[l.receiver].length; i++) {
            if(userLoans[l.receiver][i].id == l.id) {
                userLoans[l.receiver][i] = l;
                break;
            }
        }
        emit UpdatedLoanTokenPrice(l.id, tokenPrice);
    }

    function setLoan(string _result, bytes32 _queryId) internal {
        Loan memory l = queryLoan[_queryId];
        int256 tokenPrice = parseInt(_result);
        uint256 amountToStake = l.stakedTokenAmount * tokenPrice * 0.5; // Multiply it by 0.5 to divide it by 2 so that the user sends double the quantity to borrow worth of tokens
        require(tokenPrice > 0, 'The token price must be larger than absolute zero');
        require(amountToStake >= l.borrowedEth, 'The quantity of tokens to stake must be larger than or equal twice the amount of ETH to borrow');

        IERC20(l.stakedToken).transferFrom(l.receiver, address(this), l.stakedTokenAmount);
        l.receiver.transfer(l.borrowedEth);
        l.initialTokenPrice = tokenPrice;
        l.currentTokenPrice = tokenPrice;
        l.expirationDate = now + 6 months;
        l.isOpen = true;
        l.state = 'started';
        loanById[l.id] = l;
        queryLoan[_queryId] = l;
        userLoans[l.receiver].push(l);
        loans.push(l);

        emit CreatedLoan(l.id, l.stakedToken, l.borrowedEth, l.receiver);
    }

    /// @notice To pay a given loan with the 5% fee of the lend ETH
    /// @param _loanId The loan id to pay
    function payLoan(uint256 _loanId) public payable {
        Loan memory l = loanById[_loanId];
        uint256 priceWithFivePercentFee = l.borrowedEth + (l.borrowedEth * 0.05);
        require(l.isOpen, 'The loan must be open to be payable');
        require(msg.value >= priceWithFivePercentFee, 'You must pay the ETH borrowed by the loan plus the five percent fee not less');
        // If he paid more than he borrowed, return him the difference without the fee tho
        if(msg.value > priceWithFivePercentFee) {
            l.receiver.transfer(msg.value - priceWithFivePercentFee);
        }
        // Send him his tokens back
        IERC20(l.stakedToken).transfer(l.stakedTokenAmount);

        earnings += l.borrowedEth * 0.05;
        l.isOpen = false;
        l.state = 'paid';
        queryLoan[l.queryId] = l;
        loanById[l.id] = l;
        closedLoans.push(l);

        // Update the loan from the array of user loans with the paid status
        for(uint256 i = 0; i < userLoans[l.receiver].length; i++) {
            if(userLoans[l.receiver][i].id == l.id) {
                userLoans[l.receiver][i] = l;
            }
        }
    }

    /// @notice To pay a holder depending on time holding up to 5% per year of the current dynamic earnings
    function payHolder() public {
        require(holdingEth[msg.sender].holder != address(0), 'You must hold more than zero ether to earn a profit');
        int256 totalEarnings = checkEarnings();

        // Update the state of the holdings before sending the ether to avoid reentrancy
        for(uint256 i = 0; i < holdings[msg.sender].length; i++) {
            holdings[msg.sender][i].date = now;
        }

        msg.sender.transfer(totalEarnings);
    }

    /// @notice To extract the funds that a user may be holding in the bank
    function extractFunds() public {
        uint256 totalFunds;
        for(uint256 i = 0; i < holdings[msg.sender].length; i++) {
            totalFunds += holdings[msg.sender][i].quantity;
            holdings[msg.sender][i].quantity = 0;
        }
        msg.sender.transfer(totalFunds);
    }

    /// @notice To add an operator Ethereum address or to remove one based on the _type value
    /// @param _type If it's an 'add' or 'remove' operation
    /// @param _user The address of the operator
    function modifyOperator(bytes32 _type, address _user) public onlyOwner {
        bool operatorExists = false;
        for(uint256 i = 0; i < operators.length; i++) {
            if(_type == 'add' && operators[i] == _user) {
                operatorExists = true;
                break;
            } else if(_type == 'remove' && operators[i] == _user) {
                address lastOperator = operators[operators.length - 1];
                operators[i] = lastOperator;
                operators--;
                break;
            }
        }
        if(_type == 'add' && !operatorExists) {
            operators.push(_user);
        }
    }

    function closeLoan(uint256 _loanId) public onlyOwnerOrOperator {
        Loan memory l = loanById[_loanId];
        require(l.receiver != address(0), 'The selected loan is invalid');

        int256 percentageDrop =

        // If the price of the token used in the loan dropped below or equal 40% the initial value, close it
        if(l.currentTokenPrice <= l.initialTokenPrice * 0.6)  {

        } else if() {
            // Or if the time to pay the loan has expired it, close it

        }

        l.isOpen = false;
        l.state = 'expired';
        queryLoan[l.queryId] = l;
        loanById[l.id] = l;
        closedLoans.push(l);

        // Update the loan from the array of user loans with the paid status
        for(uint256 i = 0; i < userLoans[l.receiver].length; i++) {
            if(userLoans[l.receiver][i].id == l.id) {
                userLoans[l.receiver][i] = l;
            }
        }
    }

    /// @notice To compare the price of the token used for the loan so that we can detect drops in value for selling those tokens when needed
    function monitorLoan(uint256 _loanId) public payable {
        Loan memory l = loanById[_loanId];
        require(l.receiver != address(0), 'The loan id must be an existing loan');
        string memory symbol = IERC20(l.stakedToken).symbol();
        // Request the price in ETH of the token to receive the loan
        bytes32 queryId = oraclize_query(oraclize_query("URL", strConcat("json(https://api.bittrex.com/api/v1.1/public/getticker?market=ETH-", symbol, ").result.Bid"));)
        queryUpdateLoanPrice[queryId] = l;
    }

    /// @notice To check how much ether you've earned
    /// @return int256 The number of ETH
    function checkEarnings() public view returns(int256) {
        int256 quantityOfEarnings;
        for(uint256 i = 0; i < holdings[msg.sender].length; i++) {
            int256 percentageOfHoldings = holdingEth[msg.sender].quantity * 100 / address(this).balance;
            uint256 daysPassed = now - holdings[msg.sender][i].date;
            int256 thisEarnings = earnings * 0.05 * daysPassed / 365 days * percentageOfHoldings;

            /* 365 days = earnings * 0.05 * percentage of holdings
            timeSinceLastExit days = x earnings */
            quantityOfEarnings += thisEarnings;
        }
        return quantityOfEarnings;
    }

    /// @notice To check if a user is already added to the list of holders
    function checkExistingHolder() public view returns(bool) {
        for(uint256 i = 0; i < holders.length; i++) {
            if(holders[i] == msg.sender) {
                return true;
            }
        }
        return false;
    }

    /// @notice To check if a user is already added to the list of operators
    function checkExistingOperator(address _operator) public view returns(bool) {
        for(uint256 i = 0; i < operators.length; i++) {
            if(operators[i] == _operator) {
                return true;
            }
        }
        return false;
    }
}
