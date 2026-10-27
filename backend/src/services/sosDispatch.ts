import { config } from '../config/index.js';
import { SosBroadcastPayload, SosContact, SosResponse } from '../types/index.js';
import { normalisePhone, smsProvider } from './messaging/sms.js';

// Turns an SOS into text messages, honestly: the result says how many were really accepted, and says
// plainly when nothing was sent. Wording is deliberately short, plain and not an official warning.

const sentToday = new Map<string, { day: string; count: number }>();

function underDailyCap(userId: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = sentToday.get(userId);
  if (!entry || entry.day !== day) return true;
  return entry.count < config.sos.maxPerUserPerDay;
}

function countOne(userId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const entry = sentToday.get(userId);
  sentToday.set(userId, entry && entry.day === day ? { day, count: entry.count + 1 } : { day, count: 1 });
}

export function sosMessage(name: string, payload: SosBroadcastPayload): string {
  const where =
    payload.latitude != null && payload.longitude != null
      ? `Location: https://maps.google.com/?q=${payload.latitude.toFixed(5)},${payload.longitude.toFixed(5)}`
      : 'Location unavailable: call them.';
  return `RAHA SOS: ${name || 'Someone you know'} pressed the SOS button and may need help. ${where} Sent ${payload.timestamp}. Automated message from the Raha app. Call them now.`;
}

export function clearSosCounters() {
  sentToday.clear();
}

export async function dispatchSos(
  userId: string,
  userName: string,
  recipients: SosContact[],
  payload: SosBroadcastPayload
): Promise<Pick<SosResponse, 'smsCount' | 'recipients' | 'status' | 'note'>> {
  const total = recipients.length;
  if (!config.sos.live || smsProvider().name === 'none') {
    return {
      smsCount: 0,
      recipients: total,
      status: 'RECORDED',
      note: 'Your SOS was saved, but text messages are not switched on yet. Call your contacts or the local helpline now.',
    };
  }
  if (total === 0) {
    return { smsCount: 0, recipients: 0, status: 'FAILED', note: 'No contact is set to receive SOS alerts.' };
  }
  if (!underDailyCap(userId)) {
    return { smsCount: 0, recipients: total, status: 'FAILED', note: 'Daily SOS limit reached. Call your contacts directly.' };
  }

  const body = sosMessage(userName, payload);
  let accepted = 0;
  for (const c of recipients) {
    const to = normalisePhone(c.phone);
    if (!to) continue;
    const result = await smsProvider().send(to, body);
    if (result.ok) {
      accepted += 1;
      countOne(userId);
    } else {
      console.warn(`[sos] SMS to contact ${c.contactId} failed: ${result.error}`);
    }
  }
  const status = accepted === 0 ? 'FAILED' : accepted === total ? 'SENT' : 'PARTIAL';
  return {
    smsCount: accepted,
    recipients: total,
    status,
    note: status === 'SENT' ? undefined : 'Some or all messages could not be sent. Call your contacts directly.',
  };
}
