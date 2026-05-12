import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CheckCircle, XCircle, Clock, MapPin, Bus, RefreshCw, Users, Search, Shield, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api.js';
import toast from 'react-hot-toast';

const statusConfig = {
  pending:   { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200' },
  rejected:  { label: 'Rejected', color: 'bg-red-100 text-red-600 border-red-200' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

export default function Bookings() {
  const [allBookings, setAllBookings] = useState([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [acting, setActing] = useState(null);
  const [search, setSearch] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyCode, setVerifyCode] = useState(['', '', '', '']);
  const inputRefs = useRef([]);

  const fetchPendingCount = async () => {
    try { 
      const res = await api.get('/admin/bookings/pending?limit=1'); 
      setPendingCount(res.data.total || 0); 
    } catch (e) {}
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all non-cancelled bookings once
      const res = await api.get('/admin/bookings?limit=1000');
      setAllBookings(res.data.bookings || []);
      fetchPendingCount();
    } catch (e) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Memoized filtered bookings based on tab and search
  const filteredBookings = useMemo(() => {
    return allBookings.filter(b => {
      const matchesTab = b.status === tab;
      const matchesSearch = !search || 
        b.bookingReference?.toLowerCase().includes(search.toLowerCase()) ||
        b.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.userId?.phone?.includes(search);
      
      return matchesTab && matchesSearch;
    });
  }, [allBookings, tab, search]);

  const handleConfirm = async (id) => {
    setActing(id);
    try {
      await api.patch(`/bookings/${id}/confirm`);
      toast.success('Booking confirmed!');
      // Update local state without refetching everything
      setAllBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'confirmed' } : b));
      setPendingCount(p => Math.max(0, p - 1));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setActing(null); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActing(rejectTarget);
    try {
      await api.patch(`/bookings/${rejectTarget}/reject`, { reason: rejectReason || 'Rejected by admin' });
      toast.success('Booking rejected');
      // Update local state without refetching everything
      setAllBookings(prev => prev.map(b => b._id === rejectTarget ? { ...b, status: 'rejected' } : b));
      if (tab === 'pending') setPendingCount(p => Math.max(0, p - 1));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setActing(null);
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  const handleVerify = async () => {
    const fullCode = verifyCode.join('');
    if (!verifyTarget || fullCode.length !== 4) return;
    setActing(verifyTarget);
    try {
      const res = await api.patch(`/admin/bookings/${verifyTarget}/verify`, { code: fullCode });
      toast.success('Pickup verified!');
      // Update local state with the returned booking data
      setAllBookings(prev => prev.map(b => b._id === verifyTarget ? { ...b, ...res.data.booking } : b));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Verification failed');
    } finally {
      setActing(null);
      setVerifyTarget(null);
      setVerifyCode(['', '', '', '']);
    }
  };

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...verifyCode];
    newCode[index] = digit;
    setVerifyCode(newCode);

    if (digit && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verifyCode[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const tabs = ['pending', 'confirmed', 'rejected'];

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Bookings</h1>
          <p className="text-slate-500 font-medium mt-1">Manage and review travel requests.</p>
        </div>
        <button onClick={load} className="admin-btn-ghost text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex gap-2 p-1 bg-slate-900 rounded-2xl w-fit border border-slate-800">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                tab === t ? 'bg-white text-slate-950 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {t}
              {t === 'pending' && pendingCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors" />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="admin-input pl-12 pr-4 py-4 text-[10px] font-black uppercase tracking-widest placeholder:text-slate-600 focus:placeholder:text-slate-400"
          />
          {search && (
            <div className="absolute -bottom-6 left-1 text-[8px] font-black text-slate-600 uppercase tracking-widest animate-pulse">
              Filtering by {tab}
            </div>
          )}
        </div>
      </div>

      {/* Booking list */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="admin-card h-32 animate-pulse bg-slate-800/50" />)}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="admin-card text-center py-20">
          <Clock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-400 font-medium">No {tab} bookings found</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map(b => {
            const cfg = statusConfig[b.status] || statusConfig.pending;
            return (
              <div key={b._id} className="admin-card group hover:border-slate-600 transition-all">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-6 flex-wrap">
                      <span className="font-mono font-black text-white text-sm tracking-tighter uppercase">Ref. {b.bookingReference}</span>
                      <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest ${cfg.color.replace('bg-', 'text-')} bg-slate-900 border border-slate-800 shadow-none`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.color}`} />
                        {cfg.label}
                      </div>
                      {b.userId && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-xl border border-slate-800">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[10px] font-black text-white uppercase tracking-tight">{b.userId.name}</span>
                          <span className="text-[11px] font-bold text-blue-400 ml-1 block sm:inline">{b.userId.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 text-sm">
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">A</div>
                          <span className="text-slate-300 font-medium line-clamp-1">{b.fromCoords?.address || 'Pickup'}</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 border border-red-500/30">B</div>
                          <span className="text-slate-300 font-medium line-clamp-1">{b.toCoords?.address || 'Drop'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <Bus className="w-3.5 h-3.5" />
                          <span className="text-slate-300">{b.tripId?.busId?.vehicleNumber || 'Standard Bus'}</span>
                          <span className="mx-1 opacity-20">|</span>
                          <span className="text-slate-400">
                            {b.isFullBus ? 'Full Bus' : `Seat${b.seatNumbers?.length > 1 ? 's' : ''} ${b.seatNumbers?.sort((a,b)=>a-b).map(s => `#${s}`).join(', ')}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{b.tripId?.startTime ? format(new Date(b.tripId.startTime), 'EEE d MMM, h:mm a') : '—'}</span>
                          <span className="mx-1 opacity-20">|</span>
                          <span>{b.distanceKm} km ({b.fareBreakdown?.distanceText})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-6 lg:pl-8 lg:border-l border-slate-800">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fare Amount</p>
                      <p className="text-4xl font-black text-white">₹{b.price}</p>
                    </div>

                    {b.status === 'pending' && (
                      <div className="flex flex-col gap-3 w-full min-w-[140px]">
                        <button
                          onClick={() => handleConfirm(b._id)}
                          disabled={acting === b._id}
                          className="admin-btn-success w-full flex items-center justify-center gap-2 py-3 !text-[10px] uppercase tracking-widest font-black shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                          {acting === b._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          {acting === b._id ? 'Confirming...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setRejectTarget(b._id)}
                          disabled={acting === b._id}
                          className="admin-btn-danger w-full flex items-center justify-center gap-2 py-3 !text-[10px] uppercase tracking-widest font-black shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                    {b.status === 'confirmed' && !b.isVerified && (
                      <button
                        onClick={() => setVerifyTarget(b._id)}
                        disabled={acting === b._id}
                        className="admin-btn-primary w-full flex items-center justify-center gap-2 py-3 !text-[10px] uppercase tracking-widest font-black">
                        <CheckCircle className="w-4 h-4" />
                        Verify Pickup
                      </button>
                    )}
                    {b.isVerified && (
                      <div className="flex flex-col items-center gap-1 text-emerald-400">
                        <CheckCircle className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                      </div>
                    )}
                  </div>
                </div>
                {b.cancellationReason && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Reason</p>
                    <p className="text-xs text-red-300">{b.cancellationReason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Verify modal */}
      {verifyTarget && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[2000] p-6">
          <div className="admin-card max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] border-slate-800 p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <Shield className="w-8 h-8 text-slate-950" />
              </div>
              <h3 className="font-black text-2xl text-white mb-2 tracking-tight">Verify Pickup</h3>
              <p className="text-sm text-slate-500 font-medium text-center">Enter the 4-digit code provided by the passenger</p>
            </div>

            <div className="flex justify-between gap-3 mb-10">
              {verifyCode.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => inputRefs.current[idx] = el}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(idx, e.target.value)}
                  onKeyDown={e => handleKeyDown(idx, e)}
                  className="w-16 h-20 bg-slate-900 border-2 border-slate-800 rounded-2xl text-center text-3xl font-black text-white focus:border-white focus:ring-0 transition-all outline-none"
                />
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setVerifyTarget(null); setVerifyCode(['', '', '', '']); }}
                className="admin-btn-ghost flex-1 py-4 !text-[10px] uppercase tracking-widest font-black">
                Cancel
              </button>
              <button onClick={handleVerify} disabled={acting === verifyTarget || verifyCode.join('').length !== 4}
                className="admin-btn-primary flex-1 py-4 !text-[10px] uppercase tracking-widest font-black shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2">
                {acting === verifyTarget ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {acting === verifyTarget ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[2000] p-6">
          <div className="admin-card max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] border-slate-800">
            <h3 className="font-black text-2xl text-white mb-2 tracking-tight">Reject Booking</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">Provide a reason for rejection (optional)</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Route not available, insufficient capacity..."
              rows={4}
              className="admin-input mb-8 !bg-slate-950"
            />
            <div className="flex gap-4">
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                className="admin-btn-ghost flex-1 py-4 !text-[10px] uppercase tracking-widest font-black">
                Cancel
              </button>
              <button onClick={handleReject} disabled={acting === rejectTarget}
                className="admin-btn-danger flex-1 py-4 !text-[10px] uppercase tracking-widest font-black shadow-[0_0_20px_rgba(239,68,68,0.1)] flex items-center justify-center gap-2">
                {acting === rejectTarget ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {acting === rejectTarget ? 'Rejecting...' : 'Reject Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
