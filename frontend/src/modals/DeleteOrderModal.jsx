import React, { useState } from 'react';
import { AlertTriangle, X, Trash2, Trash } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function DeleteOrderModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al eliminar");
      onSuccess(data.message || "Orden eliminada exitosamente");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-rose-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            <h3 className="text-sm font-bold">Eliminar Orden de Producción</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 text-xs">
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-xl">
            <p className="font-bold flex items-center gap-1 mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>¿Eliminar orden {order.order_id}?</span>
            </p>
            <p className="text-[11px] leading-relaxed text-rose-800">
              Esta acción eliminará de forma permanente la orden, todas sus estaciones asignadas, las {order.total_units} PCs y el histórico de auditoría asociado.
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
              onClick={handleDelete}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50 touch-target"
            >
              {loading ? "Eliminando..." : "Sí, Eliminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MODAL EDITAR ORDEN DE PRODUCCIÓN
// Permite editar modelo, P/N, unidades, estado, supervisor y asignación dual de técnicos por estación/paso
// =============================================
