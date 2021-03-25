import { Initialized as ATokenInitialized } from '../../../generated/templates/AToken/AToken';
import { Initialized as VTokenInitialized } from '../../../generated/templates/VariableDebtToken/VariableDebtToken';
import { Initialized as STokenInitialized } from '../../../generated/templates/StableDebtToken/StableDebtToken';
import { AaveIncentivesController } from '../../../generated/templates';
export {
  handleATokenBurn,
  handleATokenMint,
  handleATokenTransfer,
  handleVariableTokenBurn,
  handleVariableTokenMint,
  handleStableTokenMint,
  handleStableTokenBurn,
  handleStableTokenBorrowAllowanceDelegated,
  handleVariableTokenBorrowAllowanceDelegated,
} from './tokenization';

export function handleATokenInitialized(event: ATokenInitialized): void {
  // create IncentivesController
  let incentivesController = event.params.incentivesController;
  AaveIncentivesController.create(incentivesController);
}

export function handleSTokenInitialized(event: STokenInitialized): void {}

export function handleVTokenInitialized(event: VTokenInitialized): void {}
