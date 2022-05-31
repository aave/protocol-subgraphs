import { BigInt, log } from '@graphprotocol/graph-ts';
import {
  Borrow,
  Supply,
  FlashLoan,
  LiquidationCall,
  RebalanceStableBorrowRate,
  Withdraw,
  Repay,
  ReserveUsedAsCollateralDisabled,
  ReserveUsedAsCollateralEnabled,
  SwapBorrowRateMode,
  ReserveDataUpdated,
  MintUnbacked,
  BackUnbacked,
  UserEModeSet,
  MintedToTreasury,
  IsolationModeTotalDebtUpdated,
} from '../../../generated/templates/Pool/Pool';
import {
  getOrInitReferrer,
  getOrInitReserve,
  getOrInitUser,
  getOrInitUserReserve,
  getPoolByContract,
} from '../../helpers/v3/initializers';
import {
  Borrow as BorrowAction,
  Supply as SupplyAction,
  FlashLoan as FlashLoanAction,
  LiquidationCall as LiquidationCallAction,
  RebalanceStableBorrowRate as RebalanceStableBorrowRateAction,
  RedeemUnderlying as RedeemUnderlyingAction,
  Repay as RepayAction,
  SwapBorrowRate as SwapBorrowRateAction,
  UsageAsCollateral as UsageAsCollateralAction,
  MintUnbacked as MintUnbackedAction,
  BackUnbacked as BackUnbackedAction,
  UserEModeSet as UserEModeSetAction,
  MintedToTreasury as MintedToTreasuryAction,
  IsolationModeTotalDebtUpdated as IsolationModeTotalDebtUpdatedAction,
  Pool,
} from '../../../generated/schema';
import { getHistoryEntityId } from '../../utils/id-generation';
import { calculateGrowth } from '../../helpers/math';

export function handleSupply(event: Supply): void {
  let caller = event.params.user;
  let user = event.params.onBehalfOf;

  let poolReserve = getOrInitReserve(event.params.reserve, event);
  let userReserve = getOrInitUserReserve(user, event.params.reserve, event);
  let amount = event.params.amount;

  let id = getHistoryEntityId(event);
  if (SupplyAction.load(id)) {
    id = id + '0';
  }

  let supply = new SupplyAction(id);
  supply.pool = poolReserve.pool;
  supply.user = userReserve.user;
  supply.caller = getOrInitUser(caller).id;
  supply.userReserve = userReserve.id;
  supply.reserve = poolReserve.id;
  supply.amount = amount;
  supply.timestamp = event.block.timestamp.toI32();
  if (event.params.referralCode) {
    let referrer = getOrInitReferrer(event.params.referralCode);
    supply.referrer = referrer.id;
  }
  supply.save();
}

export function handleWithdraw(event: Withdraw): void {
  let toUser = getOrInitUser(event.params.to);
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
  let redeemedAmount = event.params.amount;

  // The case for when withdrawing ETH is not possible to know which user has triggered it
  // as the event emitted will contain user and to equal to WethGateway address

  let redeemUnderlying = new RedeemUnderlyingAction(getHistoryEntityId(event));
  redeemUnderlying.pool = poolReserve.pool;
  redeemUnderlying.user = userReserve.user;
  redeemUnderlying.to = toUser.id;
  redeemUnderlying.userReserve = userReserve.id;
  redeemUnderlying.reserve = poolReserve.id;
  redeemUnderlying.amount = redeemedAmount;
  redeemUnderlying.timestamp = event.block.timestamp.toI32();
  redeemUnderlying.save();
}

export function handleBorrow(event: Borrow): void {
  let user = event.params.onBehalfOf;
  let caller = event.params.user;
  let userReserve = getOrInitUserReserve(user, event.params.reserve, event);
  let poolReserve = getOrInitReserve(event.params.reserve, event);

  let borrow = new BorrowAction(getHistoryEntityId(event));
  borrow.pool = poolReserve.pool;
  borrow.user = userReserve.user;
  borrow.caller = getOrInitUser(caller).id;
  borrow.userReserve = userReserve.id;
  borrow.reserve = poolReserve.id;
  borrow.amount = event.params.amount;
  borrow.stableTokenDebt = userReserve.principalStableDebt;
  borrow.variableTokenDebt = userReserve.scaledVariableDebt;
  borrow.borrowRate = event.params.borrowRate;
  borrow.borrowRateMode = event.params.interestRateMode;
  borrow.timestamp = event.block.timestamp.toI32();
  if (event.params.referralCode) {
    let referrer = getOrInitReferrer(event.params.referralCode);
    borrow.referrer = referrer.id;
  }
  borrow.save();
}

