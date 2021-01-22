module.exports = {
  solc: {
    version: '0.6.8',
    optimizer: {enabled: true, runs: 200},
    evmVersion: 'istanbul',
  },
  defaultNetwork: 'buidlerevm',
  networks: {
    buidlerevm: {
      hardfork: 'istanbul',
      blockGasLimit: 12000000,
      gas: 12000000,
      gasPrice: 8000000000,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true
    }
  }
};

