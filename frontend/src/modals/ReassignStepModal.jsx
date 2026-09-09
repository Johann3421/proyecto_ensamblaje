import React, { useState } from 'react';
import { Loader2, X, ArrowRightCircle } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function ReassignStepModal({ step, unit, order, currentStation, allStations, currentUser, onClose, onSuccess }) {
  const availableStations = (allStations || []).filter(s => s.station_number !== currentStation);
  const [targetStation, setTargetStation] = useState(availableStations[0]?.station_number || 1);
  const [scope, setScope] = useState("UNIT"); // "UNIT" o "ALL"
  const [reason, setReason] = useState("Carga de trabajo en estación actual / Apoyo de otra área");
  const [submitting, setSubmitting] = useState(false);

  const handleReassign = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/operator/reassign-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          unit_number: scope === "UNIT" ? unit.unit_number : null,
          step_number: step.step_number,
          from_station: currentStation,
          target_station: parseInt(targetStation, 10),
          transferred_by: currentUser.name,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al reasignar paso");
      onSuccess(data.message || `Paso #${step.step_number} reasignado a Estación ${targetStation}`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ArrowRightCircle className="w-5 h-5 text-sky-200" />
            <span>Derivar Proceso a Otra Estación</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleReassign} className="p-4 space-y-3 text-xs">
          <div className="bg-sky-50 p-3 rounded-xl border border-sky-200 text-sky-950 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">Proceso Seleccionado</span>
            <p className="font-bold text-sm text-sky-900">
              #{step.step_number} {step.operation}
            </p>
            {step.qc_criteria && (
              <p className="text-[11px] text-sky-700">{step.qc_criteria}</p>
            )}
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Estación de Destino (Área que realizará este proceso)
            </label>
            <select
              value={targetStation}
              onChange={(e) => setTargetStation(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 font-bold touch-target bg-white focus:ring-2 focus:ring-sky-500"
            >
              {availableStations.map(st => (
                <option key={st.station_number} value={st.station_number}>
                  Estación {st.station_number}: {st.station_name} ({st.user_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1.5">
              Alcance de la Reasignación
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`p-2.5 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition ${
                scope === "UNIT" ? "border-blue-600 bg-stone-50 text-stone-900 font-bold" : "border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}>
                <input
                  type="radio"
                  name="stepScope"
                  value="UNIT"
                  checked={scope === "UNIT"}
                  onChange={() => setScope("UNIT")}
                  className="text-primary"
                />
                <span className="text-xs">Solo para PC #{unit.unit_number}</span>
              </label>

              <label className={`p-2.5 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition ${
                scope === "ALL" ? "border-blue-600 bg-stone-50 text-stone-900 font-bold" : "border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}>
                <input
                  type="radio"
                  name="stepScope"
                  value="ALL"
                  checked={scope === "ALL"}
                  onChange={() => setScope("ALL")}
                  className="text-primary"
                />
                <span className="text-xs">Para todo el lote</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Motivo de la Derivación
            </label>
            <textarea
              rows="2"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Falta de herramienta en E1 / Técnico ocupado / Terminar en E5..."
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 touch-target focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              className="flex-1 py-3 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow transition touch-target flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Derivando...</span></>
              ) : (
                <span>Derivar Proceso</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
