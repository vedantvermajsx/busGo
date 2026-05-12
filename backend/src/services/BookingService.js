/**
 * BookingService — handles booking creation, confirmation, and cancellation.
 * All booking business logic lives here (not in controllers).
 */
import Booking from '../models/Booking.js';
import Trip from '../models/Trip.js';
import fareService from './FareService.js';

export class BookingService {
  /**
   * Create a new booking with map-pinned coordinates.
   * Status starts as "pending" — admin must confirm.
   */
  async createBooking({ userId, tripId, fromLat, fromLng, toLat, toLng, fromAddress, toAddress, numPeople = 1, price, seatNumbers, isFullBus = false }) {
    let trip = null;

    // Only process Trip-related logic if tripId is provided
    if (tripId) {
      // Handle Virtual Trip ID: v-busId-date
      if (typeof tripId === 'string' && tripId.startsWith('v-')) {
        const parts = tripId.split('-');
        const busId = parts[1];
        const dateStr = parts.slice(2).join('-'); // Rejoin date in case it has dashes
        
        const d = new Date(dateStr);
        const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 86400000);

        let realTrip = await Trip.findOne({
          busId,
          startTime: { $gte: startOfDay, $lt: endOfDay },
          status: { $ne: 'cancelled' }
        });

        if (!realTrip) {
          realTrip = await Trip.create({
            busId,
            startTime: new Date(startOfDay.getTime() + 8 * 3600000), // Default 8 AM
            endTime: new Date(startOfDay.getTime() + 18 * 3600000), // Default 6 PM
            basePricePerKm: 15,
            adminApproved: true,
            status: 'scheduled'
          });
        }
        tripId = realTrip._id;
      }

      trip = await Trip.findById(tripId).populate('busId');
      if (!trip) throw new Error('Trip not found');

      if (isFullBus) {
        // Check if ANY seats are already booked
        const existingBookings = await Booking.findOne({
          tripId,
          status: { $in: ['pending', 'confirmed', 'completed'] }
        });
        if (existingBookings) {
          throw new Error('Full bus booking is not available as some seats are already booked.');
        }
        numPeople = trip.busId.capacity;
        seatNumbers = Array.from({ length: trip.busId.capacity }, (_, i) => i + 1);
      } else {
        // Check if seats are already taken
        if (seatNumbers && seatNumbers.length > 0) {
          const existingSeat = await Booking.findOne({
            tripId,
            seatNumbers: { $in: seatNumbers },
            status: { $in: ['pending', 'confirmed', 'completed'] }
          });
          if (existingSeat) {
            throw new Error(`One or more selected seats are already booked.`);
          }
        }

        // Check for full bus booking that might exist
        const fullBusBooking = await Booking.findOne({
          tripId,
          isFullBus: true,
          status: { $in: ['pending', 'confirmed', 'completed'] }
        });
        if (fullBusBooking) {
          throw new Error('This bus is already fully booked.');
        }
      }

      trip = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        status: { $ne: 'cancelled' },
        adminApproved: true,
      },
      { $inc: { seatsBooked: numPeople } },
      { new: true, runValidators: true }
    ).populate('busId');

      if (!trip) {
        throw new Error('Trip not available or has not been approved by admin');
      }

      if (trip.seatsBooked > trip.busId.capacity) {
        // Rollback if we exceeded capacity
        await Trip.findByIdAndUpdate(tripId, { $inc: { seatsBooked: -numPeople } });
        throw new Error(`Not enough seats available.`);
      }
    }

    // Calculate fare via OSM using a default base price if trip isn't available
    const basePrice = trip ? trip.basePricePerKm : 15; // default 15 if no trip
    const fareInfo = await fareService.calculateFare(fromLat, fromLng, toLat, toLng, basePrice);
    
    // Always calculate price as: cost per person * number of people
    let finalPrice = price || (fareInfo.price * numPeople);
    
    // Round up to the nearest multiple of 10
    finalPrice = Math.ceil(finalPrice / 10) * 10;

    const booking = await Booking.create({
      userId,
      tripId,
      fromCoords: { lat: fromLat, lng: fromLng, address: fromAddress },
      toCoords: { lat: toLat, lng: toLng, address: toAddress },
      distanceKm: fareInfo.distanceKm,
      durationMinutes: fareInfo.durationMinutes,
      price: finalPrice,
      basePricePerKm: fareInfo.basePricePerKm,
      numPeople,
      status: 'pending',
      seatNumbers: seatNumbers || [],
      isFullBus,
      fareBreakdown: {
        distanceText: fareInfo.distanceText,
        durationText: fareInfo.durationText,
        isFallback: fareInfo.isFallback,
      },
    });

    return booking;
  }

  /**
   * Get all booked seats for a trip
   */
  async getBookedSeats(tripId) {
    // If virtual trip, no real seats can be booked yet
    if (typeof tripId === 'string' && tripId.startsWith('v-')) {
      return [];
    }

    const bookings = await Booking.find({
      tripId,
      status: { $in: ['pending', 'confirmed', 'completed'] }
    }).select('seatNumbers');
    
    const allBookedSeats = [];
    bookings.forEach(b => {
      if (b.seatNumbers) allBookedSeats.push(...b.seatNumbers);
    });
    return allBookedSeats;
  }

  /**
   * Admin confirms a pending booking
   */
  async confirmBooking(bookingId, adminId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'pending') throw new Error(`Cannot confirm booking with status: ${booking.status}`);

    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    booking.confirmedBy = adminId;
    await booking.save();

    return booking;
  }

  /**
   * Admin rejects a pending booking
   */
  async rejectBooking(bookingId, adminId, reason) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'pending') throw new Error(`Cannot reject booking with status: ${booking.status}`);

    booking.status = 'rejected';
    booking.cancellationReason = reason || 'Rejected by admin';
    booking.cancelledAt = new Date();
    await booking.save();

    // Free the reserved seat
    await Trip.findByIdAndUpdate(booking.tripId, { $inc: { seatsBooked: -1 } });

    return booking;
  }

  /**
   * User cancels their own booking
   */
  async cancelBooking(bookingId, userId, reason) {
    const booking = await Booking.findOne({ _id: bookingId, userId });
    if (!booking) throw new Error('Booking not found');
    if (['cancelled', 'completed', 'rejected'].includes(booking.status)) {
      throw new Error(`Cannot cancel booking with status: ${booking.status}`);
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Cancelled by user';
    booking.cancelledAt = new Date();
    await booking.save();

    await Trip.findByIdAndUpdate(booking.tripId, { $inc: { seatsBooked: -1 } });

    return booking;
  }

  /**
   * Get fare preview for a map selection (before booking)
   */
  async getFarePreview(fromLat, fromLng, toLat, toLng, tripId) {
    let basePrice = 15; // Default

    if (typeof tripId === 'string' && tripId.startsWith('v-')) {
      basePrice = 15;
    } else {
      const trip = await Trip.findById(tripId);
      if (trip) basePrice = trip.basePricePerKm;
    }

    return fareService.calculateFare(fromLat, fromLng, toLat, toLng, basePrice);
  }

  /**
   * Get all bookings for a user
   */
  async getUserBookings(userId) {
    return Booking.find({ userId })
      .populate({
        path: 'tripId',
        select: 'startTime endTime status busId',
        populate: {
          path: 'busId',
          select: 'vehicleNumber operatorName type capacity'
        }
      })
      .sort({ createdAt: -1 });
  }

  /**
   * Admin: get all bookings with optional filters
   */
  async getAllBookings({ status, tripId, page = 1, limit = 20, search } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (tripId) filter.tripId = tripId;
    if (search) {
      filter.bookingReference = { $regex: search, $options: 'i' };
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .select('-verificationCode')
        .populate('userId', 'name phone')
        .populate({
          path: 'tripId',
          select: 'startTime status busId',
          populate: {
            path: 'busId',
            select: 'vehicleNumber operatorName type'
          }
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Booking.countDocuments(filter),
    ]);

    return { bookings, total, page: Number(page), pages: Math.ceil(total / limit) };
  }
}

export default new BookingService();
