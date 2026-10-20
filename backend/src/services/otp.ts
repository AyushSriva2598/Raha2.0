// One-time sign-in codes sent by SMS. Codes are stored hashed, expire, and are rate limited.
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { config } from '../config/index.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;

interface Entry {
  hash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sends: number[];
}

const entries = new Map<string, Entry>();

export class OtpError extends Error {
  constructor(
    public code: 'INVALID_PHONE' | 'COOLDOWN' | 'LIMIT' | 'SMS_NOT_CONFIGURED',
    message: string,
    public retryAfterSec?: number
  ) {
    super(message);
  }
}

/** E.164 only (+ country code and number). Returns null when it cannot be a real number. */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[\s\-().]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
}

const hashCode = (phone: string, code: string) => createHash('sha256').update(`${phone}:${code}`).digest('hex');

async function sendSms(phone: string, code: string): Promise<void> {
  if (process.env.SMS_PROVIDER) {
    // Plug a real provider in here (for example Amazon SNS). Never log the code in production.
    throw new OtpError('SMS_NOT_CONFIGURED', `SMS provider "${process.env.SMS_PROVIDER}" is not implemented yet`);
  }
  if (config.nodeEnv === 'production') throw new OtpError('SMS_NOT_CONFIGURED', 'SMS delivery is not configured');
  console.log(`[otp] development code for ${phone}: ${code}`);
}

/** Creates and sends a code. In development the code is also returned so the app can show it. */
export async function issueOtp(phone: string): Promise<{ code?: string; expiresInSec: number; resendAfterSec: number }> {
  const now = Date.now();
  const entry = entries.get(phone);
  if (entry && now - entry.lastSentAt < RESEND_COOLDOWN_MS) {
    throw new OtpError('COOLDOWN', 'Please wait before asking for another code.', Math.ceil((RESEND_COOLDOWN_MS - (now - entry.lastSentAt)) / 1000));
  }
  const recent = (entry?.sends ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    throw new OtpError('LIMIT', 'Too many codes requested. Try again later.', 3600);
  }

  const devFixed = config.nodeEnv !== 'production' ? process.env.DEV_OTP : undefined;
  const code = devFixed && /^\d{6}$/.test(devFixed) ? devFixed : String(randomInt(0, 1_000_000)).padStart(6, '0');
  await sendSms(phone, code);

  entries.set(phone, { hash: hashCode(phone, code), expiresAt: now + CODE_TTL_MS, attempts: 0, lastSentAt: now, sends: [...recent, now] });
  return {
    code: config.nodeEnv !== 'production' ? code : undefined,
    expiresInSec: CODE_TTL_MS / 1000,
    resendAfterSec: RESEND_COOLDOWN_MS / 1000,
  };
}

export type OtpCheck = 'ok' | 'invalid' | 'expired' | 'locked';

export function checkOtp(phone: string, code: string): OtpCheck {
  const entry = entries.get(phone);
  if (!entry) return 'expired';
  if (entry.expiresAt < Date.now()) {
    entries.delete(phone);
    return 'expired';
  }
  if (entry.attempts >= MAX_ATTEMPTS) return 'locked';
  entry.attempts += 1;
  const given = Buffer.from(hashCode(phone, code));
  const expected = Buffer.from(entry.hash);
  if (given.length === expected.length && timingSafeEqual(given, expected)) {
    entries.delete(phone);
    return 'ok';
  }
  return 'invalid';
}
