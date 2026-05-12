import client from './ApiClient.js';

export class BookingApi {
  /**
   * Get fare estimate using OpenStreetMap distance between two pinned coordinates
   */
  getFare({ fromLat, fromLng, toLat, toLng, tripId }) {
    return client.get('/bookings/fare', { fromLat, fromLng, toLat, toLng, tripId });
  }

  /**
   * Reverse geocode lat/lng to a human-readable address
   */
  reverseGeocode(lat, lng) {
    return client.get('/bookings/reverse-geocode', { lat, lng });
  }

  /**
   * Submit a booking request (starts as "pending", admin must confirm)
   */
  createBooking({ tripId, fromLat, fromLng, toLat, toLng, fromAddress, toAddress, numPeople, price, seatNumbers, isFullBus }) {
    return client.post('/bookings', { tripId, fromLat, fromLng, toLat, toLng, fromAddress, toAddress, numPeople, price, seatNumbers, isFullBus });
  }

  /** Get booked seats for a trip */
  getBookedSeats(tripId) {
    return client.get(`/bookings/trip/${tripId}/seats`);
  }

  /** Get authenticated user's bookings */
  getMyBookings() {
    return client.get('/bookings/my');
  }

  /** Cancel a booking */
  cancelBooking(bookingId, reason) {
    return client.patch(`/bookings/${bookingId}/cancel`, { reason });
  }
}

export default new BookingApi();
