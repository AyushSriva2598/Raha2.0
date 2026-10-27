import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config/index.js';
import { setSmsProvider, type SmsProvider } from './messaging/sms.js';
import { clearSosCounters, dispatchSos, sosMessage } from './sosDispatch.js';
import type { SosBroadcastPayload, SosContact } from '../types/index.js';

const payload: SosBroadcastPayload = {
  userId: 'u1', latitude: 27.6, longitude: 88.6, alertLevel: 'WARNING',
  timestamp: '2026-10-28T10:00:00Z', recipientContactIds: ['a', 'b'],
};
const contact = (id: string, phone: string): SosContact =>
  ({ contactId: id, name: id, relation: 'Kin', phone, isActive: true, notifyOnRisk: true }) as SosContact;

function fake(okFor: (to: string) => boolean): SmsProvider & { sent: string[] } {
  const sent: string[] = [];
  return { name: 'fake', sent, async send(to) { sent.push(to); return okFor(to) ? { ok: true, messageId: 'm' } : { ok: false, error: 'x' }; } };
}

beforeEach(() => {
  clearSosCounters();
  config.sos.live = false;
  setSmsProvider(null);
});

test('with SOS switched off it records and says nothing was sent', async () => {
  const p = fake(() => true);
  setSmsProvider(p);
  const r = await dispatchSos('u1', 'Asha', [contact('a', '+919800000001')], payload);
  assert.equal(r.status, 'RECORDED');
  assert.equal(r.smsCount, 0);
  assert.equal(p.sent.length, 0);
});

test('live: counts only messages the provider accepted', async () => {
  config.sos.live = true;
  const p = fake((to) => to === '+919800000001');
  setSmsProvider(p);
  const r = await dispatchSos('u1', 'Asha', [contact('a', '+91 98000 00001'), contact('b', '+919800000002')], payload);
  assert.deepEqual([r.status, r.smsCount, r.recipients], ['PARTIAL', 1, 2]);
});

test('live: all accepted is SENT, none accepted is FAILED', async () => {
  config.sos.live = true;
  setSmsProvider(fake(() => true));
  assert.equal((await dispatchSos('u1', 'A', [contact('a', '+919800000001')], payload)).status, 'SENT');
  setSmsProvider(fake(() => false));
  assert.equal((await dispatchSos('u2', 'A', [contact('a', '+919800000001')], payload)).status, 'FAILED');
});

test('the daily cap stops further messages', async () => {
  config.sos.live = true;
  config.sos.maxPerUserPerDay = 1;
  setSmsProvider(fake(() => true));
  await dispatchSos('u1', 'A', [contact('a', '+919800000001')], payload);
  const r = await dispatchSos('u1', 'A', [contact('a', '+919800000001')], payload);
  assert.equal(r.status, 'FAILED');
  config.sos.maxPerUserPerDay = 5;
});

test('the message never invents a location', () => {
  assert.match(sosMessage('Asha', payload), /maps\.google\.com\/\?q=27\.60000,88\.60000/);
  const none = sosMessage('Asha', { ...payload, latitude: null, longitude: null });
  assert.match(none, /Location unavailable/);
  assert.doesNotMatch(none, /maps\.google/);
});
