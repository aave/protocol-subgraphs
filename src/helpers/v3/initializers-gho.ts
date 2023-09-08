import { Address } from '@graphprotocol/graph-ts';
import { Facilitator, GhoDiscount } from '../../../generated/schema';
import {
    GhoFlashMinter,
} from '../../../generated/schema';
import { GhoFlashMinter as GhoFlashMinterContract } from '../../../generated/GhoFlashMinter/GhoFlashMinter';
import {
    zeroAddress,
    zeroBI,
} from '../../utils/converters';
import { GhoDiscountRateStrategy } from '../../../generated/GhoVariableDebtToken/GhoDiscountRateStrategy';

export function getOrInitGhoFlashMinter(contractAddress: Address): GhoFlashMinter {
    const contractAddressHex = contractAddress.toHexString();
    let ghoFlashMinter = GhoFlashMinter.load(contractAddressHex);
    if (!ghoFlashMinter) {
        let flashMinterFacilitator = Facilitator.load(contractAddressHex);
        if (!flashMinterFacilitator) {
            flashMinterFacilitator = new Facilitator(contractAddressHex);
            flashMinterFacilitator.bucketCapacity = zeroBI();
            flashMinterFacilitator.bucketLevel = zeroBI();
            flashMinterFacilitator.label = '';
            flashMinterFacilitator.lifetimeFeesDistributedToTreasury = zeroBI();
            flashMinterFacilitator.save();
        }
        const ghoFlashMinterContract = GhoFlashMinterContract.bind(contractAddress);
        const maxFee = ghoFlashMinterContract.MAX_FEE();
        const fee = ghoFlashMinterContract.getFee();

        ghoFlashMinter = new GhoFlashMinter(contractAddressHex);
        ghoFlashMinter.fee = fee;
        ghoFlashMinter.maxFee = maxFee;
        ghoFlashMinter.facilitator = flashMinterFacilitator.id;
        ghoFlashMinter.save();
    }
    return ghoFlashMinter as GhoFlashMinter;
}

export function updateOrInitGhoDiscount(contractAddress: Address): GhoDiscount {
    let ghoDiscount = GhoDiscount.load('1');
    if (!ghoDiscount) {
        ghoDiscount = new GhoDiscount('1');
    }
    const discountStrategyContract = GhoDiscountRateStrategy.bind(contractAddress);
    ghoDiscount.discountToken = zeroAddress();
    const discountRate = discountStrategyContract.try_DISCOUNT_RATE();
    if (!discountRate.reverted) {
        ghoDiscount.discountRate = discountRate.value;
    } else {
        ghoDiscount.discountRate = zeroBI();
    }
    const ghoDiscountedPerDiscountToken = discountStrategyContract.try_GHO_DISCOUNTED_PER_DISCOUNT_TOKEN();
    if (!ghoDiscountedPerDiscountToken.reverted) {
        ghoDiscount.ghoDiscountedPerDiscountToken = ghoDiscountedPerDiscountToken.value;
    } else {
        ghoDiscount.ghoDiscountedPerDiscountToken = zeroBI();
    }
    const minDebtTokenBalance = discountStrategyContract.try_MIN_DEBT_TOKEN_BALANCE();
    if (!minDebtTokenBalance.reverted) {
        ghoDiscount.minDebtTokenBalance = minDebtTokenBalance.value;
    } else {
        ghoDiscount.minDebtTokenBalance = zeroBI();
    }
    const minDiscountTokenBalance = discountStrategyContract.try_MIN_DISCOUNT_TOKEN_BALANCE();
    if (!minDiscountTokenBalance.reverted) {
        ghoDiscount.minDiscountTokenBalance = minDiscountTokenBalance.value;
    } else {
        ghoDiscount.minDiscountTokenBalance = zeroBI();
    }
    ghoDiscount.save();
    return ghoDiscount;
}
