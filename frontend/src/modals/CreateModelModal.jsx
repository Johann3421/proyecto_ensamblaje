import React, { useState } from 'react';
import { Check, AlertCircle, Plus, Loader2, X, PlusCircle, ClipboardList, Sparkles } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function CreateModelModal({ isOpen, onClose, onSuccess, existingModels = [], notify }) {
  const [modelName, setModelName] = useState("");
  const [description, setDescription] = useState("");
  const [initStrategy, setInitStrategy] = useState("STANDARD"); // "STANDARD", "CLONE", "EMPTY"
  const [cloneSource, setCloneSource] = useState(existingModels[0]?.name || "PROWORK");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = modelName.trim().toUpperCase();
    if (!cleanName) {
      setErrorMsg("El nombre del modelo es obligatorio.");
      return;
    }
    if (existingModels.some(m => (m.name || "").toUpperCase() === cleanName)) {
      setErrorMsg(`El modelo '${cleanName}' ya existe.`);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const payload = {
        name: cleanName,
        description: description.trim(),
        template: initStrategy,
        clone_from: initStrategy === "CLONE" ? cloneSource : undefined
      };

      const res = await fetch(`${API_BASE}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear modelo");

      notify?.(`Modelo '${cleanName}' creado con éxito (${data.step_count || 0} pasos)`, "success");
      onSuccess?.(cleanName);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Error al procesar la solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 fade-in backdrop-blur-xs" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] animate-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Crear Nuevo Modelo de PC</h3>
              <p className="text-[11px] text-blue-100">Configura una nueva línea de producto y su checklist</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nombre del modelo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nombre del Modelo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: GAMER-ULTRA, SLIM-OFFICE, WORKSTATION-AI"
              value={modelName}
              onChange={e => setModelName(e.target.value.toUpperCase())}
              className="w-full text-xs font-bold uppercase tracking-wider border border-gray-300 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:border-primary focus:outline-none transition"
              autoFocus
            />
            <span className="text-[10px] text-gray-400 mt-1 block">Se registrará automáticamente en mayúsculas.</span>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Descripción / Línea de Producto
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Línea gamer de alto rendimiento con refrigeración líquida y GPU RTX"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white focus:border-primary focus:outline-none transition resize-none"
            />
          </div>

          {/* Estrategia de pasos iniciales */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-800">
              Checklist Inicial de Pasos:
            </label>

            <div className="space-y-2">
              {/* Opción 1: Plantilla Estándar */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                initStrategy === "STANDARD" ? "bg-stone-50 border-stone-300 shadow-xs" : "bg-white border-gray-200 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="initStrategy"
                  value="STANDARD"
                  checked={initStrategy === "STANDARD"}
                  onChange={() => setInitStrategy("STANDARD")}
                  className="mt-0.5 text-primary focus:ring-primary/20"
                />
                <div className="text-xs">
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>⚡ Plantilla Maestra SekaiTech (52 Pasos)</span>
                    <span className="text-[9px] bg-stone-200 text-stone-800 px-1.5 py-0.5 rounded font-bold">Recomendado</span>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                    Incluye los 52 pasos completos: montajes de chasis, BIOS, Windows, software, estaciones obligatorias de limpieza intermedia y final.
                  </p>
                </div>
              </label>

              {/* Opción 2: Clonar de modelo existente */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                initStrategy === "CLONE" ? "bg-indigo-50/70 border-indigo-400 shadow-xs" : "bg-white border-gray-200 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="initStrategy"
                  value="CLONE"
                  checked={initStrategy === "CLONE"}
                  onChange={() => setInitStrategy("CLONE")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs flex-1">
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                    <span>📋 Clonar pasos desde otro modelo</span>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Copia idénticamente los pasos y criterios de inspección de un modelo existente.
                  </p>
                  {initStrategy === "CLONE" && (
                    <div className="mt-2">
                      <select
                        value={cloneSource}
                        onChange={e => setCloneSource(e.target.value)}
                        className="w-full text-xs font-bold border border-indigo-300 rounded-lg p-2 bg-white text-indigo-900"
                      >
                        {existingModels.map(m => (
                          <option key={m.name} value={m.name}>
                            {m.name} ({m.step_count || 0} pasos)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </label>

              {/* Opción 3: En blanco */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                initStrategy === "EMPTY" ? "bg-amber-50/70 border-amber-400 shadow-xs" : "bg-white border-gray-200 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="initStrategy"
                  value="EMPTY"
                  checked={initStrategy === "EMPTY"}
                  onChange={() => setInitStrategy("EMPTY")}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-gray-900">📄 Modelo en blanco (0 Pasos)</div>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Crea el modelo vacío para cargar los pasos luego mediante archivo Excel o manualmente.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !modelName.trim()}
              className="px-5 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] disabled:bg-gray-300 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition touch-target disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando Modelo...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Modelo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// MODAL EDICIÓN PASO CHECKLIST
// =============================================
