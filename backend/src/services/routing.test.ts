import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { OsrmProvider, clearRoutingCache, findRoutes, parseLatLon, parseOsrm, setRoutingProvider } from './routing.js';

const body = {
  code: 'Ok',
  routes: [
    { distance: 12345, duration: 1500, geometry: { coordinates: [[88.6, 27.6], [88.7, 27.7]] as [number, number][] } },
    { distance: 15000, duration: 1800, geometry: { coordinates: [[88.6, 27.6], [88.65, 27.65], [88.7, 27.7]] as [number, number][] } },
  ],
};

beforeEach(() => {
  clearRoutingCache();
  setRoutingProvider(null);
});

test('parseOsrm keeps the engine distance and time, rounded for display', () => {
  const r = parseOsrm(body);
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].distanceKm, r[0].durationMin], [12.3, 25]);
  assert.deepEqual(r[0].coordinates[0], [88.6, 27.6]);
});

test('NoRoute is an empty list, any other error is thrown', () => {
  assert.deepEqual(parseOsrm({ code: 'NoRoute' }), []);
  assert.throws(() => parseOsrm({ code: 'InvalidQuery' }));
});

test('OsrmProvider asks for lon,lat order and alternatives, and fails loudly on HTTP errors', async () => {
  let seen = '';
  const ok = new OsrmProvider('http://osrm.test', async (url) => {
    seen = url;
    return { ok: true, status: 200, json: async () => body };
  });
  await ok.route({ latitude: 27.6, longitude: 88.6 }, { latitude: 27.7, longitude: 88.7 });
  assert.match(seen, /\/route\/v1\/driving\/88\.6,27\.6;88\.7,27\.7\?alternatives=3&overview=full&geometries=geojson/);
  const bad = new OsrmProvider('http://osrm.test', async () => ({ ok: false, status: 503, json: async () => ({}) }));
  await assert.rejects(bad.route({ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 }), /503/);
});

test('a via point is sent between the two ends, without alternatives', async () => {
  let seen = '';
  const p = new OsrmProvider('http://osrm.test', async (url) => {
    seen = url;
    return { ok: true, status: 200, json: async () => body };
  });
  await p.route({ latitude: 27.6, longitude: 88.6 }, { latitude: 27.7, longitude: 88.7 }, undefined, { latitude: 27.65, longitude: 88.62 });
  assert.match(seen, /driving\/88\.6,27\.6;88\.62,27\.65;88\.7,27\.7\?alternatives=false/);
});

test('findRoutes caches a repeated trip', async () => {
  let calls = 0;
  setRoutingProvider({ name: 'fake', async route() { calls += 1; return parseOsrm(body); } });
  const a = { latitude: 27.6, longitude: 88.6 };
  const b = { latitude: 27.7, longitude: 88.7 };
  await findRoutes(a, b);
  await findRoutes(a, b);
  assert.equal(calls, 1);
});

test('parseLatLon rejects junk and out-of-range values', () => {
  assert.deepEqual(parseLatLon('27.6,88.6'), { latitude: 27.6, longitude: 88.6 });
  assert.equal(parseLatLon('abc,1'), null);
  assert.equal(parseLatLon('91,10'), null);
  assert.equal(parseLatLon('1,2,3'), null);
  assert.equal(parseLatLon(undefined), null);
});
