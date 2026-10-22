import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { GlofData, LocalDirSource, type GlofSource } from './glofData.js';

const lake = { lake: { id: 'south_lhonak', name: 'South Lhonak Lake' }, frames: [{ i: 0 }], retrievedAt: 'x' };

async function tmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'glof-'));
}

class FlakySource implements GlofSource {
  describe = 'flaky';
  failing = false;
  async read(key: string): Promise<unknown | null> {
    if (this.failing) throw new Error('source down');
    return key === 'public/south_lhonak' ? lake : null;
  }
}

test('reads a published lake from a directory', async () => {
  const dir = await tmp();
  await fs.mkdir(path.join(dir, 'public'));
  await fs.writeFile(path.join(dir, 'public', 'south_lhonak.json'), JSON.stringify(lake));
  const data = new GlofData(new LocalDirSource(dir));
  assert.equal((await data.getLake('south_lhonak'))?.lake.id, 'south_lhonak');
  assert.equal(await data.getLake('nope'), null);
});

test('rejects unsafe lake ids without touching the source', async () => {
  const data = new GlofData(new LocalDirSource('/does/not/matter'));
  assert.equal(await data.getLake('../../etc/passwd'), null);
});

test('serves the last good copy (marked stale) when the source fails', async () => {
  const src = new FlakySource();
  const data = new GlofData(src);
  assert.equal((await data.getLake('south_lhonak'))?.stale, undefined);
  src.failing = true;
  const again = await data.getLake('south_lhonak', true);
  assert.equal(again?.stale, true);
  assert.equal(again?.lake.id, 'south_lhonak');
});

test('after a restart the disk copy still covers an outage', async () => {
  const cacheDir = await tmp();
  const src = new FlakySource();
  await new GlofData(src, cacheDir).getLake('south_lhonak');
  await new Promise((r) => setTimeout(r, 50)); // the disk write is fire-and-forget
  src.failing = true;
  const restarted = new GlofData(src, cacheDir);
  assert.equal((await restarted.getLake('south_lhonak'))?.stale, true);
});

test('with nothing saved, an outage is an error rather than an empty lake', async () => {
  const src = new FlakySource();
  src.failing = true;
  await assert.rejects(new GlofData(src).getLake('south_lhonak'));
});
