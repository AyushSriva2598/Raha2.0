import { Router, Request, Response } from 'express';
import { db } from '../db/db.js';

const router = Router();

// GET /api/safe-points?zoneId=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const zoneId = req.query.zoneId as string | undefined;
    const safePoints = await db.getSafePoints(zoneId);
    res.json(safePoints);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/safe-points/nearest?lat=27.60&lon=88.64&limit=5
router.get('/nearest', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({ error: 'Valid lat and lon query parameters are required' });
      return;
    }

    const nearest = await db.getNearestSafePoints(lat, lon, limit);
    res.json(nearest);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
