// We need a way for buyers and sellers to interact, a function to place an order for training a model and a function to submit training by sellers after they've trained the model with their results. The sellers will upload the dataset json url they got and the resulting weight and bias. The buyers will upload 1 or more datasets with an array of URLs which have to be json files that can be uploaded for free on github, from 1 to 10 elements of data to verify the cost of the trained model and the payment for training. Each model will have a maximum time of 3 days to be trained which means that the buyer has to choose a winner before 3 full days.
// We also need functions to verify the quality of the trained model which will be done with a simple cost function that will return the error for a particular data field.
pragma solidity 0.5.5;

contract MachineLearningMarketplace {
    event AddedJob(uint256 indexed id, uint256 indexed timestamp);
    event AddedResult(uint256 indexed id, uint256 indexed timestamp, address indexed sender);
    event SelectedWinner(uint256 indexed id, uint256 indexed timestamp, address indexed winner, uint256 trainedIdSelected);

    struct Model {
        uint256 id;
        string datasetUrl;
        uint256 weight;
        uint256 bias;
        uint256 payment;
        uint256 timestamp;
        address payable owner;
        bool isOpen;
    }
    mapping(uint256 => Model) public models;
    mapping(uint256 => Model[]) public trainedModels;
    uint256 public latestId;

    /// @notice To upload a model in order to train it
    /// @param _dataSetUrl The url with the json containing the array of data
    function uploadJob(string memory _dataSetUrl) public payable {
        require(msg.value > 0, 'You must send some ether to get your model trained');
        Model memory m = Model(latestId, _dataSetUrl, 0, 0, msg.value, now, msg.sender, true);
        models[latestId] = m;
        emit AddedJob(latestId, now);
        latestId += 1;
    }

    /// @notice To upload the result of a trained model
    /// @param _id The id of the trained model
    /// @param _weight The final trained weight, it must be with 10 decimals meaning that 1 weight is 1e10 so that you can do smaller fractions such as 0.01 which would be 1e8 or 100000000
    /// @param _bias The final trained bias, it must be with 10 decimals as the weight
    function uploadResult(uint256 _id, uint256 _weight, uint256 _bias) public {
        Model memory m = Model(_id, models[_id].datasetUrl, _weight, _bias, models[_id].payment, now, msg.sender, true);
        trainedModels[_id].push(m);
        emit AddedResult(_id, now, msg.sender);
    }

    /// @notice To choose a winner by the sender
    /// @param _id The id of the model
    /// @param _arrayIdSelected The array index of the selected winner
    function chooseResult(uint256 _id, uint256 _arrayIdSelected) public {
        Model memory m = models[_id];
        Model[] memory t = trainedModels[_id];
        require(m.isOpen, 'The job must be open to choose a result');
        // If 3 days have passed the winner will be the first one, otherwise the owner is allowed to choose a winner before 3 full days
        if(now - m.timestamp < 3 days) {
            require(msg.sender == m.owner, 'Only the owner can select the winner');
            t[_arrayIdSelected].owner.transfer(m.payment);
            models[_id].isOpen = false;
            emit SelectedWinner(_id, now, t[_arrayIdSelected].owner, t[_arrayIdSelected].id);
        } else {
            // If there's more than one result, send it to the first
            if(t.length > 0) {
                t[0].owner.transfer(m.payment);
                emit SelectedWinner(_id, now, t[0].owner, t[0].id);
            } else {
                // Send it to the owner if none applied to the job
                m.owner.transfer(m.payment);
                emit SelectedWinner(_id, now, msg.sender, 0);
            }
            models[_id].isOpen = false;
        }
    }

    /// @notice The cost function implemented in solidity
    /// @param _results The resulting uint256 for a particular data element
    /// @param _weight The weight of the trained model
    /// @param _bias The bias of the trained model
    /// @param _xs The independent variable for our trained model to test the prediction
    /// @return int256 Returns the total error of the model
    function cost(int256[] memory _results, int256 _weight, int256 _bias, int256[] memory _xs) public pure returns(int256) {
        require(_results.length == _xs.length, 'There must be the same number of _results than _xs values');
        int256 error = 0; // Notice the int instead of uint since we want negative values too
        uint256 numberOfDataPoints = _xs.length;
        for(uint256 i = 0; i < numberOfDataPoints; i++) {
            error += (_results[i] - (_weight * _xs[i] + _bias)) * (_results[i] - (_weight * _xs[i] + _bias));
        }
        return error / int256(numberOfDataPoints);
    }

    /// @notice To get a model dataset, payment and timestamp
    /// @param id The id of the model to get the dataset, payment and timestamp
    /// @return Returns the dataset string url, payment and timestamp
    function getModel(uint256 id) public view returns(string memory, uint256, uint256) {
        return (models[id].datasetUrl, models[id].payment, models[id].timestamp);
    }

    /// @notice To get all the proposed trained models for a particular id
    /// @param _id The id of the model created by the buyer
    /// @return uint256[], uint256[], uint256[], uint256[], address[] Returns all those trained models separated in arrays containing ids, weights, biases, timestamps and owners
    function getAllTrainedModels(uint256 _id) public view returns(uint256[] memory, uint256[] memory, uint256[] memory, uint256[] memory, address[] memory) {
        uint256[] memory ids;
        uint256[] memory weights;
        uint256[] memory biases;
        uint256[] memory timestamps;
        address[] memory owners;
        for(uint256 i = 0; i < trainedModels[_id].length; i++) {
            Model memory m = trainedModels[_id][i];
            ids[i] = m.id;
            weights[i] = m.weight;
            biases[i] = m.bias;
            timestamps[i] = m.timestamp;
            owners[i] = m.owner;
        }
        return (ids, weights, biases, timestamps, owners);
    }
}
