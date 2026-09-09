import React from 'react';
import { Download, X, Camera } from 'lucide-react';

export default function PhotoPreviewModal({ photo, onClose }) {
  if (!photo) return null;
  const { url, title, subtitle, user_name, timestamp } = photo;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-4 fade-in" onClick={onClose}>
      <div 
        className="bg-slate-900 text-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-950 px-4 py-3 flex justify-between items-center border-b border-slate-800">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white truncate">{title || "Evidencia Fotográfica"}</h3>
            </div>
            {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 bg-black p-2 flex items-center justify-center min-h-[260px] overflow-hidden">
          <img 
            src={url} 
            alt="Evidencia fotográfica" 
            className="max-h-[60vh] sm:max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-md" 
          />
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 text-slate-300">
            {user_name && (
              <span>Verificado por: <strong className="text-emerald-400 font-semibold">{user_name}</strong></span>
            )}
            {timestamp && (
              <span className="text-slate-400 font-mono text-[11px]">{new Date(timestamp).toLocaleString("es-PE")}</span>
            )}
          </div>
          <div className="flex gap-2">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              download 
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
            </a>
            <button 
              onClick={onClose} 
              className="px-4 py-1.5 bg-primary hover:bg-primary-light text-white rounded-lg text-xs font-bold transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
