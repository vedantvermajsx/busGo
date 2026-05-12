/**
 * TripService — trip search and management.
 * Removes manual route/stop path checking — trips now searched by any A→B combo.
 */
import Trip from '../models/Trip.js';
import Bus from '../models/Bus.js';

export class TripService {
  /**
   * Search available trips.
   * Now includes "Smart Fleet Discovery": 
   * If a bus exists but has no trip on this date, it's included as an empty option.
   */
  async searchTrips({ date, page = 1, limit = 20 } = {}) {
    if (!date) {
      throw new Error('Date is required for trip search');
    }

    const d = new Date(date);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = new Date(d.getTime() + 86400000);

    const existingTrips = await Trip.find({
      startTime: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ['scheduled', 'boarding'] },
      adminApproved: true,
    }).populate('busId').populate('stops.stopId');

    const allBuses = await Bus.find({ isActive: true, status: 'available' });

    const busyBusIds = existingTrips.map(t => t.busId?._id?.toString());
    const freeBuses = allBuses.filter(b => !busyBusIds.includes(b._id.toString()));

    const virtualTrips = freeBuses.map(bus => ({
      _id: `v-${bus._id}-${date}`, // Virtual ID
      busId: bus,
      isVirtual: true,
      startTime: new Date(startOfDay.getTime() + 8 * 3600000), // Default 8 AM
      endTime: new Date(startOfDay.getTime() + 18 * 3600000), // Default 6 PM
      basePricePerKm: 15, // Default base price
      seatsBooked: 0,
      status: 'scheduled',
      adminApproved: true,
      stops: []
    }));

    // Combine and return
    const allOptions = [...existingTrips.map(t => t.toObject()), ...virtualTrips];

    // Greedy sorting: 
    // 1. Partially filled buses first (minimize active buses)
    // 2. Then by smallest remaining seats (Best Fit)
    allOptions.sort((a, b) => {
      const isStartedA = a.seatsBooked > 0;
      const isStartedB = b.seatsBooked > 0;

      if (isStartedA && !isStartedB) return -1;
      if (!isStartedA && isStartedB) return 1;

      const availA = (a.busId?.capacity || 0) - (a.seatsBooked || 0);
      const availB = (b.busId?.capacity || 0) - (b.seatsBooked || 0);
      
      return availA - availB;
    });

    return allOptions.map(t => ({
      ...t,
      availableSeats: (t.busId?.capacity || 0) - (t.seatsBooked || 0),
    }));
  }

  async getTripById(id) {
    const trip = await Trip.findById(id).populate('busId');
    if (!trip) throw new Error('Trip not found');
    return {
      ...trip.toObject(),
      availableSeats: trip.busId.capacity - trip.seatsBooked,
    };
  }

  async createTrip(data) {
    return Trip.create(data);
  }
}

export default new TripService();
