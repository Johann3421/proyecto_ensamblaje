import React, { useState } from 'react';
import { Check, X, Search } from 'lucide-react';
import { formatStepNumbersRange } from '../utils/steps';

export default function StepPickerModal({
  isOpen,
  onClose,
  stationIdx,
  station,
  modelSteps,
  allStations,
  onToggleStep,
  onAddStepRange,
  onClearStationSteps,
  onClaimAllFreeSteps
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  if (!isOpen || !station) return null;

  const currentStepNumbers = new Set(station.step_numbers || []);
  const totalSteps = modelSteps.length || 0;

  // Mapa de pasos asignados a cada estación
  const stepOwnerMap = {};
  (allStations || []).forEach((st, idx) => {
    (st.step_numbers || []).forEach(num => {
      stepOwnerMap[num] = { stationIdx: idx, stationNumber: st.station_number, stationName: st.station_name };
    });
  });

  const filteredSteps = (modelSteps || []).filter(s => {
    const term = searchTerm.toLowerCase();
    return s.step_number.toString().includes(term) ||
           (s.operation && s.operation.toLowerCase().includes(term)) ||
           (s.description && s.description.toLowerCase().includes(term));
  });

  const handleApplyRange = (e) => {
    e.preventDefault();
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (!isNaN(from) && !isNaN(to) && from >= 1 && to >= from) {
      onAddStepRange(stationIdx, from, to);
      setRangeFrom("");
      setRangeTo("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header del Modal */}
        <div className="bg-[#1B4332] text-white p-4 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {station.station_number}
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold truncate">
                Asignar Pasos a Estación {station.station_number}: {station.station_name}
              </h3>
              <p className="text-[11px] text-blue-100 truncate">
                Técnico: <strong>{station.user_name}</strong> · Asignados: <strong className="text-white">{currentStepNumbers.size} pasos</strong> ({formatStepNumbersRange(Array.from(currentStepNumbers))})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg touch-target flex items-center justify-center flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Herramientas de filtro y rangos */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-2.5 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar por número o nombre de operación (ej: 9, pasta, BIOS)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary shadow-2xs"
              />
            </div>

            {/* Asignar Rango Rápido */}
            <form onSubmit={handleApplyRange} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-600 whitespace-nowrap">Rango:</span>
              <span className="text-[10px] text-gray-400">De</span>
              <input
                type="number"
                min="1"
                max={totalSteps}
                placeholder="17"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="w-12 text-center p-1 text-xs font-bold border border-gray-200 rounded focus:border-primary"
              />
              <span className="text-[10px] text-gray-400">A</span>
              <input
                type="number"
                min="1"
                max={totalSteps}
                placeholder="31"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="w-12 text-center p-1 text-xs font-bold border border-gray-200 rounded focus:border-primary"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-primary hover:bg-primary text-white rounded text-xs font-bold transition flex-shrink-0"
              >
                + Asignar
              </button>
            </form>
          </div>

          {/* Acciones de selección masiva */}
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <span className="text-[11px] text-gray-500">
              💡 Toca cualquier paso para <strong>asignarlo</strong> o <strong>quitarlo</strong>. Si pertenece a otra estación, se transferirá a esta.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onClaimAllFreeSteps(stationIdx)}
                className="text-[11px] text-primary hover:underline font-bold"
              >
                + Asignar pasos libres
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => onClearStationSteps(stationIdx)}
                className="text-[11px] text-rose-600 hover:underline font-bold"
              >
                Vaciar estación
              </button>
            </div>
          </div>
        </div>

        {/* Lista interactiva de pasos */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredSteps.map(step => {
            const isAssignedToThis = currentStepNumbers.has(step.step_number);
            const otherOwner = !isAssignedToThis ? stepOwnerMap[step.step_number] : null;

            return (
              <div
                key={step.step_number}
                onClick={() => onToggleStep(stationIdx, step.step_number)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                  isAssignedToThis
                    ? "bg-stone-100/80 border-stone-300 shadow-xs hover:bg-stone-200/70"
                    : otherOwner
                      ? "bg-amber-50/40 border-amber-200 hover:bg-amber-100/40 opacity-85"
                      : "bg-white border-gray-200 hover:border-stone-300 hover:bg-gray-50"
                }`}
              >
                {/* Badge número */}
                <div className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs ${
                  isAssignedToThis
                    ? "bg-primary text-white"
                    : otherOwner
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-700 border border-gray-300"
                }`}>
                  #{step.step_number}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-bold truncate ${isAssignedToThis ? "text-stone-900" : "text-gray-900"}`}>
                      {step.operation}
                    </h4>

                    {/* Estado y Acción */}
                    {isAssignedToThis ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Asignado a E{station.station_number}</span>
                        <span className="text-rose-600 font-extrabold ml-1 hover:text-rose-800" title="Quitar">✕</span>
                      </span>
                    ) : otherOwner ? (
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0" title="Transferir a esta estación">
                        <span>En E{otherOwner.stationNumber} ({otherOwner.stationName})</span>
                        <span className="text-primary font-extrabold ml-1">→ Mover aquí</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-full flex-shrink-0 hover:bg-stone-200 hover:text-primary">
                        + Asignar libre
                      </span>
                    )}
                  </div>

                  {step.description && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                      {step.description}
                    </p>
                  )}
                  {step.qc_criteria && (
                    <span className="text-[10px] text-emerald-700 font-medium block mt-0.5 truncate">
                      Criterio QC: {step.qc_criteria}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredSteps.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-xs">
              No se encontraron pasos coincidentes con "{searchTerm}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-100 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs font-semibold text-gray-700">
            Total en Estación {station.station_number}: <strong className="text-primary">{currentStepNumbers.size} pasos</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-bold rounded-xl shadow-xs transition touch-target"
          >
            ✓ Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
