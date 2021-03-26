import { log } from '@graphprotocol/graph-ts';
import {
  AssetConfigUpdated,
  RewardsAccrued,
  RewardsClaimed,
} from '../../generated/AaveIncentivesController/AaveIncentivesController';
import { AToken } from '../../generated/AaveIncentivesController/AToken';
import {
  ClaimIncentiveCall,
  IncentivesController,
  IncentivizedAction,
  Reserve,
} from '../../generated/schema';
import { getOrInitUserIncentives } from '../helpers/initializers';

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
  let pool = iController.pool;

  // we use the atoken contract abi, as we only need the POOL accessor, so it will still work
  // for the vtokens and stokens
  let ATokenContract = AToken.bind(asset);
  let underlying = ATokenContract.UNDERLYING_ASSET_ADDRESS();

  // get reserve
  let reserveId = underlying.toHexString() + pool;
  let reserve = Reserve.load(reserveId);

  if (!reserve) {
    log.error('Error getting the reserve. pool: {} | underlying: {}', [
      pool,
      underlying.toHexString(),
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
  let user = event.params.user;
  let amount = event.params.amount;
  let incentivesController = event.address;

  let userIncentives = getOrInitUserIncentives(user, incentivesController);
  userIncentives.incentivesAccrued = userIncentives.incentivesAccrued.plus(amount);
  userIncentives.save();

  let incentivizedAction = new IncentivizedAction(event.transaction.hash.toHexString());
  incentivizedAction.incentivesController = incentivesController.toHexString();
  incentivizedAction.user = user.toHexString();
  incentivizedAction.amount = amount;
  incentivizedAction.save();
}

export function handleRewardsClaimed(event: RewardsClaimed): void {
  let user = event.params.user;
  let amount = event.params.amount;
  let incentivesController = event.address;

  let userIncentives = getOrInitUserIncentives(user, incentivesController);
  userIncentives.incentivesAccrued = userIncentives.incentivesAccrued.minus(amount);
  userIncentives.save();

  let claimIncentive = new ClaimIncentiveCall(event.transaction.hash.toHexString());
  claimIncentive.incentivesController = incentivesController.toHexString();
  claimIncentive.user = user.toHexString();
  claimIncentive.amount = amount;
  claimIncentive.save();
}
