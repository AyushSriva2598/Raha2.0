import { Router, Request, Response } from 'express';
import { glofData } from '../services/glofData.js';

const router = Router();

// GET /api/glof/lakes   Lakes available in the 3D monitor
router.get('/lakes', async (_req: Request, res: Response) => {
  try {
    res.json(await glofData().getLakes());
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

// GET /api/glof/:lakeId[?refresh=1]   Lake history for the 3D view (outlines, alert levels, numbers)
router.get('/:lakeId', async (req: Request, res: Response) => {
  try {
    const data = await glofData().getLake(req.params.lakeId, req.query.refresh === '1');
    if (!data) {
      res.status(404).json({ error: 'No data for this lake yet.' });
      return;
    }
    if (data.stale) res.setHeader('X-Data-Stale', '1');
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

export default router;
