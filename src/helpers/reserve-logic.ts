import { BigDecimal, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Reserve } from '../../generated/schema';
import { zeroBD, zeroBI } from '../utils/converters';
import { calculateCompoundedInterest, calculateLinearInterest, rayMul } from './math';

export function getReserveNormalizedIncome(reserve: Reserve, event: ethereum.Event): BigInt {
  let timestamp = BigInt.fromI32(reserve.lastUpdateTimestamp);

  if (timestamp.equals(event.block.timestamp)) {
    //if the index was updated in the same block, no need to perform any calculation
    return reserve.liquidityIndex;
  }

  let cumulated = calculateLinearInterest(reserve.liquidityRate, timestamp, event.block.timestamp);
  let result = rayMul(cumulated, reserve.liquidityIndex);

  return result;
}

export function getReserveNormalizedVariableDebt(reserve: Reserve, event: ethereum.Event): BigInt {
  let timestamp = BigInt.fromI32(reserve.lastUpdateTimestamp);

  if (timestamp.equals(event.block.timestamp)) {
    //if the index was updated in the same block, no need to perform any calculation
    return reserve.variableBorrowIndex;
  }

  let cumulatedInterest = calculateCompoundedInterest(
    reserve.variableBorrowRate,
    timestamp,
    event.block.timestamp
  );
  return rayMul(cumulatedInterest, reserve.variableBorrowIndex);
}

export function calculateUtilizationRate(reserve: Reserve): BigDecimal {
  if (reserve.totalLiquidity.equals(zeroBI())) {
    return zeroBD();
  }
  return BigDecimal.fromString('1')
    .minus(reserve.availableLiquidity.toBigDecimal().div(reserve.totalLiquidity.toBigDecimal()))
    .truncate(8);
}
