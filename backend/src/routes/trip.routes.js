import { Router } from 'express';
import { getTrips, getTripById, createTrip } from '../controllers/trip.controller.js';
import { authenticate, requireAdmin, requireOperator } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getTrips);
router.get('/:id', getTripById);
router.post('/', authenticate, requireOperator, createTrip);

export default router;
