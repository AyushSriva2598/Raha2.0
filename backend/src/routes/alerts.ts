import { Router, Request, Response } from 'express';
import { db } from '../db/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { idempotent } from '../middleware/idempotency.js';
import { realtimeService } from '../services/realtimeService.js';
import { SosBroadcastPayload } from '../types/index.js';

const router = Router();

// POST /api/alerts/sos-broadcast
// A repeated Idempotency-Key returns the first answer instead of sending a second SOS.
router.post(
  '/sos-broadcast',
  requireAuth,
  idempotent(async (req: Request) => {
    const payload: SosBroadcastPayload = req.body;
    if (!payload.recipientContactIds || !Array.isArray(payload.recipientContactIds)) {
      return { status: 400, body: { error: 'recipientContactIds array is required' } };
    }

    try {
      const response = await db.recordSosBroadcast(req.userId as string, payload);

      // Notify connected web dashboards and emergency operators
      realtimeService.broadcastSosAlert({
        ...payload,
        ...response,
      });

      return { status: 200, body: response };
    } catch (error) {
      return { status: 500, body: { error: (error as Error).message } };
    }
  })
);

export default router;
