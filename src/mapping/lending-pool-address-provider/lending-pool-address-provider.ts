import { BigInt, ethereum, Value, Address, log } from '@graphprotocol/graph-ts';

import {
  LendingPoolUpdated,
  ConfigurationAdminUpdated,
  LendingPoolConfiguratorUpdated,
  LendingPoolCollateralManagerUpdated,
  AddressSet,
  LendingRateOracleUpdated,
  PriceOracleUpdated,
  ProxyCreated,
  EmergencyAdminUpdated,
} from '../../../generated/templates/LendingPoolAddressesProvider/LendingPoolAddressesProvider';
import {
  LendingPool as LendingPoolContract,
  LendingPoolConfigurator as LendingPoolConfiguratorContract,
} from '../../../generated/templates';
import { createMapContractToPool, getOrInitPriceOracle } from '../../helpers/initializers';
import { Pool, PoolConfigurationHistoryItem } from '../../../generated/schema';
import { getHistoryEntityId } from '../../utils/id-generation';

let POOL_COMPONENTS = [
  'lendingPoolConfigurator',
  'lendingPoolConfiguratorImpl',
  'lendingPool',
  'lendingPoolImpl',
  'configurationAdmin',
  'proxyPriceProvider',
  'lendingRateOracle',
  'lendingPoolCollateralManager',
  'emergencyAdmin',
  'ethereumAddress',
] as string[];

function saveAddressProvider(lendingPool: Pool, timestamp: BigInt, event: ethereum.Event): void {
  lendingPool.lastUpdateTimestamp = timestamp.toI32();
  lendingPool.save();

  let configurationHistoryItem = new PoolConfigurationHistoryItem(getHistoryEntityId(event));
  for (let i = 0; i < POOL_COMPONENTS.length; i++) {
    let param = POOL_COMPONENTS[i];
    let value = lendingPool.get(param);
    if (!value) {
      return;
    }
    configurationHistoryItem.set(param, value as Value);
  }
  configurationHistoryItem.timestamp = timestamp.toI32();
  configurationHistoryItem.pool = lendingPool.id;
  configurationHistoryItem.save();
}

function genericAddressProviderUpdate(
  component: string,
  newAddress: Address,
  event: ethereum.Event,
  createMapContract: boolean = true
): void {
  if (!POOL_COMPONENTS.includes(component)) {
    throw new Error('wrong pool component name' + component);
  }
  let poolAddress = event.address.toHexString();
  let lendingPool = Pool.load(poolAddress);
  if (lendingPool == null) {
    log.error('pool {} is not registered!', [poolAddress]);
    throw new Error('pool' + poolAddress + 'is not registered!');
  }

  lendingPool.set(component, Value.fromAddress(newAddress));
  if (createMapContract) {
    createMapContractToPool(newAddress, lendingPool.id);
  }
  saveAddressProvider(lendingPool as Pool, event.block.timestamp, event);
}

export function handleProxyCreated(event: ProxyCreated): void {
  let newProxyAddress = event.params.newAddress;
  let contactId = event.params.id.toString();
  let poolComponent: string;

  if (contactId == 'LENDING_POOL_CONFIGURATOR') {
    poolComponent = 'lendingPoolConfigurator';
    LendingPoolConfiguratorContract.create(newProxyAddress);
  } else if (contactId == 'LENDING_POOL') {
    poolComponent = 'lendingPool';
    LendingPoolContract.create(newProxyAddress);
  } else {
    return;
  }

  genericAddressProviderUpdate(poolComponent, newProxyAddress, event);
}

// TODO: not completely sure that this should work, as id passed through event can not mach, and proxy? or impl?
export function handleAddressSet(event: AddressSet): void {
  let mappedId = '';
  if (event.params.id.toString() == 'LENDING_POOL') {
    mappedId = 'lendingPool';
  } else if (event.params.id.toString() == 'LENDING_POOL_CONFIGURATOR') {
    mappedId = 'lendingPoolConfigurator';
  } else if (event.params.id.toString() == 'POOL_ADMIN') {
    mappedId = 'configurationAdmin'; // is this the correct id?
  } else if (event.params.id.toString() == 'EMERGENCY_ADMIN') {
    mappedId = 'emergencyAdmin';
  } else if (event.params.id.toString() == 'COLLATERAL_MANAGER') {
    mappedId = 'lendingPoolCollateralManager';
  } else if (event.params.id.toString() == 'PRICE_ORACLE') {
    mappedId = 'proxyPriceProvider';
  } else if (event.params.id.toString() == 'LENDING_RATE_ORACLE') {
    mappedId = 'lendingRateOracle';
  }

  if (mappedId != '') {
    genericAddressProviderUpdate(mappedId, event.params.newAddress, event, false);
  } else {
    log.error('Address set: {} | Contract ID: {}', [
      event.params.newAddress.toHexString(),
      event.params.id.toString(),
    ]);
  }
}

export function handlePriceOracleUpdated(event: PriceOracleUpdated): void {
  genericAddressProviderUpdate('proxyPriceProvider', event.params.newAddress, event, false);

  // TODO: should be more general
  let priceOracle = getOrInitPriceOracle();
  //if (priceOracle.proxyPriceProvider.equals(zeroAddress())) {
  priceOracle.proxyPriceProvider = event.params.newAddress;
  priceOracle.save();
  //}
}

export function handleLendingRateOracleUpdated(event: LendingRateOracleUpdated): void {
  genericAddressProviderUpdate('lendingRateOracle', event.params.newAddress, event, false);
}

export function handleLendingPoolUpdated(event: LendingPoolUpdated): void {
  genericAddressProviderUpdate('lendingPoolImpl', event.params.newAddress, event, false);
}

export function handleConfigurationAdminUpdated(event: ConfigurationAdminUpdated): void {
  genericAddressProviderUpdate('configurationAdmin', event.params.newAddress, event, false);
}

export function handleLendingPoolConfiguratorUpdated(event: LendingPoolConfiguratorUpdated): void {
  genericAddressProviderUpdate(
    'lendingPoolConfiguratorImpl',
    event.params.newAddress,
    event,
    false
  );
}

export function handleLendingPoolCollateralManagerUpdated(
  event: LendingPoolCollateralManagerUpdated
): void {
  genericAddressProviderUpdate(
    'lendingPoolCollateralManager',
    event.params.newAddress,
    event,
    false
  );
}

export function handleEmergencyAdminUpdated(event: EmergencyAdminUpdated): void {
  genericAddressProviderUpdate('emergencyAdmin', event.params.newAddress, event, false);
}
