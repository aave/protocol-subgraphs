import {
  Burn,
  Initialized as ATokenInitialized,
  Mint,
} from '../../../generated/templates/AToken/AToken';
import { Initialized as VTokenInitialized } from '../../../generated/templates/VariableDebtToken/VariableDebtToken';
import { Initialized as STokenInitialized } from '../../../generated/templates/StableDebtToken/StableDebtToken';
import { IncentivesControllerV2 } from '../../../generated/templates';

import { Address, log } from '@graphprotocol/graph-ts';
import { zeroAddress } from '../../utils/converters';
import {
  ContractToPoolMapping,
  IncentivesController,
  MapAssetPool,
} from '../../../generated/schema';
// export {
//   // handleATokenBurn,
//   // handleATokenMint,
//   handleATokenTransfer,
//   handleVariableTokenBurn,
//   handleVariableTokenMint,
//   handleStableTokenMint,
//   handleStableTokenBurn,
//   handleStableTokenBorrowAllowanceDelegated,
//   handleVariableTokenBorrowAllowanceDelegated,
// } from './tokenization-arbitrum';

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

  let iController = IncentivesController.load(incentivesController.toHexString());
  if (!iController) {
    iController = new IncentivesController(incentivesController.toHexString());
    iController.save();
    IncentivesControllerV2.create(incentivesController);
  }

  let poolAddressProvider = ContractToPoolMapping.load(pool.toHexString());
  // save asset pool mapping
  let mapAssetPool = new MapAssetPool(asset.toHexString());
  mapAssetPool.pool = poolAddressProvider.pool;
  mapAssetPool.underlyingAsset = underlyingAsset;
  mapAssetPool.save();
}

export function handleATokenBurn(event: Burn): void {
  log.error('Burn ---------------------------------', []);
  // tokenBurn(event, event.params.from, event.params.value, event.params.index);
}

export function handleATokenMint(event: Mint): void {
  log.error('Mint ---------------------------------', []);
  // tokenMint(event, event.params.from, event.params.value, event.params.index);
}

export function handleATokenInitialized(event: ATokenInitialized): void {
  log.error('asset: {}', [event.address.toHexString()]);
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
