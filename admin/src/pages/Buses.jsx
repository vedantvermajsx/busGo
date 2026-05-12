import { useState, useEffect } from 'react';
import { Bus, Plus, Trash2, Loader2, ShieldCheck, ShieldAlert, Users, CreditCard } from 'lucide-react';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function Buses() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBus, setNewBus] = useState({
    vehicleNumber: '',
    operatorName: '',
    capacity: 40,
    type: 'AC',
    status: 'available'
  });

  const fetchBuses = async () => {
    try {
      const res = await api.get('/admin/buses');
      setBuses(res.data.buses || []);
    } catch (e) {
      toast.error('Failed to load buses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const handleAddBus = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/buses', newBus);
      toast.success('Bus added successfully');
      setShowAddForm(false);
      setNewBus({ vehicleNumber: '', operatorName: '', capacity: 40, type: 'AC', status: 'available' });
      fetchBuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add bus');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBus = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bus?')) return;
    setActing(id);
    try {
      await api.delete(`/admin/buses/${id}`);
      toast.success('Bus deleted');
      fetchBuses();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete bus');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Fleet Management</h1>
          <p className="text-slate-500 font-medium">Manage your buses, capacity and comfort levels.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="admin-btn-primary flex items-center gap-2 px-6 py-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          {showAddForm ? 'Cancel' : <><Plus className="w-4 h-4" /> Add New Bus</>}
        </button>
      </div>

      {showAddForm && (
        <div className="admin-card border-white/10 bg-white/5 backdrop-blur-xl p-8 animate-in slide-in-from-top-4">
          <form onSubmit={handleAddBus} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vehicle Number</label>
              <input
                required
                className="admin-input"
                placeholder="e.g. UP32-BT-1234"
                value={newBus.vehicleNumber}
                onChange={e => setNewBus({ ...newBus, vehicleNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operator Name</label>
              <input
                required
                className="admin-input"
                placeholder="e.g. Royal Travels"
                value={newBus.operatorName}
                onChange={e => setNewBus({ ...newBus, operatorName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Capacity</label>
              <input
                required
                type="number"
                className="admin-input"
                value={newBus.capacity}
                onChange={e => setNewBus({ ...newBus, capacity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bus Type</label>
              <select
                className="admin-input"
                value={newBus.type}
                onChange={e => setNewBus({ ...newBus, type: e.target.value })}
              >
                <option value="AC">AC</option>
                <option value="Non-AC">Non-AC</option>
                <option value="Sleeper">Sleeper</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Initial Status</label>
              <select
                className="admin-input"
                value={newBus.status}
                onChange={e => setNewBus({ ...newBus, status: e.target.value })}
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end pt-4">
              <button
                disabled={saving}
                className="admin-btn-primary px-12 py-4 !text-xs uppercase tracking-widest font-black"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Bus'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-white opacity-20" />
          <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Loading Fleet...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buses.map(bus => (
            <div key={bus._id} className="admin-card group hover:border-white/20 transition-all p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform">
                  <Bus className="w-7 h-7 text-slate-950" />
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  bus.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                }`}>
                  {bus.status}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight leading-none mb-1">{bus.vehicleNumber}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{bus.operatorName}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Seats
                    </p>
                    <p className="text-sm font-black text-white">{bus.capacity}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Type
                    </p>
                    <p className="text-sm font-black text-white">{bus.type}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    {bus.isActive ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-slate-600" />
                    )}
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {bus.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteBus(bus._id)}
                    disabled={acting === bus._id}
                    className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
                  >
                    {acting === bus._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
