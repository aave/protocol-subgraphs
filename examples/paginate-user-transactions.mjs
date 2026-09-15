import { pathToFileURL } from 'node:url';

export const TRANSACTIONS_QUERY = `
  query TransactionPage($first: Int!, $lastID: String!, $user: String!, $blockHash: Bytes!) {
    userTransactions(
      first: $first
      orderBy: id
      orderDirection: asc
      where: { user: $user, id_gt: $lastID }
      block: { hash: $blockHash }
    ) {
      id
      timestamp
      txHash
      action
    }
    _meta(block: { hash: $blockHash }) {
      deployment
      hasIndexingErrors
      block { number hash }
    }
  }
`;

export async function* paginateUserTransactions(
  { url, user, blockHash, first = 100 },
  request = globalThis.fetch
) {
  if (!url || !['https:', 'http:'].includes(new URL(url).protocol)) {
    throw new Error('SUBGRAPH_URL must be an HTTP(S) GraphQL endpoint');
  }
  if (!/^0x[0-9a-f]{40}$/i.test(user || '')) {
    throw new Error('USER_ADDRESS must be a 20-byte Ethereum address');
  }
  if (!/^0x[0-9a-f]{64}$/i.test(blockHash || '')) {
    throw new Error('BLOCK_HASH must be a 32-byte block hash');
  }
  if (!Number.isInteger(first) || first < 1) {
    throw new Error('PAGE_SIZE must be a positive integer supported by the endpoint');
  }

  user = user.toLowerCase();
  blockHash = blockHash.toLowerCase();
  let lastID = '';
  let deployment;
  let blockNumber;

  while (true) {
    const response = await request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: TRANSACTIONS_QUERY,
        variables: { first, lastID, user, blockHash },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GraphQL HTTP error ${response.status}`);
    const result = await response.json();
    if (result.errors?.length) throw new Error('GraphQL query returned errors');

    const meta = result.data?._meta;
    if (
      typeof meta?.deployment !== 'string' ||
      !meta.deployment ||
      meta.hasIndexingErrors !== false ||
      meta.block?.hash?.toLowerCase() !== blockHash ||
      !Number.isInteger(meta.block?.number) ||
      meta.block.number < 0
    ) {
      throw new Error('Missing or unsafe snapshot metadata; do not treat this export as complete');
    }
    if (
      deployment !== undefined &&
      (meta.deployment !== deployment || meta.block.number !== blockNumber)
    ) {
      throw new Error('Snapshot changed between pages; restart the export');
    }
    deployment = meta.deployment;
    blockNumber = meta.block.number;

    const transactions = result.data?.userTransactions;
    if (!Array.isArray(transactions)) throw new Error('Missing transaction page');
    let nextID = lastID;
    for (const transaction of transactions) {
      if (typeof transaction.id !== 'string' || transaction.id <= nextID) {
        throw new Error('Duplicate or unordered IDs; cursor did not advance');
      }
      nextID = transaction.id;
    }

    yield { transactions, deployment, block: meta.block };
    if (transactions.length === 0) return;
    lastID = nextID;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    let count = 0;
    let snapshot;
    for await (const page of paginateUserTransactions({
      url: process.env.SUBGRAPH_URL,
      user: process.env.USER_ADDRESS,
      blockHash: process.env.BLOCK_HASH,
      first: Number(process.env.PAGE_SIZE || 100),
    })) {
      count += page.transactions.length;
      snapshot = { deployment: page.deployment, block: page.block };
    }
    console.log(JSON.stringify({ count, ...snapshot }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
