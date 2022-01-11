import { Address, log, ethereum, Bytes, BigInt } from '@graphprotocol/graph-ts';

import {
  AssetSourceUpdated,
  AaveOracle,
  BaseCurrencySet,
  FallbackOracleUpdated,
} from '../../../generated/AaveOracle/AaveOracle';
import { IExtendedPriceAggregator } from '../../../generated/AaveOracle/IExtendedPriceAggregator';

import {
  ChainlinkAggregator as ChainlinkAggregatorContract,
  FallbackPriceOracle as FallbackPriceOracleContract,
} from '../../../generated/templates';
import { GenericOracleI as FallbackPriceOracle } from '../../../generated/AaveOracle/GenericOracleI';
import {
  generateSymbol,
  namehash,
  PRICE_ORACLE_ASSET_PLATFORM_GELATO,
} from '../../utils/converters';
import {
  getChainlinkAggregator,
  getOrInitPriceOracle,
  getPriceOracleAsset,
  getOrInitENS,
} from '../../helpers/initializers';
import {
  formatUsdEthChainlinkPrice,
  getPriceOracleAssetPlatform,
  getPriceOracleAssetType,
  PRICE_ORACLE_ASSET_PLATFORM_BALANCER,
  PRICE_ORACLE_ASSET_PLATFORM_UNISWAP,
  PRICE_ORACLE_ASSET_TYPE_SIMPLE,
  zeroAddress,
  zeroBI,
} from '../../utils/converters';
import { MOCK_USD_ADDRESS, ZERO_ADDRESS } from '../../utils/constants';
import { genericPriceUpdate, usdEthPriceUpdate } from '../../helpers/price-updates';
import { PriceOracle, PriceOracleAsset } from '../../../generated/schema';
import { EACAggregatorProxy } from '../../../generated/AaveOracle/EACAggregatorProxy';

export function handleFallbackOracleUpdated(event: FallbackOracleUpdated): void {
  let priceOracle = getOrInitPriceOracle();

  priceOracle.fallbackPriceOracle = event.params.fallbackOracle;
  if (event.params.fallbackOracle.toHexString() != ZERO_ADDRESS) {
    FallbackPriceOracleContract.create(event.params.fallbackOracle);

    // update prices on assets which use fallback
    for (let i = 0; i < priceOracle.tokensWithFallback.length; i++) {
      // priceOracle.tokensWithFallback.forEach(token => {
      let priceOracleAsset = getPriceOracleAsset(priceOracle.tokensWithFallback[i]);
      if (
        priceOracleAsset.priceSource.equals(zeroAddress()) ||
        priceOracleAsset.isFallbackRequired
      ) {
        let proxyPriceProvider = AaveOracle.bind(event.address);
        let price = proxyPriceProvider.try_getAssetPrice(Address.fromString(priceOracleAsset.id));
        if (!price.reverted) {
          genericPriceUpdate(priceOracleAsset, price.value, event);
        } else {
          log.error(
            'OracleAssetId: {} | ProxyPriceProvider: {} | FallbackOracle: {} | EventAddress: {}',
            [
              priceOracleAsset.id,
              event.address.toHexString(),
              event.params.fallbackOracle.toHexString(),
              event.address.toHexString(),
            ]
          );
        }
      }
    }

    // update USDETH price
    let fallbackOracle = FallbackPriceOracle.bind(event.params.fallbackOracle);
    let ethUsdPrice = zeroBI();
    // try method for dev networks
    let ethUsdPriceCall = fallbackOracle.try_getEthUsdPrice();
    if (ethUsdPriceCall.reverted) {
      // try method for ropsten and mainnet
      let fallbackEthUsdPrice = fallbackOracle.try_getAssetPrice(
        Address.fromString(MOCK_USD_ADDRESS)
      );
      if (!fallbackEthUsdPrice.reverted) {
        ethUsdPrice = formatUsdEthChainlinkPrice(fallbackEthUsdPrice.value);
      } else {
        ethUsdPrice = BigInt.fromI32(100000000);
        log.error('Usd price not set for fallback {}', [event.params.fallbackOracle.toHexString()]);
      }
    } else {
      ethUsdPrice = ethUsdPriceCall.value;
    }
    if (
      priceOracle.usdPriceEthFallbackRequired ||
      priceOracle.usdPriceEthMainSource.equals(zeroAddress())
    ) {
      usdEthPriceUpdate(priceOracle, ethUsdPrice, event);
    }
  }
}

