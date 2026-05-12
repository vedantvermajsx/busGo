import { Outlet, Link } from 'react-router-dom';
import { Bus, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-black text-2xl text-slate-900  tracking-tighter">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <span>BusGo.</span>
          </Link>
          <div className="flex items-center gap-8">
            {isAuthenticated ? (
              <>
                <Link to="/my-bookings" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                  My Bookings
                </Link>
                <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">{user?.name}</span>
                  </div>
                  <button 
                    onClick={logout}
                    className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                  Login
                </Link>
                <Link to="/register" className="btn-primary !py-2 !px-4 !text-xs">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="py-12 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">© 2024 BusGo — Journey with Purpose</p>
      </footer>
    </div>
  );
}
