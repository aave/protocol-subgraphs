import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { paginateUserTransactions, TRANSACTIONS_QUERY } from './paginate-user-transactions.mjs';

const blockHash = `0x${'a'.repeat(64)}`;
const user = `0x${'b'.repeat(40)}`;
const options = { url: 'https://example.invalid/graphql', user, blockHash, first: 2 };
const row = (id) => ({ id, timestamp: 1, txHash: '0x00', action: 'Supply' });
const metadata = () => ({
  deployment: 'test-deployment',
  hasIndexingErrors: false,
  block: { number: 123, hash: blockHash },
});
const payload = (ids, meta = metadata()) => ({
  data: { userTransactions: ids.map(row), _meta: meta },
});

test('README query matches the tested example', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const queries = [...readme.matchAll(/```graphql\s*([\s\S]*?)```/g)];
  assert.ok(queries.some((match) =>
    match[1].replace(/\s+/g, '') === TRANSACTIONS_QUERY.replace(/\s+/g, '')));
});

test('selected transaction fields and user relation exist in both protocol schemas', () => {
  for (const version of ['v2', 'v3']) {
    const schema = readFileSync(new URL(`../schemas/${version}.schema.graphql`, import.meta.url),
      'utf8');
    const transaction = schema.match(/interface UserTransaction\s*\{([^}]+)\}/)[1];
    for (const field of ['id: ID!', 'timestamp: Int!', 'txHash: Bytes!', 'action: Action!',
      'user: User!']) assert.ok(transaction.includes(field), `${version} missing ${field}`);
  }
});

function mockRequest(results) {
  const calls = [];
  const request = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const result = results[calls.length - 1];
    assert.ok(result, 'unexpected request: paginator must terminate');
    return { ok: true, status: 200, json: async () => result };
  };
  return { calls, request };
}

async function collect(config, request) {
  const pages = [];
  for await (const page of paginateUserTransactions(config, request)) pages.push(page);
  return pages;
}

test('cursor export preserves tied timestamps and pins every request to one snapshot', async () => {
  const mock = mockRequest([payload(['a', 'b']), payload(['c', 'd']), payload([])]);
  const pages = await collect(options, mock.request);
  assert.deepEqual(pages.flatMap((page) => page.transactions.map((entry) => entry.id)),
    ['a', 'b', 'c', 'd']);
  assert.deepEqual(mock.calls.map((call) => call.body.variables.lastID), ['', 'b', 'd']);
  for (const call of mock.calls) {
    assert.equal(call.init.method, 'POST');
    assert.equal(call.body.query, TRANSACTIONS_QUERY);
    assert.equal(call.body.variables.blockHash, blockHash);
    assert.equal(call.body.variables.user, user);
    assert.equal(call.body.variables.first, 2);
  }
});

test('a short page does not end an export; continue until an empty page', async () => {
  const mock = mockRequest([payload(['a']), payload(['b']), payload([])]);
  const pages = await collect({ ...options, first: 100 }, mock.request);
  assert.equal(pages.flatMap((page) => page.transactions).length, 2);
  assert.equal(mock.calls.length, 3);
});

test('an empty initial page retains snapshot metadata', async () => {
  const mock = mockRequest([payload([])]);
  const pages = await collect(options, mock.request);
  assert.equal(pages.length, 1);
  assert.deepEqual(pages[0].block, metadata().block);
  assert.equal(pages[0].transactions.length, 0);
});

test('normalise checksum-address and block-hash case without changing opaque IDs', async () => {
  const mock = mockRequest([payload(['a']), payload([])]);
  await collect({ ...options, user: user.toUpperCase().replace('0X', '0x'),
    blockHash: blockHash.toUpperCase().replace('0X', '0x') }, mock.request);
  assert.equal(mock.calls[0].body.variables.user, user);
  assert.equal(mock.calls[0].body.variables.blockHash, blockHash);
});

test('reject invalid configuration before any request', async () => {
  for (const invalid of [{ url: undefined }, { url: 'file:///tmp/data' }, { user: 'invalid' },
    { blockHash: '0x01' }, { first: 0 }, { first: 1.5 }, { first: NaN }]) {
    await assert.rejects(collect({ ...options, ...invalid }, () => {
      assert.fail('invalid configuration must not contact an endpoint');
    }));
  }
});

