import { Router, Request, Response } from 'express';
import { db } from '../db/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { realtimeService } from '../services/realtimeService.js';
import { SosBroadcastPayload } from '../types/index.js';

const router = Router();

// POST /api/alerts/sos-broadcast
router.post('/sos-broadcast', requireAuth, async (req: Request, res: Response) => {
  try {
    const payload: SosBroadcastPayload = req.body;
    if (!payload.recipientContactIds || !Array.isArray(payload.recipientContactIds)) {
      res.status(400).json({ error: 'recipientContactIds array is required' });
      return;
    }

    const response = await db.recordSosBroadcast(req.userId as string, payload);

    // Notify connected web dashboards and emergency operators
    realtimeService.broadcastSosAlert({
      ...payload,
      ...response,
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
