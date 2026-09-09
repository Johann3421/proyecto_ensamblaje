import React, { useState } from 'react';
import { Plus, X, PlusCircle } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function AddUnitsModal({ order, onClose, onSuccess }) {
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (count < 1) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: parseInt(count, 10) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al agregar PCs");
      onSuccess(data.message);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-[#1B4332] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            <h3 className="text-sm font-bold">Agregar PCs a la Orden</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleAdd} className="p-4 space-y-4 text-xs">
          <div className="bg-stone-100 p-3 rounded-xl border border-stone-200">
            <p className="font-semibold text-stone-900">Orden activa: {order.order_id}</p>
            <p className="text-primary text-[11px] mt-0.5">Modelo: {order.model_name} · Total actual: {order.total_units} PCs</p>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">¿Cuántas PCs deseas agregar?</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[1, 5, 10, 20].map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setCount(n)}
                  className={`py-2 rounded-lg font-bold border transition ${
                    count === n ? "bg-primary text-white border-blue-600 shadow-sm" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  +{n}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="500"
              required
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
              className="w-full text-sm font-bold border border-gray-300 rounded-xl p-2.5 touch-target focus:border-primary focus:outline-none"
            />
            <p className="text-[11px] text-gray-500 mt-1">Las nuevas PCs ingresarán directamente a la cola de la Estación 1 con números de serie correlativos.</p>
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
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50 touch-target"
            >
              {loading ? "Agregando..." : `Confirmar (+${count} PCs)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// MODAL LIMPIAR / REINICIAR LOTE
// =============================================
