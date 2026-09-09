import React, { useState } from 'react';
import { AlertTriangle, X, RotateCcw } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function ResetOrderModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}/reset`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al reiniciar");
      onSuccess(data.message || "Lote reiniciado exitosamente");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-amber-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            <h3 className="text-sm font-bold">Limpiar y Reiniciar Lote</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 text-xs">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl">
            <p className="font-bold flex items-center gap-1 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>¿Reiniciar la orden {order.order_id}?</span>
            </p>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Esta acción regresará todas las <strong>{order.total_units} PCs</strong> a la <strong>Estación 1</strong> con estado inicial (Pendiente / 0 pasos) y limpiará todos los registros de prueba e incidencias anteriores.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition touch-target"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleReset}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50 touch-target"
            >
              {loading ? "Reiniciando..." : "Sí, Limpiar Lote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MODAL ELIMINAR ORDEN
// =============================================
