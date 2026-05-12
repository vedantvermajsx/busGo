import User from '../models/User.js';
import Bus from '../models/Bus.js';
import Trip from '../models/Trip.js';
import Booking from '../models/Booking.js';
import Stop from '../models/Stop.js';
import Route from '../models/Route.js';

// GET /api/admin/dashboard
export const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers, totalBuses, totalTrips, totalBookings,
      pendingTrips, activeTrips, todayBookings, revenue
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Bus.countDocuments({ isActive: true }),
      Trip.countDocuments(),
      Booking.countDocuments({ status: { $in: ['confirmed', 'completed'] } }), // Exclude pending and cancelled from total success count
      // Trips needing attention: either not approved by admin OR not confirmed by operator
      Trip.countDocuments({
        $or: [{ adminApproved: false }, { operatorConfirmed: false }],
        status: 'scheduled'
      }),
      Trip.countDocuments({ status: { $in: ['boarding', 'on-trip'] } }),
      Booking.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        status: 'confirmed'
      }),
      Booking.aggregate([
        { $match: { status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ])
    ]);

    // Upcoming trips needing attention (next 24h, not confirmed)
    const urgentTrips = await Trip.find({
      startTime: { $gte: new Date(), $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      $or: [{ operatorConfirmed: false }, { adminApproved: false }],
      status: { $ne: 'cancelled' }
    })
      .populate('busId', 'vehicleNumber operatorName type')
      .populate('routePath', 'name city')
      .sort({ startTime: 1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalUsers, totalBuses, totalTrips, totalBookings,
        pendingTrips, activeTrips, todayBookings,
        totalRevenue: revenue[0]?.total || 0
      },
      urgentTrips
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/trips — with filters
export const getAllTrips = async (req, res) => {
  try {
    const { status, date, page = 1, limit = 20, needsAttention } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (needsAttention === 'true') {
      filter.$or = [{ operatorConfirmed: false }, { adminApproved: false }];
      filter.status = { $ne: 'cancelled' };
    }
    if (date) {
      const d = new Date(date);
      filter.startTime = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }

    const trips = await Trip.find(filter)
      .populate('busId', 'vehicleNumber operatorName type capacity')
      .populate('stops.stopId')
      .sort({ startTime: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Trip.countDocuments(filter);

    res.json({ success: true, trips, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/trips/:id
export const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('busId')
      .populate('stops.stopId');
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/trips/:id
export const updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('busId').populate('stops.stopId');
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/stops — all stops
export const getAllStops = async (req, res) => {
  try {
    const stops = await Stop.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, stops });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/trips/:id/approve
export const approveTrip = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { adminApproved: true },
      { new: true }
    ).populate('busId', 'vehicleNumber operatorName');
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.json({ success: true, trip, message: 'Trip approved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/trips/:id/cancel
export const cancelTrip = async (req, res) => {
  try {
    const { reason } = req.body;
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', notes: reason },
      { new: true }
    );
    // Cancel all bookings for this trip
    await Booking.updateMany({ tripId: req.params.id, status: 'confirmed' }, { status: 'cancelled', cancellationReason: 'Trip cancelled by admin' });
    res.json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/operators — list operators with their trips
export const getOperators = async (req, res) => {
  try {
    const operators = await User.find({ role: { $in: ['operator', 'admin'] } }).select('-passwordHash');
    const result = await Promise.all(
      operators.map(async (op) => {
        const buses = await Bus.find({ operatorId: op._id });
        const trips = await Trip.find({ busId: { $in: buses.map(b => b._id) } })
          .select('startTime status operatorConfirmed')
          .sort({ startTime: -1 })
          .limit(5);
        return { operator: op, buses, recentTrips: trips };
      })
    );
    res.json({ success: true, operators: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/call-request — log an admin call request to operator
export const logCallRequest = async (req, res) => {
  try {
    const { tripId, operatorPhone, reason, urgency } = req.body;
    // In production this could send an SMS/notification; here we log it
    const trip = await Trip.findById(tripId).populate('busId');
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    // Mark trip as needs_call (store in notes for now)
    trip.notes = `[CALL REQUESTED - ${urgency?.toUpperCase() || 'NORMAL'}] ${reason} | Admin: ${req.user.name} | ${new Date().toISOString()}`;
    await trip.save();

    res.json({
      success: true,
      message: 'Call request logged',
      callInfo: {
        operatorName: trip.busId.operatorName,
        vehicleNumber: trip.busId.vehicleNumber,
        reason,
        urgency,
        requestedBy: req.user.name,
        requestedAt: new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/trips/:id/confirm-operator
export const confirmOperator = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { operatorConfirmed: true },
      { new: true }
    ).populate('busId');
    res.json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/bookings — all bookings with filters
export const getAllBookings = async (req, res) => {
  try {
    const { status, tripId, page = 1, limit = 20, search } = req.query;
    const bookingService = (await import('../services/BookingService.js')).default;
    
    // Hide cancelled bookings from admin as requested
    const result = await bookingService.getAllBookings({ 
      status: status && status !== 'cancelled' ? status : { $ne: 'cancelled' }, 
      tripId, 
      page, 
      limit, 
      search 
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/buses — manage all buses
export const getAllBuses = async (req, res) => {
  try {
    const buses = await Bus.find().populate('operatorId', 'name phone');
    res.json({ success: true, buses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/buses — create bus
export const createBus = async (req, res) => {
  try {
    const bus = await Bus.create(req.body);
    res.status(201).json({ success: true, bus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/buses/:id/status
export const updateBusStatus = async (req, res) => {
  try {
    const bus = await Bus.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, bus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/buses/:id
export const deleteBus = async (req, res) => {
  try {
    // Check if bus is associated with any upcoming trips
    const upcomingTrips = await Trip.findOne({ 
      busId: req.params.id, 
      status: { $in: ['scheduled', 'boarding', 'on-trip'] } 
    });

    if (upcomingTrips) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete bus with active or upcoming trips. Cancel the trips first.' 
      });
    }

    await Bus.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Bus deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/bookings/:id/verify
export const verifyBookingCode = async (req, res) => {
  try {
    const { code } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.verificationCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    booking.isVerified = true;
    booking.verifiedAt = new Date();
    await booking.save();

    // Remove code from response object
    const bookingResponse = booking.toObject();
    delete bookingResponse.verificationCode;

    // If this is the first booking verified for this trip, mark trip as "on-trip" (initiated)
    if (booking.tripId) {
      await Trip.findByIdAndUpdate(booking.tripId, { 
        $set: { status: 'on-trip' } 
      });
    }

    res.json({ success: true, message: 'Pickup verified successfully', booking: bookingResponse });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/trips/:id/finish
export const finishTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    if (trip.status !== 'on-trip') {
      return res.status(400).json({ success: false, message: 'Trip must be initiated (on-trip) before finishing' });
    }

    trip.status = 'completed';
    await trip.save();

    // Also mark all confirmed bookings for this trip as completed
    await Booking.updateMany(
      { tripId: trip._id, status: 'confirmed' },
      { $set: { status: 'completed' } }
    );

    res.json({ success: true, message: 'Trip finished successfully', trip });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/bookings/pending — pending bookings awaiting admin confirmation
export const getPendingBookings = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const bookingService = (await import('../services/BookingService.js')).default;
    const result = await bookingService.getAllBookings({ 
      status: 'pending', 
      page, 
      limit,
      search 
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
