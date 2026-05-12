/**
 * OSMMapsService — wraps OpenStreetMap (OSRM) and Nominatim APIs
 * Replaces Google Maps for a fully free, open-source mapping solution.
 */
import axios from 'axios';

export class OSMMapsService {
  constructor() {
    this.osrmBaseUrl = 'https://router.project-osrm.org/route/v1/driving';
    this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org/reverse';
  }

  /**
   * Get road distance (km) and duration between two lat/lng points via OSRM API
   */
  async getRoadDistance(originLat, originLng, destLat, destLng) {
    try {
      const url = `${this.osrmBaseUrl}/${originLng},${originLat};${destLng},${destLat}`;
      const response = await axios.get(url, {
        params: {
          overview: 'false',
          geometries: 'geojson',
        },
        timeout: 8000,
      });

      const data = response.data;
      if (data.code !== 'Ok') throw new Error(`OSRM API error: ${data.code}`);

      const route = data.routes?.[0];
      if (!route) {
        throw new Error('No route found between these points');
      }

      const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
      const durationMinutes = Math.ceil(route.duration / 60);

      return {
        distanceKm,
        durationMinutes,
        distanceText: `${distanceKm} km`,
        durationText: `${durationMinutes} mins`,
      };
    } catch (err) {
      // Fallback to Haversine if OSRM fails
      const haversine = this._haversine(originLat, originLng, destLat, destLng);
      return {
        distanceKm: haversine,
        durationMinutes: Math.ceil((haversine / 60) * 60), // Assuming 60km/h avg
        distanceText: `~${haversine.toFixed(1)} km (estimated)`,
        durationText: 'N/A',
        fallback: true,
      };
    }
  }

  /**
   * Reverse geocode a lat/lng to an address via Nominatim
   */
  async reverseGeocode(lat, lng) {
    try {
      const response = await axios.get(this.nominatimBaseUrl, {
        params: {
          format: 'jsonv2',
          lat: lat,
          lon: lng,
          'accept-language': 'en',
        },
        headers: {
          'User-Agent': 'BusBookingApp/1.0', // Nominatim requires a User-Agent
        },
        timeout: 5000,
      });

      const data = response.data;
      if (!data || !data.display_name) return { address: `${lat}, ${lng}`, city: 'Unknown' };

      const address = data.display_name;
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Unknown';

      return { address, city };
    } catch {
      return { address: `${lat}, ${lng}`, city: 'Unknown' };
    }
  }

  /** Haversine fallback */
  _haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
  }
}

export default new OSMMapsService();
