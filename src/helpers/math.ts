import { Address, BigInt, ethereum, log } from '@graphprotocol/graph-ts';
import { zeroBI } from '../utils/converters';

let RAY = BigInt.fromI32(10).pow(27);
let WAD_RAY_RATIO = BigInt.fromI32(10).pow(9);
let WAD = BigInt.fromI32(10).pow(18);
let halfRAY = RAY.div(BigInt.fromI32(2));
let SECONDS_PER_YEAR = BigInt.fromI32(31556952);

export function rayToWad(a: BigInt): BigInt {
  let halfRatio = WAD_RAY_RATIO.div(BigInt.fromI32(2));
  return halfRatio.plus(a).div(WAD_RAY_RATIO);
}

export function wadToRay(a: BigInt): BigInt {
  let result = a.times(WAD_RAY_RATIO);
  return result;
}

export function rayDiv(a: BigInt, b: BigInt): BigInt {
  let halfB = b.div(BigInt.fromI32(2));
  let result = a.times(RAY);
  result = result.plus(halfB);
  let division = result.div(b);
  return division;
}

export function rayMul(a: BigInt, b: BigInt): BigInt {
  let result = a.times(b);
  result = result.plus(halfRAY);
  let mult = result.div(RAY);
  return mult;
}

export function calculateCompoundedInterest(
  rate: BigInt,
  lastUpdatedTimestamp: BigInt,
  nowTimestamp: BigInt
): BigInt {
  let timeDiff = nowTimestamp.minus(lastUpdatedTimestamp);

  if (timeDiff.equals(zeroBI())) {
    return RAY;
  }

  let expMinusOne = timeDiff.minus(BigInt.fromI32(1));

  let expMinusTwo = timeDiff.gt(BigInt.fromI32(2)) ? timeDiff.minus(BigInt.fromI32(2)) : zeroBI();

  let ratePerSecond = rate.div(SECONDS_PER_YEAR);

  let basePowerTwo = rayMul(ratePerSecond, ratePerSecond);
  let basePowerThree = rayMul(basePowerTwo, ratePerSecond);

  let secondTerm = timeDiff
    .times(expMinusOne)
    .times(basePowerTwo)
    .div(BigInt.fromI32(2));
  let thirdTerm = timeDiff
    .times(expMinusOne)
    .times(expMinusTwo)
    .times(basePowerThree)
    .div(BigInt.fromI32(6));

  return RAY.plus(ratePerSecond.times(timeDiff))
    .plus(secondTerm)
    .plus(thirdTerm);
}

export function calculateLinearInterest(
  rate: BigInt,
  lastUpdatedTimestamp: BigInt,
  nowTimestamp: BigInt
): BigInt {
  let timeDifference = nowTimestamp.minus(lastUpdatedTimestamp);

  let timeDelta = rayDiv(wadToRay(timeDifference), wadToRay(SECONDS_PER_YEAR));

  return rayMul(rate, timeDelta);
}

export function calculateGrowth(
  amount: BigInt,
  rate: BigInt,
  lastUpdatedTimestamp: BigInt,
  nowTimestamp: BigInt
): BigInt {
  let growthRate = calculateLinearInterest(rate, lastUpdatedTimestamp, nowTimestamp);

  let growth = rayMul(wadToRay(amount), growthRate);

  return rayToWad(growth);
}
