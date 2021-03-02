import { Address, log, ByteArray, crypto } from '@graphprotocol/graph-ts';
import { getOrInitENS } from '../helpers/initializers';
import {
  AddrChanged,
  ChainlinkENSResolver,
} from '../../generated/ChainlinkENSResolver/ChainlinkENSResolver';

import { ENS, OracleSystemMigrated } from '../../generated/schema';

export function handleAddressesChanged(event: AddrChanged): void {
  log.error('NODE: {} | A: {}', [event.params.node.toHexString(), event.params.a.toHexString()]);

  let ens = ENS.load(event.params.node.toHexString());
  // Check if we watching this ENS asset
  if (ens) {
    // Update with the new aggregated
    // Check if the contract is it a proxy and try to get the correct address asking for try_aggregator()
    // Bind the new aggregated
    // Save
    ens.save();
  } // if the schema for ENS are not created ignore
}

export function handleOracleSystemMigrated(event: any): void {
  // Update the value migrated
  let oracleSystem = new OracleSystemMigrated('1');
  oracleSystem.activated = true;
  oracleSystem.save();
}
