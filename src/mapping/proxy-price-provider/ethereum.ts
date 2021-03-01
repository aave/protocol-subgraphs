import { WETHReserve } from '../../../generated/schema';
import { WethSet } from '../../../generated/AaveOracle/AaveOracle';
export * from './proxy-price-provider';

export function handleWethSet(event: WethSet): void {
  let wethAddress = event.params.weth;
  let weth = WETHReserve.load('weth');
  if (weth == null) {
    weth = new WETHReserve('weth');
  }
  weth.address = wethAddress;
  weth.name = 'Wrapped Ethereum';
  weth.symbol = 'WETH';
  weth.decimals = 18;
  weth.updatedTimestamp = event.block.timestamp.toI32();
  weth.updatedBlockNumber = event.block.number;
  weth.save();
}
