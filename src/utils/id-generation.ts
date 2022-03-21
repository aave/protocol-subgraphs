import { Bytes, ethereum } from '@graphprotocol/graph-ts';

export function getHistoryEntityId(event: ethereum.Event): string {
  return (
    event.block.number.toString() +
    ':' +
    event.transaction.index.toString() +
    ':' +
    event.transaction.hash.toHexString() +
    ':' +
    event.logIndex.toString() +
    ':' +
    event.transactionLogIndex.toString()
  );
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
