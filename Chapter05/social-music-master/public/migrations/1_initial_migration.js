const SocialMusic = artifacts.require("./SocialMusic.sol")

module.exports = function(deployer) {
  deployer.deploy(SocialMusic)
}
