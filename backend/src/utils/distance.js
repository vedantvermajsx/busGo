/**
 * Haversine formula – returns distance in kilometers between two lat/lng points
 */
export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Find nearest stop to a given lat/lng
 */
export const findNearestStop = (stops, lat, lng) => {
  let nearest = null;
  let minDist = Infinity;
  for (const stop of stops) {
    const dist = haversineDistance(lat, lng, stop.lat, stop.lng);
    if (dist < minDist) { minDist = dist; nearest = stop; }
  }
  return { stop: nearest, distanceKm: minDist };
};

/**
 * Compute total route distance between two stops along a routePath using route edges
 */
export const computeRouteDistance = (routePath, fromStopId, toStopId, routeEdges) => {
  const fromIdx = routePath.findIndex(id => id.toString() === fromStopId.toString());
  const toIdx = routePath.findIndex(id => id.toString() === toStopId.toString());

  if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) return null;

  let totalKm = 0;
  for (let i = fromIdx; i < toIdx; i++) {
    const edge = routeEdges.find(
      r =>
        r.fromStopId.toString() === routePath[i].toString() &&
        r.toStopId.toString() === routePath[i + 1].toString()
    );
    if (!edge) return null;
    totalKm += edge.distanceKm;
  }
  return totalKm;
};
