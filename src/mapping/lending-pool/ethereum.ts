import { Swapped as SwappedRepay } from '../../../generated/UniswapRepayAdapter/UniswapRepayAdapter';
import { Swapped as SwappedLiquidity } from '../../../generated/UniswapLiquiditySwapAdapter/UniswapLiquiditySwapAdapter';
import { SwapHistory } from '../../../generated/schema';
import { getHistoryEntityId } from '../../utils/id-generation';
export {
  handleDeposit,
  handleWithdraw,
  handleBorrow,
  handlePaused,
  handleUnpaused,
  handleSwap,
  handleRebalanceStableBorrowRate,
  handleRepay,
  handleLiquidationCall,
  handleFlashLoan,
  handleReserveUsedAsCollateralEnabled,
  handleReserveUsedAsCollateralDisabled,
  handleReserveDataUpdated,
} from './lending-pool';

export function handleSwappedRepay(event: SwappedRepay): void {
  let swap = new SwapHistory(getHistoryEntityId(event));

  swap.fromAsset = event.params.fromAsset.toHexString();
  swap.toAsset = event.params.toAsset.toHexString();
  swap.fromAmount = event.params.fromAmount;
  swap.receivedAmount = event.params.receivedAmount;
  swap.swapType = 'REPAY';

  swap.save();
}

export function handleSwappedLiquidity(event: SwappedLiquidity): void {
  let swap = new SwapHistory(getHistoryEntityId(event));

  swap.fromAsset = event.params.fromAsset.toHexString();
  swap.toAsset = event.params.toAsset.toHexString();
  swap.fromAmount = event.params.fromAmount;
  swap.receivedAmount = event.params.receivedAmount;
  swap.swapType = 'LIQUIDITY';

  swap.save();
}