export function handleSwapBorrowRateMode(event: SwapBorrowRateMode): void {
  let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
  let poolReserve = getOrInitReserve(event.params.reserve, event);

  let swapHistoryItem = new SwapBorrowRateAction(getHistoryEntityId(event));
  swapHistoryItem.pool = poolReserve.pool;
  swapHistoryItem.borrowRateModeFrom = event.params.interestRateMode;
  if (swapHistoryItem.borrowRateModeFrom === 1) {
    swapHistoryItem.borrowRateModeTo = 2;
  } else {
    swapHistoryItem.borrowRateModeTo = 1;
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
  let repayer = event.params.repayer;
  let user = event.params.user;
  let userReserve = getOrInitUserReserve(user, event.params.reserve, event);
  let poolReserve = getOrInitReserve(event.params.reserve, event);

  poolReserve.save();

  let repay = new RepayAction(getHistoryEntityId(event));
  repay.pool = poolReserve.pool;
  repay.user = userReserve.user;
  repay.repayer = getOrInitUser(repayer).id;
  repay.userReserve = userReserve.id;
  repay.reserve = poolReserve.id;
  repay.amount = event.params.amount;
  repay.timestamp = event.block.timestamp.toI32();
  repay.useATokens = event.params.useATokens;
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
  liquidationCall.save();
}

export function handleFlashLoan(event: FlashLoan): void {
  let initiator = getOrInitUser(event.params.initiator);
  let poolReserve = getOrInitReserve(event.params.asset, event);
  let poolId = getPoolByContract(event);
  let pool = Pool.load(poolId) as Pool;

  let premium = event.params.premium;
  let premiumToProtocol = premium
    .times(pool.flashloanPremiumToProtocol as BigInt)
    .plus(BigInt.fromI32(5000))
    .div(BigInt.fromI32(10000));
  let premiumToLP = premium.minus(premiumToProtocol);
  log.error('premium {},{},{}', [
    premium.toString(),
    premiumToProtocol.toString(),
    premiumToLP.toString(),
  ]);
  poolReserve.availableLiquidity = poolReserve.availableLiquidity.plus(premium);

  poolReserve.lifetimeFlashLoans = poolReserve.lifetimeFlashLoans.plus(event.params.amount);
  poolReserve.lifetimeFlashLoanPremium = poolReserve.lifetimeFlashLoanPremium.plus(premium);
  poolReserve.lifetimeFlashLoanLPPremium = poolReserve.lifetimeFlashLoanLPPremium.plus(premiumToLP);
  poolReserve.lifetimeFlashLoanProtocolPremium = poolReserve.lifetimeFlashLoanProtocolPremium.plus(
    premiumToProtocol
  );
  poolReserve.totalATokenSupply = poolReserve.totalATokenSupply.plus(premium);

  poolReserve.save();

  let flashLoan = new FlashLoanAction(getHistoryEntityId(event));
  flashLoan.pool = poolReserve.pool;
  flashLoan.reserve = poolReserve.id;
  flashLoan.target = event.params.target;
  flashLoan.initiator = initiator.id;
  flashLoan.totalFee = premium;
  flashLoan.lpFee = premiumToLP;
  flashLoan.protocolFee = premiumToProtocol;
  flashLoan.amount = event.params.amount;
  flashLoan.timestamp = event.block.timestamp.toI32();
  flashLoan.save();
}

export function handleReserveUsedAsCollateralEnabled(event: ReserveUsedAsCollateralEnabled): void {
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
  let timestamp = event.block.timestamp.toI32();

  let usageAsCollateral = new UsageAsCollateralAction(getHistoryEntityId(event));
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
    reserve.lifetimeSuppliersInterestEarned = reserve.lifetimeSuppliersInterestEarned.plus(growth);
  }
  reserve.liquidityRate = event.params.liquidityRate;
  reserve.liquidityIndex = event.params.liquidityIndex;
  reserve.lastUpdateTimestamp = event.block.timestamp.toI32();

  reserve.save();
}

