/**
 * bookingHandler — handles all /bookings/* endpoints
 */

// Haversine formula: distance in km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getNextSeatNumber(db, tripId) {
  const tripBookings = db.bookings.filter(
    b => b.tripId === tripId && b.status !== 'cancelled'
  );
  const usedSeats = new Set(tripBookings.map(b => b.seatNumber));
  for (let i = 1; i <= 60; i++) {
    if (!usedSeats.has(i)) return i;
  }
  return tripBookings.length + 1;
}

function populateBooking(booking, db) {
  const trip = db.trips.find(t => t._id === booking.tripId);
  const bus = trip ? db.buses.find(b => b._id === trip.busId) : null;
  const populatedTrip = trip ? { ...trip, busId: bus || trip.busId } : booking.tripId;
  return { ...booking, tripId: populatedTrip };
}

export function handleBookings(method, path, body, params, db, currentUserId) {
  // GET /bookings/fare
  if (method === 'GET' && path === '/bookings/fare') {
    const { fromLat, fromLng, toLat, toLng, tripId } = params || {};
    const trip = db.trips.find(t => t._id === tripId);
    if (!trip) throw { status: 404, message: 'Trip not found' };

    const fLat = parseFloat(fromLat) || 18.5204;
    const fLng = parseFloat(fromLng) || 73.8567;
    const tLat = parseFloat(toLat) || 19.076;
    const tLng = parseFloat(toLng) || 72.8777;

    const distanceKm = Math.max(haversineKm(fLat, fLng, tLat, tLng), 5); // minimum 5 km
    const price = Math.round(distanceKm * trip.basePricePerKm);
    const durationMin = Math.round(distanceKm / 40 * 60); // ~40 km/h avg
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    const durationText = `${hours} hr ${mins.toString().padStart(2, '0')} min`;

    return {
      distanceKm,
      price,
      pricePerKm: trip.basePricePerKm,
      durationText,
      fareBreakdown: { distanceKm, pricePerKm: trip.basePricePerKm, durationText },
    };
  }

  // GET /bookings/reverse-geocode
  if (method === 'GET' && path === '/bookings/reverse-geocode') {
    const { lat, lng } = params || {};
    const sampleAddresses = [
      'Shivajinagar, Pune, Maharashtra 411005',
      'Dadar, Mumbai, Maharashtra 400014',
      'Koramangala, Bangalore, Karnataka 560034',
      'Banjara Hills, Hyderabad, Telangana 500034',
      'Andheri West, Mumbai, Maharashtra 400058',
    ];
    const idx = Math.abs(Math.round((parseFloat(lat) + parseFloat(lng)) * 10)) % sampleAddresses.length;
    return { address: sampleAddresses[idx] || `Near (${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)})` };
  }

  // POST /bookings
  if (method === 'POST' && path === '/bookings') {
    if (!currentUserId) throw { status: 401, message: 'Unauthorized' };
    const {
      tripId, fromLat, fromLng, toLat, toLng,
      fromAddress, toAddress, passengerName, passengerPhone,
    } = body || {};

    if (!tripId) throw { status: 400, message: 'Trip ID is required' };
    const trip = db.trips.find(t => t._id === tripId);
    if (!trip) throw { status: 404, message: 'Trip not found' };

    const distanceKm = Math.max(haversineKm(
      parseFloat(fromLat) || 18.5204,
      parseFloat(fromLng) || 73.8567,
      parseFloat(toLat) || 19.076,
      parseFloat(toLng) || 72.8777,
    ), 5);
    const price = Math.round(distanceKm * trip.basePricePerKm);
    const durationMin = Math.round(distanceKm / 40 * 60);
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    const durationText = `${hours} hr ${mins.toString().padStart(2, '0')} min`;
    const seatNumber = getNextSeatNumber(db, tripId);

    const booking = {
      _id: `bkg_${Date.now()}`,
      userId: currentUserId,
      tripId,
      bookingReference: `BG-${String(db.bookings.length + 1).padStart(3, '0')}-${new Date().getFullYear()}`,
      seatNumber,
      passengerName: passengerName || 'Passenger',
      passengerPhone: passengerPhone || '',
      fromCoords: { lat: parseFloat(fromLat), lng: parseFloat(fromLng), address: fromAddress || '' },
      toCoords: { lat: parseFloat(toLat), lng: parseFloat(toLng), address: toAddress || '' },
      distanceKm,
      price,
      fareBreakdown: { distanceKm, pricePerKm: trip.basePricePerKm, durationText },
      status: 'pending',
      verificationCode: Math.floor(1000 + Math.random() * 9000).toString(),
      isVerified: false,
      cancellationReason: null,
      createdAt: new Date().toISOString(),
    };

    db.bookings.push(booking);

    // Decrement available seats
    trip.availableSeats = Math.max(0, (trip.availableSeats || 1) - 1);

    return { booking };
  }

  // GET /bookings/my
  if (method === 'GET' && path === '/bookings/my') {
    if (!currentUserId) throw { status: 401, message: 'Unauthorized' };
    const bookings = db.bookings
      .filter(b => b.userId === currentUserId)
      .map(b => populateBooking(b, db))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { bookings };
  }

  // PATCH /bookings/:id/cancel
  const cancelMatch = path.match(/^\/bookings\/([^/]+)\/cancel$/);
  if (method === 'PATCH' && cancelMatch) {
    const bookingId = cancelMatch[1];
    const booking = db.bookings.find(b => b._id === bookingId);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    if (!['pending', 'confirmed'].includes(booking.status))
      throw { status: 400, message: `Cannot cancel a ${booking.status} booking` };
    booking.status = 'cancelled';
    booking.cancellationReason = body?.reason || 'Cancelled by user';
    // Restore the seat
    const trip = db.trips.find(t => t._id === booking.tripId);
    if (trip) trip.availableSeats = (trip.availableSeats || 0) + 1;
    return { booking };
  }

  // PATCH /bookings/:id/confirm  (admin action)
  const confirmMatch = path.match(/^\/bookings\/([^/]+)\/confirm$/);
  if (method === 'PATCH' && confirmMatch) {
    const bookingId = confirmMatch[1];
    const booking = db.bookings.find(b => b._id === bookingId);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    booking.status = 'confirmed';
    return { booking };
  }

  // PATCH /bookings/:id/reject  (admin action)
  const rejectMatch = path.match(/^\/bookings\/([^/]+)\/reject$/);
  if (method === 'PATCH' && rejectMatch) {
    const bookingId = rejectMatch[1];
    const booking = db.bookings.find(b => b._id === bookingId);
    if (!booking) throw { status: 404, message: 'Booking not found' };
    booking.status = 'rejected';
    booking.cancellationReason = body?.reason || 'Rejected by admin';
    return { booking };
  }

  return null; // not handled
}
