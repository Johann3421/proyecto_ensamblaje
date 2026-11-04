import React from 'react';

export default function Card({ children, className = "", ...props }) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-200/80 shadow-bento ${className}`} {...props}>
      {children}
    </div>
  );
}
