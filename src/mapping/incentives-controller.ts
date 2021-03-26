import { log } from '@graphprotocol/graph-ts';
import {
  AaveIncentivesController,
  AssetConfigUpdated,
  RewardsAccrued,
} from '../../generated/AaveIncentivesController/AaveIncentivesController';
import { AToken } from '../../generated/AaveIncentivesController/AToken';
import { IERC20Detailed } from '../../generated/AaveIncentivesController/IERC20Detailed';
import { Reserve } from '../../generated/schema';

export function handleAssetConfigUpdated(event: AssetConfigUpdated): void {
  let emissionsPerSecond = event.params.emission;
  let asset = event.params.asset; // a / v / s token
  let incentivesController = event.address;

  // get pool and underlying asset
  // we use the atoken contract abi, as we only need the POOL accessor, so it will still work
  // for the vtokens and stokens
  let ATokenContract = AToken.bind(asset);
  let pool = ATokenContract.POOL();
  let underlying = ATokenContract.UNDERLYING_ASSET_ADDRESS();

  // get reserve
  let reserveId = underlying.toHexString() + pool.toHexString();
  let reserve = Reserve.load(reserveId);

  if (!reserve) {
    log.error('Error getting the pool. pool: {} | underlying: {}', [
      pool.toHexString(),
      underlying.toHexString(),
    ]);
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
}
