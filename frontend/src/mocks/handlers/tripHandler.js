/**
 * tripHandler — handles GET /trips and GET /trips/:id
 */

function populateTrip(trip, db) {
  const bus = db.buses.find(b => b._id === trip.busId);
  return { ...trip, busId: bus || trip.busId };
}

export function handleTrips(method, path, params, db) {
  // GET /trips — search (optional ?date=YYYY-MM-DD)
  if (method === 'GET' && path === '/trips') {
    let trips = db.trips.map(t => populateTrip(t, db));
    if (params?.date) {
      trips = trips.filter(t => {
        const tripDate = new Date(t.startTime).toISOString().split('T')[0];
        return tripDate === params.date;
      });
    }
    trips = trips.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    return { trips };
  }

  // GET /trips/:id
  const tripMatch = path.match(/^\/trips\/([^/]+)$/);
  if (method === 'GET' && tripMatch) {
    const tripId = tripMatch[1];
    const trip = db.trips.find(t => t._id === tripId);
    if (!trip) throw { status: 404, message: 'Trip not found' };
    return { trip: populateTrip(trip, db) };
  }

  return null; // not handled
}