test('HTTP errors and transport failures are not empty pages', async () => {
  await assert.rejects(collect(options, async () => ({ ok: false, status: 429 })),
    /HTTP error 429/);
  await assert.rejects(collect(options, async () => { throw new Error('transport failed'); }),
    /transport failed/);
});

test('GraphQL errors reject partial data', async () => {
  const mock = mockRequest([{ ...payload(['a']), errors: [{ message: 'block unavailable' }] }]);
  await assert.rejects(collect(options, mock.request), /returned errors/);
});

test('reject indexing errors, missing metadata and a different block hash', async () => {
  for (const meta of [null, { ...metadata(), hasIndexingErrors: true },
    { ...metadata(), deployment: '' }, { ...metadata(), hasIndexingErrors: undefined },
    { ...metadata(), block: { number: 123, hash: null } },
    { ...metadata(), block: { number: 123, hash: `0x${'c'.repeat(64)}` } }]) {
    const mock = mockRequest([payload(['a'], meta)]);
    await assert.rejects(collect(options, mock.request), /snapshot metadata/);
  }
});

test('reject a deployment or block-number change, including on the empty final page', async () => {
  for (const meta of [{ ...metadata(), deployment: 'different-deployment' },
    { ...metadata(), block: { number: 124, hash: blockHash } }]) {
    const mock = mockRequest([payload(['a']), payload([], meta)]);
    await assert.rejects(collect(options, mock.request), /Snapshot changed/);
  }
});

test('reject missing transaction data rather than claiming no results', async () => {
  for (const transactions of [null, undefined, {}]) {
    const mock = mockRequest([{ data: { _meta: metadata(), userTransactions: transactions } }]);
    await assert.rejects(collect(options, mock.request), /Missing transaction page/);
  }
});

test('reject duplicate, unordered and non-advancing cursors', async () => {
  for (const results of [[payload(['a', 'a'])], [payload(['b', 'a'])],
    [payload(['a']), payload(['a'])], [payload(['b']), payload(['a'])]]) {
    const mock = mockRequest(results);
    await assert.rejects(collect(options, mock.request), /Duplicate or unordered/);
  }
});

test('reject invalid transaction IDs', async () => {
  for (const id of [null, undefined, 1, '']) {
    const mock = mockRequest([payload([id])]);
    await assert.rejects(collect(options, mock.request), /Duplicate or unordered/);
  }
});

test('CLI validates configuration and exits non-zero without printing a success summary', () => {
  const result = spawnSync(process.execPath,
    [fileURLToPath(new URL('./paginate-user-transactions.mjs', import.meta.url))],
    { encoding: 'utf8', env: {
      ...process.env, SUBGRAPH_URL: '', USER_ADDRESS: '', BLOCK_HASH: '',
    } });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /SUBGRAPH_URL/);
});

test('CLI prints a summary only after reaching the empty final page', () => {
  const results = [payload(['a', 'b']), payload(['c']), payload([])];
  const bootstrap = `const results = ${JSON.stringify(results)};
    globalThis.fetch = async () => {
      const result = results.shift();
      if (!result) throw new Error('unexpected request');
      return { ok: true, json: async () => result };
    };`;
  const result = spawnSync(process.execPath,
    ['--import', `data:text/javascript,${encodeURIComponent(bootstrap)}`,
      fileURLToPath(new URL('./paginate-user-transactions.mjs', import.meta.url))],
    { encoding: 'utf8', env: { ...process.env, SUBGRAPH_URL: options.url,
      USER_ADDRESS: user, BLOCK_HASH: blockHash, PAGE_SIZE: '2' } });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    count: 3, deployment: 'test-deployment', block: metadata().block,
  });
});

test('CLI rejects a later failed page without printing partial success', () => {
  const results = [payload(['a']), { errors: [{ message: 'index unavailable' }] }];
  const bootstrap = `const results = ${JSON.stringify(results)};
    globalThis.fetch = async () => ({ ok: true, json: async () => results.shift() });`;
  const result = spawnSync(process.execPath,
    ['--import', `data:text/javascript,${encodeURIComponent(bootstrap)}`,
      fileURLToPath(new URL('./paginate-user-transactions.mjs', import.meta.url))],
    { encoding: 'utf8', env: { ...process.env, SUBGRAPH_URL: options.url,
      USER_ADDRESS: user, BLOCK_HASH: blockHash, PAGE_SIZE: '2' } });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /returned errors/);
});
