import {
  log,
  crypto,
  ens as graphENS,
  ethereum,
  Address,
  Bytes,
  ByteArray,
} from '@graphprotocol/graph-ts';
import { IERC20Detailed } from '../../generated/AaveOracle/IERC20Detailed';
import { AaveOracle } from '../../generated/OracleAnchor/AaveOracle';
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
  getOrInitReserve,
  getPriceOracleAsset,
} from '../helpers/initializers';
import { genericPriceUpdate, usdEthPriceUpdate } from '../helpers/price-updates';
import { MOCK_USD_ADDRESS } from '../utils/constants';
import {
  byteArrayFromHex,
  concat,
  formatUsdEthChainlinkPrice,
  getPriceOracleAssetType,
  namehash,
  PRICE_ORACLE_ASSET_TYPE_SIMPLE,
  zeroAddress,
  zeroBI,
} from '../utils/converters';

export function priceFeedUpdated(
  event: ethereum.Event,
  assetAddress: Address,
  assetOracleAddress: Address,
  priceOracleAsset: PriceOracleAsset,
  priceOracle: PriceOracle
): void {
  let sAssetAddress = assetAddress.toHexString();
  log.warning('-------------------------------------------------------------', []);
  // We get the current price from the oracle. Valid for chainlink source and custom oracle
  let proxyPriceProvider = AaveOracle.bind(
    Address.fromString(priceOracle.proxyPriceProvider.toHexString())
  );
  let priceFromOracle = zeroBI();
  let priceFromProxyCall = proxyPriceProvider.try_getAssetPrice(assetAddress);
  if (!priceFromProxyCall.reverted) {
    priceFromOracle = priceFromProxyCall.value;
  } else {
    log.error(`this asset has not been registered. || asset: {} | assetOracle: {}`, [
      sAssetAddress,
      assetOracleAddress.toHexString(),
    ]);
    return;
  }

  priceOracleAsset.isFallbackRequired = true;

  // if it's valid oracle address
  if (!assetOracleAddress.equals(zeroAddress())) {
    let priceAggregatorInstance = IExtendedPriceAggregator.bind(assetOracleAddress);

    // check is it composite or simple asset.
    // In case its chainlink source, this call will revert, and will not update priceOracleAsset type
    // so it will stay as simple, as it is the default type
    let tokenTypeCall = priceAggregatorInstance.try_getTokenType();
    if (!tokenTypeCall.reverted) {
      priceOracleAsset.type = getPriceOracleAssetType(tokenTypeCall.value);
    }

    // Type simple means that the source is chainlink source
    if (priceOracleAsset.type == PRICE_ORACLE_ASSET_TYPE_SIMPLE) {
      // get underlying aggregator from proxy (assetOracleAddress) address
      let chainlinkProxyInstance = EACAggregatorProxy.bind(assetOracleAddress);
      let aggregatorAddressCall = chainlinkProxyInstance.try_aggregator();
      // If we can't get the aggregator, it means that the source address is not a chainlink proxy
      // so it has been registered badly.
      if (aggregatorAddressCall.reverted) {
        log.error(`Simple Type must be a chainlink proxy. || asset: {} | assetOracleAddress: {}`, [
          sAssetAddress,
          assetOracleAddress.toHexString(),
        ]);
        return;
      }
      let aggregatorAddress = aggregatorAddressCall.value;
      log.warning('aggregator:::::: {}', [aggregatorAddress.toHexString()]);
      priceOracleAsset.priceSource = aggregatorAddress;
      // create ChainLink aggregator template entity
      // ChainlinkAggregatorContract.create(aggregatorAddress);

      // Register the aggregator address to the ens registry
      // we can get the reserve as aave oracle is in the contractToPoolMapping as proxyPriceProvider
      let symbol = 'dai';
      // if (
      //   assetAddress.toHexString().toLowerCase() == '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2'
      // ) {
      //   symbol = 'MKR';
      // } else {
      //   // we need to use the underlying, as the anchor address is not mapped to the lending pool
      //   let ERC20ATokenContract = IERC20Detailed.bind(assetAddress);
      //   symbol = ERC20ATokenContract.symbol().slice(1); // TODO: remove slice if we change
      // }

      let domain: Array<string> = ['aggregator', symbol + '-eth', 'data', 'eth'];
      // let node = crypto
      //   .keccak256(
      //     concat(
      //       concat(
      //         concat(
      //           crypto.keccak256(ByteArray.fromHexString(domain[0])),
      //           crypto.keccak256(ByteArray.fromHexString(domain[1]))
      //         ),
      //         crypto.keccak256(ByteArray.fromHexString(domain[2]))
      //       ),
      //       crypto.keccak256(ByteArray.fromHexString(domain[3]))
      //     )
      //   )
      //   .toHexString();
      // let ensDomain = 'aggregator.' + symbol.toLowerCase() + '-eth.data.eth';

      // Hash the ENS to generate the node and create the ENS register in the schema.
      let node = namehash(domain);
      // let node = crypto
      //   .keccak256(byteArrayFromHex('aggregator.' + symbol + '-eth.data.eth'))
      //   .toHexString();
      log.error(`node construction is ::: {}`, [node]);

      // Create the ENS or update
      let ens = getOrInitENS(node);
      ens.aggregatorAddress = aggregatorAddress;
      ens.underlyingAddress = assetAddress;
      ens.symbol = symbol;
      ens.save();

      // Need to check latestAnswer and not use priceFromOracle because priceFromOracle comes from the oracle
      // and the value could be from the fallback already. So we need to check if we can get latestAnswer from the
      // chainlink aggregator
      let priceAggregatorlatestAnswerCall = priceAggregatorInstance.try_latestAnswer();
      priceOracleAsset.isFallbackRequired =
        priceAggregatorlatestAnswerCall.reverted || priceAggregatorlatestAnswerCall.value.isZero();

      // create chainlinkAggregator entity with new aggregator to be able to match asset and oracle after
      let chainlinkAggregator = getChainlinkAggregator(aggregatorAddress.toHexString());
      chainlinkAggregator.oracleAsset = assetAddress.toHexString();
      chainlinkAggregator.save();
    } else {
      // composite assets don't need fallback, it will work out of the box
      priceOracleAsset.isFallbackRequired = false;
      priceOracleAsset.priceSource = assetOracleAddress;

      // call contract and check on which assets we're dependent
      let dependencies = priceAggregatorInstance.getSubTokens();
      // add asset to all dependencies
      for (let i = 0; i < dependencies.length; i += 1) {
        let dependencyAddress = dependencies[i].toHexString();
        if (dependencyAddress == MOCK_USD_ADDRESS) {
          let usdDependentAssets = priceOracle.usdDependentAssets;
          if (!usdDependentAssets.includes(sAssetAddress)) {
            usdDependentAssets.push(sAssetAddress);
            priceOracle.usdDependentAssets = usdDependentAssets;
          }
        } else {
          let dependencyOracleAsset = getPriceOracleAsset(dependencyAddress);
          let dependentAssets = dependencyOracleAsset.dependentAssets;
          if (!dependentAssets.includes(sAssetAddress)) {
            dependentAssets.push(sAssetAddress);
            dependencyOracleAsset.dependentAssets = dependentAssets;
            dependencyOracleAsset.save();
          }
        }
      }
    }

    if (sAssetAddress == MOCK_USD_ADDRESS) {
      priceOracle.usdPriceEthFallbackRequired = priceOracleAsset.isFallbackRequired;
      priceOracle.usdPriceEthMainSource = priceOracleAsset.priceSource;
      usdEthPriceUpdate(priceOracle, formatUsdEthChainlinkPrice(priceFromOracle), event);
    } else {
      // if chainlink was invalid before and valid now, remove from tokensWithFallback array
      if (
        !assetOracleAddress.equals(zeroAddress()) &&
        priceOracle.tokensWithFallback.includes(sAssetAddress) &&
        !priceOracleAsset.isFallbackRequired
      ) {
        priceOracle.tokensWithFallback = priceOracle.tokensWithFallback.filter(
          token => token != assetAddress.toHexString()
        );
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
