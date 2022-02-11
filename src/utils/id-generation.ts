import { ethereum } from '@graphprotocol/graph-ts';
import { Address } from '@graphprotocol/graph-ts/index';

export enum EventTypeRef {
  NoType,
  Deposit,
  Borrow,
  Redeem,
  Repay,
  Swap,
  UsageAsCollateral,
  RebalanceStableBorrowRate,
  LiquidationCall,
  FlashLoan,
  OriginationFeeLiquidation,
  SwapAdapter,
}

export function getHistoryEntityId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + ':' + event.logIndex.toString();
}

export function getReserveId(underlyingAsset: Address, poolId: string): string {
  return underlyingAsset.toHexString() + poolId;
}

export function getUserReserveId(
  userAddress: Address,
  underlyingAssetAddress: Address,
  poolId: string
): string {
  return userAddress.toHexString() + underlyingAssetAddress.toHexString() + poolId;
}

export function getAtokenId(aTokenAddress: Address): string {
  return aTokenAddress.toHexString();
}
