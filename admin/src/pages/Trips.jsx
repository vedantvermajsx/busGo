import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, XCircle, ChevronRight, Filter, Bus, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const STATUS_STYLES = {
  scheduled: 'bg-blue-900/50 text-blue-300',
  boarding: 'bg-green-900/50 text-green-300',
  'on-trip': 'bg-emerald-900/50 text-emerald-300',
  completed: 'bg-slate-700 text-slate-400',
  cancelled: 'bg-red-900/50 text-red-300',
};

export default function Trips() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [total, setTotal] = useState(0);

  const status = searchParams.get('status') || '';
  const needsAttention = searchParams.get('needsAttention') || '';
  const date = searchParams.get('date') || '';

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (needsAttention) params.set('needsAttention', needsAttention);
      if (date) params.set('date', date);
      const res = await api.get(`/admin/trips?${params}`);
      setTrips(res.data.trips || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load trips'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status, needsAttention, date]);

  const approve = async (id) => {
    setActing(id);
    try {
      await api.patch(`/admin/trips/${id}/approve`);
      toast.success('Trip approved');
      load();
    } catch { toast.error('Failed'); }
    finally { setActing(null); }
  };

  const cancel = async (id) => {
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    setActing(id);
    try {
      await api.patch(`/admin/trips/${id}/cancel`, { reason });
      toast.success('Trip cancelled');
      load();
    } catch { toast.error('Failed'); }
    finally { setActing(null); }
  };

  const finish = async (id) => {
    if (!confirm('Mark this trip as completed? All confirmed bookings will also be marked as completed.')) return;
    setActing(id);
    try {
      await api.patch(`/admin/trips/${id}/finish`);
      toast.success('Trip finished');
      load();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to finish trip'); 
    } finally { setActing(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Trips <span className="text-slate-500 font-normal text-base ml-2">({total})</span></h1>
      </div>

      {/* Filters */}
      <div className="admin-card flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <select value={status} onChange={e => setSearchParams(p => { p.set('status', e.target.value); return p; })}
          className="admin-input w-40">
          <option value="">All Statuses</option>
          {['scheduled','boarding','on-trip','completed','cancelled'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={e => setSearchParams(p => { p.set('date', e.target.value); return p; })}
          className="admin-input w-44" />
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={needsAttention === 'true'}
            onChange={e => setSearchParams(p => { p.set('needsAttention', e.target.checked ? 'true' : ''); return p; })}
            className="accent-blue-500" />
          Needs Attention Only
        </label>
        <button onClick={load} className="admin-btn-ghost ml-auto text-xs">Refresh</button>
      </div>

      {/* Table */}
      <div className="admin-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Bus / Operator</th>
                <th className="text-left px-4 py-3">Route</th>
                <th className="text-left px-4 py-3">Departure</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Confirmations</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : trips.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500">No trips found</td></tr>
              ) : trips.map(trip => (
                <tr key={trip._id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-100">{trip.busId?.vehicleNumber}</p>
                        <p className="text-xs text-slate-400">{trip.busId?.operatorName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-slate-300 text-xs">
                      {trip.stops?.[0]?.stopId?.name || 'Start'}
                      <span className="text-slate-600 mx-1">→</span>
                      {trip.stops?.[trip.stops.length - 1]?.stopId?.name || 'End'}
                    </p>
                    <p className="text-slate-500 text-xs">{trip.stops?.length || 0} stops</p>
                  </td>
                  <td className="px-4 py-4 text-slate-300 text-xs">
                    {trip.startTime ? format(new Date(trip.startTime), 'd MMM, h:mm a') : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`badge ${STATUS_STYLES[trip.status] || 'bg-slate-700 text-slate-400'}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`flex items-center gap-1 text-xs ${trip.operatorConfirmed ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {trip.operatorConfirmed ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        Operator
                      </span>
                      <span className={`flex items-center gap-1 text-xs ${trip.adminApproved ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trip.adminApproved ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        Admin
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {!trip.adminApproved && trip.status !== 'cancelled' && (
                        <button 
                          onClick={() => approve(trip._id)} 
                          disabled={acting === trip._id}
                          className="admin-btn-success py-1 px-2.5 text-xs flex items-center gap-1"
                        >
                          {acting === trip._id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {acting === trip._id ? 'Approving...' : 'Approve'}
                        </button>
                      )}
                      {trip.status === 'on-trip' && (
                        <button 
                          onClick={() => finish(trip._id)} 
                          disabled={acting === trip._id}
                          className="admin-btn-primary py-1 px-2.5 text-xs flex items-center gap-1"
                        >
                          {acting === trip._id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {acting === trip._id ? 'Finishing...' : 'Finish'}
                        </button>
                      )}
                      {trip.status !== 'cancelled' && trip.status !== 'completed' && (
                        <button 
                          onClick={() => cancel(trip._id)} 
                          disabled={acting === trip._id}
                          className="admin-btn-danger py-1 px-2.5 text-xs flex items-center gap-1"
                        >
                          {acting === trip._id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {acting === trip._id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                      <Link to={`/trips/${trip._id}`} className="admin-btn-ghost py-1 px-2.5 text-xs flex items-center gap-1">
                        View <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
