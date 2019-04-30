const fs = require('fs')
const { join } = require('path')
const should = require('chai').should()
const abi = JSON.parse(fs.readFileSync(join(__dirname, '../build', 'contracts', 'MachineLearningMarketplace.json'))).abi
const MachineLearningMarketplace = artifacts.require('MachineLearningMarketplace')
let machineLearningMarketplace = {}
let eventsInstance = {}

contract('MachineLearningMarketplace', accounts => {
    beforeEach(async () => {
        machineLearningMarketplace = await MachineLearningMarketplace.new()
    })
    it('Should upload a new job model successfully', async () => {
        const id = 0
        const datasetUrl = 'https://example.com' // Suppose this is the dataset shown in the previous section
        const payment = 100000000000000000 // 0.1 ether
        await machineLearningMarketplace.uploadJob(datasetUrl, { from: accounts[0], gas: 8e6, value: payment })
        const uploadedModel = await machineLearningMarketplace.getModel(id)
        uploadedModel[0].should.equal(datasetUrl)
        parseInt(uploadedModel[1]).should.equal(payment)
    })
    it('Should upload a result for an existing job', async () => {
        machineLearningMarketplace.AddedJob().on('data', data => {
            console.log('Data', data)
        })

        const id = 0
        const datasetUrl = 'https://example.com'
        const payment = 100000000000000000 // 0.1 ether
        await machineLearningMarketplace.uploadJob(datasetUrl, { from: accounts[0], gas: 8e6, value: payment })
        const uploadedModel = await machineLearningMarketplace.getModel(id)
        uploadedModel[0].should.equal(datasetUrl)
        parseInt(uploadedModel[1]).should.equal(payment)

        const trainedWeight = 0.0090
        const trainedBias = 0.0629
        const trainedWeightWithDecimals = 0.0090 * 1e10
        const trainedBiasWithDecimals = 0.0629 * 1e10
        await machineLearningMarketplace.uploadResult(id, trainedWeightWithDecimals, trainedBiasWithDecimals, {
            from: accounts[1],
            gas: 8e6
        })
        console.log('Uploaded result, waiting...')
        await asyncSetTimeout(10)
    })
    it('Should choose a winning model', async () => {
    })
})

function asyncSetTimeout(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time * 1e3)
    })
}
