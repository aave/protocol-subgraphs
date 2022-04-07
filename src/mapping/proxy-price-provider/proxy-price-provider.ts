import { Bytes, Address, log } from '@graphprotocol/graph-ts';

import {
  FallbackOracleUpdated,
  AaveOracle,
  WethSet,
} from '../../../generated/AaveOracle/AaveOracle';
import { GenericOracleI as FallbackPriceOracle } from '../../../generated/AaveOracle/GenericOracleI';

import { FallbackPriceOracle as FallbackPriceOracleContract } from '../../../generated/templates';
import { getOrInitPriceOracle, getPriceOracleAsset } from '../../helpers/initializers';
import {
  exponentToBigInt,
  formatUsdEthChainlinkPrice,
  zeroAddress,
  zeroBI,
} from '../../utils/converters';
import { MOCK_USD_ADDRESS, ZERO_ADDRESS } from '../../utils/constants';
import { genericPriceUpdate, usdEthPriceUpdate } from '../../helpers/price-updates';
import { WETHReserve } from '../../../generated/schema';

export function handleWethSet(event: WethSet): void {
  let wethAddress = event.params.weth;
  let weth = WETHReserve.load('weth');
  if (weth == null) {
    weth = new WETHReserve('weth');
  }
  weth.address = wethAddress;
  weth.name = 'Wrapped Ether';
  weth.symbol = 'WETH';
  weth.decimals = 18;
  weth.updatedTimestamp = event.block.timestamp.toI32();
  weth.updatedBlockNumber = event.block.number;
  weth.save();

  let oracleAsset = getPriceOracleAsset(wethAddress.toHexString());
  oracleAsset.priceInEth = exponentToBigInt(18);
  oracleAsset.lastUpdateTimestamp = event.block.timestamp.toI32();
  oracleAsset.save();
}

export function handleFallbackOracleUpdated(event: FallbackOracleUpdated): void {
  let priceOracle = getOrInitPriceOracle();

  priceOracle.fallbackPriceOracle = event.params.fallbackOracle;
  if (event.params.fallbackOracle.toHexString() != ZERO_ADDRESS) {
    FallbackPriceOracleContract.create(event.params.fallbackOracle);

    // update prices on assets which use fallback

    let proxyPriceProvider = AaveOracle.bind(event.address);
    for (let i = 0; i < priceOracle.tokensWithFallback.length; i++) {
      let token = priceOracle.tokensWithFallback[i];
      let priceOracleAsset = getPriceOracleAsset(token);
      if (
        priceOracleAsset.priceSource.equals(zeroAddress()) ||
        priceOracleAsset.isFallbackRequired
      ) {
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
      ethUsdPrice = formatUsdEthChainlinkPrice(
        fallbackOracle.getAssetPrice(Address.fromString(MOCK_USD_ADDRESS))
      );
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
