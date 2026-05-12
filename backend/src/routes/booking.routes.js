import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  getFare,
  confirmBooking,
  rejectBooking,
  reverseGeocode,
  getBookedSeats,
} from '../controllers/booking.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public helpers
router.get('/fare', getFare);
router.get('/reverse-geocode', reverseGeocode);
router.get('/trip/:tripId/seats', getBookedSeats);

// User routes
router.get('/my', authenticate, getMyBookings);
router.post('/', authenticate, createBooking);
router.patch('/:id/cancel', authenticate, cancelBooking);

// Admin-only booking management
router.patch('/:id/confirm', authenticate, requireAdmin, confirmBooking);
router.patch('/:id/reject', authenticate, requireAdmin, rejectBooking);

export default router;
