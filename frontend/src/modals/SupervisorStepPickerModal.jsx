import React, { useState } from 'react';
import { Check, X, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { formatStepNumbersRange, isStepCleaning } from '../utils/steps';

export default function SupervisorStepPickerModal({
  isOpen,
  onClose,
  supervisorName,
  modelSteps,
  supervisedSteps = [],
  onToggleStep,
  onAddStepRange,
  onSelectAll,
  onSelectCleaningOnly,
  onClearAll
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  if (!isOpen) return null;

  const currentStepNumbers = new Set(supervisedSteps || []);
  const totalSteps = (modelSteps || []).length;

  const filteredSteps = (modelSteps || []).filter(s => {
    const term = searchTerm.toLowerCase();
    return s.step_number.toString().includes(term) ||
           (s.operation && s.operation.toLowerCase().includes(term)) ||
           (s.description && s.description.toLowerCase().includes(term)) ||
           (s.qc_criteria && s.qc_criteria.toLowerCase().includes(term));
  });

  const handleApplyRange = (e) => {
    e.preventDefault();
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (!isNaN(from) && !isNaN(to) && from >= 1 && to >= from) {
      if (onAddStepRange) {
        onAddStepRange(from, to);
      }
      setRangeFrom("");
      setRangeTo("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header del Modal */}
        <div className="bg-primary text-white p-4 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center font-bold text-sm flex-shrink-0 text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold truncate">
                Pasos a Supervisar: {supervisorName || "Supervisor de Calidad"}
              </h3>
              <p className="text-[11px] text-white/80 truncate">
                Asignados: <strong className="text-white">{currentStepNumbers.size} de {totalSteps} pasos</strong> {currentStepNumbers.size > 0 ? `(${formatStepNumbersRange(Array.from(currentStepNumbers))})` : "— (Todos por defecto si no se selecciona ninguno)"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg touch-target flex items-center justify-center flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Herramientas de filtro y rangos */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 space-y-2.5 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Filtrar por número, operación o criterio QC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-medium focus:outline-none focus:border-primary shadow-2xs text-stone-900"
              />
            </div>

            {/* Asignar Rango Rápido */}
            <form onSubmit={handleApplyRange} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-stone-200 shadow-2xs">
              <span className="text-[11px] font-bold text-stone-700 whitespace-nowrap">Rango:</span>
              <span className="text-[10px] text-stone-400">De</span>
              <input
                type="number"
                min="1"
                max={totalSteps}
                placeholder="1"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="w-12 text-center p-1 text-xs font-bold border border-stone-200 rounded focus:border-primary"
              />
              <span className="text-[10px] text-stone-400">A</span>
              <input
                type="number"
                min="1"
                max={totalSteps}
                placeholder={totalSteps.toString()}
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="w-12 text-center p-1 text-xs font-bold border border-stone-200 rounded focus:border-primary"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-primary hover:bg-primary-light text-white rounded text-xs font-bold transition flex-shrink-0"
              >
                + Asignar
              </button>
            </form>
          </div>

          {/* Acciones de selección masiva */}
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <span className="text-[11px] text-stone-500">
              Toca cualquier paso para <strong>activar o desactivar</strong> su supervisión.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-[11px] text-primary hover:underline font-bold"
              >
                + Supervisar Todos ({totalSteps})
              </button>
              <span className="text-stone-300">|</span>
              <button
                type="button"
                onClick={onSelectCleaningOnly}
                className="text-[11px] text-emerald-700 hover:underline font-bold inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Solo Limpieza</span>
              </button>
              <span className="text-stone-300">|</span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-[11px] text-rose-600 hover:underline font-bold"
              >
                Vaciar Selección
              </button>
            </div>
          </div>
        </div>

        {/* Lista interactiva de pasos */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredSteps.map(step => {
            const isSupervised = currentStepNumbers.has(step.step_number);
            const isClean = isStepCleaning(step);

            return (
              <div
                key={step.step_number}
                onClick={() => onToggleStep(step.step_number)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                  isSupervised
                    ? "bg-emerald-50/60 border-emerald-500/40 shadow-xs hover:bg-emerald-50"
                    : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                {/* Badge número */}
                <div className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs ${
                  isSupervised
                    ? "bg-primary text-white"
                    : isClean
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-stone-100 text-stone-700 border border-stone-200"
                }`}>
                  #{step.step_number}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <h4 className={`text-xs font-bold truncate ${isSupervised ? "text-stone-900" : "text-stone-800"}`}>
                        {step.operation}
                      </h4>
                      {isClean && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          Limpieza
                        </span>
                      )}
                    </div>

                    {/* Estado y Acción */}
                    {isSupervised ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>Supervisado</span>
                        <span className="text-rose-600 font-extrabold ml-1 hover:text-rose-800" title="Quitar">✕</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full flex-shrink-0 hover:bg-primary/10 hover:text-primary">
                        + Supervisar
                      </span>
                    )}
                  </div>

                  {step.description && (
                    <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                      {step.description}
                    </p>
                  )}
                  {step.qc_criteria && (
                    <span className="text-[10px] text-stone-600 font-medium block mt-0.5 truncate">
                      Criterio QC: {step.qc_criteria}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredSteps.length === 0 && (
            <div className="p-8 text-center text-stone-500 text-xs">
              No se encontraron pasos coincidentes con "{searchTerm}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs font-semibold text-stone-700">
            Total a supervisar: <strong className="text-primary">{currentStepNumbers.size} pasos</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl shadow-xs transition touch-target flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Guardar y Cerrar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
