pragma solidity 0.5.0;

contract SocialMusic {
    struct User {
        bytes32 name;
        uint256 age;
        string state; // A short description of who they are or how they feel
        string[] musicRecommendations;
        address[] following;
    }
    mapping(address => User) public users;
    address[] public userList;

    // To add a new musical recommendation
    function addSong(string memory _songName) public {
        require(bytes(_songName).length > 0 && bytes(_songName).length <= 100);
        users[msg.sender].musicRecommendations.push(_songName);
    }

    // To setup user information
    function setup(bytes32 _name, uint256 _age, string memory _state) public {
        require(_name.length > 0);
        User memory newUser = User(_name, _age, _state, users[msg.sender].musicRecommendations, users[msg.sender].following);
        users[msg.sender] = newUser;
        userList.push(msg.sender);
    }

    // To follow new users
    function follow(address _user) public {
        require(_user != address(0));
        users[msg.sender].following.push(_user);
    }

    // Returns the array of users
    function getUsersList() public view returns(address[] memory) {
        return userList;
    }

    // Returns the music recommendations
    function getUsersMusicRecommendation(address _user, uint256 _recommendationIndex) public view returns(string memory) {
        return users[_user].musicRecommendations[_recommendationIndex];
    }

    // Returns how many music recommendations that user has
    function getUsersMusicRecommendationLength(address _user) public view returns(uint256) {
        return users[_user].musicRecommendations.length;
    }

    // Returns the addresses of the users _user is following
    function getUsersFollowings(address _user) public view returns(address[] memory) {
        return users[_user].following;
    }
}
