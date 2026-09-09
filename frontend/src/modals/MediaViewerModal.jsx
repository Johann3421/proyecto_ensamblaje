import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

export default function MediaViewerModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden shadow-2xl">
        <div className="bg-[#1B4332] text-white p-4 flex justify-between items-start">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Guía Visual</span>
            <h3 className="text-sm font-bold leading-tight">Paso #{item.step_number}: {item.operation}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded flex-shrink-0 touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center min-h-[200px] max-h-[350px]">
            {item.media_url ? (
              <img src={item.media_url} alt={item.operation} className="max-h-[350px] w-full object-contain" />
            ) : (
              <div className="text-gray-400 text-center p-8">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Sin imagen asignada</p>
              </div>
            )}
          </div>
          <div className="bg-stone-100 p-3 rounded-xl border border-stone-200">
            <h4 className="text-xs font-bold text-stone-900">Criterio de Aceptación:</h4>
            <p className="text-xs text-stone-800 mt-1">{item.qc_criteria}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-sm rounded-xl shadow touch-target transition"
          >
            Entendido, Regresar
          </button>
        </div>
      </div>
    </div>
  );
}
