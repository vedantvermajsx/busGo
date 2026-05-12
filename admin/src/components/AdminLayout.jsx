import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bus, MapPin, Ticket, Users, Route, LogOut, Bell, Shield, X, Clock
} from 'lucide-react';
import { useAdminStore } from '../store/adminStore.js';
import api from '../services/api.js';
import toast from 'react-hot-toast';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/trips', icon: Route, label: 'Trips' },
  { to: '/buses', icon: Bus, label: 'Buses' },
  { to: '/bookings', icon: Ticket, label: 'Bookings' },
  { to: '/stops', icon: MapPin, label: 'Stops' },
];

export default function AdminLayout() {
  const { user, logout } = useAdminStore();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // We'll treat pending bookings as notifications
      const res = await api.get('/admin/bookings/pending?limit=5');
      setNotifications(res.data.bookings || []);
    } catch (e) {
      console.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <Bus className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <p className="font-black text-white text-lg leading-none tracking-tight">BusGo.</p>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all
                ${isActive
                  ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                  : 'text-slate-500 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-6 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-slate-800/50 rounded-2xl border border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-950 font-black text-xs">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate uppercase tracking-tight">{user?.name}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-red-500 hover:bg-slate-900 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-slate-950/50 backdrop-blur-md border-b border-slate-900 flex items-center justify-between px-8 shrink-0 relative z-[1000]">
          <h1 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Management System</h1>
          <div className="flex items-center gap-4">
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative w-10 h-10 flex items-center justify-center rounded-2xl border transition-all ${
                  showNotifications 
                  ? 'bg-white border-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Recent Notifications</p>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {loading && notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Clock className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-spin" />
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Loading...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <button
                          key={n._id}
                          onClick={() => {
                            navigate('/bookings');
                            setShowNotifications(false);
                          }}
                          className="w-full p-5 text-left border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors flex gap-4 items-start"
                        >
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                            <Ticket size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-white uppercase tracking-tight mb-1">New Booking Request</p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">Ref: {n.bookingReference} • {n.userId?.name}</p>
                            <p className="text-[9px] text-slate-600 mt-1 font-bold uppercase tracking-widest">Pending Confirmation</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <button 
                      onClick={() => { navigate('/bookings'); setShowNotifications(false); }}
                      className="w-full p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-center border-t border-slate-800"
                    >
                      View All Bookings
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
