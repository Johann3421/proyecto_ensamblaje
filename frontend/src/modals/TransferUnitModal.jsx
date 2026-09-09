import React, { useState } from 'react';
import { Loader2, X, ArrowRightCircle } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function TransferUnitModal({ unit, order, currentStation, allStations, currentUser, onClose, onSuccess }) {
  const availableStations = (allStations || []).filter(s => s.station_number !== currentStation);
  const [targetStation, setTargetStation] = useState(availableStations[0]?.station_number || 1);
  const [reason, setReason] = useState("Carga de trabajo / Finalizar procesos pendientes");
  const [submitting, setSubmitting] = useState(false);

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/operator/transfer-station`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          unit_number: unit.unit_number,
          from_station: currentStation,
          target_station: parseInt(targetStation, 10),
          transferred_by: currentUser.name,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al derivar unidad");
      onSuccess(data.message || `PC #${unit.unit_number} derivada a Estación ${targetStation}`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ArrowRightCircle className="w-5 h-5 text-blue-200" />
            <span>Derivar PC #{unit.unit_number} a otra Estación</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleTransfer} className="p-4 space-y-3.5 text-xs">
          <div className="bg-stone-100 p-3 rounded-xl border border-stone-200 text-stone-900 space-y-1">
            <p className="font-semibold text-[11px]">
              📍 Estación actual: <strong>Estación {currentStation}</strong>
            </p>
            <p className="text-[11px] text-primary leading-snug">
              La PC viajará a la estación de destino para que otro técnico continúe o finalice las asignaciones pendientes.
            </p>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Estación de Destino
            </label>
            <select
              value={targetStation}
              onChange={(e) => setTargetStation(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 font-bold touch-target bg-white focus:ring-2 focus:ring-primary/20"
            >
              {availableStations.map(st => (
                <option key={st.station_number} value={st.station_number}>
                  Estación {st.station_number}: {st.station_name} ({st.user_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Motivo / Indicaciones para el técnico de destino
            </label>
            <textarea
              rows="2.5"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Completar pruebas de arranque y cerrar tapa en Estación 5..."
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 touch-target focus:outline-none focus:ring-2 focus:ring-primary/20"
            ></textarea>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 text-xs font-bold bg-primary hover:bg-primary text-white rounded-xl shadow transition touch-target flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Derivando...</span></>
              ) : (
                <span>Derivar PC #{unit.unit_number}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
