import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { clearIdempotencyStore, idempotent } from './idempotency.js';

function makeApp() {
  let calls = 0;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = 'u1';
    next();
  });
  app.post(
    '/make',
    idempotent(async (req) => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 30));
      if (req.body.fail) return { status: 500, body: { error: 'boom' } };
      return { status: 201, body: { id: `rec-${calls}` } };
    })
  );
  return { app, calls: () => calls };
}

async function withServer(app: express.Express, run: (url: string) => Promise<void>) {
  const server = app.listen(0);
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}/make`);
  } finally {
    server.close();
  }
}

const post = (url: string, body: object, key?: string) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
    body: JSON.stringify(body),
  });

test('same key replays the first answer and runs the handler once', async () => {
  clearIdempotencyStore();
  const { app, calls } = makeApp();
  await withServer(app, async (url) => {
    const a = await post(url, { n: 1 }, 'key-12345678');
    const b = await post(url, { n: 1 }, 'key-12345678');
    assert.equal(a.status, 201);
    assert.deepEqual(await b.json(), { id: 'rec-1' });
    assert.equal(b.headers.get('idempotent-replay'), 'true');
    assert.equal(calls(), 1);
  });
});

test('a repeat that arrives while the first is running does not run twice', async () => {
  clearIdempotencyStore();
  const { app, calls } = makeApp();
  await withServer(app, async (url) => {
    const [a, b] = await Promise.all([post(url, { n: 2 }, 'key-concurrent'), post(url, { n: 2 }, 'key-concurrent')]);
    assert.deepEqual(await a.json(), await b.json());
    assert.equal(calls(), 1);
  });
});

test('same key with a different body is rejected', async () => {
  clearIdempotencyStore();
  const { app } = makeApp();
  await withServer(app, async (url) => {
    await post(url, { n: 1 }, 'key-different');
    assert.equal((await post(url, { n: 2 }, 'key-different')).status, 422);
  });
});

test('a failed attempt can be retried with the same key', async () => {
  clearIdempotencyStore();
  const { app, calls } = makeApp();
  await withServer(app, async (url) => {
    assert.equal((await post(url, { fail: true }, 'key-retry-ok')).status, 500);
    assert.equal((await post(url, { fail: true }, 'key-retry-ok')).status, 500);
    assert.equal(calls(), 2);
  });
});

test('no key means no deduplication, and a malformed key is a 400', async () => {
  clearIdempotencyStore();
  const { app, calls } = makeApp();
  await withServer(app, async (url) => {
    await post(url, { n: 1 });
    await post(url, { n: 1 });
    assert.equal(calls(), 2);
    assert.equal((await post(url, { n: 1 }, 'bad key!')).status, 400);
  });
});
