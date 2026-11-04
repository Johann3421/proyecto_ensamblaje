import React from 'react';

const variants = {
  neutral: "bg-stone-100 text-stone-700 border-stone-200/80",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 border-amber-200/80",
  danger: "bg-red-50 text-red-700 border-red-200/80",
  info: "bg-blue-50 text-blue-600 border-blue-200/80",
  purple: "bg-purple-50 text-purple-700 border-purple-200/80",
};

export default function Badge({ children, variant = "neutral", className = "" }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant] || variants.neutral} ${className}`}>
      {children}
    </span>
  );
}
