// This is a social media smart contract that allows people to publish strings of text in short formats with a focus on hashtags so that they can follow, read and be in touch with the latest content regarding those hashtags. There will be a mapping os top hashtags. A struct for each piece of content with the date, author, content and array of hashtags. We want to avoid focusing on specific users that's why user accounts will be anonymous where addresses will the be the only identifiers.

pragma solidity ^0.5.0;

contract SocialMedia {
    struct Content {
        uint256 id;
        address author;
        uint256 date;
        string content;
        bytes32[] hashtags;
    }

    event ContentAdded(uint256 indexed id, address indexed author, uint256 indexed date, string content, bytes32[] hashtags);

    mapping(address => bytes32[]) public subscribedHashtags;
    mapping(bytes32 => uint256) public hashtagScore; // The number of times this hashtag has been used, used to sort the top hashtags
    mapping(bytes32 => Content[]) public contentByHashtag;
    mapping(uint256 => Content) public contentById;
    mapping(bytes32 => bool) public doesHashtagExist;
    mapping(address => bool) public doesUserExist;
    address[] public users;
    Content[] public contents;
    bytes32[] public hashtags;
    uint256 public latestContentId;

    /// @notice To add new content to the social media dApp. If no hashtags are sent, the content is added to the #general hashtag list.
    /// @param _content The string of content
    /// @param _hashtags The hashtags used for that piece of content
    function addContent(string memory _content, bytes32[] memory _hashtags) public {
        require(bytes(_content).length > 0, 'The content cannot be empty');
        Content memory newContent = Content(latestContentId, msg.sender, now, _content, _hashtags);
        // If the user didn't specify any hashtags add the content to the #general hashtag
        if(_hashtags.length == 0) {
            contentByHashtag['general'].push(newContent);
            hashtagScore['general']++;
            if(!doesHashtagExist['general']) {
                hashtags.push('general');
                doesHashtagExist['general'] = true;
            }
            newContent.hashtags[0] = 'general';
        } else {
            for(uint256 i = 0; i < _hashtags.length; i++) {
                contentByHashtag[_hashtags[i]].push(newContent);
                hashtagScore[_hashtags[i]]++;
                if(!doesHashtagExist[_hashtags[i]]) {
                    hashtags.push(_hashtags[i]);
                    doesHashtagExist[_hashtags[i]] = true;
                }
            }
        }
        hashtags = sortHashtagsByScore();
        contentById[latestContentId] = newContent;
        contents.push(newContent);
        if(!doesUserExist[msg.sender]) {
            users.push(msg.sender);
            doesUserExist[msg.sender] = true;
        }
        emit ContentAdded(latestContentId, msg.sender, now, _content, _hashtags);
        latestContentId++;
    }

    /// @notice To subscribe to a hashtag if you didn't do so already
    /// @param _hashtag The hashtag name
    function subscribeToHashtag(bytes32 _hashtag) public {
        if(!checkExistingSubscription(_hashtag)) {
            subscribedHashtags[msg.sender].push(_hashtag);
            hashtagScore[_hashtag]++;
            hashtags = sortHashtagsByScore();
        }
    }

    /// @notice To unsubscribe to a hashtag if you are subscribed otherwise it won't do nothing
    /// @param _hashtag The hashtag name
    function unsubscribeToHashtag(bytes32 _hashtag) public {
        if(checkExistingSubscription(_hashtag)) {
            for(uint256 i = 0; i < subscribedHashtags[msg.sender].length; i++) {
                if(subscribedHashtags[msg.sender][i] == _hashtag) {
                    bytes32 lastElement = subscribedHashtags[msg.sender][subscribedHashtags[msg.sender].length - 1];
                    subscribedHashtags[msg.sender][i] = lastElement;
                    subscribedHashtags[msg.sender].length--; // Reduce the array to remove empty elements
                    hashtagScore[_hashtag]--;
                    hashtags = sortHashtagsByScore();
                    break;
                }
            }
        }
    }

    /// @notice To get the top hashtags
    /// @param _amount How many top hashtags to get in order, for instance the top 20 hashtags
    /// @return bytes32[] Returns the names of the hashtags
    function getTopHashtags(uint256 _amount) public view returns(bytes32[] memory) {
        bytes32[] memory result;
        if(hashtags.length < _amount) {
            result = new bytes32[](hashtags.length);
            for(uint256 i = 0; i < hashtags.length; i++) {
                result[i] = hashtags[i];
            }
        } else {
            result = new bytes32[](_amount);
            for(uint256 i = 0; i < _amount; i++) {
                result[i] = hashtags[i];
            }
        }
        return result;
    }

    /// @notice To get the followed hashtag names for this msg.sender
    /// @return bytes32[] The hashtags followed by this user
    function getFollowedHashtags() public view returns(bytes32[] memory) {
        return subscribedHashtags[msg.sender];
    }

    /// @notice To get the contents for a particular hashtag. It returns the ids because we can't return arrays of strings and we can't return structs so the user has to manually make a new request for each piece of content using the function below.
    /// @param _hashtag The hashtag from which get content
    /// @param _amount The quantity of contents to get for instance, 50 pieces of content for that hashtag
    /// @return uint256[] Returns the ids of the contents so that you can get each piece independently with a new request since you can't return arrays of strings
    function getContentIdsByHashtag(bytes32 _hashtag, uint256 _amount) public view returns(uint256[] memory) {
        uint256[] memory ids = new uint256[](_amount);
        for(uint256 i = 0; i < _amount; i++) {
            ids[i] = contentByHashtag[_hashtag][i].id;
        }
        return ids;
    }

    /// @notice Returns the data for a particular content id
    /// @param _id The id of the content
    /// @return Returns the id, author, date, content and hashtags for that piece of content
    function getContentById(uint256 _id) public view returns(uint256, address, uint256, string memory, bytes32[] memory) {
        Content memory c = contentById[_id];
        return (c.id, c.author, c.date, c.content, c.hashtags);
    }

    /// @notice Sorts the hashtags given their hashtag score
    /// @return bytes32[] Returns the sorted array of hashtags
    function sortHashtagsByScore() public view returns(bytes32[] memory) {
        bytes32[] memory _hashtags = hashtags;
        bytes32[] memory sortedHashtags = new bytes32[](hashtags.length);
        uint256 lastId = 0;
        for(uint256 i = 0; i < _hashtags.length; i++) {
            for(uint j = i+1; j < _hashtags.length; j++) {
                // If it's a buy order, sort from lowest to highest since we want the lowest prices first
                if(hashtagScore[_hashtags[i]] < hashtagScore[_hashtags[j]]) {
                    bytes32 temporaryhashtag = _hashtags[i];
                    _hashtags[i] = _hashtags[j];
                    _hashtags[j] = temporaryhashtag;
                }
            }
            sortedHashtags[lastId] = _hashtags[i];
            lastId++;
        }
        return sortedHashtags;
    }

    /// @notice To check if the use is already subscribed to a hashtag
    /// @return bool If you are subscribed to that hashtag or not
    function checkExistingSubscription(bytes32 _hashtag) public view returns(bool) {
        for(uint256 i = 0; i < subscribedHashtags[msg.sender].length; i++) {
            if(subscribedHashtags[msg.sender][i] == _hashtag) return true;
        }
        return false;
    }
}
