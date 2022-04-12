import { Address } from '@graphprotocol/graph-ts';
import { Pool } from '../../../generated/schema';
import { LendingPoolAddressesProvider } from '../../../generated/templates';
import {
  AddressesProviderRegistered,
  AddressesProviderUnregistered,
} from '../../../generated/LendingPoolAddressesProviderRegistry/LendingPoolAddressesProviderRegistry';
import { getProtocol } from '../../helpers/initializers';

export function handleAddressesProviderRegistered(event: AddressesProviderRegistered): void {
  let protocol = getProtocol();
  let address = event.params.newAddress.toHexString();
  if (Pool.load(address) == null) {
    let pool = new Pool(address);
    pool.protocol = protocol.id;
    pool.active = true;
    pool.paused = false;
    pool.lastUpdateTimestamp = event.block.timestamp.toI32();
    pool.save();

    LendingPoolAddressesProvider.create(Address.fromString(address));
  }
}

export function handleAddressesProviderUnregistered(event: AddressesProviderUnregistered): void {
  let address = event.params.newAddress.toHexString();
  let pool = Pool.load(address);
  if (pool != null) {
    pool.active = false;
    pool.save();
  }
}
