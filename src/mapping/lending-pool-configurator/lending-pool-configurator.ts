/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Bytes, Address, ethereum } from '@graphprotocol/graph-ts';

import {
  BorrowingDisabledOnReserve,
  BorrowingEnabledOnReserve,
  StableRateDisabledOnReserve,
  StableRateEnabledOnReserve,
  ReserveActivated,
  ReserveDeactivated,
  CollateralConfigurationChanged,
  ReserveInterestRateStrategyChanged,
  ReserveFactorChanged,
  ReserveDecimalsChanged,
  ATokenUpgraded,
  StableDebtTokenUpgraded,
  VariableDebtTokenUpgraded,
} from '../../../generated/templates/LendingPoolConfigurator/LendingPoolConfigurator';
import { DefaultReserveInterestRateStrategy } from '../../../generated/templates/LendingPoolConfigurator/DefaultReserveInterestRateStrategy';
import {
  getOrInitAToken,
  getOrInitReserve,
  getOrInitReserveConfigurationHistoryItem,
} from '../../helpers/initializers';
import { Reserve } from '../../../generated/schema';
import { zeroAddress, zeroBI } from '../../utils/converters';

export function saveReserve(reserve: Reserve, event: ethereum.Event): void {
  let timestamp = event.block.timestamp.toI32();
  let txHash = event.transaction.hash;

  reserve.lastUpdateTimestamp = timestamp;
  reserve.save();

  let configurationHistoryItem = getOrInitReserveConfigurationHistoryItem(txHash, reserve);
  configurationHistoryItem.usageAsCollateralEnabled = reserve.usageAsCollateralEnabled;
  configurationHistoryItem.borrowingEnabled = reserve.borrowingEnabled;
  configurationHistoryItem.stableBorrowRateEnabled = reserve.stableBorrowRateEnabled;
  configurationHistoryItem.isActive = reserve.isActive;
  configurationHistoryItem.isFrozen = reserve.isFrozen;
  configurationHistoryItem.reserveInterestRateStrategy = reserve.reserveInterestRateStrategy;
  configurationHistoryItem.baseLTVasCollateral = reserve.baseLTVasCollateral;
  configurationHistoryItem.reserveLiquidationThreshold = reserve.reserveLiquidationThreshold;
  configurationHistoryItem.reserveLiquidationBonus = reserve.reserveLiquidationBonus;
  configurationHistoryItem.timestamp = timestamp;
  configurationHistoryItem.save();
}

export function updateInterestRateStrategy(
  reserve: Reserve,
  strategy: Bytes,
  init: boolean = false
): void {
  let interestRateStrategyContract = DefaultReserveInterestRateStrategy.bind(
    Address.fromString(strategy.toHexString())
  );

  reserve.reserveInterestRateStrategy = strategy;
  reserve.baseVariableBorrowRate = interestRateStrategyContract.baseVariableBorrowRate();
  if (init) {
    reserve.variableBorrowRate = reserve.baseVariableBorrowRate;
  }
  reserve.optimalUtilisationRate = interestRateStrategyContract.OPTIMAL_UTILIZATION_RATE();
  reserve.variableRateSlope1 = interestRateStrategyContract.variableRateSlope1();
  reserve.variableRateSlope2 = interestRateStrategyContract.variableRateSlope2();
  reserve.stableRateSlope1 = interestRateStrategyContract.stableRateSlope1();
  reserve.stableRateSlope2 = interestRateStrategyContract.stableRateSlope2();
}

export function handleReserveInterestRateStrategyChanged(
  event: ReserveInterestRateStrategyChanged
): void {
  // TODO: remove it after ropsten redeployment
  let interestRateStrategyContract = DefaultReserveInterestRateStrategy.bind(event.params.strategy);
  let stableSlope1 = interestRateStrategyContract.try_stableRateSlope1();
  let stableSlope2 = interestRateStrategyContract.try_stableRateSlope2();
  if (stableSlope1.reverted || stableSlope2.reverted) {
    return;
  }
  //////
  let reserve = getOrInitReserve(event.params.asset, event);
  // if reserve is not initialize, needed to handle ropsten wrong deployment
  if (reserve.aToken == zeroAddress().toHexString()) {
    return;
  }
  updateInterestRateStrategy(reserve, event.params.strategy, false);
  saveReserve(reserve, event);
}

export function handleBorrowingDisabledOnReserve(event: BorrowingDisabledOnReserve): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.borrowingEnabled = false;
  saveReserve(reserve, event);
}

export function handleBorrowingEnabledOnReserve(event: BorrowingEnabledOnReserve): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.borrowingEnabled = true;
  reserve.stableBorrowRateEnabled = event.params.stableRateEnabled;
  saveReserve(reserve, event);
}
export function handleStableRateDisabledOnReserve(event: StableRateDisabledOnReserve): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.stableBorrowRateEnabled = false;
  saveReserve(reserve, event);
}
export function handleStableRateEnabledOnReserve(event: StableRateEnabledOnReserve): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.stableBorrowRateEnabled = true;
  saveReserve(reserve, event);
}

export function handleReserveActivated(event: ReserveActivated): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.isActive = true;
  saveReserve(reserve, event);
}
export function handleReserveDeactivated(event: ReserveDeactivated): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.isActive = false;
  saveReserve(reserve, event);
}

export function handleReserveFreezed(event: ReserveActivated): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.isFrozen = true;
  saveReserve(reserve, event);
}
export function handleReserveUnfreezed(event: ReserveDeactivated): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.isFrozen = false;
  saveReserve(reserve, event);
}

export function handleCollateralConfigurationChanged(event: CollateralConfigurationChanged): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.usageAsCollateralEnabled = false;
  if (event.params.liquidationThreshold.gt(zeroBI())) {
    reserve.usageAsCollateralEnabled = true;
  }

  reserve.baseLTVasCollateral = event.params.ltv;
  reserve.reserveLiquidationThreshold = event.params.liquidationThreshold;
  reserve.reserveLiquidationBonus = event.params.liquidationBonus;
  saveReserve(reserve, event);
}

export function handleReserveFactorChanged(event: ReserveFactorChanged): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.reserveFactor = event.params.factor;
  saveReserve(reserve, event);
}

export function handleReserveDecimalsChanged(event: ReserveDecimalsChanged): void {
  let reserve = getOrInitReserve(event.params.asset, event);
  reserve.decimals = event.params.decimals.toI32();
  saveReserve(reserve, event);
}

export function handleATokenUpgraded(event: ATokenUpgraded): void {
  let aToken = getOrInitAToken(event.params.proxy);
  aToken.tokenContractImpl = event.params.implementation;
  aToken.save();
}

export function handleStableDebtTokenUpgraded(event: StableDebtTokenUpgraded): void {
  let sToken = getOrInitAToken(event.params.proxy);
  sToken.tokenContractImpl = event.params.implementation;
  sToken.save();
}
export function handleVariableDebtTokenUpgraded(event: VariableDebtTokenUpgraded): void {
  let vToken = getOrInitAToken(event.params.proxy);
  vToken.tokenContractImpl = event.params.implementation;
  vToken.save();
}
