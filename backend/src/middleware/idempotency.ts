import { NextFunction, Request, Response } from 'express';

// Replays the first answer when a client repeats a request with the same Idempotency-Key, so a retry
// after a dropped connection cannot create a second record (or send a second SOS). A repeat that
// arrives while the first is still running waits for it. Per user, kept for 24 hours, in memory:
// the DynamoDB-backed version replaces this store when the API moves to AWS.

interface Entry {
  fingerprint: string;
  result: Promise<{ status: number; body: unknown }>;
  at: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const entries = new Map<string, Entry>();

function sweep(now: number) {
  for (const [k, e] of entries) if (now - e.at > TTL_MS) entries.delete(k);
}

/** Wraps a handler that returns the status and body to send. The header is optional. */
export function idempotent(handler: (req: Request) => Promise<{ status: number; body: unknown }>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.header('Idempotency-Key');
      if (!key) {
        const r = await handler(req);
        res.status(r.status).json(r.body);
        return;
      }
      if (!KEY_PATTERN.test(key)) {
        res.status(400).json({ error: 'Idempotency-Key must be 8 to 128 letters, digits, - or _.' });
        return;
      }

      const now = Date.now();
      sweep(now);
      const id = `${req.userId}:${req.method}:${req.baseUrl}${req.path}:${key}`;
      const fingerprint = JSON.stringify(req.body ?? null);
      const existing = entries.get(id);
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          res.status(422).json({ error: 'This Idempotency-Key was already used with a different request.' });
          return;
        }
        const r = await existing.result;
        res.status(r.status).set('Idempotent-Replay', 'true').json(r.body);
        return;
      }

      const result = handler(req);
      entries.set(id, { fingerprint, result, at: now });
      try {
        const r = await result;
        // A failed attempt must stay retryable.
        if (r.status >= 500) entries.delete(id);
        res.status(r.status).json(r.body);
      } catch (e) {
        entries.delete(id);
        throw e;
      }
    } catch (e) {
      next(e);
    }
  };
}

/** Test helper. */
export function clearIdempotencyStore() {
  entries.clear();
}
