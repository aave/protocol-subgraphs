import { RewardsClaimed1 } from '../../../generated/templates/AaveIncentivesController/AaveIncentivesController';
import { handleRewardsClaimedCommon } from './incentives-controller';
export {
  handleAssetConfigUpdated,
  handleRewardsAccrued,
  handleAssetIndexUpdated,
  handleUserIndexUpdated,
  handleRewardsClaimed,
  handleDistributionEndUpdated,
} from './incentives-controller';

// This event has the claimer field.
// We use RewardsClaimed1 because on maitc we also have the first version of the event without the claimer
// the codegen generates RewardsClaimed1 because we have the original event with the same name.
export function handleRewardsClaimedClaimer(event: RewardsClaimed1): void {
  handleRewardsClaimedCommon(event.params.user, event.address, event.params.amount, event);
}
