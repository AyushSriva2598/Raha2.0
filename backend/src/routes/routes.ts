import { Router, Request, Response } from 'express';
import { db } from '../db/db.js';
import { googleMapsService } from '../services/googleMapsService.js';

const router = Router();

// POST /api/routes/calculate
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { origin, destination, avoidHazards = true } = req.body;

    // Check if Google Maps Directions API returns an active walking evacuation route
    const googleRoute = origin && destination ? await googleMapsService.calculateWalkingRoute(origin, destination) : null;
    const dbRoutes = await db.calculateRoutes(origin, destination, avoidHazards);

    const routes = googleRoute ? [googleRoute, ...dbRoutes] : dbRoutes;
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/routes/offline-pack?zoneId=chungthang-zone
router.get('/offline-pack', async (req: Request, res: Response) => {
  try {
    const zoneId = (req.query.zoneId as string) || 'chungthang-zone';
    const safePoints = await db.getSafePoints(zoneId);

    // GeoJSON FeatureCollection containing evacuation routes and safe shelters
    const offlinePack = {
      type: 'FeatureCollection',
      zoneId,
      generatedAt: new Date().toISOString(),
      features: safePoints.map((sp) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [sp.coordinates.longitude, sp.coordinates.latitude],
        },
        properties: {
          id: sp.pointId,
          name: sp.name,
          type: sp.type,
          elevationGainM: sp.elevationGainM,
          walkingTimeMinutes: sp.walkingTimeMinutes,
          contactPhone: sp.contactPhone,
          isRecommended: sp.isRecommended,
        },
      })),
    };

    res.json(offlinePack);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
