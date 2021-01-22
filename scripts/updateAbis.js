const fs = require('fs').promises;
const path = require('path');

const contractList = [
  'AaveOracle',
  'ChainlinkUSDETHOracleI',
  'AToken',
  'StableDebtToken',
  'VariableDebtToken',
  'GenericOracleI',
  'IUniswapExchange',
  'IExtendedPriceAggregator',
  'LendingPoolAddressesProviderRegistry',
  'LendingPoolAddressesProvider',
  'LendingPoolConfigurator',
  'IERC20Detailed',
  'IERC20DetailedBytes',
  'DefaultReserveInterestRateStrategy',
  'LendingPool',
  // 'ReserveLogic',
];
const updateAbis = async () => {
  contractList.forEach(contract => {
    const artifact = require(`../externals/protocol-v2/artifacts/${contract}.json`);
    const { abi } = artifact;

    const configStringified = JSON.stringify(abi);
    console.log('Getting ABI for contract: ', contract);
    const abiPath = `../abis/${contract}.json`;
    fs.writeFile(path.join(__dirname, abiPath), configStringified);
  });
};

const moveConstantAbis = async () => {
  const originPath = `../constant-abis`;
  const destinationPath = `../abis`;
  const files = await fs.readdir(path.join(__dirname, `${originPath}/`));

  const prom = files.map(file => {
    console.log('Moving constant abi: ', file);
    return fs.copyFile(
      path.join(__dirname, `${originPath}/${file}`),
      path.join(__dirname, `${destinationPath}/${file}`)
    );
  });
  await Promise.all(prom);
};

updateAbis()
  .then()
  .catch();
moveConstantAbis()
  .then()
  .catch();
