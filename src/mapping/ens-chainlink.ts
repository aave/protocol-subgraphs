import { log } from '@graphprotocol/graph-ts';
import { getChainlinkAggregator, getPriceOracleAsset } from '../helpers/initializers';
import { AddrChanged } from '../../generated/ChainlinkENSResolver/ChainlinkENSResolver';
import { ChainlinkAggregator as ChainlinkAggregatorContract } from '../../generated/templates';

import { ChainlinkENS, OracleSystemMigrated } from '../../generated/schema';
import { IExtendedPriceAggregator } from '../../generated/ChainlinkENSResolver/IExtendedPriceAggregator';
import { zeroBI } from '../utils/converters';
import { genericPriceUpdate } from '../helpers/price-updates';

// Event that gets triggered when an aggregator of chainlink change gets triggered
// updates the ens entity with new aggregator address
// updates price on priceOracleAsset of underlying
// creates aggregator listener for latestAnswer event on new aggregator
export function handleAddressesChanged(event: AddrChanged): void {
  let priceSource = event.params.a;
  let node = event.params.node.toHexString();

  let ens = ChainlinkENS.load(node);
  // Check if we watching this ENS asset
  if (ens) {
    ens.aggregatorAddress = priceSource;
    ens.save();

    let oracleAssetAddress = ens.underlyingAddress;
    let assetOracle = getPriceOracleAsset(oracleAssetAddress.toHexString());
    assetOracle.priceSource = priceSource;

    // update the price from latestAnswer of new aggregator
    let priceAggregatorInstance = IExtendedPriceAggregator.bind(priceSource);
    let latestAnswerCall = priceAggregatorInstance.try_latestAnswer();
    if (!latestAnswerCall.reverted && latestAnswerCall.value.gt(zeroBI())) {
      genericPriceUpdate(assetOracle, latestAnswerCall.value, event);
    } else {
      log.error(`Latest answer call failed on aggregator:: {} | for node:: {}`, [
        priceSource.toHexString(),
        node,
      ]);
      // TODO: Do I need to add fallback here?
      assetOracle.isFallbackRequired = true;
      assetOracle.lastUpdateTimestamp = event.block.timestamp;
      assetOracle.save();
    }

    // start listening to events from new price source
    ChainlinkAggregatorContract.create(priceSource);

    // create chainlinkAggregator entity with new aggregator to be able to match asset and oracle after
    let chainlinkAggregator = getChainlinkAggregator(priceSource.toHexString());
    chainlinkAggregator.oracleAsset = oracleAssetAddress.toHexString();
    chainlinkAggregator.save();
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
