import { Bytes, ethereum, log } from '@graphprotocol/graph-ts';
import {
  SubToken,
  PriceOracle,
  PriceOracleAsset,
  Reserve,
  User,
  UserReserve,
  ReserveParamsHistoryItem,
  ReserveConfigurationHistoryItem,
  Referrer,
  ChainlinkAggregator,
  ContractToPoolMapping,
  Protocol,
  Pool,
} from '../../../generated/schema';
import {
  PRICE_ORACLE_ASSET_PLATFORM_SIMPLE,
  PRICE_ORACLE_ASSET_TYPE_SIMPLE,
  zeroAddress,
  zeroBD,
  zeroBI,
} from '../../utils/converters';
import { getReserveId, getUserReserveId } from '../../utils/id-generation';

export function getProtocol(): Protocol {
  let protocolId = '1';
  let protocol = Protocol.load(protocolId);
  if (protocol == null) {
    protocol = new Protocol(protocolId);
    protocol.save();
  }
  return protocol as Protocol;
}

export function getPoolByContract(event: ethereum.Event): string {
  let contractAddress = event.address.toHexString();
  let contractToPoolMapping = ContractToPoolMapping.load(contractAddress);
  if (contractToPoolMapping === null) {
    throw new Error(contractAddress + 'is not registered in ContractToPoolMapping');
  }
  return contractToPoolMapping.pool;
}

export function getOrInitUser(address: Bytes): User {
  let user = User.load(address.toHexString());
  if (!user) {
    user = new User(address.toHexString());
    user.borrowedReservesCount = 0;
    user.unclaimedRewards = zeroBI();
    user.rewardsLastUpdated = 0;
    user.lifetimeRewards = zeroBI();
    user.save();
  }
  return user as User;
}

function initUserReserve(
  underlyingAssetAddress: Bytes,
  userAddress: Bytes,
  poolId: string,
  reserveId: string
): UserReserve {
  let userReserveId = getUserReserveId(userAddress, underlyingAssetAddress, poolId);
  let userReserve = UserReserve.load(userReserveId);
  if (userReserve === null) {
    userReserve = new UserReserve(userReserveId);
    userReserve.pool = poolId;
    userReserve.usageAsCollateralEnabledOnUser = false;
    userReserve.scaledATokenBalance = zeroBI();
    userReserve.scaledVariableDebt = zeroBI();
    userReserve.principalStableDebt = zeroBI();
    userReserve.currentATokenBalance = zeroBI();
    userReserve.currentVariableDebt = zeroBI();
    userReserve.currentStableDebt = zeroBI();
    userReserve.stableBorrowRate = zeroBI();
    userReserve.oldStableBorrowRate = zeroBI();
    userReserve.currentTotalDebt = zeroBI();
    userReserve.variableBorrowIndex = zeroBI();
    userReserve.lastUpdateTimestamp = 0;
    userReserve.liquidityRate = zeroBI();
    userReserve.stableBorrowLastUpdateTimestamp = 0;

    let user = getOrInitUser(userAddress);
    userReserve.user = user.id;

    userReserve.reserve = reserveId;
  }
  return userReserve as UserReserve;
}

export function getOrInitUserReserveWithIds(
  userAddress: Bytes,
  underlyingAssetAddress: Bytes,
  pool: string
): UserReserve {
  let reserveId = getReserveId(underlyingAssetAddress, pool);
  return initUserReserve(underlyingAssetAddress, userAddress, pool, reserveId);
}

export function getOrInitPriceOracle(): PriceOracle {
  let priceOracle = PriceOracle.load('1');
  if (!priceOracle) {
    priceOracle = new PriceOracle('1');
    priceOracle.proxyPriceProvider = zeroAddress();
    priceOracle.usdPriceEth = zeroBI();
    priceOracle.usdPriceEthMainSource = zeroAddress();
    priceOracle.usdPriceEthFallbackRequired = false;
    priceOracle.fallbackPriceOracle = zeroAddress();
    priceOracle.tokensWithFallback = [];
    priceOracle.lastUpdateTimestamp = 0;
    priceOracle.usdDependentAssets = [];
    priceOracle.version = 1;
    priceOracle.baseCurrency = zeroAddress();
    priceOracle.baseCurrencyUnit = zeroBI();
    priceOracle.save();
  }
  return priceOracle as PriceOracle;
}

