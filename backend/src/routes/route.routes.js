import { Router } from 'express';
import Route from '../models/Route.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const routes = await Route.find({ isActive: true })
      .populate('fromStopId', 'name city')
      .populate('toStopId', 'name city');
    res.json({ success: true, routes });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const route = await Route.create(req.body);
    res.status(201).json({ success: true, route });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, route });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await Route.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Route deactivated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
