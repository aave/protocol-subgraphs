import { Bytes, ethereum } from '@graphprotocol/graph-ts';

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
  Supply,
  MintUnbacked,
  MintedToTreasury,
  BackUnbacked,
  UserEModeSet,
}

export function getHistoryId(
  event: ethereum.Event,
  type: EventTypeRef = EventTypeRef.NoType
): string {
  let postfix = type !== EventTypeRef.NoType ? ':' + type.toString() : '';
  return event.transaction.hash.toHexString() + postfix;
}

export function getHistoryEntityId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + ':' + event.logIndex.toString();
}

export function getReserveId(underlyingAsset: Bytes, poolId: string): string {
  return underlyingAsset.toHexString() + poolId;
}

export function getUserReserveId(
  userAddress: Bytes,
  underlyingAssetAddress: Bytes,
  poolId: string
): string {
  return userAddress.toHexString() + underlyingAssetAddress.toHexString() + poolId;
}

export function getAtokenId(aTokenAddress: Bytes): string {
  return aTokenAddress.toHexString();
}
