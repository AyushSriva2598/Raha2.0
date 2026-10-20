import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../services/session.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Requires `Authorization: Bearer <token>`; sets req.userId or answers 401. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    res.status(401).json({ error: 'Please sign in again.' });
    return;
  }
  req.userId = userId;
  next();
}
