import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { findRoutes, parseLatLon } from '../services/routing.js';

const router = Router();

// GET /api/route?from=lat,lon&to=lat,lon : real road routes (driving, which cars and bikes share).
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const from = parseLatLon(req.query.from);
  const to = parseLatLon(req.query.to);
  if (!from || !to) {
    res.status(400).json({ error: 'from and to must be "lat,lon"' });
    return;
  }
  try {
    const { source, routes } = await findRoutes(from, to);
    res.json({ source, profile: 'driving', routes });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

export default router;
