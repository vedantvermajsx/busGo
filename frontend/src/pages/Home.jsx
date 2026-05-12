import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bus, MapPin, ShieldCheck, Globe } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center py-20">
        <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl mb-8">
          <Globe className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Travel Simplified</span>
        </div>

        <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
          Travel where <br />
          <span className="text-blue-600">you want to.</span>
        </h1>

        <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-12">
          A minimalist Trivedi Travels experience. No fixed routes, no hidden fees.
          Just road distance and fair pricing.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button
            onClick={() => navigate('/book')}
            className="btn-primary flex items-center gap-3 group"
          >
            Start Booking
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/my-bookings')}
            className="px-8 py-4 rounded-2xl font-bold btn-primary"
          >
            View My Bookings
          </button>
        </div>
      </div>

      {/* Subtle Trust Indicators */}
      <div className="border-t border-slate-50 py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Custom Routes</h3>
              <p className="text-sm text-slate-500">Pick any two points on the map.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <Bus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Premium Fleet</h3>
              <h3 className="text-sm text-slate-500">Select AC or Non-AC comfort.</h3>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Admin Verified</h3>
              <p className="text-sm text-slate-500">Every journey is manually confirmed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
