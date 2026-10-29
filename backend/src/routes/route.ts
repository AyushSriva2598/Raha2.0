import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { findRoutes, parseLatLon } from '../services/routing.js';

const router = Router();

// GET /api/route?from=lat,lon&to=lat,lon[&via=lat,lon] : real road routes (driving, which cars and
// bikes share). `via` asks for the road through one point, which the app uses to find flood-zone detours.
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const from = parseLatLon(req.query.from);
  const to = parseLatLon(req.query.to);
  const via = req.query.via === undefined ? undefined : parseLatLon(req.query.via);
  if (!from || !to || via === null) {
    res.status(400).json({ error: 'from, to and via must be "lat,lon"' });
    return;
  }
  try {
    const { source, routes } = await findRoutes(from, to, via);
    res.json({ source, profile: 'driving', routes });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

export default router;
