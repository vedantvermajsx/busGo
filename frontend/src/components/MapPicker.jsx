/**
 * MapLibrePicker — lets user pin Point A (pickup) and Point B (drop) on a MapLibre GL map.
 * Uses MapTiler tiles for rendering, Nominatim for geocoding, and OSRM for routing.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { MapPin, Navigation, RotateCcw, Search, Crosshair, Loader2, Clock, Map as MapIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import bookingApi from '../services/BookingApi.js';
import tripApi from '../services/TripApi.js';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || 'get_your_own_key';

export default function MapPicker({ tripId, basePricePerKm, stops = [], isFullBus = false, onFareUpdate, onLocationsChange, onNearestStopUpdate }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({ from: null, to: null });
  const stopMarkersRef = useRef([]);

  const [allStops, setAllStops] = useState([]);
  const [showAllStops, setShowAllStops] = useState(true);

  useEffect(() => {
    if (stops.length > 0) {
      setAllStops(stops);
    } else {
      tripApi.getStops().then(d => setAllStops(d.stops || []));
    }
  }, [stops]);

  const [fromPoint, setFromPoint] = useState(null);
  const [toPoint, setToPoint] = useState(null);
  const [selectingFor, setSelectingFor] = useState('from'); // 'from' | 'to'
  const [fareInfo, setFareInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  // Keep a ref to selectingFor so event callbacks always read the latest value
  const selectingForRef = useRef('from');
  useEffect(() => { selectingForRef.current = selectingFor; }, [selectingFor]);

  // Keep a ref to handleMapClick so the map doesn't need to re-init when it changes
  const handleMapClickRef = useRef(null);

  // ── Helper Functions (Must be defined before useCallback/useEffect) ───────
  
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const findNearestStop = useCallback((lat, lng) => {
    const stopsToSearch = allStops.length > 0 ? allStops : stops;
    if (!stopsToSearch.length) return null;

    let nearest = null;
    let minDistance = Infinity;

    stopsToSearch.forEach(s => {
      const stopData = s.stopId || s;
      if (!stopData?.lat || !stopData?.lng) return;

      const dist = calculateDistance(lat, lng, stopData.lat, stopData.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = s;
      }
    });

    return { stop: nearest, distance: minDistance };
  }, [allStops, stops]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await resp.json();
      return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const createMarkerEl = (type) => {
    const color = type === 'from' ? '#22c55e' : '#ef4444';
    const label = type === 'from' ? 'A' : 'B';
    const wrapper = document.createElement('div');
    wrapper.style.width = '36px';
    wrapper.style.height = '36px';
    wrapper.style.cursor = 'pointer';
    wrapper.style.position = 'absolute';
    const el = document.createElement('div');
    el.style.cssText = `
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
    `;
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
        <circle cx="12" cy="10" r="3" fill="white"></circle>
      </svg>
      <div style="position: absolute; top: 7px; color: white; font-weight: 900; font-size: 10px; font-family: sans-serif;">${label}</div>
    `;
    wrapper.appendChild(el);
    return wrapper;
  };

  const placeMarker = useCallback((lat, lng, type, title) => {
    if (!mapRef.current) return;
    if (markersRef.current[type]) {
      markersRef.current[type].remove();
    }
    const el = createMarkerEl(type);
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .setPopup(new maplibregl.Popup({ offset: 20 }).setText(title))
      .addTo(mapRef.current);
    markersRef.current[type] = marker;
  }, []);

  // ── Handle a map click or programmatic location placement ───────────────
  const handleMapClick = useCallback(async (lat, lng) => {
    let finalLat = lat;
    let finalLng = lng;
    let finalAddress = '';

    const nearest = findNearestStop(lat, lng);

    if (!isFullBus) {
       if (!nearest || nearest.distance > 10) { // 10km threshold
         toast.error('Please click closer to a blue bus stop marker.');
         return;
       }
      // Snap to nearest stop
      const stopData = nearest.stop.stopId || nearest.stop;
      finalLat = stopData.lat;
      finalLng = stopData.lng;
      finalAddress = `${stopData.name} (Stop)`;
    } else {
      finalAddress = await reverseGeocode(lat, lng);
    }

    const point = { lat: finalLat, lng: finalLng, address: finalAddress };
    const currentFor = selectingForRef.current;

    if (currentFor === 'from') {
      setFromPoint(point);
      placeMarker(finalLat, finalLng, 'from', finalAddress);
      setSelectingFor('to');
      if (nearest && !isFullBus) onNearestStopUpdate?.('from', nearest);
    } else {
      setToPoint(point);
      placeMarker(finalLat, finalLng, 'to', finalAddress);
      setSelectingFor('from');
      if (nearest && !isFullBus) onNearestStopUpdate?.('to', nearest);
    }
  }, [placeMarker, findNearestStop, onNearestStopUpdate, isFullBus]);

  useEffect(() => {
    handleMapClickRef.current = handleMapClick;
  }, [handleMapClick]);

  // ── Map initialisation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [80.9462, 26.8467], // Lucknow [lng, lat]
      zoom: 7,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-right');
    map.on('load', () => {
      setMapReady(true);
    });
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      if (handleMapClickRef.current) {
        handleMapClickRef.current(lat, lng);
      }
    });
    mapRef.current = map;
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); 

  // ── Render Trip Stops & Bus Route ────────────────────────────────────────
  const renderStops = (map, stopsToRender) => {
    // Clear existing stop markers
    stopMarkersRef.current.forEach(m => m.remove());
    stopMarkersRef.current = [];

    stopsToRender.forEach(s => {
      const stopData = s.stopId || s;
      if (!stopData?.lat || !stopData?.lng) return;

      const el = document.createElement('div');
      el.className = `w-6 h-6 ${s.arrivalTime ? 'bg-blue-600' : 'bg-slate-500'} border-4 border-white rounded-full shadow-xl cursor-pointer hover:scale-125 transition-transform z-10`;
      
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stopData.lng, stopData.lat])
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(`
          <div class="p-2">
            <p class="font-bold text-slate-900">${stopData.name}</p>
            <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">${stopData.city}</p>
            ${s.arrivalTime ? `
              <p class="text-xs text-slate-500 flex items-center gap-1">
                <Clock size="12" /> Scheduled: ${s.arrivalTime}
              </p>
            ` : ''}
            <button class="mt-2 w-full bg-slate-900 text-white text-[9px] font-black uppercase py-1.5 rounded-lg" onclick="window.selectStop('${stopData.lat}', '${stopData.lng}', '${stopData.name.replace(/'/g, "\\'")}')">
              Select as Point
            </button>
          </div>
        `))
        .addTo(map);
      
      stopMarkersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (mapReady && mapRef.current) {
      if (isFullBus) {
        renderStops(mapRef.current, []);
        // Clear bus route if it exists
        const map = mapRef.current;
        if (map.getLayer('bus-route-line')) map.removeLayer('bus-route-line');
        if (map.getLayer('bus-route-casing')) map.removeLayer('bus-route-casing');
        if (map.getSource('bus-route')) map.removeSource('bus-route');
      } else {
        renderStops(mapRef.current, allStops);
        drawBusRoute();
      }
    }
  }, [allStops, mapReady, isFullBus]);

  const drawBusRoute = async () => {
    const map = mapRef.current;
    if (!map || allStops.length < 2 || isFullBus) return;

    // Filter stops that have coordinates
    const validStops = allStops
      .map(s => s.stopId || s)
      .filter(s => s?.lat && s?.lng);

    if (validStops.length < 2) return;

    try {
      const coordsString = validStops.map(s => `${s.lng},${s.lat}`).join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
      
      const resp = await fetch(osrmUrl);
      const data = await resp.json();

      // Check map existence again after await
      if (!mapRef.current) return;
      const currentMap = mapRef.current;

      if (data.code !== 'Ok') return;

      const geojson = data.routes[0].geometry;

      if (currentMap.getLayer('bus-route-line')) currentMap.removeLayer('bus-route-line');
      if (currentMap.getLayer('bus-route-casing')) currentMap.removeLayer('bus-route-casing');
      if (currentMap.getSource('bus-route')) currentMap.removeSource('bus-route');

      currentMap.addSource('bus-route', { type: 'geojson', data: geojson });
      
      // Dashed casing for bus route
      currentMap.addLayer({
        id: 'bus-route-casing',
        type: 'line',
        source: 'bus-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 
          'line-color': '#475569', 
          'line-width': 8, 
          'line-opacity': 0.2 
        },
      });

      currentMap.addLayer({
        id: 'bus-route-line',
        type: 'line',
        source: 'bus-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 
          'line-color': '#94a3b8', 
          'line-width': 3, 
          'line-opacity': 0.8,
          'line-dasharray': [2, 2]
        },
      });
    } catch (e) {
      console.error('Failed to draw bus route:', e);
    }
  };

  // Expose selectStop to window for popup clicks
  useEffect(() => {
    window.selectStop = (lat, lng, name) => {
      handleMapClick(parseFloat(lat), parseFloat(lng));
    };
    return () => delete window.selectStop;
  }, [handleMapClick]);

  // ── Draw route when both points are set ────────────────────────────────
  useEffect(() => {
    if (!fromPoint || !toPoint || !mapReady || !mapRef.current) return;

    const fetchRoute = async () => {
      setLoading(true);
      setError('');

      try {
        // 1. Fetch route from OSRM (free, no key)
        const osrmUrl =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${fromPoint.lng},${fromPoint.lat};${toPoint.lng},${toPoint.lat}` +
          `?overview=full&geometries=geojson`;
        const resp = await fetch(osrmUrl);
        const data = await resp.json();

        if (data.code !== 'Ok') throw new Error('Could not find a road route between these points');

        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        const durationMin = Math.round(route.duration / 60);
        const geojson = route.geometry; // GeoJSON LineString

        // Check map existence again after await
        if (!mapRef.current) return;
        const currentMap = mapRef.current;

        // 2. Remove old route layers/source
        if (currentMap.getLayer('route-line')) currentMap.removeLayer('route-line');
        if (currentMap.getLayer('route-casing')) currentMap.removeLayer('route-casing');
        if (currentMap.getSource('route')) currentMap.removeSource('route');

        // 3. Add new route source + layers (casing + main line for depth effect)
        currentMap.addSource('route', { type: 'geojson', data: geojson });
        currentMap.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#1e40af', 'line-width': 9, 'line-opacity': 0.4 },
        });
        currentMap.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.9 },
        });

        // 4. Fit bounds to show the full route
        const coords = geojson.coordinates;
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        currentMap.fitBounds(bounds, { padding: 60, maxZoom: 14 });

        // 5. Fare calculation
        let fareData;
        if (tripId) {
          try {
            fareData = await bookingApi.getFare({
              fromLat: fromPoint.lat, fromLng: fromPoint.lng,
              toLat: toPoint.lat, toLng: toPoint.lng,
              tripId,
            });
          } catch {
            fareData = buildLocalFare(distanceKm, durationMin);
          }
        } else {
          fareData = buildLocalFare(distanceKm, durationMin);
        }

        setFareInfo(fareData);
        onFareUpdate?.(fareData);
        onLocationsChange?.({ from: fromPoint, to: toPoint });

      } catch (err) {
        setError(err.message || 'Error calculating route');
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPoint, toPoint, mapReady, tripId, basePricePerKm]);

  const buildLocalFare = (distanceKm, durationMin) => ({
    price: Math.round(distanceKm * (basePricePerKm || 15)),
    distanceText: `${distanceKm.toFixed(1)} km`,
    durationText: `${durationMin} mins`,
    isFallback: true,
    basePricePerKm: basePricePerKm || 15,
  });

  // ── Reset ───────────────────────────────────────────────────────────────
  const reset = () => {
    setFromPoint(null);
    setToPoint(null);
    setFareInfo(null);
    setError('');
    setSelectingFor('from');

    if (markersRef.current.from) { markersRef.current.from.remove(); markersRef.current.from = null; }
    if (markersRef.current.to) { markersRef.current.to.remove(); markersRef.current.to = null; }

    const map = mapRef.current;
    if (map) {
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getLayer('route-casing')) map.removeLayer('route-casing');
      if (map.getSource('route')) map.removeSource('route');
      map.flyTo({ center: [80.9462, 26.8467], zoom: 7 });
    }

    onFareUpdate?.(null);
    onLocationsChange?.(null);
  };

  // ── Address search (Nominatim) ──────────────────────────────────────────
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
      );
      setSearchResults(await resp.json());
    } catch {
      // silently ignore
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
    }
    handleMapClick(lat, lng);
    setSearchResults([]);
    setSearchQuery('');
  };

  // ── Geolocation ─────────────────────────────────────────────────────────
  const getUserLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        if (mapRef.current) mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
        handleMapClick(lat, lng);
        setLocating(false);
      },
      () => { setError('Could not get your location'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Search & Locate bar */}
      <div className="relative group">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search for ${selectingFor === 'from' ? 'pickup' : 'drop-off'} location...`}
              className="w-full bg-slate-50 border-0 rounded-2xl pl-11 pr-4 py-4 text-sm font-semibold focus:ring-2 focus:ring-slate-200 transition-all outline-none"
            />
          </div>
          <button
            type="button"
            onClick={getUserLocation}
            disabled={locating}
            className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-600 disabled:opacity-50"
            title="Use current location"
          >
            {locating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crosshair className="w-5 h-5" />}
          </button>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-6 h-12 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-800"
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[1000]">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => selectSearchResult(result)}
                className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-3"
              >
                <MapPin className="w-4 h-4 text-slate-800 mt-1 shrink-0" />
                <span className="text-sm font-semibold text-slate-700 leading-relaxed">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Point tags */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selectingFor === 'from'
          ? 'bg-green-50 border-green-300 text-green-700'
          : fromPoint ? 'bg-gray-50 border-gray-200 text-gray-400 line-through' : 'bg-gray-50 border-gray-200 text-gray-400'
          }`}>
          <div className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">A</div>
          <span className="max-w-[150px] truncate">{fromPoint ? fromPoint.address : 'Click map to set pickup'}</span>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selectingFor === 'to' && fromPoint
          ? 'bg-red-50 border-red-300 text-red-700'
          : toPoint ? 'bg-gray-50 border-gray-200 text-gray-400 line-through' : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
          <div className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">B</div>
          <span className="max-w-[150px] truncate">{toPoint ? toPoint.address : 'Click map to set drop-off'}</span>
        </div>

        {(fromPoint || toPoint) && (
          <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 ml-auto transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Map canvas */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div ref={mapContainerRef} style={{ height: 340, width: '100%' }} />

        {mapReady && (
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            {allStops.length > 0 ? `${allStops.length} Bus Stops Available` : 'Searching for stops...'}
          </div>
        )}

        {!mapReady && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center text-gray-500">
              <Navigation className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              <p className="text-sm">Loading map…</p>
            </div>
          </div>
        )}

        {mapReady && !fromPoint && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none z-10">
            👆 Click anywhere on the map to set your pickup point
          </div>
        )}
        {mapReady && fromPoint && !toPoint && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none z-10">
            👆 Now click to set your drop-off point
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-blue-200 rounded w-48 mb-2" />
          <div className="h-6 bg-blue-200 rounded w-24" />
        </div>
      )}

      {/* Fare card */}
      {fareInfo && !loading && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Estimated Fare</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-900">₹{fareInfo.price}</span>
                {fareInfo.isFallback && <span className="text-xs text-orange-500">(estimated)</span>}
              </div>
            </div>
            <div className="text-right text-sm text-blue-700 space-y-0.5">
              <p className="font-medium">{fareInfo.distanceText}</p>
              <p className="text-blue-500">{fareInfo.durationText}</p>
              <p className="text-xs text-blue-400">₹{fareInfo.basePricePerKm}/km</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
