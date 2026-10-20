import { Router, Request, Response } from 'express';
import { db } from '../db/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkOtp, issueOtp, normalizePhone, OtpError } from '../services/otp.js';
import { signToken } from '../services/session.js';

const router = Router();

// POST /api/auth/send-otp  { phone }  Sends a one-time code by SMS
router.post('/send-otp', async (req: Request, res: Response) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) {
    res.status(400).json({ error: 'Enter your phone number with the country code, for example +91 98300 12345.' });
    return;
  }
  try {
    const sent = await issueOtp(phone);
    res.json({ success: true, expiresInSec: sent.expiresInSec, resendAfterSec: sent.resendAfterSec, debugCode: sent.code });
  } catch (error) {
    if (error instanceof OtpError) {
      const status = error.code === 'SMS_NOT_CONFIGURED' ? 503 : 429;
      res.status(status).json({ error: error.message, retryAfterSec: error.retryAfterSec });
      return;
    }
    res.status(500).json({ error: 'Could not send the code. Please try again.' });
  }
});

// POST /api/auth/verify-otp  { phone, code }  Signs in (or registers) and returns a session token
router.post('/verify-otp', async (req: Request, res: Response) => {
  const phone = normalizePhone(req.body?.phone);
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!phone || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'Enter the 6-digit code.' });
    return;
  }
  const result = checkOtp(phone, code);
  if (result !== 'ok') {
    const messages = {
      invalid: 'That code is not right. Check it and try again.',
      expired: 'That code has expired. Ask for a new one.',
      locked: 'Too many wrong tries. Ask for a new code.',
    } as const;
    res.status(result === 'invalid' ? 401 : 410).json({ error: messages[result], reason: result });
    return;
  }
  try {
    const { profile, isNewUser } = await db.findOrCreateUserByPhone(phone);
    res.json({ success: true, token: signToken(profile.userId), isNewUser, profile });
  } catch {
    res.status(500).json({ error: 'Could not sign you in. Please try again.' });
  }
});

// GET /api/auth/me  Returns the signed-in user's profile (used to restore a saved session)
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    res.json(await db.getUserProfile(req.userId as string));
  } catch {
    res.status(401).json({ error: 'Please sign in again.' });
  }
});

export default router;
