/**
 * FareService — all fare calculation logic.
 * Decoupled from controllers; uses OSMMapsService for distance.
 */
import mapsService from './OSMMapsService.js';

export class FareService {
  constructor(pricePerKm = 2.5) {
    this.defaultPricePerKm = pricePerKm;
  }

  /**
   * Calculate fare using road distance between two coordinates.
   * @param {number} fromLat
   * @param {number} fromLng
   * @param {number} toLat
   * @param {number} toLng
   * @param {number} basePricePerKm — per-trip rate from Trip model
   */
  async calculateFare(fromLat, fromLng, toLat, toLng, basePricePerKm) {
    const rate = basePricePerKm ?? this.defaultPricePerKm;
    const distInfo = await mapsService.getRoadDistance(fromLat, fromLng, toLat, toLng);
    let price = distInfo.distanceKm * rate;
    
    // Round up to the nearest multiple of 10
    price = Math.ceil(price / 10) * 10;

    return {
      distanceKm: distInfo.distanceKm,
      durationMinutes: distInfo.durationMinutes,
      distanceText: distInfo.distanceText,
      durationText: distInfo.durationText,
      basePricePerKm: rate,
      price,
      isFallback: distInfo.fallback || false,
    };
  }

  /**
   * Validate that fare is within reasonable bounds
   */
  validateFare(price, distanceKm) {
    if (distanceKm <= 0) throw new Error('Distance must be greater than 0');
    if (price <= 0) throw new Error('Calculated fare must be positive');
    if (distanceKm > 5000) throw new Error('Distance exceeds maximum allowed (5000 km)');
    return true;
  }
}

export default new FareService();
