import { BigDecimal, BigInt } from '@graphprotocol/graph-ts';
import {
  BORROW_MODE_STABLE,
  BORROW_MODE_VARIABLE,
  getBorrowRateMode,
} from '../../utils/converters';
import {
  Borrow,
  Deposit,
  FlashLoan,
  LiquidationCall,
  RebalanceStableBorrowRate,
  Paused,
  Unpaused,
  Withdraw,
  Repay,
  ReserveUsedAsCollateralDisabled,
  ReserveUsedAsCollateralEnabled,
  Swap,
  ReserveDataUpdated,
} from '../../../generated/templates/LendingPool/LendingPool';
import {
  getOrInitReferrer,
  getOrInitReserve,
  getOrInitUser,
  getOrInitUserReserve,
  getPoolByContract,
  getPriceOracleAsset,
} from '../../helpers/initializers';
import {
  Borrow as BorrowAction,
  Deposit as DepositAction,
  FlashLoan as FlashLoanAction,
  LiquidationCall as LiquidationCallAction,
  Pool,
  PriceOracle,
  RebalanceStableBorrowRate as RebalanceStableBorrowRateAction,
  RedeemUnderlying as RedeemUnderlyingAction,
  Repay as RepayAction,
  Swap as SwapAction,
  UsageAsCollateral as UsageAsCollateralAction,
} from '../../../generated/schema';
import { getHistoryEntityId } from '../../utils/id-generation';
import { calculateGrowth } from '../../helpers/math';
import { ETH_PRECISION, USD_PRECISION } from '../../utils/constants';

export function handleDeposit(event: Deposit): void {
  let caller = event.params.user;
  let user = event.params.onBehalfOf;
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  let userReserve = getOrInitUserReserve(user, event.params.reserve, event);
  let depositedAmount = event.params.amount;

  let deposit = new DepositAction(getHistoryEntityId(event));
  deposit.txHash = event.transaction.hash;
  deposit.action = 'Deposit';
  deposit.pool = poolReserve.pool;
  deposit.user = userReserve.user;
  deposit.caller = getOrInitUser(caller).id;
  deposit.userReserve = userReserve.id;
  deposit.reserve = poolReserve.id;
  deposit.amount = depositedAmount;
  deposit.timestamp = event.block.timestamp.toI32();
  let priceOracleAsset = getPriceOracleAsset(poolReserve.price);
  let usdPriceEth = PriceOracle.load('1');
  if (usdPriceEth && usdPriceEth.usdPriceEth.toString() != '0') {
    const ethPriceUSD = BigDecimal.fromString('1').div(
      usdPriceEth.usdPriceEth.divDecimal(ETH_PRECISION)
    );
    deposit.assetPriceUSD = priceOracleAsset.priceInEth
      .divDecimal(ETH_PRECISION)
      .times(ethPriceUSD);
  } else {
    deposit.assetPriceUSD = priceOracleAsset.priceInEth.divDecimal(USD_PRECISION);
  }
  if (event.params.referral) {
    let referrer = getOrInitReferrer(event.params.referral);
    deposit.referrer = referrer.id;
  }
  deposit.save();
}

export function handleWithdraw(event: Withdraw): void {
  let toUser = getOrInitUser(event.params.to);
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
  let redeemedAmount = event.params.amount;

  let redeemUnderlying = new RedeemUnderlyingAction(getHistoryEntityId(event));
  redeemUnderlying.txHash = event.transaction.hash;
  redeemUnderlying.action = 'RedeemUnderlying';
  redeemUnderlying.pool = poolReserve.pool;
  redeemUnderlying.user = userReserve.user;
  redeemUnderlying.to = toUser.id;
  redeemUnderlying.userReserve = userReserve.id;
  redeemUnderlying.reserve = poolReserve.id;
  redeemUnderlying.amount = redeemedAmount;
  redeemUnderlying.timestamp = event.block.timestamp.toI32();
  let priceOracleAsset = getPriceOracleAsset(poolReserve.price);
  let usdPriceEth = PriceOracle.load('1');
  if (usdPriceEth && usdPriceEth.usdPriceEth.toString() != '0') {
    const ethPriceUSD = BigDecimal.fromString('1').div(
      usdPriceEth.usdPriceEth.divDecimal(ETH_PRECISION)
    );
    redeemUnderlying.assetPriceUSD = priceOracleAsset.priceInEth
      .divDecimal(ETH_PRECISION)
      .times(ethPriceUSD);
  } else {
    redeemUnderlying.assetPriceUSD = priceOracleAsset.priceInEth.divDecimal(USD_PRECISION);
  }
  redeemUnderlying.save();
}

