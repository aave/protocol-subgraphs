# Aave Protocol subgraphs

This repo contains the logic of Lend to Aave token subgraph

More information about TheGraph can be found on https://thegraph.com/docs/quick-start

## Formats

### raw

Data presented as in the smartcontracts in small units (wei, etc), deployed at:

https://thegraph.com/explorer/subgraph/aave/migrator-raw - mainnet

https://thegraph.com/explorer/subgraph/aave/migrator-ropsten-raw - ropsten

### formatted

Data formatted to big units with floating point, deployed at:

https://thegraph.com/explorer/subgraph/aave/migrator - mainnet

https://thegraph.com/explorer/subgraph/aave/migrator-ropsten - ropsten

## Local Development

1. Start docker environment for a buidler node and TheGraph infrastructure:

```
docker-compose up
```

Remember that before runing `docker-compose up` you need to run `docker-compose down` if it is not the first time. That is because the postgres database needs to not be persistant, so we need to delete the docker volumes.

2. Deploy Migration Contracts: MockLendTocken, AaveToken, LendToAaveMigrator.
   Generate test migrations to be viewed in the migration subgraph:

```
npm run deploy-stack:local
```

- this step will download the aave-token repo as a submodule, install its dependencies, deploy the contracts and execute the migrations and get the LendToAaveMigrator address and put it at the subgraph config. Then it will generate the correct subgraph yaml template.
- When all this preparation is complete it will create and deploy the subgraph to the TheGraph node in the docker environment

3. To check or query the subgraph use:

```
Queries (HTTP):     http://localhost:8000/subgraphs/name/aave/migrator
Subscriptions (WS): http://localhost:8001/subgraphs/name/aave/migrator

INFO Starting JSON-RPC admin server at: http://localhost:8020, component: JsonRpcServer
INFO Starting GraphQL HTTP server at: http://localhost:8000, component: GraphQLServer
INFO Starting index node server at: http://localhost:8030, component: IndexNodeServer
INFO Starting GraphQL WebSocket server at: ws://localhost:8001, component: SubscriptionServer
INFO Starting metrics server at: http://localhost:8040, component: MetricsServer

```

- example query:

```
{
  aaves {
    id
    users {
      id
      migratedBalance
    }
  }
  users {
    id
    migratedBalance
    transactions {
      timestamp
      blockNumber
      migratedAmount
    }
  }
  transactions {
    id
    from
    migratedAmount
    blockNumber
    timestamp
  }
}
```

## Individual Comands:

- Subgraph commands:

```
npm run subgraph:codegen // run the graph codegen comand on your subgraph
npm run subgraph:build // run the graph build comand on your subgraph
npm run subgraph:create:local // creates the subgraph in the TheGraph node deployed in the docker env
npm run subgraph:deploy:local // deploys a subgraph to the TheGrpah node deployed in the docker env
```

- Deployment of contracts

```
npm run submodule:compile-contracts // compiles the contracts of the submodule repository
npm run submodule:deploy-contracts // deploys the contracts of the submodule repository to the buidler node deployed in docker env
```

## Working with gitmodules

- This comands should not be needed for our case as the submodule is added bia packgage.json script inside the deployment comand
  To add one submodule:

```
git submodule add -f https://gitmodule:V1phP4ezTaUvznajsNZ3@gitlab.com/aave-tech/aave-token.git externals/aToken
```

To clone the repository and also download the submodule files:

```
git clone <repo> --recurse-submodules
```

To update the submodules:

```
git submodule update --init
```

if you want to work with a branch of the submodule repository:

```
> cd submodule/path
> git fetch
> git checkout branch
```
