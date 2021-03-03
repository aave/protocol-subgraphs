import { Address, log, ByteArray, crypto } from '@graphprotocol/graph-ts';
import { getOrInitENS } from '../helpers/initializers';
import {
  AddrChanged,
  ChainlinkENSResolver,
} from '../../generated/ChainlinkENSResolver/ChainlinkENSResolver';

import { ENS, OracleSystemMigrated } from '../../generated/schema';

// Event that gets triggered when an address of chainlink gets triggered
export function handleAddressesChanged(event: AddrChanged): void {
  log.error('NODE: {} | A: {}', [event.params.node.toHexString(), event.params.a.toHexString()]);

  let ens = getOrInitENS(event.params.node.toHexString());
  // Check if we watching this ENS asset
  if (ens) {
    // Update with the new aggregated
    // Check if the contract is it a proxy and try to get the correct address asking for try_aggregator()
    // Bind the new aggregated by getting PriceOracleAsset
    // Save
  } // if the schema for ENS are not created ignore
}

// Event that will get triggered when new chainlink ens system gets activated
// if flag is activated means we need to stop listening to old events
// TODO: deprecate old events on this trigger
export function handleOracleSystemMigrated(event: any): void {
  // Update the value migrated
  let oracleSystem = new OracleSystemMigrated('1');
  oracleSystem.activated = true;
  oracleSystem.save();
}
