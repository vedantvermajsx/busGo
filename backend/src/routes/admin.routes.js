import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import {
  getDashboard, getAllTrips, approveTrip, cancelTrip,
  getOperators, logCallRequest, confirmOperator,
  getAllBookings, getAllBuses, createBus, updateBusStatus, deleteBus,
  getPendingBookings, getTripById, updateTrip, getAllStops,
  verifyBookingCode, finishTrip
} from '../controllers/admin.controller.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.delete('/buses/:id', deleteBus);
router.get('/dashboard', getDashboard);
router.get('/trips', getAllTrips);
router.get('/trips/:id', getTripById);
router.patch('/trips/:id', updateTrip);
router.patch('/trips/:id/finish', finishTrip);
router.get('/stops', getAllStops);
router.patch('/trips/:id/approve', approveTrip);
router.patch('/trips/:id/cancel', cancelTrip);
router.patch('/trips/:id/confirm-operator', confirmOperator);
router.get('/operators', getOperators);
router.post('/call-request', logCallRequest);
router.get('/bookings', getAllBookings);
router.patch('/bookings/:id/verify', verifyBookingCode);
router.get('/bookings/pending', getPendingBookings);
router.get('/buses', getAllBuses);
router.post('/buses', createBus);
router.patch('/buses/:id/status', updateBusStatus);

export default router;
