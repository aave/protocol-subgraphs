import { ethereum, Address, log } from '@graphprotocol/graph-ts';
import { AaveOracle } from '../../generated/templates/UniswapExchange/AaveOracle';
import { getOrInitPriceOracle, getPriceOracleAsset } from '../helpers/initializers';
import { savePriceToHistory } from '../helpers/price-updates';

export function updateUniswapAssetPrice(event: ethereum.Event): void {
  let assetAddress = event.address;
  let priceOracle = getOrInitPriceOracle();
  let priceOracleAsset = getPriceOracleAsset(assetAddress.toHexString());
  let proxyPriceProvider = AaveOracle.bind(priceOracle.proxyPriceProvider as Address);

  let assetPriceCall = proxyPriceProvider.try_getAssetPrice(assetAddress);
  if (!assetPriceCall.reverted) {
    priceOracleAsset.priceInEth = assetPriceCall.value;
    priceOracleAsset.save();

    // save price to history
    savePriceToHistory(priceOracleAsset, event);
  } else {
    log.error('Error in getting price from uniswap price feed for asset: {}', [
      assetAddress.toHexString(),
    ]);
  }
}