export function handleBorrow(event: Borrow): void {
  let caller = event.params.user;
  let user = event.params.onBehalfOf;
  let userReserve = getOrInitUserReserve(user, event.params.reserve, event);
  let poolReserve = getOrInitReserve(event.params.reserve, event);

  let borrow = new BorrowAction(getHistoryEntityId(event));
  borrow.txHash = event.transaction.hash;
  borrow.action = 'Borrow';
  borrow.pool = poolReserve.pool;
  borrow.user = userReserve.user;
  borrow.caller = getOrInitUser(caller).id;
  borrow.userReserve = userReserve.id;
  borrow.reserve = poolReserve.id;
  borrow.amount = event.params.amount;
  borrow.stableTokenDebt = userReserve.principalStableDebt;
  borrow.variableTokenDebt = userReserve.scaledVariableDebt;
  borrow.borrowRate = event.params.borrowRate;
  borrow.borrowRateMode = getBorrowRateMode(event.params.borrowRateMode);
  borrow.timestamp = event.block.timestamp.toI32();
  if (event.params.referral) {
    let referrer = getOrInitReferrer(event.params.referral);
    borrow.referrer = referrer.id;
  }
  let priceOracleAsset = getPriceOracleAsset(poolReserve.price);
  let usdPriceEth = PriceOracle.load('1');
  if (usdPriceEth && usdPriceEth.usdPriceEth.toString() != '0') {
    const ethPriceUSD = BigDecimal.fromString('1').div(
      usdPriceEth.usdPriceEth.divDecimal(ETH_PRECISION)
    );
    borrow.assetPriceUSD = priceOracleAsset.priceInEth.divDecimal(ETH_PRECISION).times(ethPriceUSD);
  } else {
    borrow.assetPriceUSD = priceOracleAsset.priceInEth.divDecimal(USD_PRECISION);
  }
  borrow.save();
}

export function handlePaused(event: Paused): void {
  let poolId = getPoolByContract(event);
  let lendingPool = Pool.load(poolId);
  if (lendingPool) {
    lendingPool.paused = true;
    lendingPool.save();
  }
}

export function handleUnpaused(event: Unpaused): void {
  let poolId = getPoolByContract(event);
  let lendingPool = Pool.load(poolId);

  if (lendingPool) {
    lendingPool.paused = false;
    lendingPool.save();
  }
}

export function handleSwap(event: Swap): void {
  let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
  let poolReserve = getOrInitReserve(event.params.reserve, event);

  let swapHistoryItem = new SwapAction(getHistoryEntityId(event));
  swapHistoryItem.txHash = event.transaction.hash;
  swapHistoryItem.action = 'Swap';
  swapHistoryItem.pool = poolReserve.pool;
  swapHistoryItem.borrowRateModeFrom = getBorrowRateMode(event.params.rateMode);
  if (swapHistoryItem.borrowRateModeFrom === BORROW_MODE_STABLE) {
    swapHistoryItem.borrowRateModeTo = BORROW_MODE_VARIABLE;
  } else {
    swapHistoryItem.borrowRateModeTo = BORROW_MODE_STABLE;
  }

  swapHistoryItem.variableBorrowRate = poolReserve.variableBorrowRate;
  swapHistoryItem.stableBorrowRate = poolReserve.stableBorrowRate;
  swapHistoryItem.user = userReserve.user;
  swapHistoryItem.userReserve = userReserve.id;
  swapHistoryItem.reserve = poolReserve.id;
  swapHistoryItem.timestamp = event.block.timestamp.toI32();
  swapHistoryItem.save();
}

export function handleRebalanceStableBorrowRate(event: RebalanceStableBorrowRate): void {
  let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
  let poolReserve = getOrInitReserve(event.params.reserve, event);

  let rebalance = new RebalanceStableBorrowRateAction(getHistoryEntityId(event));
  rebalance.txHash = event.transaction.hash;
  rebalance.action = 'RebalanceStableBorrowRate';
  rebalance.userReserve = userReserve.id;
  rebalance.borrowRateFrom = userReserve.oldStableBorrowRate;
  rebalance.borrowRateTo = userReserve.stableBorrowRate;
  rebalance.pool = poolReserve.pool;
  rebalance.reserve = poolReserve.id;
  rebalance.user = event.params.user.toHexString();
  rebalance.timestamp = event.block.timestamp.toI32();
  rebalance.save();
}

