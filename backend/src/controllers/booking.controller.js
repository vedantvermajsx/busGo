import bookingService from '../services/BookingService.js';
import mapsService from '../services/OSMMapsService.js';

// GET /api/bookings/fare?fromLat&fromLng&toLat&toLng&tripId
export const getFare = async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng, tripId } = req.query;
    if (!fromLat || !fromLng || !toLat || !toLng || !tripId) {
      return res.status(400).json({ success: false, message: 'Missing required params: fromLat, fromLng, toLat, toLng, tripId' });
    }
    const fare = await bookingService.getFarePreview(
      parseFloat(fromLat), parseFloat(fromLng),
      parseFloat(toLat), parseFloat(toLng),
      tripId
    );
    res.json({ success: true, ...fare });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/bookings
export const createBooking = async (req, res) => {
  try {
    const { tripId, fromLat, fromLng, toLat, toLng, fromAddress, toAddress, numPeople, price, seatNumbers, isFullBus } = req.body;
    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ success: false, message: 'fromLat, fromLng, toLat, toLng are required' });
    }
    const booking = await bookingService.createBooking({
      userId: req.user._id,
      tripId,
      fromLat: parseFloat(fromLat),
      fromLng: parseFloat(fromLng),
      toLat: parseFloat(toLat),
      toLng: parseFloat(toLng),
      fromAddress,
      toAddress,
      numPeople: Number(numPeople) || 1,
      price: Number(price),
      seatNumbers: seatNumbers,
      isFullBus: !!isFullBus,
    });
    res.status(201).json({ success: true, booking, message: 'Booking submitted — awaiting admin confirmation' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/bookings/trip/:tripId/seats
export const getBookedSeats = async (req, res) => {
  try {
    const seats = await bookingService.getBookedSeats(req.params.tripId);
    res.json({ success: true, seats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bookings/my
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getUserBookings(req.user._id);
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/bookings/:id/cancel
export const cancelBooking = async (req, res) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, req.user._id, req.body.reason);
    res.json({ success: true, booking });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/bookings/:id/confirm  (admin only)
export const confirmBooking = async (req, res) => {
  try {
    const booking = await bookingService.confirmBooking(req.params.id, req.user._id);
    res.json({ success: true, booking, message: 'Booking confirmed successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/bookings/:id/reject  (admin only)
export const rejectBooking = async (req, res) => {
  try {
    const booking = await bookingService.rejectBooking(req.params.id, req.user._id, req.body.reason);
    res.json({ success: true, booking, message: 'Booking rejected' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/bookings/reverse-geocode?lat&lng  (helper for frontend)
export const reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const result = await mapsService.reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
