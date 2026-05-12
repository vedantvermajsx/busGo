import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, Clock, MapPin, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [stops, setStops] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [tripRes, stopsRes] = await Promise.all([
          api.get(`/admin/trips/${id}`),
          api.get('/admin/stops')
        ]);
        setTrip(tripRes.data.trip);
        setStops(tripRes.data.trip.stops || []);
        setAllStops(stopsRes.data.stops);
      } catch (err) {
        toast.error('Failed to load details');
        navigate('/trips');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const addStop = () => {
    setStops([...stops, { stopId: '', arrivalTime: '00:00' }]);
  };

  const removeStop = (index) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const updateStop = (index, field, value) => {
    const newStops = [...stops];
    newStops[index][field] = value;
    setStops(newStops);
  };

  const save = async () => {
    if (stops.some(s => !s.stopId || !s.arrivalTime)) {
      return toast.error('Please fill all stop details');
    }
    setSaving(true);
    try {
      await api.patch(`/admin/trips/${id}`, { stops });
      toast.success('Trip stops updated');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/trips')} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Trips
        </button>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-100">Manage Scheduled Stops</h1>
        </div>
      </div>

      <div className="admin-card">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-200">Trip: {trip.busId?.vehicleNumber}</h2>
              <p className="text-sm text-slate-400">{trip.busId?.operatorName} • {new Date(trip.startTime).toLocaleString()}</p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Departure Time (24h)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="datetime-local" 
                  value={trip.startTime ? new Date(new Date(trip.startTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} 
                  onChange={async (e) => {
                    try {
                      await api.patch(`/admin/trips/${id}`, { startTime: new Date(e.target.value).toISOString() });
                      setTrip({ ...trip, startTime: e.target.value });
                      toast.success('Departure time updated');
                    } catch { toast.error('Failed to update time'); }
                  }}
                  className="admin-input !w-64"
                />
                <span className="text-xs text-slate-500 font-medium tracking-wide bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50 flex items-center gap-2">
                  <Clock size="14" /> 24-Hour Format
                </span>
              </div>
            </div>
          </div>
          <button onClick={addStop} className="admin-btn-primary flex items-center gap-2 py-2">
            <Plus className="w-4 h-4" /> Add Stop
          </button>
        </div>

        <div className="space-y-4">
          {stops.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
              No stops added yet. Click "Add Stop" to begin.
            </div>
          ) : (
            stops.map((stop, idx) => (
              <div key={idx} className="flex items-end gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Select Stop
                  </label>
                  <select 
                    value={stop.stopId._id || stop.stopId} 
                    onChange={e => updateStop(idx, 'stopId', e.target.value)}
                    className="admin-input w-full"
                  >
                    <option value="">Choose a stop...</option>
                    {allStops.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.city})</option>
                    ))}
                  </select>
                </div>

                <div className="w-40 space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Arrival Time
                  </label>
                  <input 
                    type="time" 
                    value={stop.arrivalTime} 
                    onChange={e => updateStop(idx, 'arrivalTime', e.target.value)}
                    className="admin-input w-full"
                  />
                </div>

                <button 
                  onClick={() => removeStop(idx)}
                  className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 flex justify-end border-t border-slate-800 pt-6">
          <button 
            onClick={save} 
            disabled={saving}
            className="admin-btn-primary flex items-center gap-2 px-8 py-2.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Scheduled Stops
          </button>
        </div>
      </div>
    </div>
  );
}
