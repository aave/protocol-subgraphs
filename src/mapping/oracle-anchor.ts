import { log, ethereum, Address } from '@graphprotocol/graph-ts';
import { IERC20Detailed } from '../../generated/OracleAnchor/IERC20Detailed';
import { EACAggregatorProxy } from '../../generated/OracleAnchor/EACAggregatorProxy';
import { IExtendedPriceAggregator } from '../../generated/OracleAnchor/IExtendedPriceAggregator';
import {
  AssetSourceUpdated,
  OracleSystemMigrated,
} from '../../generated/OracleAnchor/OracleAnchor';
import { PriceOracle, PriceOracleAsset } from '../../generated/schema';
import {
  getChainlinkAggregator,
  getOrInitENS,
  getOrInitPriceOracle,
  getPriceOracleAsset,
} from '../helpers/initializers';
import { genericPriceUpdate, usdEthPriceUpdate } from '../helpers/price-updates';
import { MOCK_USD_ADDRESS } from '../utils/constants';
import {
  convertToLowerCase,
  formatUsdEthChainlinkPrice,
  generateSymbol,
  namehash,
  zeroAddress,
  zeroBI,
} from '../utils/converters';
import { ChainlinkAggregator as ChainlinkAggregatorContract } from '../../generated/templates';

// Only for chainlink proxy price provider
export function priceFeedUpdated(
  event: ethereum.Event,
  assetAddress: Address,
  assetOracleAddress: Address,
  priceOracleAsset: PriceOracleAsset,
  priceOracle: PriceOracle
): void {
  let sAssetAddress = assetAddress.toHexString();
  // We get the current price from the oracle. Valid for chainlink source and custom oracle

  // if it's valid oracle address
  if (!assetOracleAddress.equals(zeroAddress())) {
    // get underlying aggregator from proxy (assetOracleAddress) address
    let chainlinkProxyInstance = EACAggregatorProxy.bind(assetOracleAddress);
    let aggregatorAddressCall = chainlinkProxyInstance.try_aggregator();
    // If we can't get the aggregator, it means that the source address is not a chainlink proxy
    // so it has been registered badly.
    if (aggregatorAddressCall.reverted) {
      log.error(
        `ANCHOR: Simple Type must be a chainlink proxy. || asset: {} | assetOracleAddress: {}`,
        [sAssetAddress, assetOracleAddress.toHexString()]
      );
      return;
    }
    let aggregatorAddress = aggregatorAddressCall.value;
    priceOracleAsset.priceSource = aggregatorAddress;
    // create ChainLink aggregator template entity
    ChainlinkAggregatorContract.create(aggregatorAddress);

    // Register the aggregator address to the ens registry
    let symbol = '';
    let descriptionCall = chainlinkProxyInstance.try_description();
    if (descriptionCall.reverted) {
      log.warning('No description in proxy: {} for asset: {}', [
        assetOracleAddress.toHexString(),
        assetAddress.toHexString(),
      ]);
      return;
    }
    let description = descriptionCall.value;
    symbol = generateSymbol(description);
    log.warning(`description: {} || symbol: {}`, [description, symbol]);

    let domain: Array<string> = ['aggregator', symbol, 'data', 'eth'];

    // Hash the ENS to generate the node and create the ENS register in the schema.
    let node = namehash(domain);

    // Create the ENS or update
    let ens = getOrInitENS(node);
    ens.aggregatorAddress = aggregatorAddress;
    ens.underlyingAddress = assetAddress;
    ens.symbol = symbol;
    ens.save();

    // // Need to check latestAnswer and not use priceFromOracle because priceFromOracle comes from the oracle
    // // and the value could be from the fallback already. So we need to check if we can get latestAnswer from the
    // // chainlink aggregator

    let priceAggregatorInstance = IExtendedPriceAggregator.bind(assetOracleAddress);
    let priceAggregatorlatestAnswerCall = priceAggregatorInstance.try_latestAnswer();
    priceOracleAsset.isFallbackRequired =
      priceAggregatorlatestAnswerCall.reverted || priceAggregatorlatestAnswerCall.value.isZero();

    let priceFromOracle = priceAggregatorlatestAnswerCall.value || zeroBI();
    // create chainlinkAggregator entity with new aggregator to be able to match asset and oracle after
    let chainlinkAggregator = getChainlinkAggregator(aggregatorAddress.toHexString());
    chainlinkAggregator.oracleAsset = assetAddress.toHexString();
    chainlinkAggregator.save();

    if (sAssetAddress == MOCK_USD_ADDRESS) {
      priceOracle.usdPriceEthFallbackRequired = priceOracleAsset.isFallbackRequired;
      priceOracle.usdPriceEthMainSource = priceOracleAsset.priceSource;
      usdEthPriceUpdate(priceOracle, formatUsdEthChainlinkPrice(priceFromOracle), event);
      // this is so we also save the assetOracle for usd chainlink
      genericPriceUpdate(priceOracleAsset, priceFromOracle, event);
    } else {
      // if chainlink was invalid before and valid now, remove from tokensWithFallback array
      if (
        !assetOracleAddress.equals(zeroAddress()) &&
        priceOracle.tokensWithFallback.includes(sAssetAddress) &&
        !priceOracleAsset.isFallbackRequired
      ) {
        let tokensWithFallback: string[] = [];
        for (let i = 0; i < priceOracle.tokensWithFallback.length; i++) {
          if (priceOracle.tokensWithFallback[i] != sAssetAddress) {
            tokensWithFallback.push(priceOracle.tokensWithFallback[i]);
          }
        }
        priceOracle.tokensWithFallback = tokensWithFallback;
      }

      if (
        !priceOracle.tokensWithFallback.includes(sAssetAddress) &&
        (assetOracleAddress.equals(zeroAddress()) || priceOracleAsset.isFallbackRequired)
      ) {
        let updatedTokensWithFallback = priceOracle.tokensWithFallback;
        updatedTokensWithFallback.push(sAssetAddress);
        priceOracle.tokensWithFallback = updatedTokensWithFallback;
      }
      priceOracle.save();

      genericPriceUpdate(priceOracleAsset, priceFromOracle, event);
    }
  }
}

// Event that will get triggered when new chainlink ens system gets activated
// if flag is activated means we need to stop listening to old events
// TODO: deprecate old events on this trigger
export function handleOracleSystemMigrated(event: OracleSystemMigrated): void {
  let priceOracle = getOrInitPriceOracle();
  priceOracle.version = 2;
  priceOracle.save();
}

export function handleAssetSourceUpdatedAnchor(event: AssetSourceUpdated): void {
  let assetAddress = event.params.token;
  let sAssetAddress = assetAddress.toHexString();
  let assetOracleAddress = event.params.source;
  // because of the bug with wrong assets addresses submission
  if (sAssetAddress.split('0').length > 38) {
    log.warning('skipping wrong asset registration {}', [sAssetAddress]);
    return;
  }
  let priceOracle = getOrInitPriceOracle();
  if (priceOracle.proxyPriceProvider.equals(zeroAddress())) {
    log.error(`aave oracle should already have been deployed : {}`, [event.address.toHexString()]);
  }

  let priceOracleAsset = getPriceOracleAsset(assetAddress.toHexString());

  if (priceOracle.version > 1) {
    priceFeedUpdated(event, assetAddress, assetOracleAddress, priceOracleAsset, priceOracle);
  } else {
    log.error(`version should be 2`, []);
  }
}
