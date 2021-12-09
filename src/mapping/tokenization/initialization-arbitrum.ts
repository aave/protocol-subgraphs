import { Initialized as ATokenInitialized } from '../../../generated/templates/AToken/AToken';
import { Initialized as VTokenInitialized } from '../../../generated/templates/VariableDebtToken/VariableDebtToken';
import { Initialized as STokenInitialized } from '../../../generated/templates/StableDebtToken/StableDebtToken';
import { IncentivesControllerV2 } from '../../../generated/templates';

import { Address, log } from '@graphprotocol/graph-ts';
import { zeroAddress } from '../../utils/converters';
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
} from './tokenization-avalanche';

function createIncentivesController(
  asset: Address,
  incentivesController: Address,
  underlyingAsset: Address,
  pool: Address
): void {
  if (incentivesController == zeroAddress()) {
    log.warning('Incentives controller is 0x0 for asset: {} | underlyingasset: {} | pool: {}', [
      asset.toHexString(),
      underlyingAsset.toHexString(),
      pool.toHexString(),
    ]);
    return;
  }

  IncentivesControllerV2.create(incentivesController);
}

export function handleATokenInitialized(event: ATokenInitialized): void {
  // log.warning('Incentives controller is 0x0 for asset: {} | underlyingasset: {} | pool: {}', []);
  createIncentivesController(
    event.address,
    event.params.incentivesController,
    event.params.underlyingAsset,
    event.params.pool
  );
}

export function handleSTokenInitialized(event: STokenInitialized): void {
  createIncentivesController(
    event.address,
    event.params.incentivesController,
    event.params.underlyingAsset,
    event.params.pool
  );
}

export function handleVTokenInitialized(event: VTokenInitialized): void {
  createIncentivesController(
    event.address,
    event.params.incentivesController,
    event.params.underlyingAsset,
    event.params.pool
  );
}
