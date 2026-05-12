import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Bus, Ticket, IndianRupee, AlertTriangle, Clock,
  CheckCircle, PhoneCall, ChevronRight, TrendingUp, Calendar
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api.js';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="stat-card group transition-all">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform border border-slate-800 ${color.replace('text-', 'bg-').replace('-500', '-500/10')}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <p className="text-4xl font-black text-white tracking-tight">{value}</p>
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">{label}</p>
    {sub && <p className="text-[10px] text-slate-600 mt-4 flex items-center gap-2">
      <div className="w-1 h-1 rounded-full bg-slate-700" />
      {sub}
    </p>}
  </div>
);

const UrgencyBadge = ({ trip }) => {
  const bothMissing = !trip.operatorConfirmed && !trip.adminApproved;
  if (bothMissing) return <span className="badge bg-red-900/60 text-red-300">⚠ Needs Both</span>;
  if (!trip.operatorConfirmed) return <span className="badge bg-orange-900/60 text-orange-300">📞 Call Operator</span>;
  if (!trip.adminApproved) return <span className="badge bg-yellow-900/60 text-yellow-300">✋ Needs Approval</span>;
  return <span className="badge bg-emerald-900/60 text-emerald-300">✓ Ready</span>;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState({});

  const load = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (tripId) => {
    try {
      await api.patch(`/admin/trips/${tripId}/approve`);
      toast.success('Trip approved');
      load();
    } catch { toast.error('Failed to approve'); }
  };

  const handleCallRequest = async (trip) => {
    setCalling(p => ({ ...p, [trip._id]: true }));
    try {
      const res = await api.post('/admin/call-request', {
        tripId: trip._id,
        operatorPhone: trip.busId?.operatorPhone || 'N/A',
        reason: `Trip departing ${format(new Date(trip.startTime), 'h:mm a')} — confirmation needed`,
        urgency: 'high',
      });
      toast.success(`📞 Call request logged for ${res.data.callInfo.operatorName}`);
      load();
    } catch { toast.error('Failed to log call request'); }
    finally { setCalling(p => ({ ...p, [trip._id]: false })); }
  };

  const handleConfirmOperator = async (tripId) => {
    try {
      await api.patch(`/admin/trips/${tripId}/confirm-operator`);
      toast.success('Operator marked as confirmed');
      load();
    } catch { toast.error('Failed to confirm'); }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="stat-card h-28 animate-pulse bg-slate-700" />)}
      </div>
    </div>
  );

  const { stats, urgentTrips } = data || {};

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <button onClick={load} className="admin-btn-ghost text-xs">↻ Refresh</button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Total Users"       value={stats?.totalUsers}      color="bg-blue-600/20 text-blue-400"    sub="Registered passengers" />
        <StatCard icon={Bus}          label="Active Buses"      value={stats?.totalBuses}      color="bg-purple-600/20 text-purple-400" sub="Fleet strength" />
        <StatCard icon={Ticket}       label="Today's Bookings"  value={stats?.todayBookings}   color="bg-emerald-600/20 text-emerald-400" sub={`${stats?.totalBookings} total`} />
        <StatCard icon={IndianRupee}  label="Total Revenue"     value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`} color="bg-amber-600/20 text-amber-400" sub="All time" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="admin-card flex items-center gap-4">
          <div className="w-10 h-10 bg-red-900/40 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-red-400">{stats?.pendingTrips}</p>
            <p className="text-xs text-slate-400">Trips Pending Approval</p>
          </div>
        </div>
        <div className="admin-card flex items-center gap-4">
          <div className="w-10 h-10 bg-green-900/40 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-green-400">{stats?.activeTrips}</p>
            <p className="text-xs text-slate-400">Trips Currently Active</p>
          </div>
        </div>
        <div className="admin-card flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-900/40 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-blue-400">{stats?.totalTrips}</p>
            <p className="text-xs text-slate-400">Total Trips Scheduled</p>
          </div>
        </div>
      </div>

      {/* Urgent Trips — Needs Action */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-slate-100">Needs Attention — Next 24 Hours</h2>
            {urgentTrips?.length > 0 && (
              <span className="badge bg-red-900/60 text-red-300 ml-1">{urgentTrips.length}</span>
            )}
          </div>
          <Link to="/trips?needsAttention=true" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {urgentTrips?.length === 0 ? (
          <div className="flex items-center gap-3 py-6 justify-center text-slate-500">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm">All trips confirmed for next 24 hours</span>
          </div>
        ) : (
          <div className="space-y-3">
            {urgentTrips?.map(trip => (
              <div key={trip._id} className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Trip info */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100">{trip.busId?.vehicleNumber}</span>
                      <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
                        {trip.busId?.type}
                      </span>
                      <UrgencyBadge trip={trip} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(trip.startTime), 'h:mm a')} —{' '}
                        {formatDistanceToNow(new Date(trip.startTime), { addSuffix: true })}
                      </span>
                      <span className="text-slate-500">{trip.busId?.operatorName}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Route: {trip.routePath?.slice(0, 3).map(s => s.name).join(' → ')}
                      {trip.routePath?.length > 3 ? ` +${trip.routePath.length - 3} more` : ''}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {!trip.operatorConfirmed && (
                      <>
                        <button
                          onClick={() => handleCallRequest(trip)}
                          disabled={calling[trip._id]}
                          className="admin-btn bg-orange-700 hover:bg-orange-600 text-white flex items-center gap-1.5"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          {calling[trip._id] ? 'Logging...' : 'Log Call'}
                        </button>
                        <button
                          onClick={() => handleConfirmOperator(trip._id)}
                          className="admin-btn-ghost flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Confirmed
                        </button>
                      </>
                    )}
                    {!trip.adminApproved && (
                      <button
                        onClick={() => handleApprove(trip._id)}
                        className="admin-btn-success flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve Trip
                      </button>
                    )}
                    <Link to={`/trips/${trip._id}`} className="admin-btn-ghost text-xs flex items-center gap-1">
                      Details <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Notes (call log) */}
                {trip.notes && (
                  <div className="mt-3 text-xs bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-400 font-mono">
                    {trip.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
