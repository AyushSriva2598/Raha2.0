// Signed session tokens (HS256 JWT) using only node:crypto.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

// Production must set JWT_SECRET. In development a random secret is created once and kept in a
// gitignored file, so sessions survive the dev server restarting without a secret in the repo.
function loadSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (config.nodeEnv === 'production') throw new Error('JWT_SECRET must be set in production');
  const file = path.resolve(process.cwd(), '.jwt-dev-secret');
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch {
    // create below
  }
  const created = randomBytes(32).toString('hex');
  fs.writeFileSync(file, created, { mode: 0o600 });
  return created;
}

const SECRET = loadSecret();
const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const sign = (data: string) => createHmac('sha256', SECRET).update(data).digest();

export function signToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ sub: userId, iat: now, exp: now + TOKEN_TTL_SECONDS }));
  return `${head}.${body}.${b64url(sign(`${head}.${body}`))}`;
}

/** Returns the user id for a valid, unexpired token, otherwise null. */
export function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = sign(`${parts[0]}.${parts[1]}`);
  let given: Buffer;
  try {
    given = Buffer.from(parts[2], 'base64url');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { sub?: string; exp?: number };
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
