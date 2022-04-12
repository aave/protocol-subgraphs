import { Initialized as ATokenInitialized } from '../../../generated/templates/AToken/AToken';
import { Initialized as VTokenInitialized } from '../../../generated/templates/VariableDebtToken/VariableDebtToken';
import { Initialized as STokenInitialized } from '../../../generated/templates/StableDebtToken/StableDebtToken';
import { AaveIncentivesController as AaveIncentivesControllerTemplate } from '../../../generated/templates';
import { AaveIncentivesController as AaveIncentivesControllerC } from '../../../generated/templates/AaveIncentivesController/AaveIncentivesController';
import {
  ContractToPoolMapping,
  IncentivesController,
  MapAssetPool,
} from '../../../generated/schema';
import { Address, log } from '@graphprotocol/graph-ts';
import { IERC20Detailed } from '../../../generated/templates/AToken/IERC20Detailed';
import { zeroAddress } from '../../utils/converters';
export {
  handleATokenBurn,
  handleATokenMint,
  handleATokenTransfer,
  handleVariableTokenBurn,
  handleVariableTokenMint,
  handleStableTokenMint,
  handleStableTokenBurn,
  handleStableTokenBorrowAllowanceDelegated,
  handleVariableTokenBorrowAllowanceDelegated,
} from './tokenization-avalanche';

function createIncentivesController(
  asset: Address,
  incentivesController: Address,
  underlyingAsset: Address,
  pool: Address
): void {
  if (incentivesController == zeroAddress()) {
    log.warning('Incentives controller is 0x0 for asset: {} | underlyingasset: {} | pool: {}', [
      asset.toHexString(),
      underlyingAsset.toHexString(),
      pool.toHexString(),
    ]);
    return;
  }
  let iController = IncentivesController.load(incentivesController.toHexString());
  if (!iController) {
    iController = new IncentivesController(incentivesController.toHexString());
    // get incentive reward info
    let AaveIncentivesControllerContract = AaveIncentivesControllerC.bind(incentivesController);
    let rewardToken = AaveIncentivesControllerContract.REWARD_TOKEN();
    let precision = AaveIncentivesControllerContract.PRECISION();
    let emissionEndTimestamp = AaveIncentivesControllerContract.DISTRIBUTION_END();
    let IERC20DetailedContract = IERC20Detailed.bind(rewardToken);
    let rewardTokenDecimals = IERC20DetailedContract.decimals();
    let rewardTokenSymbol = IERC20DetailedContract.symbol();
    iController.rewardToken = rewardToken;
    iController.rewardTokenDecimals = rewardTokenDecimals;
    iController.rewardTokenSymbol = rewardTokenSymbol;
    iController.precision = precision;
    iController.emissionEndTimestamp = emissionEndTimestamp.toI32();
    iController.save();
    AaveIncentivesControllerTemplate.create(incentivesController);
  }
  let poolAddressProvider = ContractToPoolMapping.load(pool.toHexString());
  if (poolAddressProvider != null) {
    // save asset pool mapping
    let mapAssetPool = new MapAssetPool(asset.toHexString());
    mapAssetPool.pool = poolAddressProvider.pool;
    mapAssetPool.underlyingAsset = underlyingAsset;
    mapAssetPool.save();
  }
}

export function handleATokenInitialized(event: ATokenInitialized): void {
  // log.warning('Incentives controller is 0x0 for asset: {} | underlyingasset: {} | pool: {}', []);
  createIncentivesController(
    event.address,
    event.params.incentivesController,
    event.params.underlyingAsset,
    event.params.pool
  );
}

export function handleSTokenInitialized(event: STokenInitialized): void {
  createIncentivesController(
    event.address,
    event.params.incentivesController,
    event.params.underlyingAsset,
    event.params.pool
  );
}

export function handleVTokenInitialized(event: VTokenInitialized): void {
  createIncentivesController(
    event.address,
    event.params.incentivesController,
    event.params.underlyingAsset,
    event.params.pool
  );
}
