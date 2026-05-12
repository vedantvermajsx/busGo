import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import bookingApi from '../services/BookingApi.js';
const statusConfig = {
  pending:   { label: 'Pending Confirmation', color: 'bg-blue-100 text-blue-700',   icon: Clock },
  confirmed: { label: 'Confirmed',            color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected:  { label: 'Rejected',             color: 'bg-slate-100 text-slate-500',     icon: XCircle },
  cancelled: { label: 'Cancelled',            color: 'bg-slate-100 text-slate-400',     icon: XCircle },
  completed: { label: 'Completed',            color: 'bg-slate-900 text-white',         icon: CheckCircle },
};

const statusPriority = {
  confirmed: 0, // "booked successfully"
  pending: 1,
  completed: 2, // "finished"
  cancelled: 3,
  rejected: 4
};

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    bookingApi.getMyBookings()
      .then(d => {
        const sorted = (d.bookings || []).sort((a, b) => {
          // 1. Sort by defined priority
          const priorityA = statusPriority[a.status] ?? 99;
          const priorityB = statusPriority[b.status] ?? 99;
          
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // 2. Then sort by time (newest first) for same status
          const timeA = a.tripId?.startTime ? new Date(a.tripId.startTime).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.tripId?.startTime ? new Date(b.tripId.startTime).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
        
        // Only show top 10
        setBookings(sorted.slice(0, 10));
      })
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    setCancelling(id);
    try {
      await bookingApi.cancelBooking(id, 'Cancelled by user');
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking cancelled');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCancelling(null);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-12 flex justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Journeys</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your active and past trips.</p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{bookings.length} Total</span>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card text-center py-24 bg-slate-50/50 border-dashed border-2 border-slate-100 shadow-none">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Bus className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-xl font-black text-slate-900">No journeys yet</h3>
          <p className="text-slate-800 mt-2 mb-8 max-w-xs mx-auto">Your travel history will appear here once you book a trip.</p>
          <button onClick={() => navigate('/book')} className="btn-primary">
            Book Your First Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {bookings.map(b => {
            const cfg = statusConfig[b.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <div key={b._id} className="group card !p-0 overflow-hidden border-slate-100">
                <div className="flex flex-col lg:flex-row">
                  {/* Left Info */}
                  <div className="flex-1 p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Ref. ID</span>
                        <span className="text-xl font-mono font-black text-slate-900">{b.bookingReference}</span>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest ${cfg.color} shadow-none`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{cfg.label}</span>
                      </div>
                      {b.isVerified && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Verified</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center">
                            <Bus className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Bus Number Plate</p>
                            <p className="font-bold text-slate-900">{b.tripId?.busId?.vehicleNumber || 'Unassigned / Private'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center">
                            <Clock className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Departure</p>
                            <p className="font-bold text-slate-900">
                              {b.tripId?.startTime ? format(new Date(b.tripId.startTime), 'EEE, d MMM • h:mm a') : '—'}
                            </p>
                          </div>
                        </div>
                        {b.isFullBus ? (
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center">
                              <Bus className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking Type</p>
                              <p className="font-bold text-slate-900">Full Bus Booked</p>
                            </div>
                          </div>
                        ) : (
                          b.seatNumbers && b.seatNumbers.length > 0 && (
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center">
                                <Ticket className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seat{b.seatNumbers.length > 1 ? 's' : ''}</p>
                                <p className="font-bold text-slate-900">{b.seatNumbers.sort((a,b)=>a-b).map(s => `#${s}`).join(', ')}</p>
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      <div className="relative pl-8 border-l border-slate-100 space-y-8">
                        <div className="relative">
                          <div className="absolute -left-[37px] top-1 w-3 h-3 rounded-full bg-slate-900 border-4 border-white ring-1 ring-slate-100" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">From</p>
                          <p className="text-sm font-bold text-slate-900 line-clamp-1">{b.fromCoords?.address}</p>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[37px] top-1 w-3 h-3 rounded-full bg-slate-200 border-4 border-white ring-1 ring-slate-100" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">To</p>
                          <p className="text-sm font-bold text-slate-900 line-clamp-1">{b.toCoords?.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="lg:w-64 bg-slate-50/50 p-8 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-6 border-t lg:border-t-0 lg:border-l border-slate-100">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Amount</p>
                      <p className="text-4xl font-black text-slate-900">₹{b.price}</p>
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mt-1">{b.distanceKm} KM Route</p>
                    </div>

                    <div className="flex flex-col gap-3 w-full max-w-[160px]">
                      {['pending', 'confirmed'].includes(b.status) && (
                        <button
                          onClick={() => handleCancel(b._id)}
                          disabled={cancelling === b._id}
                          className="w-full text-[10px] font-black uppercase tracking-widest text-slate-800 hover:text-red-500 transition-colors py-3">
                          {cancelling === b._id ? 'Processing...' : 'Cancel Journey'}
                        </button>
                      )}
                      {['pending', 'confirmed'].includes(b.status) && !b.isVerified && b.verificationCode && (
                        <div className="w-full flex flex-col items-center justify-center p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg transition-all">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pickup Code</span>
                          <span className="text-3xl font-black text-white tracking-[0.3em] font-mono">{b.verificationCode}</span>
                        </div>
                      )}
                      {b.isVerified && (
                        <div className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Boarded</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
