/**
 * adminHandler — handles all /admin/* endpoints
 */

function populateBus(bus, db) {
  return bus; // buses have no foreign keys in mock
}

function populateTrip(trip, db) {
  const bus = db.buses.find(b => b._id === trip.busId);
  return { ...trip, busId: bus || trip.busId };
}

function populateBooking(booking, db) {
  const trip = db.trips.find(t => t._id === booking.tripId);
  const bus = trip ? db.buses.find(b => b._id === trip.busId) : null;
  const user = db.users.find(u => u._id === booking.userId);
  const { password: _pw, ...safeUser } = user || {};
  const populatedTrip = trip ? { ...trip, busId: bus || trip.busId } : booking.tripId;
  return { ...booking, tripId: populatedTrip, userId: safeUser };
}

export function handleAdmin(method, path, body, params, db) {
  // GET /admin/dashboard
  if (method === 'GET' && path === '/admin/dashboard') {
    const totalUsers = db.users.filter(u => u.role === 'user').length;
    const totalBuses = db.buses.filter(b => b.isActive).length;
    const totalTrips = db.trips.length;
    const totalBookings = db.bookings.filter(b => b.status === 'confirmed').length;
    const pendingTrips = db.trips.filter(t => !t.adminApproved && t.status !== 'cancelled').length;
    const activeTrips = db.trips.filter(t => ['boarding', 'on-trip'].includes(t.status)).length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookings = db.bookings.filter(b =>
      b.status === 'confirmed' && b.createdAt.startsWith(todayStr)
    ).length;
    const totalRevenue = db.bookings
      .filter(b => ['confirmed', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + (b.price || 0), 0);

    const urgentTrips = db.trips
      .filter(t => !t.adminApproved || !t.operatorConfirmed)
      .map(t => populateTrip(t, db))
      .slice(0, 10);

    return {
      stats: { totalUsers, totalBuses, totalTrips, totalBookings, pendingTrips, activeTrips, todayBookings, totalRevenue },
      urgentTrips,
    };
  }

  // GET /admin/trips
  if (method === 'GET' && path === '/admin/trips') {
    let trips = db.trips.map(t => populateTrip(t, db));
    if (params?.status) trips = trips.filter(t => t.status === params.status);
    if (params?.date) {
      trips = trips.filter(t => new Date(t.startTime).toISOString().split('T')[0] === params.date);
    }
    if (params?.needsAttention === 'true') {
      trips = trips.filter(t => !t.adminApproved || !t.operatorConfirmed);
    }
    trips.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    return { trips, total: trips.length, page: 1, pages: 1 };
  }

  // PATCH /admin/trips/:id/approve
  const approveMatch = path.match(/^\/admin\/trips\/([^/]+)\/approve$/);
  if (method === 'PATCH' && approveMatch) {
    const trip = db.trips.find(t => t._id === approveMatch[1]);
    if (!trip) throw { status: 404, message: 'Trip not found' };
    trip.adminApproved = true;
    return { trip: populateTrip(trip, db), message: 'Trip approved successfully' };
  }

  // PATCH /admin/trips/:id/cancel
  const tripCancelMatch = path.match(/^\/admin\/trips\/([^/]+)\/cancel$/);
  if (method === 'PATCH' && tripCancelMatch) {
    const trip = db.trips.find(t => t._id === tripCancelMatch[1]);
    if (!trip) throw { status: 404, message: 'Trip not found' };
    trip.status = 'cancelled';
    trip.notes = body?.reason || 'Cancelled by admin';
    // Cancel all bookings for this trip
    db.bookings.forEach(b => {
      if (b.tripId === trip._id && b.status === 'confirmed') {
        b.status = 'cancelled';
        b.cancellationReason = 'Trip cancelled by admin';
      }
    });
    return { trip: populateTrip(trip, db) };
  }

  // GET /admin/bookings/pending
  if (method === 'GET' && path === '/admin/bookings/pending') {
    const bookings = db.bookings
      .filter(b => b.status === 'pending')
      .map(b => populateBooking(b, db))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { bookings, total: bookings.length };
  }

  // GET /admin/bookings
  if (method === 'GET' && path === '/admin/bookings') {
    let bookings = db.bookings.map(b => populateBooking(b, db));
    if (params?.status) bookings = bookings.filter(b => b.status === params.status);
    if (params?.tripId) bookings = bookings.filter(b =>
      (typeof b.tripId === 'object' ? b.tripId?._id : b.tripId) === params.tripId
    );
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { bookings, total: bookings.length };
  }

  // GET /admin/buses
  if (method === 'GET' && path === '/admin/buses') {
    const buses = db.buses.map(b => populateBus(b, db));
    return { buses };
  }

  // PATCH /admin/bookings/:id/verify
  const verifyMatch = path.match(/^\/admin\/bookings\/([^/]+)\/verify$/);
  if (method === 'PATCH' && verifyMatch) {
    const bookingId = verifyMatch[1];
    const booking = db.bookings.find(b => b._id === bookingId);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (booking.status !== 'confirmed') throw { status: 400, message: 'Only confirmed bookings can be verified' };
    
    if (booking.verificationCode !== body?.code) {
      throw { status: 400, message: 'Invalid verification code' };
    }

    booking.isVerified = true;
    booking.verifiedAt = new Date().toISOString();
    booking.status = 'completed'; // Mark as completed once verified

    return { 
      success: true, 
      booking: populateBooking(booking, db), 
      message: 'Pickup verified successfully' 
    };
  }

  return null; // not handled
}
