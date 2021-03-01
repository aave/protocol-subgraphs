import { WETHReserve } from '../../../generated/schema';
import { WethSet } from '../../../generated/AaveOracle/AaveOracle';
export {
  handleFallbackOracleUpdated,
  handleAssetSourceUpdated,
  handleChainlinkAggregatorUpdated,
} from './proxy-price-provider';

export function handleWethSet(event: WethSet): void {
  let wethAddress = event.params.weth;
  let weth = WETHReserve.load('weth');
  if (weth == null) {
    weth = new WETHReserve('weth');
  }
  weth.address = wethAddress;
  weth.name = 'Wrapped Matic';
  weth.symbol = 'WMATIC';
  weth.decimals = 18;
  weth.updatedTimestamp = event.block.timestamp.toI32();
  weth.updatedBlockNumber = event.block.number;
  weth.save();
}
