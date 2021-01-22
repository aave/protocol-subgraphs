const contractsInfo = require('../externals/protocol-v2/deployed-contracts.json');
const fs = require('fs').promises;
const path = require('path');

const contractList = [
  'AaveOracle',
  // 'ChainlinkUSDETHOracleI',
  // 'ChainlinkSourcesRegistry',
  'LendingPoolAddressesProviderRegistry',
  // 'ReserveLogic',
];

const getMigratorAddress = () => {
  const migratorAddress = {};
  contractList.forEach(contract => {
    console.log('contract:: ', contract);
    migratorAddress[contract] =
      contractsInfo[contract][process.env.NETWORK || 'buidlerevm_docker'].address;
  });
  return migratorAddress;
};

const updateDevConfig = async migratorAddress => {
  let devConfig;
  try {
    devConfig = require(`../config/${process.env.NETWORK}.json`);
    // do stuff
  } catch (ex) {
    devConfig = require(`../config/dev.json`);
  }
  const newConfig = { ...devConfig };
  contractList.forEach(contract => {
    newConfig[`${contract}Address`] = migratorAddress[contract];
  });
  const configStringified = JSON.stringify(newConfig);

  const configPath = `../config/${process.env.NETWORK || 'dev'}.json`;
  await fs.writeFile(path.join(__dirname, configPath), configStringified);
  return newConfig;
};

const migratorAddress = getMigratorAddress();
updateDevConfig(migratorAddress)
  .then(console.log)
  .catch(console.error);
