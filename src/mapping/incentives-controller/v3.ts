import {
  AssetConfigUpdated,
  AssetIndexUpdated,
  RewardsAccrued,
  RewardsClaimed,
  UserIndexUpdated,
  RewardOracleUpdated,
  IncentivesControllerV2,
} from '../../../generated/templates/RewardsController/RewardsController';
import {
  ClaimIncentiveCall,
  RewardsController,
  RewardedAction,
  MapAssetPool,
  Reserve,
  RewardFeedOracle,
  RewardIncentives,
  UserRewardIncentives,
} from '../../../generated/schema';
import { getOrInitUser } from '../../helpers/v3/initializers';
import { getHistoryEntityId, getReserveId } from '../../utils/id-generation';
import { IERC20Detailed } from '../../../generated/templates/RewardsController/IERC20Detailed';
import { zeroBI } from '../../utils/converters';
import { Address, log } from '@graphprotocol/graph-ts';

export function handleAssetConfigUpdated(event: AssetConfigUpdated): void {
  let emissionsPerSecond = event.params.emission;
  let blockTimestamp = event.block.timestamp.toI32();
  let asset = event.params.asset; // a / v / s token
  let reward = event.params.reward;
  let distributionEnd = event.params.distributionEnd;
  let incentivesController = event.address;

  //  update rewards configurations
  let rewardIncentiveId =
    incentivesController.toHexString() + ':' + asset.toHexString() + ':' + reward.toHexString();

  let rewardIncentive = RewardIncentives.load(rewardIncentiveId);
  if (!rewardIncentive) {
    rewardIncentive = new RewardIncentives(rewardIncentiveId);
    rewardIncentive.rewardToken = reward;
    rewardIncentive.index = zeroBI();
    rewardIncentive.asset = asset.toHexString();
    rewardIncentive.incentivesController = incentivesController.toHexString();

    let IERC20DetailedContract = IERC20Detailed.bind(reward);
    rewardIncentive.rewardTokenDecimals = IERC20DetailedContract.decimals();
    rewardIncentive.rewardTokenSymbol = IERC20DetailedContract.symbol();

    let iController = IncentivesControllerV2.bind(incentivesController);
    rewardIncentive.precision = iController.PRECISION();

    rewardIncentive.createdAt = blockTimestamp;

    // get oracle
    let oracle = RewardFeedOracle.load(reward.toHexString());
    if (!oracle) {
      let rewardOracle = iController.getRewardOracle(reward);
      oracle = new RewardFeedOracle(reward.toHexString());
      oracle.rewardFeedAddress = rewardOracle;
      oracle.createdAt = blockTimestamp;
      oracle.updatedAt = blockTimestamp;
    }

    rewardIncentive.rewardFeedOracle = oracle.id;
  }

  rewardIncentive.distributionEnd = distributionEnd.toI32();
  rewardIncentive.emissionsPerSecond = emissionsPerSecond;
  rewardIncentive.updatedAt = blockTimestamp;
  rewardIncentive.save();
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
  let user = getOrInitUser(event.params.user);
  user.unclaimedRewards = user.unclaimedRewards.minus(event.params.amount);
  user.incentivesLastUpdated = event.block.timestamp.toI32();
  user.save();

  let claimIncentive = new ClaimIncentiveCall(getHistoryEntityId(event));
  claimIncentive.incentivesController = event.address.toHexString();
  claimIncentive.user = event.params.user.toHexString();
  claimIncentive.amount = event.params.amount;
  claimIncentive.save();
}

export function handleAssetIndexUpdated(event: AssetIndexUpdated): void {
  let asset = event.params.asset;
  let index = event.params.index;
  let reward = event.params.reward;
  let blockTimestamp = event.block.timestamp.toI32();
  let incentivesController = event.address;

  let rewardIncentiveId =
    incentivesController.toHexString() + ':' + asset.toHexString() + ':' + reward.toHexString();

  let rewardIncentive = RewardIncentives.load(rewardIncentiveId);
  rewardIncentive.index = index;
  rewardIncentive.updatedAt = blockTimestamp;

  rewardIncentive.save();
}

export function handleUserIndexUpdated(event: UserIndexUpdated): void {
  let user = event.params.user;
  let asset = event.params.asset;
  let index = event.params.index;
  let reward = event.params.reward;
  let blockTimestamp = event.block.timestamp.toI32();
  let incentivesController = event.address;

  let rewardId =
    incentivesController.toHexString() + ':' + asset.toHexString() + ':' + reward.toHexString();
  let userRewardsId = rewardId + ':' + user.toHexString();

  let userReward = UserRewardIncentives.load(userRewardsId);
  if (!userReward) {
    userReward = new UserRewardIncentives(userRewardsId);
    userReward.reward = rewardId;
    userReward.createdAt = blockTimestamp;
    userReward.user = user.toHexString();
  }

  userReward.index = index;
  userReward.updatedAt = blockTimestamp;
  userReward.save();
}

export function handleRewardOracleUpdated(event: RewardOracleUpdated): void {
  let reward = event.params.reward;
  let oracle = event.params.rewardOracle;

  let blockTimestamp = event.block.timestamp.toI32();

  let rewardOracleId = reward.toHexString();

  let rewardOracle = RewardFeedOracle.load(rewardOracleId);
  if (!rewardOracle) {
    rewardOracle = new RewardFeedOracle(rewardOracleId);
    rewardOracle.createdAt = blockTimestamp;
  }
  rewardOracle.rewardFeedAddress = oracle;
  rewardOracle.updatedAt = blockTimestamp;

  rewardOracle.save();
}
