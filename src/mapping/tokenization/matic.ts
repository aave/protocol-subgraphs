import { Initialized as ATokenInitialized } from '../../../generated/templates/AToken/AToken';
import { Initialized as VTokenInitialized } from '../../../generated/templates/VariableDebtToken/VariableDebtToken';
import { Initialized as STokenInitialized } from '../../../generated/templates/StableDebtToken/StableDebtToken';
import { AaveIncentivesController } from '../../../generated/templates';
import { IncentivesController } from '../../../generated/schema';
import { Address } from '@graphprotocol/graph-ts';
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

function createIncentivesController(incentivesController: Address): void {
  let iController = IncentivesController.load(incentivesController.toHexString());
  if (!iController) {
    // pool
    // underlyingasset
    // reserve

    AaveIncentivesController.create(incentivesController);
  }
}

export function handleATokenInitialized(event: ATokenInitialized): void {
  // create IncentivesController
  let incentivesController = event.params.incentivesController;

  // load entity
  createIncentivesController(incentivesController);
}

export function handleSTokenInitialized(event: STokenInitialized): void {}

export function handleVTokenInitialized(event: VTokenInitialized): void {}
