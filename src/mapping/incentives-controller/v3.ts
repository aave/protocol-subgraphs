import {
  AssetConfigUpdated,
  Accrued,
  RewardsClaimed,
  RewardOracleUpdated,
  RewardsController as RewardsControllerContract,
  EmissionManagerUpdated,
} from '../../../generated/RewardsController/RewardsController';
import {
  ClaimRewardsCall,
  RewardedAction,
  RewardFeedOracle,
  Reward,
  UserReward,
  RewardsController as RewardsControllerEntity,
} from '../../../generated/schema';
import { getOrInitUser } from '../../helpers/v3/initializers';
import { getHistoryEntityId } from '../../utils/id-generation';
import { IERC20Detailed } from '../../../generated/RewardsController/IERC20Detailed';

export function handleEmissionManagerUpdated(event: EmissionManagerUpdated): void {
  const rewardsController = event.address;
  let iController = RewardsControllerEntity.load(rewardsController.toHexString());
  if (!iController) {
    iController = new RewardsControllerEntity(rewardsController.toHexString());
    iController.save();
  }
}

export function handleAssetConfigUpdated(event: AssetConfigUpdated): void {
  let emissionsPerSecond = event.params.newEmission;
  let blockTimestamp = event.block.timestamp.toI32();
  let asset = event.params.asset; // a / v / s token
  let reward = event.params.reward;
  let distributionEnd = event.params.newDistributionEnd;
  let rewardsController = event.address;

  let iController = RewardsControllerEntity.load(rewardsController.toHexString());
  if (!iController) {
    iController = new RewardsControllerEntity(rewardsController.toHexString());
    iController.save();
  }

  //  update rewards configurations
  let rewardIncentiveId =
    rewardsController.toHexString() + ':' + asset.toHexString() + ':' + reward.toHexString();

  let rewardIncentive = Reward.load(rewardIncentiveId);
  if (!rewardIncentive) {
    rewardIncentive = new Reward(rewardIncentiveId);
    rewardIncentive.rewardToken = reward;
    rewardIncentive.asset = asset.toHexString();
    rewardIncentive.rewardsController = rewardsController.toHexString();

    let IERC20DetailedContract = IERC20Detailed.bind(reward);
    rewardIncentive.rewardTokenDecimals = IERC20DetailedContract.decimals();
    rewardIncentive.rewardTokenSymbol = IERC20DetailedContract.symbol();

    let iController = RewardsControllerContract.bind(rewardsController);
    rewardIncentive.precision = iController.getAssetDecimals(asset);

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

  rewardIncentive.index = event.params.assetIndex;
  rewardIncentive.distributionEnd = distributionEnd.toI32();
  rewardIncentive.emissionsPerSecond = emissionsPerSecond;
  rewardIncentive.updatedAt = blockTimestamp;
  rewardIncentive.save();
}

export function handleAccrued(event: Accrued): void {
  let userAddress = event.params.user;
  let amount = event.params.rewardsAccrued;
  let asset = event.params.asset;
  let reward = event.params.reward;
  let assetIndex = event.params.assetIndex;
  let userIndex = event.params.userIndex;
  let rewardsController = event.address;
  let blockTimestamp = event.block.timestamp.toI32();

  let user = getOrInitUser(userAddress);
  user.unclaimedRewards = user.unclaimedRewards.plus(amount);
  user.lifetimeRewards = user.lifetimeRewards.plus(amount);
  user.rewardsLastUpdated = event.block.timestamp.toI32();
  user.save();

  let rewardId =
    rewardsController.toHexString() + ':' + asset.toHexString() + ':' + reward.toHexString();
  let rewardIncentive = Reward.load(rewardId);
  if (rewardIncentive) {
    rewardIncentive.index = assetIndex;
    rewardIncentive.updatedAt = blockTimestamp;
    rewardIncentive.save();
  }

  let userRewardsId = rewardId + ':' + userAddress.toHexString();
  let userReward = UserReward.load(userRewardsId);
  if (!userReward) {
    userReward = new UserReward(userRewardsId);
    userReward.reward = rewardId;
    userReward.createdAt = blockTimestamp;
    userReward.user = userAddress.toHexString();
  }

  userReward.index = userIndex;
  userReward.updatedAt = blockTimestamp;
  userReward.save();

  let incentivizedAction = new RewardedAction(getHistoryEntityId(event));
  incentivizedAction.rewardsController = rewardsController.toHexString();
  incentivizedAction.user = userAddress.toHexString();
  incentivizedAction.amount = amount;
  incentivizedAction.save();
}

export function handleRewardsClaimed(event: RewardsClaimed): void {
  let caller = event.params.claimer;
  let onBehalfOf = event.params.user;
  let to = event.params.to;
  let amount = event.params.amount;

  let user = getOrInitUser(onBehalfOf);
  user.unclaimedRewards = user.unclaimedRewards.minus(amount);
  user.rewardsLastUpdated = event.block.timestamp.toI32();
  user.save();

  getOrInitUser(to);
  getOrInitUser(caller);

  let claimRewards = new ClaimRewardsCall(getHistoryEntityId(event));
  claimRewards.rewardsController = event.address.toHexString();
  claimRewards.user = onBehalfOf.toHexString();
  claimRewards.amount = amount;
  claimRewards.to = to.toHexString();
  claimRewards.caller = caller.toHexString();
  claimRewards.txHash = event.transaction.hash;
  claimRewards.action = 'ClaimRewardsCall';
  claimRewards.timestamp = event.block.timestamp.toI32();
  claimRewards.save();
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
