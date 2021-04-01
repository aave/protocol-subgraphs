import { Address, log } from '@graphprotocol/graph-ts';
import {
  AssetConfigUpdated,
  AssetIndexUpdated,
  RewardsAccrued,
  RewardsClaimed,
  UserIndexUpdated,
} from '../../generated/templates/AaveIncentivesController/AaveIncentivesController';
import {
  ClaimIncentiveCall,
  IncentivizedAction,
  MapAssetPool,
  Reserve,
  UserReserve,
} from '../../generated/schema';
import { getOrInitUser } from '../helpers/initializers';
import { getHistoryEntityId, getReserveId, getUserReserveId } from '../utils/id-generation';

export function handleAssetConfigUpdated(event: AssetConfigUpdated): void {
  let emissionsPerSecond = event.params.emission;
  let blockTimestamp = event.block.timestamp.toI32();
  let asset = event.params.asset; // a / v / s token

  let mapAssetPool = MapAssetPool.load(asset.toHexString());
  if (!mapAssetPool) {
    log.error('Mapping not initiated for asset: {}', [asset.toHexString()]);
    return;
  }
  let pool = mapAssetPool.pool;
  let underlyingAsset = mapAssetPool.underlyingAsset;

  // get reserve
  let reserveId = getReserveId(underlyingAsset as Address, pool.toHexString());
  let reserve = Reserve.load(reserveId);

  if (asset.toHexString() == reserve.aToken) {
    reserve.aEmissionPerSecond = emissionsPerSecond;
    reserve.aIncentivesLastUpdateTimestamp = blockTimestamp;
  } else if (asset.toHexString() == reserve.vToken) {
    reserve.vEmissionPerSecond = emissionsPerSecond;
    reserve.vIncentivesLastUpdateTimestamp = blockTimestamp;
  } else if (asset.toHexString() == reserve.sToken) {
    reserve.sEmissionPerSecond = emissionsPerSecond;
    reserve.sIncentivesLastUpdateTimestamp = blockTimestamp;
  }

  reserve.save();
}

export function handleRewardsAccrued(event: RewardsAccrued): void {
  let userAddress = event.params.user;
  let amount = event.params.amount;
  let incentivesController = event.address;

  let user = getOrInitUser(userAddress);
  user.unclaimedRewards = user.unclaimedRewards.plus(amount);
  user.lifetimeRewards = user.lifetimeRewards.plus(amount);
  user.incentivesLastUpdated = event.block.timestamp.toI32();
  user.save();

  let incentivizedAction = new IncentivizedAction(getHistoryEntityId(event));
  incentivizedAction.incentivesController = incentivesController.toHexString();
  incentivizedAction.user = userAddress.toHexString();
  incentivizedAction.amount = amount;
  incentivizedAction.save();
}

export function handleRewardsClaimed(event: RewardsClaimed): void {
  let userAddress = event.params.user;
  let amount = event.params.amount;
  let incentivesController = event.address;

  let user = getOrInitUser(userAddress);
  user.unclaimedRewards = user.unclaimedRewards.minus(amount);
  user.incentivesLastUpdated = event.block.timestamp.toI32();
  user.save();

  let claimIncentive = new ClaimIncentiveCall(getHistoryEntityId(event));
  claimIncentive.incentivesController = incentivesController.toHexString();
  claimIncentive.user = userAddress.toHexString();
  claimIncentive.amount = amount;
  claimIncentive.save();
}

export function handleAssetIndexUpdated(event: AssetIndexUpdated): void {
  let asset = event.params.asset;
  let index = event.params.index;
  let blockTimestamp = event.block.timestamp.toI32();

  let mapAssetPool = MapAssetPool.load(asset.toHexString());
  if (!mapAssetPool) {
    log.error('Mapping not initiated for asset: {}', [asset.toHexString()]);
    return;
  }
  let pool = mapAssetPool.pool;
  let underlyingAsset = mapAssetPool.underlyingAsset;
  // get reserve
  let reserveId = getReserveId(underlyingAsset as Address, pool.toHexString());
  let reserve = Reserve.load(reserveId);

  if (asset.toHexString() == reserve.aToken) {
    reserve.aTokenIncentivesIndex = index;
    reserve.aIncentivesLastUpdateTimestamp = blockTimestamp;
  } else if (asset.toHexString() == reserve.vToken) {
    reserve.vTokenIncentivesIndex = index;
    reserve.vIncentivesLastUpdateTimestamp = blockTimestamp;
  } else if (asset.toHexString() == reserve.sToken) {
    reserve.sTokenIncentivesIndex = index;
    reserve.sIncentivesLastUpdateTimestamp = blockTimestamp;
  }

  reserve.save();
}

export function handleUserIndexUpdated(event: UserIndexUpdated): void {
  let user = event.params.user;
  let asset = event.params.asset;
  let index = event.params.index;
  let blockTimestamp = event.block.timestamp.toI32();

  let mapAssetPool = MapAssetPool.load(asset.toHexString());
  if (!mapAssetPool) {
    log.error('Mapping not initiated for asset: {}', [asset.toHexString()]);
    return;
  }
  let pool = mapAssetPool.pool;
  let underlyingAsset = mapAssetPool.underlyingAsset;

  let reserveId = getReserveId(underlyingAsset as Address, pool.toHexString());
  let userReserveId = getUserReserveId(user, underlyingAsset as Address, pool.toHexString());
  let userReserve = UserReserve.load(userReserveId);

  let reserve = Reserve.load(reserveId);

  if (asset.toHexString() == reserve.aToken) {
    userReserve.aTokenincentivesUserIndex = index;
    userReserve.aIncentivesLastUpdateTimestamp = blockTimestamp;
  } else if (asset.toHexString() == reserve.vToken) {
    userReserve.aTokenincentivesUserIndex = index;
    userReserve.vIncentivesLastUpdateTimestamp = blockTimestamp;
  } else if (asset.toHexString() == reserve.sToken) {
    userReserve.aTokenincentivesUserIndex = index;
    userReserve.sIncentivesLastUpdateTimestamp = blockTimestamp;
  }

  userReserve.save();
}