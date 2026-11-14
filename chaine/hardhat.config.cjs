// Compilation et tests du contrat. evmVersion « london » : même jeu d'instructions que la genèse du réseau Besu (londonBlock 0).
require('@nomicfoundation/hardhat-ethers');
require('@nomicfoundation/hardhat-chai-matchers');
module.exports = {
  solidity: { version: '0.8.37', settings: { evmVersion: 'london', optimizer: { enabled: true, runs: 200 } } },
  networks: { hardhat: { hardfork: 'london', initialBaseFeePerGas: 0 } },
};