export function getPriceOracleAsset(id: string, save: boolean = true): PriceOracleAsset {
  let priceOracleReserve = PriceOracleAsset.load(id);
  if (!priceOracleReserve && save) {
    priceOracleReserve = new PriceOracleAsset(id);
    priceOracleReserve.oracle = getOrInitPriceOracle().id;
    priceOracleReserve.priceSource = zeroAddress();
    priceOracleReserve.dependentAssets = [];
    priceOracleReserve.type = PRICE_ORACLE_ASSET_TYPE_SIMPLE;
    priceOracleReserve.platform = PRICE_ORACLE_ASSET_PLATFORM_SIMPLE;
    priceOracleReserve.priceInEth = zeroBI();
    priceOracleReserve.isFallbackRequired = false;
    priceOracleReserve.lastUpdateTimestamp = 0;
    priceOracleReserve.fromChainlinkSourcesRegistry = false;
    priceOracleReserve.save();
  }
  return priceOracleReserve as PriceOracleAsset;
}

export function getOrInitReserve(underlyingAsset: Bytes, event: ethereum.Event): Reserve {
  let poolId = getPoolByContract(event);
  let reserveId = getReserveId(underlyingAsset, poolId);
  let reserve = Reserve.load(reserveId);

  if (reserve === null) {
    reserve = new Reserve(reserveId);
    reserve.underlyingAsset = underlyingAsset;
    reserve.pool = poolId;
    reserve.symbol = '';
    reserve.name = '';
    reserve.decimals = 0;
    reserve.usageAsCollateralEnabled = false;
    reserve.borrowingEnabled = false;
    reserve.stableBorrowRateEnabled = false;
    reserve.isActive = false;
    reserve.isFrozen = false;
    reserve.baseLTVasCollateral = zeroBI();
    reserve.reserveLiquidationThreshold = zeroBI();
    reserve.reserveLiquidationBonus = zeroBI();
    reserve.reserveInterestRateStrategy = new Bytes(1);
    reserve.baseVariableBorrowRate = zeroBI();
    reserve.optimalUtilisationRate = zeroBI();
    reserve.variableRateSlope1 = zeroBI();
    reserve.variableRateSlope2 = zeroBI();
    reserve.stableRateSlope1 = zeroBI();
    reserve.stableRateSlope2 = zeroBI();
    reserve.utilizationRate = zeroBD();
    reserve.totalLiquidity = zeroBI();
    reserve.totalATokenSupply = zeroBI();
    reserve.totalLiquidityAsCollateral = zeroBI();
    reserve.availableLiquidity = zeroBI();
    reserve.liquidityRate = zeroBI();
    reserve.variableBorrowRate = zeroBI();
    reserve.stableBorrowRate = zeroBI();
    reserve.averageStableRate = zeroBI(); // TODO: where do i get this?
    reserve.liquidityIndex = zeroBI();
    reserve.variableBorrowIndex = zeroBI();
    reserve.reserveFactor = zeroBI(); // TODO: is default 0?
    reserve.aToken = zeroAddress().toHexString();
    reserve.vToken = zeroAddress().toHexString();
    reserve.sToken = zeroAddress().toHexString();

    reserve.totalScaledVariableDebt = zeroBI();
    reserve.totalCurrentVariableDebt = zeroBI();
    reserve.totalPrincipalStableDebt = zeroBI();
    reserve.totalSupplies = zeroBI();
    reserve.accruedToTreasury = zeroBI();

    reserve.isPaused = false;
    reserve.isDropped = false;
    reserve.siloedBorrowing = false;

    reserve.lifetimePrincipalStableDebt = zeroBI();
    reserve.lifetimeScaledVariableDebt = zeroBI();
    reserve.lifetimeCurrentVariableDebt = zeroBI();

    reserve.lifetimeLiquidity = zeroBI();
    reserve.lifetimeBorrows = zeroBI();
    reserve.lifetimeRepayments = zeroBI();
    reserve.lifetimeWithdrawals = zeroBI();
    reserve.lifetimeLiquidated = zeroBI();
    reserve.lifetimeFlashLoans = zeroBI();
    reserve.lifetimeFlashLoanPremium = zeroBI();
    reserve.lifetimeFlashLoanLPPremium = zeroBI();
    reserve.lifetimeFlashLoanProtocolPremium = zeroBI();

    reserve.stableDebtLastUpdateTimestamp = 0;
    reserve.lastUpdateTimestamp = 0;

    reserve.lifetimeReserveFactorAccrued = zeroBI();
    reserve.lifetimeSuppliersInterestEarned = zeroBI();
    // reserve.lifetimeStableDebFeeCollected = zeroBI();
    // reserve.lifetimeVariableDebtFeeCollected = zeroBI();

    let priceOracleAsset = getPriceOracleAsset(underlyingAsset.toHexString());
    if (!priceOracleAsset.lastUpdateTimestamp) {
      priceOracleAsset.save();
    }
    reserve.price = priceOracleAsset.id;
    // TODO: think about AToken
  }
  return reserve as Reserve;
}

