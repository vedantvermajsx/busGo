import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  loading = false, 
  disabled = false, 
  icon: Icon,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-slate-900 hover:bg-slate-800 text-white",
    secondary: "bg-slate-50 hover:bg-slate-100 text-slate-900",
    outline: "bg-transparent border border-slate-200 hover:bg-slate-50 text-slate-900",
    ghost: "bg-transparent hover:bg-slate-50 text-slate-800",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white",
    danger: "bg-red-600 hover:bg-red-500 text-white"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
      {!loading && Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
};
