import { Initialized as ATokenInitialized } from '../../../generated/templates/AToken/AToken';
import { Initialized as VTokenInitialized } from '../../../generated/templates/VariableDebtToken/VariableDebtToken';
import { Initialized as STokenInitialized } from '../../../generated/templates/StableDebtToken/StableDebtToken';

import { Address, log } from '@graphprotocol/graph-ts';
import { ContractToPoolMapping, MapAssetPool } from '../../../generated/schema';
export {
  handleATokenBurn,
  handleATokenMint,
  handleBalanceTransfer,
  handleVariableTokenBurn,
  handleVariableTokenMint,
  handleStableTokenMint,
  handleStableTokenBurn,
  handleStableTokenBorrowAllowanceDelegated,
  handleVariableTokenBorrowAllowanceDelegated,
} from './tokenization-v3';

function initializeToken(asset: Address, underlyingAsset: Address, pool: Address): void {
  let poolAddressProvider = ContractToPoolMapping.load(pool.toHexString());
  if (poolAddressProvider != null) {
    // save asset pool mapping
    let mapAssetPool = new MapAssetPool(asset.toHexString());
    mapAssetPool.pool = poolAddressProvider.pool;
    mapAssetPool.underlyingAsset = underlyingAsset;
    mapAssetPool.save();
  }
}

// export function handleATokenBurn(event: Burn): void {
//   log.error('Burn ---------------------------------', []);
//   // tokenBurn(event, event.params.from, event.params.value, event.params.index);
// }

// export function handleATokenMint(event: Mint): void {
//   log.error('Mint ---------------------------------', []);
//   // tokenMint(event, event.params.from, event.params.value, event.params.index);
// }

export function handleATokenInitialized(event: ATokenInitialized): void {
  log.error('asset: {}', [event.address.toHexString()]);
  initializeToken(event.address, event.params.underlyingAsset, event.params.pool);
}

export function handleSTokenInitialized(event: STokenInitialized): void {
  initializeToken(event.address, event.params.underlyingAsset, event.params.pool);
}

export function handleVTokenInitialized(event: VTokenInitialized): void {
  initializeToken(event.address, event.params.underlyingAsset, event.params.pool);
}
