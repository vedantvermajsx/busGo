import React from 'react';

export const Badge = ({ 
  children, 
  variant = 'default', 
  className = '', 
  icon: Icon 
}) => {
  const baseStyles = "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest";
  
  const variants = {
    default: "bg-slate-50 text-slate-500",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-yellow-50 text-yellow-700 border border-yellow-100",
    danger: "bg-red-50 text-red-700 border border-red-100",
    info: "bg-blue-50 text-blue-700 border border-blue-100",
    dark: "bg-slate-900 text-white"
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </div>
  );
};