export function handleRepay(event: Repay): void {
  let repayer = getOrInitUser(event.params.repayer);
  let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
  let poolReserve = getOrInitReserve(event.params.reserve, event);

  poolReserve.save();

  let repay = new RepayAction(getHistoryEntityId(event));
  repay.txHash = event.transaction.hash;
  repay.action = 'Repay';
  repay.pool = poolReserve.pool;
  repay.user = userReserve.user;
  repay.repayer = repayer.id;
  repay.userReserve = userReserve.id;
  repay.reserve = poolReserve.id;
  repay.amount = event.params.amount;
  repay.timestamp = event.block.timestamp.toI32();
  let priceOracleAsset = getPriceOracleAsset(poolReserve.price);
  let usdPriceEth = PriceOracle.load('1');
  if (usdPriceEth && usdPriceEth.usdPriceEth.toString() != '0') {
    const ethPriceUSD = BigDecimal.fromString('1').div(
      usdPriceEth.usdPriceEth.divDecimal(ETH_PRECISION)
    );
    repay.assetPriceUSD = priceOracleAsset.priceInEth.divDecimal(ETH_PRECISION).times(ethPriceUSD);
  } else {
    repay.assetPriceUSD = priceOracleAsset.priceInEth.divDecimal(USD_PRECISION);
  }
  repay.save();
}

export function handleLiquidationCall(event: LiquidationCall): void {
  let user = getOrInitUser(event.params.user);

  let collateralPoolReserve = getOrInitReserve(event.params.collateralAsset, event);
  let collateralUserReserve = getOrInitUserReserve(
    event.params.user,
    event.params.collateralAsset,
    event
  );
  let liquidatedCollateralAmount = event.params.liquidatedCollateralAmount;

  collateralPoolReserve.lifetimeLiquidated = collateralPoolReserve.lifetimeLiquidated.plus(
    liquidatedCollateralAmount
  );

  collateralPoolReserve.save();

  let principalUserReserve = getOrInitUserReserve(event.params.user, event.params.debtAsset, event);
  let principalPoolReserve = getOrInitReserve(event.params.debtAsset, event);

  principalPoolReserve.save();

  let liquidationCall = new LiquidationCallAction(getHistoryEntityId(event));
  liquidationCall.txHash = event.transaction.hash;
  liquidationCall.action = 'LiquidationCall';
  liquidationCall.pool = collateralPoolReserve.pool;
  liquidationCall.user = user.id;
  liquidationCall.collateralReserve = collateralPoolReserve.id;
  liquidationCall.collateralUserReserve = collateralUserReserve.id;
  liquidationCall.collateralAmount = liquidatedCollateralAmount;
  liquidationCall.principalReserve = principalPoolReserve.id;
  liquidationCall.principalUserReserve = principalUserReserve.id;
  liquidationCall.principalAmount = event.params.debtToCover;
  liquidationCall.liquidator = event.params.liquidator;
  liquidationCall.timestamp = event.block.timestamp.toI32();
  let usdPriceEth = PriceOracle.load('1');
  let collateralPriceOracleAsset = getPriceOracleAsset(collateralPoolReserve.price);
  let borrowPriceOracleAsset = getPriceOracleAsset(principalPoolReserve.price);
  if (usdPriceEth && usdPriceEth.usdPriceEth.toString() != '0') {
    const ethPriceUSD = BigDecimal.fromString('1').div(
      usdPriceEth.usdPriceEth.divDecimal(ETH_PRECISION)
    );
    liquidationCall.collateralAssetPriceUSD = collateralPriceOracleAsset.priceInEth
      .divDecimal(ETH_PRECISION)
      .times(ethPriceUSD);
    liquidationCall.borrowAssetPriceUSD = borrowPriceOracleAsset.priceInEth
      .divDecimal(ETH_PRECISION)
      .times(ethPriceUSD);
  } else {
    liquidationCall.collateralAssetPriceUSD = collateralPriceOracleAsset.priceInEth.divDecimal(
      USD_PRECISION
    );
    liquidationCall.borrowAssetPriceUSD = borrowPriceOracleAsset.priceInEth.divDecimal(
      USD_PRECISION
    );
  }
  liquidationCall.save();
}

