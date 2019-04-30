const SocialMedia = artifacts.require("./SocialMedia.sol")

module.exports = function(deployer) {
  deployer.deploy(SocialMedia);
}
