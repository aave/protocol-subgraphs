import { log } from '@graphprotocol/graph-ts';
import {
  AssetConfigUpdated,
  AssetIndexUpdated,
  RewardsAccrued,
  RewardsClaimed,
  UserIndexUpdated,
} from '../../generated/AaveIncentivesController/AaveIncentivesController';
import {
  ClaimIncentiveCall,
  IncentivesController,
  IncentivizedAction,
  MapAssetPool,
  Reserve,
  UserReserve,
} from '../../generated/schema';
import { getOrInitUser } from '../helpers/initializers';

export function handleAssetConfigUpdated(event: AssetConfigUpdated): void {
  let emissionsPerSecond = event.params.emission;
  let asset = event.params.asset; // a / v / s token
  let incentivesController = event.address;

  let iController = IncentivesController.load(incentivesController.toHexString());
  if (!iController) {
    log.error(
      'Incentives Controller not initialized. incentives controller: {} | asset: {} | emission: {}',
      [incentivesController.toHexString(), asset.toHexString(), emissionsPerSecond.toString()]
    );
    return;
  }
  let mapAssetPool = MapAssetPool.load(asset.toHexString());
  if (!mapAssetPool) {
    log.error('Mapping not initiated for asset: {}', [asset.toHexString()]);
    return;
  }
  let pool = mapAssetPool.pool;
  let underlyingAsset = mapAssetPool.underlyingAsset;

  // get reserve
  let reserveId = underlyingAsset.toHexString() + pool.toHexString();
  let reserve = Reserve.load(reserveId);

  if (!reserve) {
    log.error('Error getting the reserve. pool: {} | underlying: {}', [
      pool.toHexString(),
      underlyingAsset.toHexString(),
    ]);
    return;
  }

  if (asset.toHexString() == reserve.aToken) {
    reserve.aEmissionPerSecond = emissionsPerSecond;
  } else if (asset.toHexString() == reserve.vToken) {
    reserve.vEmissionPerSecond = emissionsPerSecond;
  } else if (asset.toHexString() == reserve.sToken) {
    reserve.sEmissionPerSecond = emissionsPerSecond;
  }

  reserve.save();
}

export function handleRewardsAccrued(event: RewardsAccrued): void {
  let userAddress = event.params.user;
  let amount = event.params.amount;
  let incentivesController = event.address;

  let user = getOrInitUser(userAddress);
  user.incentivesRewardsAccrued = user.incentivesRewardsAccrued.plus(amount);
  user.incentivesLastUpdated = event.block.timestamp.toI32();

  let incentivizedAction = new IncentivizedAction(event.transaction.hash.toHexString());
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
  user.incentivesRewardsAccrued = user.incentivesRewardsAccrued.minus(amount);
  user.incentivesLastUpdated = event.block.timestamp.toI32();

  let claimIncentive = new ClaimIncentiveCall(event.transaction.hash.toHexString());
  claimIncentive.incentivesController = incentivesController.toHexString();
  claimIncentive.user = userAddress.toHexString();
  claimIncentive.amount = amount;
  claimIncentive.save();
}

export function handleAssetIndexUpdated(event: AssetIndexUpdated): void {
  let asset = event.params.asset;
  let index = event.params.index;
  let incentiveAssetIndexLastUpdated = event.block.timestamp.toI32();

  let mapAssetPool = MapAssetPool.load(asset.toHexString());
  if (!mapAssetPool) {
    log.error('Mapping not initiated for asset: {}', [asset.toHexString()]);
    return;
  }
  let pool = mapAssetPool.pool;
  let underlyingAsset = mapAssetPool.underlyingAsset;
  // get reserve
  let reserveId = underlyingAsset.toHexString() + pool.toHexString();
  let reserve = Reserve.load(reserveId);

  if (!reserve) {
    log.error('Error getting the reserve. pool: {} | underlying: {}', [
      pool.toHexString(),
      underlyingAsset.toHexString(),
    ]);
    return;
  }
  reserve.incentiveAssetIndex = index;
  reserve.incentiveAssetIndexLastUpdated = incentiveAssetIndexLastUpdated;
  reserve.save();
}

export function handleUserIndexUpdated(event: UserIndexUpdated): void {
  let user = event.params.user;
  let asset = event.params.asset;
  let index = event.params.index;
  let incentivesUserIndexLastUpdated = event.block.timestamp.toI32();

  let mapAssetPool = MapAssetPool.load(asset.toHexString());
  if (!mapAssetPool) {
    log.error('Mapping not initiated for asset: {}', [asset.toHexString()]);
    return;
  }
  let pool = mapAssetPool.pool;
  let underlyingAsset = mapAssetPool.underlyingAsset;

  let reserveId = underlyingAsset.toHexString() + pool.toHexString();
  let userReserveId = user.toHexString() + reserveId;
  let userReserve = UserReserve.load(userReserveId);
  userReserve.incentivesUserIndex = index;
  userReserve.incentivesUserIndexLastUpdated = incentivesUserIndexLastUpdated;
  userReserve.save();
}
