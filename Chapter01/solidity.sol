pragma solidity 0.5.0;

/*---*/

pragma solidity 0.5.0;
contract Example {}

/*---*/

pragma solidity 0.5.0;
contract Example {}
contract Another {}
contract Token {}
contract ICO {}

/*---*/

pragma solidity 0.5.0;
contract Example {
    uint256 counter;
    modifier onlyOwner {}
    constructor() {}
    function doSomething() {}
}

/*---*/

pragma solidity 0.5.0;
contract Example {
    uint256 myStateVariable;
    string myOtherStateVariable;
    function example(){
        uint256 thisIsNotAStateVariable;
    }
}

/*---*/

uint public myNumber;

/*---*/

uint8 public myNumber = 256;

/*---*/

uint8 public myNumber = 300;
// Will result in
uint8 public myNymber = 44;

/*---*/

uint8 public myNumber = -5;
// You’ll get
uint8 public myNumber = 251;

/*---*/

pragma solidity 0.5.0;
contract Example {
    address public myAddress = 0xeF5781A2c04113e29bE5724ae6E30bC287610007;
}

/*---*/

address payable public myAddress;

/*---*/

pragma solidity 0.5.0;
contract TransferExample {
    address payable public userAAddress;
    function transferFunds() public {
        userAAddress.transfer(10 ether);
    }
}

/*---*/

address public myContractAddress = address(this);

/*---*/

uint256 public myContractBalance = address(this).balance;

/*---*/

myUserAddress.transfer(address(this).balance);

/*---*/

string public myText = “This is a long text”;
bytes public myTextTwo = “This is another text”;

/*---*/

bytes32 public shortText = “Short text.”;

/*---*/

function example(string memory myText) public {
    require(bytes(myText)[0] != 0);
}

/*---*/

require(bytes(yourString)[0] != 0);

/*---*/

struct Example {
    propertyOne;
};

/*---*/

enum Trees { RedTree, BlueTree, GreenTree, YellowTree }
Trees public myFavoriteTree = Trees.RedTree;

/*---*/

bool public isValid = true;

/*---*/

uint256[] public myNumbers;
string[] public myTexts;
delete myTexts[2];

/*---*/

mapping(string => bool) public validStrings;
validStrings['example'] = true;

/*---*/

uint256 memory myNumber;

/*---*/

pragma solidity 0.5.0
contract EventsExample {
    event LogUserAddress(address userAddress);
    function registerUser() public {
        emit LogUserAddress(msg.sender);
    }
}

/*---*/

event LogUserAddress(address);
event LogUserAddress(address indexed userAddress);

/*---*/

address public owner;
modifier onlyOwner() {
    require(msg.sender == owner, ‘You must be the owner’);
    _;
}
function doSomething() public onlyOwner {}

/*---*/

modifier onlyOwner { ... }

/*---*/

function example() public returns(uint256) { }

/*---*/

string public myStateString = 'Hi';
function exampleOfView() public view returns(string memory) {
    return myStateString;
}

/*---*/

function sumTwoNumbers(uint256 numberA, uint256 numberB) public pure returns(uint256) {
    uint256 result = numberA + numberB;
    return result;
}

/*---*/

function receiveDonation() public payable {}

/*---*/

function () external payable {}
