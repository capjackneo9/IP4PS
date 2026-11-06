// Hardhat is used only for its local development chain (`npm run chain`) and in-process test network.
// Contracts are compiled with the bundled solc-js compiler: `npm run contracts:compile`.
/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  networks: {
    hardhat: { chainId: 31337, hardfork: "cancun", allowUnlimitedContractSize: false },
  },
};