export function handleMintUnbacked(event: MintUnbacked): void {
  let caller = event.params.user;
  let user = event.params.onBehalfOf;
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  let userReserve = getOrInitUserReserve(user, event.params.reserve, event);
  let amount = event.params.amount;

  let mintUnbacked = new MintUnbackedAction(getHistoryEntityId(event));
  mintUnbacked.pool = poolReserve.pool;
  mintUnbacked.user = userReserve.user;
  mintUnbacked.userReserve = userReserve.id;
  mintUnbacked.caller = getOrInitUser(caller).id;
  mintUnbacked.reserve = poolReserve.id;
  mintUnbacked.amount = amount;
  mintUnbacked.timestamp = event.block.timestamp.toI32();
  mintUnbacked.referral = event.params.referralCode;

  mintUnbacked.save();
}

export function handleBackUnbacked(event: BackUnbacked): void {
  let backer = event.params.backer;
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  let userReserve = getOrInitUserReserve(backer, event.params.reserve, event);
  let amount = event.params.amount;

  let poolId = getPoolByContract(event);
  let pool = Pool.load(poolId) as Pool;

  let premium = event.params.fee;
  let premiumToProtocol = premium
    .times(pool.bridgeProtocolFee as BigInt)
    .plus(BigInt.fromI32(5000))
    .div(BigInt.fromI32(10000));
  let premiumToLP = premium.minus(premiumToProtocol);
  poolReserve.lifetimePortalLPFee = poolReserve.lifetimePortalLPFee.plus(premiumToLP);
  poolReserve.lifetimePortalProtocolFee = poolReserve.lifetimePortalProtocolFee.plus(
    premiumToProtocol
  );
  poolReserve.save();

  let backUnbacked = new BackUnbackedAction(getHistoryEntityId(event));
  backUnbacked.pool = poolReserve.pool;
  backUnbacked.backer = userReserve.user;
  backUnbacked.userReserve = userReserve.id;
  backUnbacked.reserve = poolReserve.id;
  backUnbacked.amount = amount;
  backUnbacked.timestamp = event.block.timestamp.toI32();
  backUnbacked.fee = event.params.fee;
  backUnbacked.lpFee = premiumToLP;
  backUnbacked.protocolFee = premiumToProtocol;

  backUnbacked.save();
}

export function handleUserEModeSet(event: UserEModeSet): void {
  let user = getOrInitUser(event.params.user);

  user.eModeCategoryId = BigInt.fromI32(event.params.categoryId).toString();
  user.save();

  let userEModeSet = new UserEModeSetAction(getHistoryEntityId(event));
  userEModeSet.user = user.id;
  userEModeSet.categoryId = event.params.categoryId;
  userEModeSet.timestamp = event.block.timestamp.toI32();

  userEModeSet.save();
}

export function handleMintedToTreasury(event: MintedToTreasury): void {
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  let amount = event.params.amountMinted;

  let mintedToTreasury = new MintedToTreasuryAction(getHistoryEntityId(event));
  mintedToTreasury.pool = poolReserve.pool;
  mintedToTreasury.reserve = poolReserve.id;
  mintedToTreasury.amount = amount;
  mintedToTreasury.timestamp = event.block.timestamp.toI32();

  mintedToTreasury.save();
}

export function handleIsolationModeTotalDebtUpdated(event: IsolationModeTotalDebtUpdated): void {
  let poolReserve = getOrInitReserve(event.params.asset, event);

  let isolationDebt = new IsolationModeTotalDebtUpdatedAction(getHistoryEntityId(event));
  isolationDebt.pool = poolReserve.pool;
  isolationDebt.reserve = poolReserve.id;
  isolationDebt.isolatedDebt = event.params.totalDebt;
  isolationDebt.timestamp = event.block.timestamp.toI32();

  isolationDebt.save();
}
