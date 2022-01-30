import { Bytes, Address, log } from '@graphprotocol/graph-ts';

import { FallbackOracleUpdated, AaveOracle } from '../../../generated/AaveOracle/AaveOracle';
import { GenericOracleI as FallbackPriceOracle } from '../../../generated/AaveOracle/GenericOracleI';

import { FallbackPriceOracle as FallbackPriceOracleContract } from '../../../generated/templates';
import { getOrInitPriceOracle, getPriceOracleAsset } from '../../helpers/initializers';
import { formatUsdEthChainlinkPrice, zeroAddress, zeroBI } from '../../utils/converters';
import { MOCK_USD_ADDRESS, ZERO_ADDRESS } from '../../utils/constants';
import { genericPriceUpdate, usdEthPriceUpdate } from '../../helpers/price-updates';

export function handleFallbackOracleUpdated(event: FallbackOracleUpdated): void {
  let priceOracle = getOrInitPriceOracle();

  priceOracle.fallbackPriceOracle = event.params.fallbackOracle;
  if (event.params.fallbackOracle.toHexString() != ZERO_ADDRESS) {
    FallbackPriceOracleContract.create(event.params.fallbackOracle);

    // update prices on assets which use fallback

    priceOracle.tokensWithFallback.forEach(token => {
      let priceOracleAsset = getPriceOracleAsset(token);
      if (
        priceOracleAsset.priceSource.equals(zeroAddress()) ||
        priceOracleAsset.isFallbackRequired
      ) {
        let proxyPriceProvider = AaveOracle.bind(event.address);
        let price = proxyPriceProvider.try_getAssetPrice(
          Bytes.fromHexString(priceOracleAsset.id) as Address
        );
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
    });

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
