import { Router } from 'express';
import Bus from '../models/Bus.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', async (req, res) => {
  const buses = await Bus.find({ isActive: true });
  res.json({ success: true, buses });
});
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const bus = await Bus.create(req.body);
    res.status(201).json({ success: true, bus });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
export default router;