export function priceFeedUpdated(
  event: ethereum.Event,
  assetAddress: Address,
  assetOracleAddress: Address,
  priceOracleAsset: PriceOracleAsset,
  priceOracle: PriceOracle
): void {
  let sAssetAddress = assetAddress.toHexString();

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
        log.error(
          `PROXY: Simple Type must be a chainlink proxy. || asset: {} | assetOracleAddress: {}`,
          [sAssetAddress, assetOracleAddress.toHexString()]
        );
        return;
      }
      let aggregatorAddress = aggregatorAddressCall.value;
      priceOracleAsset.priceSource = aggregatorAddress;
      // create ChainLink aggregator template entity
      ChainlinkAggregatorContract.create(aggregatorAddress);

      // Register the aggregator address to the ens registry
      // Hash the ENS to generate the node and create the ENS register in the schema.
      let symbol = '';

      // let aggregatorInstance = AccessControlledAggregator.bind(aggregatorAddress);
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

      // check platform
      let platformIdCall = priceAggregatorInstance.try_getPlatformId();
      if (!platformIdCall.reverted) {
        let platformId = getPriceOracleAssetPlatform(platformIdCall.value);
        if (platformId == PRICE_ORACLE_ASSET_PLATFORM_UNISWAP) {
          // UniswapExchange.create(assetAddress);
        } else if (platformId == PRICE_ORACLE_ASSET_PLATFORM_BALANCER) {
          // BalancerPool.create(assetAddress);
        } else if (platformId == PRICE_ORACLE_ASSET_PLATFORM_GELATO) {
          // GelatoPool.create(assetAddress)
        } else {
          log.error('Platform not supported: {}', [platformIdCall.value.toString()]);
        }
      } else {
        log.error('Platform id method reverted for asset: {} || and source: {}', [
          sAssetAddress,
          assetOracleAddress.toHexString(),
        ]);
      }
    }
  }

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
      // priceOracle.tokensWithFallback = priceOracle.tokensWithFallback.filter(
      //   token => token != assetAddress.toHexString()
      // );

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

