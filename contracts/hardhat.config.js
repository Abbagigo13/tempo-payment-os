require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      // Deployment is expensive on Tempo (gas per byte of contract code),
      // so keep the compiled contract small.
      optimizer: { enabled: true, runs: 200 },
    },
  },
  // Contract source files go in ./src (not the default ./contracts,
  // which would be confusing inside a folder that is already called contracts).
  paths: {
    sources: "./src",
  },
};