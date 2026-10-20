import { Router, Request, Response } from 'express';
import { getLiveFeed } from '../services/liveFeed.js';

const router = Router();

// GET /api/feed[?refresh=1]  Live weather, earthquake and news items with sources
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json(await getLiveFeed(req.query.refresh === '1'));
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

export default router;
