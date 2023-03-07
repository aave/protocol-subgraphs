import { Facilitator, FacilitatorLevelUpdated, FacilitatorCapacityUpdated, FacilitatorTreasuryUpdated, FacilitatorTreasuryDistribution } from '../../../generated/schema';
import { FacilitatorAdded, FacilitatorBucketCapacityUpdated, FacilitatorBucketLevelUpdated, FacilitatorRemoved, GhoToken } from '../../../generated/GhoToken/GhoToken';
import { zeroBI } from '../../utils/converters';
import { Address, store } from '@graphprotocol/graph-ts'
import { getHistoryEntityId } from '../../utils/id-generation';
import { FeesDistributedToTreasury, GhoTreasuryUpdated } from '../../../generated/templates/GhoFacilitator/GhoAToken';
import { GhoFacilitator } from '../../../generated/templates';

export function handleFacilitatorAdded(event: FacilitatorAdded): void {
    let facilitatorAddress = event.params.facilitatorAddress;
    let facilitator = new Facilitator(facilitatorAddress.toHexString());
    GhoFacilitator.create(Address.fromString(facilitatorAddress.toHexString()));
    facilitator.bucketCapacity = event.params.bucketCapacity;
    facilitator.bucketLevel = zeroBI();
    let ghoTokenInstance = GhoToken.bind(Address.fromString("0xcbE9771eD31e761b744D3cB9eF78A1f32DD99211")); // Query facilitator info on GHO token contract
    let facilitatorInfo = ghoTokenInstance.getFacilitator(facilitatorAddress);
    facilitator.label = facilitatorInfo.label;
    facilitator.lifetimeFeesDistributedToTreasury = zeroBI();
    facilitator.save();
}

export function handleFacilitatorRemoved(event: FacilitatorRemoved): void {
    let facilitatorAddress = event.params.facilitatorAddress.toHexString();
    store.remove('Facilitator', facilitatorAddress);
}

export function handleFacilitatorBucketLevelUpdated(event: FacilitatorBucketLevelUpdated): void {
    let facilitatorAddress = event.params.facilitatorAddress.toHexString()
    let facilitator = Facilitator.load(facilitatorAddress);
    if (!facilitator) {
        throw new Error(`facilitator ${facilitatorAddress} not initialized`)
    } else {
        let updateId = facilitatorAddress + getHistoryEntityId(event)
        let bucketLevelUpdate = new FacilitatorLevelUpdated(updateId);
        bucketLevelUpdate.txHash = event.transaction.hash;
        bucketLevelUpdate.facilitator = facilitatorAddress;
        bucketLevelUpdate.oldBucketLevel = event.params.oldLevel;
        bucketLevelUpdate.newBucketLevel = event.params.newLevel;
        facilitator.bucketLevel = event.params.newLevel;
        facilitator.save();
        bucketLevelUpdate.save();
    }
}

export function handleFacilitatorBucketCapacityUpdated(event: FacilitatorBucketCapacityUpdated): void {
    let facilitatorAddress = event.params.facilitatorAddress.toHexString()
    let facilitator = Facilitator.load(facilitatorAddress);
    if (!facilitator) {
        throw new Error(`facilitator ${facilitatorAddress} not initialized`)
    } else {
        let updateId = facilitatorAddress + getHistoryEntityId(event)
        let bucketCapacityUpdate = new FacilitatorCapacityUpdated(updateId);
        bucketCapacityUpdate.txHash = event.transaction.hash;
        bucketCapacityUpdate.facilitator = facilitatorAddress;
        bucketCapacityUpdate.oldBucketCapacity = event.params.oldCapacity;
        bucketCapacityUpdate.newBucketCapacity = event.params.newCapacity;
        facilitator.bucketCapacity = event.params.newCapacity;
        facilitator.save();
        bucketCapacityUpdate.save();
    }
}

export function handleFeeDistributedToTreasury(event: FeesDistributedToTreasury): void {
    let facilitatorAddress = event.address.toHexString();
    let facilitator = Facilitator.load(facilitatorAddress);
    if (!facilitator) {
        throw new Error("Treasury updated before GHO AToken Facilitator initialized")
    }
    let historyId = facilitatorAddress + getHistoryEntityId(event);
    let treasuryDistribution = new FacilitatorTreasuryDistribution(historyId);
    treasuryDistribution.txHash = event.transaction.hash;
    treasuryDistribution.facilitator = facilitatorAddress;
    treasuryDistribution.treasury = event.params.ghoTreasury;
    treasuryDistribution.amount = event.params.amount;
    let newLifetimeDistribution = facilitator.lifetimeFeesDistributedToTreasury.plus(event.params.amount);
    facilitator.lifetimeFeesDistributedToTreasury = newLifetimeDistribution;
    facilitator.save();
    treasuryDistribution.newLifetimeFeesDistributedToTreasury = newLifetimeDistribution;
    treasuryDistribution.save();
}

export function handleGhoTreasuryUpdated(event: GhoTreasuryUpdated): void {
    let facilitatorAddress = event.address.toHexString()
    let facilitator = Facilitator.load(event.address.toHexString());
    if (!facilitator) {
        throw new Error("Treasury updated before GHO AToken Facilitator initialized")
    }
    let historyId = facilitatorAddress + getHistoryEntityId(event);
    let treasuryUpdate = new FacilitatorTreasuryUpdated(historyId);
    treasuryUpdate.txHash = event.transaction.hash;
    treasuryUpdate.facilitator = facilitatorAddress;
    treasuryUpdate.newTreasury = event.params.newGhoTreasury;
    treasuryUpdate.previousTreasury = event.params.oldGhoTreasury;
    treasuryUpdate.save();
}
