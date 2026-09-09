import React from 'react';

const variants = {
  neutral: "bg-stone-100 text-stone-700 border-stone-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  purple: "bg-violet-50 text-violet-700 border-violet-200",
};

export default function Badge({ children, variant = "neutral", className = "" }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${variants[variant] || variants.neutral} ${className}`}>
      {children}
    </span>
  );
}
