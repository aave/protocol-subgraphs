import { log } from '@graphprotocol/graph-ts';
import {
  getChainlinkAggregator,
  getOrInitPriceOracle,
  getPriceOracleAsset,
} from '../helpers/initializers';
import { AddrChanged } from '../../generated/ChainlinkENSResolver/ChainlinkENSResolver';
import { ChainlinkAggregator as ChainlinkAggregatorContract } from '../../generated/templates';

import { ChainlinkENS } from '../../generated/schema';
import { IExtendedPriceAggregator } from '../../generated/ChainlinkENSResolver/IExtendedPriceAggregator';
import { formatUsdEthChainlinkPrice, zeroBI } from '../utils/converters';
import { genericPriceUpdate, usdEthPriceUpdate } from '../helpers/price-updates';
import { MOCK_USD_ADDRESS } from '../utils/constants';

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

      // update usd
      if (oracleAssetAddress.toHexString() == MOCK_USD_ADDRESS) {
        let priceOracle = getOrInitPriceOracle();
        priceOracle.usdPriceEthFallbackRequired = assetOracle.isFallbackRequired;
        priceOracle.usdPriceEthMainSource = priceSource;
        usdEthPriceUpdate(priceOracle, formatUsdEthChainlinkPrice(latestAnswerCall.value), event);
      }
    } else {
      log.error(`Latest answer call failed on aggregator:: {} | for node:: {}`, [
        priceSource.toHexString(),
        node,
      ]);
      return;
    }

    // start listening to events from new price source
    ChainlinkAggregatorContract.create(priceSource);

    // create chainlinkAggregator entity with new aggregator to be able to match asset and oracle after
    let chainlinkAggregator = getChainlinkAggregator(priceSource.toHexString());
    chainlinkAggregator.oracleAsset = oracleAssetAddress.toHexString();
    chainlinkAggregator.save();

    log.warning('ENS updated: {}', [node]);
  } // if the schema for ENS are not created ignore
  else {
    // log.error(`Ens not created`, []);
  }
}
