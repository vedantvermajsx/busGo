import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, User, Phone, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';

export default function Register() {
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuthStore();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 3 || form.name.trim().length > 30) return toast.error('Name must be between 3 and 30 characters');
    if (form.phone.trim().length < 10 || form.phone.trim().length > 15) return toast.error('Phone number must be between 10 and 15 digits');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signup(form.name, form.phone, form.password);
      toast.success('Account created!');
      navigate('/');
    } catch (e) {
      toast.error(e.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="card w-full max-w-md shadow-none border-slate-100">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mb-6">
            <Bus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Get Started.</h1>
          <p className="text-slate-800 font-medium mt-2">Create your Trivedi Travels account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {[
            { key: 'name', label: 'Full Name', icon: User, type: 'text', placeholder: 'John Doe', minLength: 3, maxLength: 30 },
            { key: 'phone', label: 'Phone Number', icon: Phone, type: 'tel', placeholder: '10-digit number', minLength: 10, maxLength: 15 },
            { key: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: 'Min. 6 characters', minLength: 6 },
          ].map(({ key, label, icon: Icon, type, placeholder, minLength, maxLength }) => (
            <div key={key} className="space-y-2">
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">{label}</label>
              <div className="relative">
                <Icon className="w-4 h-4 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
                <input type={type} value={form[key]} onChange={set(key)} placeholder={placeholder} minLength={minLength} maxLength={maxLength}
                  className="input-field pl-12" required />
              </div>
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-3">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-800 font-bold mt-10">
          Already have an account?{' '}
          <Link to="/login" className="text-slate-900 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