function chainLinkAggregatorUpdated(
  event: ethereum.Event,
  assetAddress: Address,
  assetOracleAddress: Address,
  priceOracleAsset: PriceOracleAsset,
  priceOracle: PriceOracle
): void {
  let sAssetAddress = assetAddress.toHexString();

  let proxyPriceProvider = AaveOracle.bind(
    Address.fromString(priceOracle.proxyPriceProvider.toHexString())
  );

  //needed because of one wrong handleAssetSourceUpdated event deployed on the mainnet
  let priceFromProxy = zeroBI();

  let priceFromProxyCall = proxyPriceProvider.try_getAssetPrice(assetAddress);

  if (!priceFromProxyCall.reverted) {
    priceFromProxy = priceFromProxyCall.value;
  }

  priceOracleAsset.isFallbackRequired = true;

  // if it's valid oracle address
  if (!assetOracleAddress.equals(zeroAddress())) {
    let priceAggregatorInstance = IExtendedPriceAggregator.bind(assetOracleAddress);

    // // check is it composite or simple asset
    let tokenTypeCall = priceAggregatorInstance.try_getTokenType();
    if (!tokenTypeCall.reverted) {
      priceOracleAsset.type = getPriceOracleAssetType(tokenTypeCall.value);
    }

    if (priceOracleAsset.type == PRICE_ORACLE_ASSET_TYPE_SIMPLE) {
      // create ChainLink aggregator template entity
      ChainlinkAggregatorContract.create(assetOracleAddress);

      // fallback is not required if oracle works fine
      let priceAggregatorlatestAnswerCall = priceAggregatorInstance.try_latestAnswer();
      priceOracleAsset.isFallbackRequired =
        priceAggregatorlatestAnswerCall.reverted || priceAggregatorlatestAnswerCall.value.isZero();
    } else {
      // composite assets don't need fallback, it will work out of the box
      priceOracleAsset.isFallbackRequired = false;

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

      // check platform
      let platformIdCall = priceAggregatorInstance.try_getPlatformId();
      if (!platformIdCall.reverted) {
        let platformId = getPriceOracleAssetPlatform(platformIdCall.value);
        if (platformId == PRICE_ORACLE_ASSET_PLATFORM_UNISWAP) {
          // UniswapExchange.create(assetAddress);
        } else if (platformId == PRICE_ORACLE_ASSET_PLATFORM_BALANCER) {
          // BalancerPool.create(assetAddress);
        } else if (platformId == PRICE_ORACLE_ASSET_PLATFORM_GELATO) {
          // GelatoPool.create(assetAddress)
        } else {
          log.error('Platform not supported: {}', [platformIdCall.value.toString()]);
        }
      } else {
        log.error('Platform id method reverted for asset: {} || and source: {}', [
          sAssetAddress,
          assetOracleAddress.toHexString(),
        ]);
      }
    }

    // add entity to be able to match asset and oracle after
    let chainlinkAggregator = getChainlinkAggregator(assetOracleAddress.toHexString());
    chainlinkAggregator.oracleAsset = sAssetAddress;
    chainlinkAggregator.save();
  }
  // set price aggregator address
  priceOracleAsset.priceSource = assetOracleAddress;

  if (sAssetAddress == MOCK_USD_ADDRESS) {
    priceOracle.usdPriceEthFallbackRequired = priceOracleAsset.isFallbackRequired;
    priceOracle.usdPriceEthMainSource = assetOracleAddress;
    usdEthPriceUpdate(priceOracle, formatUsdEthChainlinkPrice(priceFromProxy), event);
  } else {
    // TODO: remove old one ChainLink aggregator template entity if it exists, and it's not fallback oracle
    // if chainlink was invalid before and valid now, remove from tokensWithFallback array
    if (
      !assetOracleAddress.equals(zeroAddress()) &&
      priceOracle.tokensWithFallback.includes(sAssetAddress) &&
      !priceOracleAsset.isFallbackRequired
    ) {
      // priceOracle.tokensWithFallback = priceOracle.tokensWithFallback.filter(
      //   token => token != sAssetAddress
      // );

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

    genericPriceUpdate(priceOracleAsset, priceFromProxy, event);
  }
}

export function handleAssetSourceUpdated(event: AssetSourceUpdated): void {
  let assetAddress = event.params.asset;
  let sAssetAddress = assetAddress.toHexString();
  let assetOracleAddress = event.params.source;
  // because of the bug with wrong assets addresses submission
  if (sAssetAddress.split('0').length > 38) {
    log.warning('skipping wrong asset registration {}', [sAssetAddress]);
    return;
  }
  let priceOracle = getOrInitPriceOracle();
  if (priceOracle.proxyPriceProvider.equals(zeroAddress())) {
    priceOracle.proxyPriceProvider = event.address;
  }

  let priceOracleAsset = getPriceOracleAsset(assetAddress.toHexString());

  if (priceOracle.version > 1) {
    priceFeedUpdated(event, assetAddress, assetOracleAddress, priceOracleAsset, priceOracle);
  } else {
    if (!priceOracleAsset.fromChainlinkSourcesRegistry) {
      chainLinkAggregatorUpdated(
        event,
        assetAddress,
        assetOracleAddress,
        priceOracleAsset,
        priceOracle
      );
    }
  }
}

export function handleBaseCurrencySet(event: BaseCurrencySet): void {
  let priceOracle = getOrInitPriceOracle();

  priceOracle.baseCurrency = event.params.baseCurrency;
  priceOracle.baseCurrencyUnit = event.params.baseCurrencyUnit;

  priceOracle.save();
}
