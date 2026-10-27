import { Router, Request, Response } from 'express';
import { db } from '../db/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { idempotent } from '../middleware/idempotency.js';

const router = Router();

// Every user route belongs to the signed-in user.
router.use(requireAuth);

// GET /api/user/profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await db.getUserProfile(req.userId as string);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PATCH /api/user/profile
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const updated = await db.updateUserProfile(req.userId as string, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/user/contacts
// A repeated Idempotency-Key returns the first contact instead of adding a duplicate.
router.post(
  '/contacts',
  idempotent(async (req: Request) => {
    const { name, relation, phone, isActive = true, notifyOnRisk = true } = req.body;
    if (!name || !phone || !relation) {
      return { status: 400, body: { error: 'Name, phone, and relation are required' } };
    }
    try {
      const newContact = await db.addContact(req.userId as string, { name, relation, phone, isActive, notifyOnRisk });
      return { status: 201, body: newContact };
    } catch (error) {
      return { status: 500, body: { error: (error as Error).message } };
    }
  })
);

// PATCH /api/user/contacts/:contactId
router.patch('/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive boolean flag is required' });
      return;
    }
    const updated = await db.toggleContact(req.userId as string, contactId, isActive);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/user/contacts/:contactId
router.delete('/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const success = await db.deleteContact(req.userId as string, contactId);
    if (!success) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    res.json({ success: true, contactId });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