export function getOrInitUserReserve(
  _user: Bytes,
  _underlyingAsset: Bytes,
  event: ethereum.Event
): UserReserve {
  let poolId = getPoolByContract(event);
  let reserve = getOrInitReserve(_underlyingAsset, event);
  return initUserReserve(_underlyingAsset, _user, poolId, reserve.id);
}

export function getChainlinkAggregator(id: string): ChainlinkAggregator {
  let chainlinkAggregator = ChainlinkAggregator.load(id);
  if (!chainlinkAggregator) {
    chainlinkAggregator = new ChainlinkAggregator(id);
    chainlinkAggregator.oracleAsset = '';
  }
  return chainlinkAggregator as ChainlinkAggregator;
}

export function getOrInitSubToken(subTokenAddress: Bytes): SubToken {
  let sTokenId = subTokenAddress.toHexString();
  let sToken = SubToken.load(sTokenId);
  if (!sToken) {
    sToken = new SubToken(sTokenId);
    sToken.underlyingAssetAddress = new Bytes(1);
    sToken.pool = '';
    sToken.underlyingAssetDecimals = 18;
  }
  return sToken as SubToken;
}

export function getOrInitReserveParamsHistoryItem(
  id: string,
  reserve: Reserve
): ReserveParamsHistoryItem {
  let reserveParamsHistoryItem = ReserveParamsHistoryItem.load(id);
  if (!reserveParamsHistoryItem) {
    reserveParamsHistoryItem = new ReserveParamsHistoryItem(id);
    reserveParamsHistoryItem.variableBorrowRate = zeroBI();
    reserveParamsHistoryItem.variableBorrowIndex = zeroBI();
    reserveParamsHistoryItem.utilizationRate = zeroBD();
    reserveParamsHistoryItem.stableBorrowRate = zeroBI();
    reserveParamsHistoryItem.averageStableBorrowRate = zeroBI();
    reserveParamsHistoryItem.liquidityIndex = zeroBI();
    reserveParamsHistoryItem.liquidityRate = zeroBI();
    reserveParamsHistoryItem.totalLiquidity = zeroBI();
    reserveParamsHistoryItem.accruedToTreasury = zeroBI();
    reserveParamsHistoryItem.totalATokenSupply = zeroBI();
    reserveParamsHistoryItem.availableLiquidity = zeroBI();
    reserveParamsHistoryItem.totalLiquidityAsCollateral = zeroBI();
    reserveParamsHistoryItem.priceInEth = zeroBI();
    reserveParamsHistoryItem.priceInUsd = zeroBD();
    reserveParamsHistoryItem.reserve = reserve.id;
    reserveParamsHistoryItem.totalScaledVariableDebt = zeroBI();
    reserveParamsHistoryItem.totalCurrentVariableDebt = zeroBI();
    reserveParamsHistoryItem.totalPrincipalStableDebt = zeroBI();
    reserveParamsHistoryItem.lifetimePrincipalStableDebt = zeroBI();
    reserveParamsHistoryItem.lifetimeScaledVariableDebt = zeroBI();
    reserveParamsHistoryItem.lifetimeCurrentVariableDebt = zeroBI();
    reserveParamsHistoryItem.lifetimeLiquidity = zeroBI();
    reserveParamsHistoryItem.lifetimeBorrows = zeroBI();
    reserveParamsHistoryItem.lifetimeRepayments = zeroBI();
    reserveParamsHistoryItem.lifetimeWithdrawals = zeroBI();
    reserveParamsHistoryItem.lifetimeLiquidated = zeroBI();
    reserveParamsHistoryItem.lifetimeFlashLoans = zeroBI();
    reserveParamsHistoryItem.lifetimeFlashLoanPremium = zeroBI();
    reserveParamsHistoryItem.lifetimeFlashLoanLPPremium = zeroBI();
    reserveParamsHistoryItem.lifetimeFlashLoanProtocolPremium = zeroBI();
    reserveParamsHistoryItem.lifetimeReserveFactorAccrued = zeroBI();
    reserveParamsHistoryItem.lifetimeSuppliersInterestEarned = zeroBI();
    // reserveParamsHistoryItem.lifetimeStableDebFeeCollected = zeroBI();
    // reserveParamsHistoryItem.lifetimeVariableDebtFeeCollected = zeroBI();
  }
  return reserveParamsHistoryItem as ReserveParamsHistoryItem;
}

