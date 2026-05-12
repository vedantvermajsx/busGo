import { Router } from 'express';
import Stop from '../models/Stop.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const stops = await Stop.find({ isActive: true }).sort({ city: 1, name: 1 });
    res.json({ success: true, stops });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const stop = await Stop.create(req.body);
    res.status(201).json({ success: true, stop });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const stop = await Stop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, stop });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await Stop.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Stop deactivated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
