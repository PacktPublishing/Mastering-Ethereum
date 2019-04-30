pragma solidity 0.5.0;
contract Copyright {
    // Create the events
    event RegisteredContent(uint256 counter, bytes32 indexed hashId, string indexed contentUrl, address indexed owner, uint256 timestamp, string email, string termsOfUse);

    // Create the variables that we'll use
    struct Content {
        uint256 counter;
        bytes32 hashId; // The half keccak256 hash since we can't store the entire 64 bit hash
        string contentUrl;
        address owner;
        uint256 timestamp;
        string email; // We need a valid email to contact the owner of the content
        string termsOfUse;
    }
    mapping(bytes32 => Content) public copyrightsById;
    uint256 public counter = 0;
    address payable public owner;

    // To setup the owner of the contract
    constructor() public {
        owner = msg.sender;
    }

    // To add new content to copyright the blockchain
    function addContent(bytes32 _hashId, string memory _contentUrl, string memory _email, string memory _termsOfUse) public {
        // Check that the most important values are not empty
        require(_hashId != 0 && bytes(_contentUrl).length != 0 && bytes(_contentUrl).length != 0 && bytes(_email).length != 0);

        counter += 1;
        Content memory newContent = Content(counter, _hashId, _contentUrl, msg.sender, now, _email, _termsOfUse);
        copyrightsById[_hashId] = newContent;
        emit RegisteredContent(counter, _hashId, _contentUrl, msg.sender, now, _email, _termsOfUse);
    }

    // To delete something if you're the owner
    function deleteCopyrightedByHash(bytes32 _hashId) public {
        if(copyrightsById[_hashId].owner == msg.sender) {
            delete copyrightsById[_hashId];
        }
    }

    // To extract the funds locked in this smart contract
    function extractFunds() public {
        owner.transfer(address(this).balance);
    }
}