export function getOrInitReserveConfigurationHistoryItem(
  id: Bytes,
  reserve: Reserve
): ReserveConfigurationHistoryItem {
  let reserveConfigurationHistoryItem = ReserveConfigurationHistoryItem.load(id.toHexString());
  if (!reserveConfigurationHistoryItem) {
    reserveConfigurationHistoryItem = new ReserveConfigurationHistoryItem(id.toHexString());
    reserveConfigurationHistoryItem.usageAsCollateralEnabled = false;
    reserveConfigurationHistoryItem.borrowingEnabled = false;
    reserveConfigurationHistoryItem.stableBorrowRateEnabled = false;
    reserveConfigurationHistoryItem.isActive = false;
    reserveConfigurationHistoryItem.reserveInterestRateStrategy = new Bytes(1);
    reserveConfigurationHistoryItem.baseLTVasCollateral = zeroBI();
    reserveConfigurationHistoryItem.reserveLiquidationThreshold = zeroBI();
    reserveConfigurationHistoryItem.reserveLiquidationBonus = zeroBI();
    reserveConfigurationHistoryItem.reserve = reserve.id;
  }
  return reserveConfigurationHistoryItem as ReserveConfigurationHistoryItem;
}

// @ts-ignore
export function getOrInitReferrer(id: i32): Referrer {
  let referrer = Referrer.load(id.toString());
  if (!referrer) {
    referrer = new Referrer(id.toString());
    referrer.save();
  }
  return referrer as Referrer;
}

export function createMapContractToPool(_contractAddress: Bytes, pool: string): void {
  let contractAddress = _contractAddress.toHexString();
  let contractToPoolMapping = ContractToPoolMapping.load(contractAddress);

  if (contractToPoolMapping) {
    log.error('contract {} is already registered in the protocol', [contractAddress]);
    throw new Error(contractAddress + 'is already registered in the protocol');
  }
  contractToPoolMapping = new ContractToPoolMapping(contractAddress);
  contractToPoolMapping.pool = pool;
  contractToPoolMapping.save();
}
