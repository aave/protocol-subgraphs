# Aave Protocol Subgraphs

The Aave Protocol subgraphs index data from the protocol smart contracts, and expose a GraphQL endpoint hosted by [The Graph](https://thegraph.com).

- [Active Deployments](#active-deployments)
- [Usage](#usage)
- [Development](#deployment)

# Active deployments

## Protocol Subgraphs

### Production networks

- [ETH Mainnet V3](https://thegraph.com/explorer/subgraphs/Cd2gEDVeqnjBn1hSeqFMitw8Q1iiyV9FYUZkLNRcL87g)
- [ETH Mainnet V3 GHO](https://thegraph.com/explorer/subgraphs/BQN5t5Mgti3BNLsZYEiL1MtiBJLa1DQJnaquXR1zTBjn)
- [ETH Mainnet V3 Lido Market](https://thegraph.com/explorer/subgraphs/5vxMbXRhG1oQr55MWC5j6qg78waWujx1wjeuEWDA6j3)
- [ETH Mainnet V3 Etherfi Market](https://thegraph.com/explorer/subgraphs/8o4HGApJkAqnvxAHShG4w5xiXihHyL7HkeDdQdRUYmqZ)
- [ETH Mainnet V2](https://thegraph.com/explorer/subgraphs/8wR23o1zkS4gpLqLNU4kG3JHYVucqGyopL5utGxP2q1N)
- [Polygon V2](https://thegraph.com/explorer/subgraphs/H1Et77RZh3XEf27vkAmJyzgCME2RSFLtDS2f4PPW6CGp)
- [Avalanche V2](https://thegraph.com/explorer/subgraphs/EZvK18pMhwiCjxwesRLTg81fP33WnR6BnZe5Cvma3H1C)
- [Polygon V3](https://thegraph.com/explorer/subgraphs/Co2URyXjnxaw8WqxKyVHdirq9Ahhm5vcTs4dMedAq211)
- [Avalanche V3](https://thegraph.com/explorer/subgraphs/2h9woxy8RTjHu1HJsCEnmzpPHFArU33avmUh4f71JpVn)
- [Arbitrum V3](https://thegraph.com/explorer/subgraphs/DLuE98kEb5pQNXAcKFQGQgfSQ57Xdou4jnVbAEqMfy3B)
- [Optimism V3](https://thegraph.com/explorer/subgraphs/DSfLz8oQBUeU5atALgUFQKMTSYV9mZAVYp4noLSXAfvb)
- [Fantom V3](https://thegraph.com/explorer/subgraphs/6L1vPqyE3xvkzkWjh6wUKc1ABWYYps5HJahoxhrv2PJn)
- [Harmony V3](https://thegraph.com/explorer/subgraphs/FifJapBdCqT9vgNqJ5axmr6eNyUpUSaRAbbZTfsViNsT)
- [Metis V3](https://metisapi.0xgraph.xyz/subgraphs/name/aave/protocol-v3-metis)
- [Gnosis V3](https://thegraph.com/explorer/subgraphs/HtcDaL8L8iZ2KQNNS44EBVmLruzxuNAz1RkBYdui1QUT)
- [BNB Chain V3](https://thegraph.com/explorer/subgraphs/7Jk85XgkV1MQ7u56hD8rr65rfASbayJXopugWkUoBMnZ)
- [Base V3](https://thegraph.com/explorer/subgraphs/GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF)
- [Scroll V3](https://thegraph.com/explorer/subgraphs/74JwenoHZb2aAYVGCCSdPWzi9mm745dyHyQQVoZ7Sbub)
- [ZKsync V3](https://thegraph.com/explorer/subgraphs/ENYSc8G3WvrbhWH8UZHrqPWYRcuyCaNmaTmoVp7uzabM)
- [Linea V3](https://thegraph.com/explorer/subgraphs/Gz2kjnmRV1fQj3R8cssoZa5y9VTanhrDo4Mh7nWW1wHa)
- [Sonic V3](https://thegraph.com/explorer/subgraphs/FQcacc4ZJaQVS9euWb76nvpSq2GxavBnUM6DU6tmspbi)
- [Celo V3](https://thegraph.com/explorer/subgraphs/GAVWZzGwQ6d6QbFojyFWxpZ2GB9Rf5hZgGyJHCEry8kn)
- [Soneium V3](https://thegraph.com/explorer/subgraphs/5waxmqS3rkRtZPoV2mL5RCToupVxVbTd7hjicxMGebYm)
- [Ink V3](https://thegraph.com/explorer/subgraphs/6AY9ccNwMwd3G27zp9vUKWCi9ugvNS6gkh5EEBY2xnPC)
- [MegaETH V3](https://thegraph.com/explorer/subgraphs/DnfLSdosqrcZ8pb8G2rL954SdRB8Pk4jjkgjtfwfx7cY)

### Test networks

- [Goerli V2](https://thegraph.com/hosted-service/subgraph/aave/protocol-v2-goerli)
- [Goerli V3](https://thegraph.com/hosted-service/subgraph/aave/protocol-v3-goerli)
- [Mumbai V2](https://thegraph.com/hosted-service/subgraph/aave/aave-v2-polygon-mumbai)
- [Mumbai V3](https://thegraph.com/hosted-service/subgraph/aave/protocol-v3-mumbai)
- [Fuji V2](https://thegraph.com/explorer/subgraphs/CkLPS5QuGQR5Ys6w9TSLCbUQ6zvKoa6R5SJmmRqFQjpd)
- [Fuji V3](https://thegraph.com/hosted-service/subgraph/aave/protocol-v3-fuji)
- [Arbitrum Goerli V3](https://thegraph.com/hosted-service/subgraph/aave/protocol-v3-arbitrum-goerli)
- [Optimism Goerli V3](https://thegraph.com/hosted-service/subgraph/aave/protocol-v3-optimism-goerli)
- [Fantom Testnet V3](https://thegraph.com/hosted-service/subgraph/aave/protocol-v3-fantom-testnet)

## Governance Subgraphs

- [Aave Governance V3](https://thegraph.com/explorer/subgraphs/A7QMszgomC9cnnfpAcqZVLr2DffvkGNfimD8iUSMiurK)
- [Aave Governance V3 Voting Polygon](https://thegraph.com/explorer/subgraphs/32WLrLTQctAgfoshbkteHfxLu3DpAeZwh2vUPWXV6Qxu)
- [Aave Governance V3 Voting Ethereum](https://thegraph.com/explorer/subgraphs/2QPwuCfFtQ8WSCZoN3i9SmdoabMzbq2pmg4kRbrhymBV?view=Query&chain=arbitrum-one)
- [Aave Governance V3 Voting Avalache](https://thegraph.com/explorer/subgraphs/FngMWWGJV45McvV7GUBkrta9eoEi3sHZoH7MYnFQfZkr?view=Query&chain=arbitrum-one)
- [Aave Governance V2](https://thegraph.com/explorer/subgraphs/CfdJBpzFXCCCagNhMt2uQgqjDSVbaSNLV5f5c3BbGwip)

## Usage

Subgraphs can be queried directly from the graph explorer, or from [another application](https://thegraph.com/docs/en/developer/querying-from-your-app/). The following section gives common queries for Aave protocol data.

### Helpful Queries

See [TheGraph API](https://thegraph.com/docs/en/developer/graphql-api/) docs for a complete guide on querying capabilities.

#### User Transaction History

<details>
  <summary>V2</summary>

```
{
  userTransactions(
    where: { user: "insert_lowercase_address_here" }
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    timestamp
    txHash
    action
    ... on Deposit {
      amount
      reserve {
        symbol
        decimals
      }
      assetPriceUSD
    }
    ... on RedeemUnderlying {
      amount
      reserve {
        symbol
        decimals
      }
      assetPriceUSD
    }
    ... on Borrow {
      amount
      borrowRateMode
      borrowRate
      stableTokenDebt
      variableTokenDebt
      reserve {
        symbol
        decimals
      }
      assetPriceUSD
    }
    ... on UsageAsCollateral {
      fromState
      toState
      reserve {
        symbol
      }
    }
    ... on Repay {
      amount
      reserve {
        symbol
        decimals
      }
      assetPriceUSD
    }
    ... on Swap {
      borrowRateModeFrom
      borrowRateModeTo
      variableBorrowRate
      stableBorrowRate
      reserve {
        symbol
        decimals
      }
    }
    ... on LiquidationCall {
      collateralAmount
      collateralReserve {
        symbol
        decimals
      }
      principalAmount
      principalReserve {
        symbol
        decimals
      }
      collateralAssetPriceUSD
      borrowAssetPriceUSD
    }
  }
}
```

</details>

<details>
  <summary>V3</summary>

```
{
  userTransactions(
    where: { user: "insert_lowercase_address_here" }
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    timestamp
    txHash
    action
    ... on Supply {
      amount
      reserve {
        symbol
        decimals
      }
      assetPriceUSD
    }
    ... on RedeemUnderlying {
      amount
      reserve {
        symbol
        decimals
      }
      assetPriceUSD
    }
    ... on Borrow {
      amount
      borrowRateMode
      borrowRate
      stableTokenDebt
      variableTokenDebt
      reserve {
        symbol
        decimals
      }
      assetPriceUSD
    }
    ... on UsageAsCollateral {
      fromState
      toState
      reserve {
        symbol
      }
    }
    ... on Repay {
      amount
      reserve {
        symbol
        decimals
      }
      assetPriceUSD
    }
    ... on SwapBorrowRate {
      borrowRateModeFrom
      borrowRateModeTo
      variableBorrowRate
      stableBorrowRate
      reserve {
        symbol
        decimals
      }
    }
    ... on LiquidationCall {
      collateralAmount
      collateralReserve {
        symbol
        decimals
      }
      principalAmount
      principalReserve {
        symbol
        decimals
      }
      collateralAssetPriceUSD
      borrowAssetPriceUSD
    }
  }
}
```

</details>

<details>
  <summary>Reserve Data</summary>

#### Reserve Summary

The `reserve` entity gives data on the assets of the protocol including rates, configuration, and total supply/borrow amounts.

The aave-utilities library includes a [`formatReserves`](https://github.com/aave/aave-utilities/#formatReserves) function which can be used to format all data into a human readable format. The queries to fetch data for passing into this function can be found [here](https://github.com/aave/aave-utilities#subgraph).

Why does the raw subgraph data not match app.aave.com?

- aToken and debtToken balances are continuously increasing. The subgraph provides a snapshot of the balance at the time of indexing (not querying), which means fields affected by interest such as `totalLiquidity`, `availableLiquidity`, and `totalCurrentVariableDebt` will need to be formatted to get real-time values
- All rates (liquidityRate, variableBorrowRate, stableBorrowRate) are expressed as _APR_ with RAY units (10**27). To convert to the APY percentage as shown on the Aave frontend: `supplyAPY = (((1 + ((liquidityRate / 10**27) / 31536000)) ^ 31536000) - 1) \* 100`. [`formatReserves`](https://github.com/aave/aave-utilities/#formatReserves) will perform this calculation for you.

</details>

<details>
  <summary>User Data</summary>

#### User Summary

The `userReserve` entity gives the supply and borrow balances for a particular user along with the underlying reserve data.

The aave-utilities library includes a [`formatUserSummary`](https://github.com/aave/aave-utilities#formatUserSummary) function which can be used to format all data into a human readable format. The queries to fetch data for passing into this function can be found [here](https://github.com/aave/aave-utilities#subgraph).

Why does the raw subgraph data not match my account balances on app.aave.com?

- aToken and debtToken balances are continuously increasing. The subgraph provides a snapshot of the balance at the time of indexing (not querying), which means fields affected by interest such as `currentATokenBalance`, `currentVariableDebt`, and `currentStableDebt` will need to be formatted to get the real-time values

</details>

<details>
  <summary>Querying Tips</summary>

### Historical Queries

You can query for historical data by specifying a block number:

```
{
	reserves(block: {number: 14568297}){
  	symbol
  	liquidityRate
	}
}
```

To query based on a historical timestamp, you will need to convert the timstamp to the most recent block number, you will need to use an external tool such as [this](https://www.npmjs.com/package/ethereum-block-by-date).

### Pagination

The Graph places a limit on the number of items which can returned by a single query (currently 100). To fetch a larger number of items, the `first` and `skip` parameters can be used to create paginated queries.

For example, if you wanted to fetch the first 200 transactions for an Aave market, you can't query 200 items at once, but you can achieve the same thing by concatenating the output of these queries:

```
{
  userTransactions(orderBy: timestamp, orderDirection: asc, first: 100, skip: 0){
    timestamp
  }
}
```

```
{
  userTransactions(orderBy: timestamp, orderDirection: asc, first: 100, skip: 100){
    timestamp
  }
}
```

</details>

## Development

```bash

# copy env and adjust its content with your personal access token and subgraph name

# you can get an access token from https://thegraph.com/explorer/dashboard
cp .env.test .env

# install project dependencies
npm i

# to regenrate types if schema.graphql has changed
npm run subgraph:codegen

# to run a test build of your subgraph
npm run subgraph:build

# now you're able to deploy to thegraph hosted service with one of the deploy commands:
npm run deploy:hosted:mainnet

```

### Troubleshooting

If a subgraph encounters an error while indexing, the logs on the explorer may not display the error. You can check for errors on a pending or synced subgraph with the following commands, replacing `aave/protocol-v2` with your subgraph name:

Pending:

```
curl --location --request POST 'https://api.thegraph.com/index-node/graphql' --data-raw '{"query":"{ indexingStatusForPendingVersion(subgraphName: \"aave/protocol-v2\") { subgraph fatalError { message } nonFatalErrors {message } } }"}'
```

Synced:

```
curl --location --request POST 'https://api.thegraph.com/index-node/graphql' --data-raw '{"query":"{ indexingStatusForCurrentVersion(subgraphName: \"aave/protocol-v2\") { subgraph fatalError { message } nonFatalErrors {message } } }"}'
```
