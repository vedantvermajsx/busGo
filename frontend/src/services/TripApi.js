import client from './ApiClient.js';

export class TripApi {
  /** Search available trips for a date */
  searchTrips(date) {
    return client.get('/trips', date ? { date } : undefined);
  }

  /** Get single trip details */
  getTrip(tripId) {
    return client.get(`/trips/${tripId}`);
  }

  /** Get all active stops */
  getStops() {
    return client.get('/stops');
  }
}

export default new TripApi();
