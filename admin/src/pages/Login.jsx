import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Phone, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminStore } from '../store/adminStore.js';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAdminStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(phone, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/');
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="admin-card w-full max-w-md shadow-none">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <Bus className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Admin Portal.</h1>
          <p className="text-slate-400 font-medium mt-2">Sign in to manage BusGo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-5 top-1/2 -translate-y-1/2" />
              <input 
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                placeholder="10-digit number" 
                className="admin-input pl-12" 
                required 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-5 top-1/2 -translate-y-1/2" />
              <input 
                type={show ? 'text' : 'password'} 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="admin-input pl-12 pr-12" 
                required 
              />
              <button 
                type="button" 
                onClick={() => setShow(!show)} 
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="admin-btn-primary w-full flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
