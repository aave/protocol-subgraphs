import { ethereum, Value, Address, log } from '@graphprotocol/graph-ts';

import {
  ProxyCreated,
  PriceOracleUpdated,
  PoolUpdated,
  PoolConfiguratorUpdated,
  PoolDataProviderUpdated,
  AddressSet,
} from '../../../generated/templates/PoolAddressesProvider/PoolAddressesProvider';
import {
  Pool as PoolContract,
  PoolConfigurator as PoolConfiguratorContract,
} from '../../../generated/templates';
import { createMapContractToPool, getOrInitPriceOracle } from '../../helpers/v3/initializers';
import { ContractToPoolMapping, Pool } from '../../../generated/schema';

let POOL_COMPONENTS = [
  'poolDataProvider',
  'poolDataProviderImpl',
  'poolConfigurator',
  'poolConfiguratorImpl',
  'pool',
  'poolImpl',
  'proxyPriceProvider',
] as string[];

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
  let pool = Pool.load(poolAddress);
  if (pool == null) {
    log.error('pool {} is not registered!', [poolAddress]);
    throw new Error('pool' + poolAddress + 'is not registered!');
  }

  pool.set(component, Value.fromAddress(newAddress));
  if (createMapContract) {
    createMapContractToPool(newAddress, pool.id);
  }
  pool.lastUpdateTimestamp = event.block.timestamp.toI32();
  pool.save();
  if (component == 'poolConfigurator') {
    const configuratorMapping = ContractToPoolMapping.load(newAddress.toHexString());
    if (!configuratorMapping) {
      const mapping = new ContractToPoolMapping(newAddress.toHexString());
      mapping.pool = poolAddress;
      mapping.save();
    }
  }
}

export function handleProxyCreated(event: ProxyCreated): void {
  let newProxyAddress = event.params.proxyAddress;
  let contractId = event.params.id.toString();
  let poolComponent: string;

  if (contractId == 'POOL_CONFIGURATOR') {
    poolComponent = 'poolConfigurator';
    PoolConfiguratorContract.create(newProxyAddress);
  } else if (contractId == 'POOL') {
    poolComponent = 'pool';
    PoolContract.create(newProxyAddress);
  } else {
    return;
  }

  genericAddressProviderUpdate(poolComponent, newProxyAddress, event);
}

// TODO: not completely sure that this should work, as id passed through event can not mach, and proxy? or impl?
export function handleAddressSet(event: AddressSet): void {
  let mappedId = '';
  if (event.params.id.toString() == 'POOL') {
    mappedId = 'pool';
  } else if (event.params.id.toString() == 'POOL_CONFIGURATOR') {
    mappedId = 'poolConfigurator';
  } else if (event.params.id.toString() == 'POOL_ADMIN') {
    mappedId = 'configurationAdmin'; // is this the correct id?
  } else if (event.params.id.toString() == 'EMERGENCY_ADMIN') {
    mappedId = 'emergencyAdmin';
  } else if (event.params.id.toString() == 'COLLATERAL_MANAGER') {
    mappedId = 'poolCollateralManager';
  } else if (event.params.id.toString() == 'PRICE_ORACLE') {
    mappedId = 'proxyPriceProvider';
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

export function handlePoolUpdated(event: PoolUpdated): void {
  genericAddressProviderUpdate('poolImpl', event.params.newAddress, event, false);
}

export function handlePoolConfiguratorUpdated(event: PoolConfiguratorUpdated): void {
  genericAddressProviderUpdate('poolConfiguratorImpl', event.params.newAddress, event, false);
}

export function handlePoolDataProviderUpdated(event: PoolDataProviderUpdated): void {
  genericAddressProviderUpdate('poolDataProviderImpl', event.params.newAddress, event, false);
}