export function handleFlashLoan(event: FlashLoan): void {
  let initiator = getOrInitUser(event.params.initiator);
  let poolReserve = getOrInitReserve(event.params.asset, event);

  let premium = event.params.premium;

  poolReserve.availableLiquidity = poolReserve.availableLiquidity.plus(premium);

  poolReserve.lifetimeFlashLoans = poolReserve.lifetimeFlashLoans.plus(event.params.amount);
  poolReserve.lifetimeFlashLoanPremium = poolReserve.lifetimeFlashLoanPremium.plus(premium);
  poolReserve.totalATokenSupply = poolReserve.totalATokenSupply.plus(premium);

  poolReserve.save();

  let flashLoan = new FlashLoanAction(getHistoryEntityId(event));
  flashLoan.pool = poolReserve.pool;
  flashLoan.reserve = poolReserve.id;
  flashLoan.target = event.params.target;
  flashLoan.initiator = initiator.id;
  flashLoan.totalFee = premium;
  flashLoan.amount = event.params.amount;
  flashLoan.timestamp = event.block.timestamp.toI32();
  flashLoan.save();
}

export function handleReserveUsedAsCollateralEnabled(event: ReserveUsedAsCollateralEnabled): void {
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
  let timestamp = event.block.timestamp.toI32();

  let usageAsCollateral = new UsageAsCollateralAction(getHistoryEntityId(event));
  usageAsCollateral.txHash = event.transaction.hash;
  usageAsCollateral.action = 'UsageAsCollateral';
  usageAsCollateral.pool = poolReserve.pool;
  usageAsCollateral.fromState = userReserve.usageAsCollateralEnabledOnUser;
  usageAsCollateral.toState = true;
  usageAsCollateral.user = userReserve.user;
  usageAsCollateral.userReserve = userReserve.id;
  usageAsCollateral.reserve = poolReserve.id;
  usageAsCollateral.timestamp = timestamp;
  usageAsCollateral.save();

  userReserve.lastUpdateTimestamp = timestamp;
  userReserve.usageAsCollateralEnabledOnUser = true;
  userReserve.save();
}

export function handleReserveUsedAsCollateralDisabled(
  event: ReserveUsedAsCollateralDisabled
): void {
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
  let timestamp = event.block.timestamp.toI32();

  let usageAsCollateral = new UsageAsCollateralAction(getHistoryEntityId(event));
  usageAsCollateral.txHash = event.transaction.hash;
  usageAsCollateral.action = 'UsageAsCollateral';
  usageAsCollateral.pool = poolReserve.pool;
  usageAsCollateral.fromState = userReserve.usageAsCollateralEnabledOnUser;
  usageAsCollateral.toState = false;
  usageAsCollateral.user = userReserve.user;
  usageAsCollateral.userReserve = userReserve.id;
  usageAsCollateral.reserve = poolReserve.id;
  usageAsCollateral.timestamp = timestamp;
  usageAsCollateral.save();

  userReserve.lastUpdateTimestamp = timestamp;
  userReserve.usageAsCollateralEnabledOnUser = false;
  userReserve.save();
}

export function handleReserveDataUpdated(event: ReserveDataUpdated): void {
  let reserve = getOrInitReserve(event.params.reserve, event);
  reserve.stableBorrowRate = event.params.stableBorrowRate;
  reserve.variableBorrowRate = event.params.variableBorrowRate;
  reserve.variableBorrowIndex = event.params.variableBorrowIndex;
  let timestamp = event.block.timestamp;
  let prevTimestamp = BigInt.fromI32(reserve.lastUpdateTimestamp);
  if (timestamp.gt(prevTimestamp)) {
    let growth = calculateGrowth(
      reserve.totalATokenSupply,
      reserve.liquidityRate,
      prevTimestamp,
      timestamp
    );
    reserve.totalATokenSupply = reserve.totalATokenSupply.plus(growth);
    reserve.lifetimeDepositorsInterestEarned = reserve.lifetimeDepositorsInterestEarned.plus(
      growth
    );
  }
  reserve.liquidityRate = event.params.liquidityRate;
  reserve.liquidityIndex = event.params.liquidityIndex;
  reserve.lastUpdateTimestamp = event.block.timestamp.toI32();

  reserve.save();
}
