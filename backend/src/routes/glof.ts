import { Router, Request, Response } from 'express';
import { getGlofLake, getGlofLakes } from '../services/glofMonitor.js';

const router = Router();

// GET /api/glof/lakes   Lakes available in the 3D monitor
router.get('/lakes', async (_req: Request, res: Response) => {
  try {
    res.json(await getGlofLakes());
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// GET /api/glof/:lakeId[?refresh=1]   Slim lake history for the 3D view
router.get('/:lakeId', async (req: Request, res: Response) => {
  try {
    res.json(await getGlofLake(req.params.lakeId, req.query.refresh === '1'));
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

export default router;
