import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Trash2, Plus, Loader2, Map as MapIcon, Navigation } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || 'get_your_own_key';

export default function Stops() {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(null);
  const [search, setSearch] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const [newStop, setNewStop] = useState({ name: '', city: '', lat: null, lng: null, address: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const newMarkerRef = useRef(null);

  // ── Create a custom SVG marker element ─────────────────────────────────
  const createMarkerEl = (color, isBouncing = false) => {
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
    
    // Using MapPin SVG directly for maximum control
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
        <circle cx="12" cy="10" r="3" fill="white"></circle>
      </svg>
    `;
    
    if (isBouncing) {
      el.style.animation = 'bounce 1s infinite';
    }
    
    wrapper.appendChild(el);
    return wrapper;
  };

  const fetchStops = async () => {
    try {
      const res = await api.get('/admin/stops');
      setStops(res.data.stops || []);
    } catch (e) {
      toast.error('Failed to load stops');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkers = () => {
    if (!mapRef.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    stops.forEach(stop => {
      const el = createMarkerEl('#0f172a'); // slate-900

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([stop.lng, stop.lat])
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(`
          <div class="p-2">
            <p class="font-bold text-slate-900">${stop.name}</p>
            <p class="text-[10px] text-slate-500 uppercase font-black">${stop.city}</p>
          </div>
        `))
        .addTo(mapRef.current);
      
      markersRef.current[stop._id] = marker;
    });
  };

  const handleMapClick = async (lat, lng) => {
    if (!mapRef.current) return;
    if (newMarkerRef.current) newMarkerRef.current.remove();

    const el = createMarkerEl('#3b82f6', true); // blue-500, bouncing

    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);

    newMarkerRef.current = marker;

    // Reverse geocode
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await resp.json();
      const address = data.display_name;
      const city = data.address?.city || data.address?.town || data.address?.village || '';
      
      setNewStop(prev => ({ ...prev, lat, lng, address, city }));
      setShowAddForm(true);
    } catch (e) {
      setNewStop(prev => ({ ...prev, lat, lng }));
      setShowAddForm(true);
    }
  };

  useEffect(() => {
    fetchStops();
  }, []);

  useEffect(() => {
    if (mapReady) renderMarkers();
  }, [stops, mapReady]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [80.9462, 26.8467], // Lucknow [lng, lat]
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      mapRef.current = map;
      setMapReady(true);
    });

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      handleMapClick(lat, lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleAddStop = async (e) => {
    e.preventDefault();
    if (!newStop.name || !newStop.city || !newStop.lat) return;

    setSaving(true);
    try {
      await api.post('/stops', newStop);
      toast.success('Stop added successfully');
      setNewStop({ name: '', city: '', lat: null, lng: null, address: '' });
      setShowAddForm(false);
      if (newMarkerRef.current) newMarkerRef.current.remove();
      fetchStops();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add stop');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will deactivate the stop.')) return;
    setActing(id);
    try {
      await api.delete(`/stops/${id}`);
      toast.success('Stop deactivated');
      fetchStops();
    } catch (e) {
      toast.error('Failed to delete');
    } finally {
      setActing(null);
    }
  };

  const filteredStops = stops.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Manage Stops</h1>
          <p className="text-slate-500 font-medium mt-1">Add and manage bus stops on the map.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search stops..."
              className="admin-input pl-11 py-3 text-xs w-64"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left: Map */}
        <div className="flex-[2] admin-card !p-0 overflow-hidden relative border-slate-800">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Navigation className="w-3 h-3 text-blue-400" />
            Click on map to add a new stop
          </div>
        </div>

        {/* Right: List & Form */}
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          {showAddForm && (
            <div className="admin-card border-blue-500/50 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)] animate-in slide-in-from-right-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-white uppercase text-xs tracking-widest">Add New Stop</h3>
                <button onClick={() => { setShowAddForm(false); if (newMarkerRef.current) newMarkerRef.current.remove(); }} className="text-slate-500 hover:text-white">
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <form onSubmit={handleAddStop} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Stop Name</label>
                  <input 
                    required
                    value={newStop.name}
                    onChange={e => setNewStop(p => ({ ...p, name: e.target.value }))}
                    className="admin-input py-3 text-sm"
                    placeholder="e.g. Charbagh Station"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">City</label>
                  <input 
                    required
                    value={newStop.city}
                    onChange={e => setNewStop(p => ({ ...p, city: e.target.value }))}
                    className="admin-input py-3 text-sm"
                    placeholder="e.g. Lucknow"
                  />
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Coordinates</p>
                  <p className="text-[10px] font-mono text-slate-400">{newStop.lat?.toFixed(5)}, {newStop.lng?.toFixed(5)}</p>
                </div>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="admin-btn-primary w-full py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Stop
                </button>
              </form>
            </div>
          )}

          <div className="admin-card flex-1 flex flex-col min-h-0 border-slate-800">
            <h3 className="font-black text-white uppercase text-xs tracking-widest mb-6 shrink-0 flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-blue-400" />
              Existing Stops ({filteredStops.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {loading ? (
                [1,2,3].map(i => <div key={i} className="h-16 bg-slate-900 animate-pulse rounded-2xl" />)
              ) : filteredStops.length === 0 ? (
                <div className="text-center py-12 text-slate-600">No stops found</div>
              ) : (
                filteredStops.map(stop => (
                  <div key={stop._id} className="group p-4 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{stop.name}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{stop.city}</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(stop._id)}
                      disabled={acting === stop._id}
                      className="p-2 text-slate-600 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {acting === stop._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Save(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
  );
}
