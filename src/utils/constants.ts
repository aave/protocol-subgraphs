import { BigInt } from '@graphprotocol/graph-ts';

export const MOCK_ETHEREUM_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
export const MOCK_USD_ADDRESS = '0x10f7fc1f91ba351f9c629c5947ad69bd03c05b96';
export const PROPOSAL_STATUS_INITIALIZING = 'Initializing';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ETH_PRECISION = BigInt.fromI32(10)
  .pow(18)
  .toBigDecimal();
export const USD_PRECISION = BigInt.fromI32(10)
  .pow(8)
  .toBigDecimal();
