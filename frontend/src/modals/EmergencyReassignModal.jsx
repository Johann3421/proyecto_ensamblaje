import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function EmergencyReassignModal({ order, stations, operators, onClose, onSuccess }) {
  const [stationNumber, setStationNumber] = useState(stations[0]?.station_number || 1);
  const [newUserId, setNewUserId] = useState(operators[0]?.id || "");
  const [reason, setReason] = useState("Ausencia / Retraso de Operario");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetUser = operators.find(o => o.id === newUserId);
    if (!targetUser) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/orders/reassign-emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          station_number: parseInt(stationNumber, 10),
          new_user_id: targetUser.id,
          new_user_name: targetUser.name,
          reason
        })
      });
      if (!res.ok) throw new Error("Error al reasignar");
      const data = await res.json();
      onSuccess(data.message);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl">
        <div className="bg-amber-600 text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>Reasignación de Emergencia</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Estación a Transferir</label>
            <select
              value={stationNumber}
              onChange={(e) => setStationNumber(parseInt(e.target.value, 10))}
              className="w-full text-xs border border-gray-300 rounded-xl p-3 touch-target"
            >
              {stations.map(st => (
                <option key={st.station_number} value={st.station_number}>
                  E{st.station_number}: {st.station_name} ({st.user_name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nuevo Técnico</label>
            <select
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-3 font-bold text-primary touch-target"
            >
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-3 touch-target"
            />
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[10px] text-amber-900">
            El historial previo queda intacto. El nuevo técnico inicia desde este momento.
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow transition touch-target">
              {submitting ? "Reasignando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// MODAL CAPTURA DE CÁMARA EN TIEMPO REAL (CON COMPRESIÓN WEB/CLIENTE)
// =============================================
