import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, CheckCircle, AlertTriangle, AlertCircle, Plus, Edit, Loader2, Shield, Cpu, X, ShieldCheck, CheckSquare, Wrench, Users, Trash2, Trash, Sparkles, Layers } from 'lucide-react';
import { API_BASE } from '../utils/api';
import Badge from '../components/Badge';
import StepPickerModal from '../modals/StepPickerModal';
import SupervisorStepPickerModal from '../modals/SupervisorStepPickerModal';
import { formatStepNumbersRange, parseStepNumbersInput, isStepCleaning, distributeStepsSeparatingCleaning } from '../utils/steps';

export default function EditOrderModal({ order, stations: initialStations = [], models = [], users = [], onClose, onSuccess, notify }) {
  const [modelName, setModelName] = useState(order?.model_name || "");
  const [partNumber, setPartNumber] = useState(order?.part_number || "");
  const [totalUnits, setTotalUnits] = useState(order?.total_units || 1);
  const [status, setStatus] = useState(order?.status || "IN_PROGRESS");
  const [supervisorId, setSupervisorId] = useState(order?.supervisor_id || "");
  const [supervisorName, setSupervisorName] = useState(order?.supervisor_name || "");
  const [supervisorSteps, setSupervisorSteps] = useState(() => {
    if (!order?.supervisor_steps) return [];
    return order.supervisor_steps.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));
  });
  const [supervisorQuickInput, setSupervisorQuickInput] = useState("");
  const [supervisorPickerOpen, setSupervisorPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visualPickerStation, setVisualPickerStation] = useState(null);
  const [modelSteps, setModelSteps] = useState([]);

  // Cargar checklist del modelo seleccionado
  const loadModelSteps = useCallback(async (model) => {
    if (!model) return;
    try {
      const res = await fetch(`${API_BASE}/models/${model}/checklist`);
      if (res.ok) {
        const data = await res.json();
        setModelSteps(data);
      }
    } catch (e) {
      console.error("Error cargando pasos del modelo:", e);
    }
  }, []);

  useEffect(() => {
    loadModelSteps(modelName);
  }, [modelName, loadModelSteps]);

  // Sincronizar nombre de supervisor al cambiar supervisorId
  const handleSupervisorChange = (newSupId) => {
    setSupervisorId(newSupId);
    if (!newSupId) {
      setSupervisorName("");
      setSupervisorSteps([]);
    } else {
      const u = users.find(x => x.id === newSupId);
      setSupervisorName(u ? u.name : "");
    }
  };

  // Lista de estaciones inicializada desde initialStations
  const [stationsList, setStationsList] = useState(() => {
    if (!initialStations || initialStations.length === 0) return [];
    return initialStations.map(st => {
      let stepNums = [];
      if (Array.isArray(st.step_numbers)) {
        stepNums = st.step_numbers;
      } else if (typeof st.step_numbers === "string" && st.step_numbers.trim()) {
        stepNums = st.step_numbers.split(/[,;\s]+/).map(x => parseInt(x, 10)).filter(n => !isNaN(n) && n > 0);
      } else if (st.start_step && st.end_step) {
        for (let i = st.start_step; i <= st.end_step; i++) stepNums.push(i);
      }
      return {
        station_number: st.station_number,
        station_name: st.station_name || `Estación ${st.station_number}`,
        user_id: st.user_id || "",
        user_name: st.user_name || "",
        secondary_user_id: st.secondary_user_id || "",
        secondary_user_name: st.secondary_user_name || "",
        is_cleaning_station: !!(st.is_cleaning_station || st.station_type === "CLEANING" || (st.station_name || "").toLowerCase().includes("limpieza")),
        station_type: st.station_type || (st.is_cleaning_station ? "CLEANING" : "ASSEMBLY"),
        step_numbers: stepNums,
        rawStepsInput: stepNums.length > 0 ? stepNums.join(", ") : ""
      };
    });
  });

  // Conteo de estaciones de limpieza
  const cleaningCount = useMemo(() => {
    return stationsList.filter(
      st => st.is_cleaning_station || st.station_type === "CLEANING" || (st.station_name || "").toLowerCase().includes("limpieza")
    ).length;
  }, [stationsList]);

  // Handlers para técnicos
  const handlePrimaryTechChange = (idx, newUserId) => {
    const u = users.find(x => x.id === newUserId);
    setStationsList(prev => prev.map((st, i) => {
      if (i !== idx) return st;
      return {
        ...st,
        user_id: newUserId,
        user_name: u ? u.name : ""
      };
    }));
  };

  const handleSecondaryTechChange = (idx, newUserId) => {
    const u = users.find(x => x.id === newUserId);
    setStationsList(prev => prev.map((st, i) => {
      if (i !== idx) return st;
      return {
        ...st,
        secondary_user_id: newUserId || "",
        secondary_user_name: u ? u.name : ""
      };
    }));
  };

  const handleToggleCleaning = (idx) => {
    setStationsList(prev => prev.map((st, i) => {
      if (i !== idx) return st;
      const nextClean = !st.is_cleaning_station;
      return {
        ...st,
        is_cleaning_station: nextClean,
        station_type: nextClean ? "CLEANING" : "ASSEMBLY"
      };
    }));
  };

  const handleStationNameChange = (idx, name) => {
    setStationsList(prev => prev.map((st, i) => {
      if (i !== idx) return st;
      return { ...st, station_name: name };
    }));
  };

  const handleStepsInputChange = (idx, rawVal) => {
    const parsed = parseStepNumbersInput(rawVal, modelSteps.length || 500);
    setStationsList(prev => prev.map((st, i) => {
      if (i !== idx) return st;
      return {
        ...st,
        rawStepsInput: rawVal,
        step_numbers: parsed
      };
    }));
  };

  const handleAutoDistribute = () => {
    setStationsList(prev => {
      const distributed = distributeStepsSeparatingCleaning(prev, modelSteps);
      return distributed.map(st => ({
        ...st,
        rawStepsInput: (st.step_numbers || []).join(", ")
      }));
    });
    notify?.("Pasos redistribuidos: Las estaciones de ensamblaje NO contienen pasos de limpieza.", "success");
  };

  const handleAddStation = () => {
    const nextNum = stationsList.length + 1;
    const op = users[(nextNum - 1) % users.length] || { id: `OP-${100 + nextNum}`, name: `Operario ${nextNum}` };
    setStationsList(prev => [
      ...prev,
      {
        station_number: nextNum,
        station_name: `Estación ${nextNum}`,
        user_id: op.id,
        user_name: op.name,
        secondary_user_id: "",
        secondary_user_name: "",
        is_cleaning_station: false,
        station_type: "ASSEMBLY",
        step_numbers: [],
        rawStepsInput: ""
      }
    ]);
  };

  const handleRemoveStation = (idxToRemove) => {
    if (stationsList.length <= 2) {
      alert("Una orden de producción debe tener al menos 2 estaciones.");
      return;
    }
    const filtered = stationsList.filter((_, idx) => idx !== idxToRemove);
    const renumbered = filtered.map((st, idx) => ({
      ...st,
      station_number: idx + 1
    }));
    setStationsList(renumbered);
  };

  // Handlers para StepPickerModal
  const handleToggleStep = (targetStationIdx, stepNum) => {
    setStationsList(prev => prev.map((st, idx) => {
      const current = new Set(st.step_numbers || []);
      if (idx === targetStationIdx) {
        if (current.has(stepNum)) current.delete(stepNum);
        else current.add(stepNum);
      } else {
        current.delete(stepNum);
      }
      const updated = Array.from(current).sort((a, b) => a - b);
      return {
        ...st,
        step_numbers: updated,
        rawStepsInput: updated.join(", ")
      };
    }));
  };

  const handleAddStepRange = (targetStationIdx, from, to) => {
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    const toAdd = new Set();
    for (let i = min; i <= max; i++) toAdd.add(i);

    setStationsList(prev => prev.map((st, idx) => {
      const current = new Set(st.step_numbers || []);
      if (idx === targetStationIdx) {
        toAdd.forEach(n => current.add(n));
      } else {
        toAdd.forEach(n => current.delete(n));
      }
      const updated = Array.from(current).sort((a, b) => a - b);
      return {
        ...st,
        step_numbers: updated,
        rawStepsInput: updated.join(", ")
      };
    }));
  };

  const handleClearStationSteps = (targetStationIdx) => {
    setStationsList(prev => prev.map((st, idx) => {
      if (idx !== targetStationIdx) return st;
      return { ...st, step_numbers: [], rawStepsInput: "" };
    }));
  };

  const handleClaimAllFreeSteps = (targetStationIdx) => {
    const total = modelSteps.length || 52;
    const allAssigned = new Set();
    stationsList.forEach(st => {
      (st.step_numbers || []).forEach(n => allAssigned.add(n));
    });
    const free = [];
    for (let i = 1; i <= total; i++) {
      if (!allAssigned.has(i)) free.push(i);
    }
    if (free.length === 0) return;

    setStationsList(prev => prev.map((st, idx) => {
      if (idx !== targetStationIdx) return st;
      const current = new Set(st.step_numbers || []);
      free.forEach(n => current.add(n));
      const updated = Array.from(current).sort((a, b) => a - b);
      return { ...st, step_numbers: updated, rawStepsInput: updated.join(", ") };
    }));
  };

  // Handlers para SupervisorStepPickerModal
  const handleToggleSupervisorStep = (stepNumber) => {
    setSupervisorSteps(prev => {
      const exists = prev.includes(stepNumber);
      const next = exists ? prev.filter(n => n !== stepNumber) : [...prev, stepNumber];
      return next.sort((a, b) => a - b);
    });
  };

  const handleAddSupervisorStepRange = (from, to) => {
    const range = [];
    for (let i = from; i <= to; i++) range.push(i);
    setSupervisorSteps(prev => {
      const combined = Array.from(new Set([...prev, ...range]));
      return combined.sort((a, b) => a - b);
    });
  };

  const handleAddSupervisorQuickSteps = () => {
    if (!supervisorQuickInput.trim()) return;
    const newNums = parseStepNumbersInput(supervisorQuickInput, modelSteps.length || 100);
    if (newNums.length === 0) return;
    setSupervisorSteps(prev => {
      const combined = Array.from(new Set([...prev, ...newNums]));
      return combined.sort((a, b) => a - b);
    });
    setSupervisorQuickInput("");
  };

  const handleSelectAllSupervisorSteps = () => {
    setSupervisorSteps((modelSteps || []).map(s => s.step_number));
  };

  const handleSelectCleaningOnlySupervisorSteps = () => {
    setSupervisorSteps((modelSteps || []).filter(s => isStepCleaning(s)).map(s => s.step_number));
  };

  const handleClearSupervisorSteps = () => {
    setSupervisorSteps([]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (cleaningCount < 2) {
      alert(`Regla de Calidad Obligatoria: La línea debe incluir al menos 2 estaciones designadas para Limpieza. Actualmente tienes ${cleaningCount}.`);
      return;
    }

    for (const st of stationsList) {
      if (!st.user_id) {
        alert(`La Estación ${st.station_number} (${st.station_name}) requiere un 1er Técnico (titular) asignado.`);
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        model_name: modelName,
        part_number: partNumber,
        total_units: parseInt(totalUnits, 10),
        status: status,
        supervisor_id: supervisorId || null,
        supervisor_name: supervisorName || null,
        supervisor_steps: supervisorId && supervisorSteps.length > 0 ? supervisorSteps.join(",") : null,
        stations: stationsList.map(st => ({
          station_number: st.station_number,
          station_name: st.station_name,
          user_id: st.user_id,
          user_name: st.user_name,
          secondary_user_id: st.secondary_user_id || null,
          secondary_user_name: st.secondary_user_name || null,
          step_numbers: st.step_numbers || [],
          is_cleaning_station: !!st.is_cleaning_station,
          station_type: st.is_cleaning_station ? "CLEANING" : (st.station_type || "ASSEMBLY")
        }))
      };

      const res = await fetch(`${API_BASE}/orders/${order.order_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al actualizar la orden");
      }

      onSuccess(data.message || "Orden actualizada exitosamente");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderModalStationCard = (st, idx) => {
    const isClean = Boolean(st.is_cleaning_station);
    return (
      <div
        key={st.station_number}
        className={`rounded-2xl border p-4 transition space-y-3 ${
          isClean
            ? "bg-emerald-50/50 border-emerald-300 shadow-xs"
            : "bg-white border-gray-200 shadow-xs"
        }`}
      >
        {/* Fila 1: Nombre de Estación y Limpieza */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <span className={`font-bold text-xs px-2.5 py-1 rounded-lg font-mono flex-shrink-0 ${
              isClean ? "bg-emerald-700 text-white" : "bg-gray-900 text-white"
            }`}>
              Estación {st.station_number}
            </span>
            <input
              type="text"
              value={st.station_name}
              onChange={(e) => handleStationNameChange(idx, e.target.value)}
              placeholder="Nombre de estación (ej: Chasis y Montaje)..."
              className="flex-1 text-xs font-semibold border border-gray-300 rounded-lg p-1.5 bg-white focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleCleaning(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                isClean
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              <span>🧼 Estación Limpieza</span>
              {isClean && <Check className="w-3.5 h-3.5" />}
            </button>

            {stationsList.length > 2 && (
              <button
                type="button"
                onClick={() => handleRemoveStation(idx)}
                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Eliminar estación"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Fila 2: Dos Técnicos Asignados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* 1er Técnico (Titular) */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1 text-[11px]">
              1er Técnico (Titular) <span className="text-rose-600">*</span>
            </label>
            <select
              value={st.user_id}
              onChange={(e) => handlePrimaryTechChange(idx, e.target.value)}
              required
              className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2 bg-white focus:border-primary focus:outline-none"
            >
              <option value="">-- Seleccionar Técnico Titular --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* 2do Técnico (Co-operario / Apoyo) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-gray-700 text-[11px]">
                2do Técnico (Co-operario / Apoyo)
              </label>
              {st.secondary_user_id && (
                <span className="text-[10px] font-bold text-primary bg-stone-200 px-1.5 py-0.2 rounded">
                  👥 2 Técnicos Activos
                </span>
              )}
            </div>
            <select
              value={st.secondary_user_id || ""}
              onChange={(e) => handleSecondaryTechChange(idx, e.target.value)}
              className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2 bg-white focus:border-primary focus:outline-none"
            >
              <option value="">-- (Opcional) Sin 2do técnico --</option>
              {users.map(u => (
                <option key={u.id} value={u.id} disabled={u.id === st.user_id}>
                  {u.name} ({u.role}) {u.id === st.user_id ? "— (Ya es 1er técnico)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 3: Pasos Asignados */}
        <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-200/80 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 text-[11px]">Pasos Asignados:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                isClean ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-800"
              }`}>
                {(st.step_numbers || []).length} pasos
              </span>
              <span className="text-gray-500 font-mono text-[11px]">
                {formatStepNumbersRange(st.step_numbers)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setVisualPickerStation(idx)}
                className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold rounded-lg text-[11px] transition flex items-center gap-1"
              >
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
                <span>Selector Visual</span>
              </button>
              <button
                type="button"
                onClick={() => handleClearStationSteps(idx)}
                className="px-2 py-1 text-gray-400 hover:text-rose-600 rounded text-[11px] transition"
                title="Vaciar pasos"
              >
                Vaciar
              </button>
            </div>
          </div>

          <input
            type="text"
            value={st.rawStepsInput}
            onChange={(e) => handleStepsInputChange(idx, e.target.value)}
            placeholder="Ej: 1-10, 15, 20-25"
            className="w-full text-xs font-mono border border-gray-300 rounded-lg p-1.5 bg-white focus:border-primary focus:outline-none"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-gray-200">
        
        {/* Cabecera del Modal */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shadow">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Editar Orden de Producción</h3>
                <span className="bg-primary-light/30 text-blue-200 px-2 py-0.5 rounded text-xs font-mono font-bold">
                  {order.order_id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ajusta parámetros, supervisor de calidad y asignaciones de los 2 técnicos por estación/paso
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition touch-target flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario Principal */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          
          {/* Tarjeta: Parámetros del Lote */}
          <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <Cpu className="w-4 h-4 text-primary" />
                <span>Parámetros del Lote y Modelo</span>
              </h4>
              <Badge variant="info">Orden Activa</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Modelo de PC */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Modelo de PC</label>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2.5 bg-white focus:border-primary focus:outline-none"
                >
                  {models.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.step_count || 52} pasos)
                    </option>
                  ))}
                </select>
              </div>

              {/* Número de Parte */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nº de Parte (P/N)</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="Ej: PN-PRO-01"
                  className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2.5 bg-white focus:border-primary focus:outline-none"
                />
              </div>

              {/* Total Unidades */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Cantidad de PCs</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(parseInt(e.target.value, 10) || 1)}
                  className="w-full text-xs font-bold border border-gray-300 rounded-xl p-2.5 bg-white focus:border-primary focus:outline-none font-mono"
                />
              </div>

              {/* Estado de la Orden */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Estado de la Orden</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs font-bold border border-gray-300 rounded-xl p-2.5 bg-white focus:border-primary focus:outline-none"
                >
                  <option value="IN_PROGRESS">🟡 En Proceso (IN_PROGRESS)</option>
                  <option value="PAUSED">⏸️ Pausada (PAUSED)</option>
                  <option value="COMPLETED">🟢 Finalizada (COMPLETED)</option>
                </select>
              </div>
            </div>

            {totalUnits < (order.total_units || 0) && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl flex items-center gap-2 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Atención:</strong> Disminuir la cantidad de unidades eliminará únicamente aquellas PCs excedentes que sigan en estado PENDING y sin avance.
                </span>
              </div>
            )}

            {/* Asignación de Supervisor de Calidad */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Supervisor de Calidad Asignado</span>
                </label>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-primary border border-stone-200">
                  Rol: Valida con Fotos de Cumplimiento
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <select
                  value={supervisorId}
                  onChange={(e) => handleSupervisorChange(e.target.value)}
                  className="w-full text-xs font-semibold border border-stone-300 rounded-xl p-2.5 bg-white focus:border-primary focus:outline-none"
                >
                  <option value="">-- Sin supervisor asignado --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      [{u.role}] {u.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-600 leading-tight">
                  El supervisor es el encargado de verificar el cumplimiento de los pasos y certificar la orden capturando fotos de evidencia directa.
                </p>
              </div>

              {/* Apartado para seleccionar qué pasos va a supervisar en edición */}
              {supervisorId && (
                <div className="mt-2 pt-2.5 border-t border-stone-200 space-y-2.5">
                  {/* Fila 1: Resumen y Acciones Rápidas */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        <span>Pasos a Supervisar:</span>
                      </span>
                      <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
                        {supervisorSteps.length > 0 ? `${supervisorSteps.length} pasos asignados` : `Todos los pasos (${modelSteps.length || 52})`}
                      </span>
                      {supervisorSteps.length > 0 && (
                        <span className="text-primary font-mono text-[11px]">
                          {formatStepNumbersRange(supervisorSteps)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSupervisorPickerOpen(true)}
                        className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-bold rounded-lg text-[11px] transition flex items-center gap-1"
                      >
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <span>Selector Visual</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectCleaningOnlySupervisorSteps}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg text-[11px] transition flex items-center gap-1"
                        title="Supervisar únicamente los pasos de limpieza"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Solo Limpieza</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectAllSupervisorSteps}
                        className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 font-bold rounded-lg text-[11px] transition"
                      >
                        Todos
                      </button>
                      {supervisorSteps.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSupervisorSteps}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg text-[11px] font-bold transition"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fila 2: Input Rápido para agregar pasos o rangos */}
                  <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-stone-200">
                    <span className="text-[11px] font-bold text-stone-700 whitespace-nowrap hidden sm:inline pl-1">
                      + Agregar paso(s):
                    </span>
                    <input
                      type="text"
                      placeholder="Escribe números o rangos, ej: 12, 13, 14, 43 o 1-5, 48-52..."
                      value={supervisorQuickInput}
                      onChange={(e) => setSupervisorQuickInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSupervisorQuickSteps();
                        }
                      }}
                      className="flex-1 text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddSupervisorQuickSteps}
                      className="px-3 py-1.5 bg-primary hover:bg-primary-light text-white rounded-lg text-xs font-bold transition flex-shrink-0"
                    >
                      + Añadir
                    </button>
                  </div>

                  {/* Fila 3: Chips interactivos de pasos */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-stone-500 px-0.5">
                      <span>Pasos asignados ({supervisorSteps.length}):</span>
                      <span className="text-stone-400">Toca ✕ para quitar cualquier paso</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white rounded-xl border border-dashed border-stone-300">
                      {supervisorSteps.length > 0 ? (
                        supervisorSteps.map(num => {
                          const stepInfo = modelSteps.find(s => s.step_number === num);
                          const isClean = stepInfo && isStepCleaning(stepInfo);
                          return (
                            <span
                              key={num}
                              title={stepInfo ? `Paso #${num}: ${stepInfo.operation} · Clic en ✕ para quitar` : `Paso #${num}`}
                              className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-rose-50 text-stone-900 hover:text-rose-700 pl-2 pr-1.5 py-1 rounded-lg text-xs font-bold border border-stone-200 hover:border-rose-300 shadow-2xs transition group"
                            >
                              <span className={isClean ? "text-emerald-700 group-hover:text-rose-700" : "text-primary group-hover:text-rose-700"}>
                                #{num}
                              </span>
                              {stepInfo && (
                                <span className="text-[10px] text-stone-600 group-hover:text-rose-600 max-w-[140px] truncate hidden sm:inline">
                                  {stepInfo.operation}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleSupervisorStep(num)}
                                className="w-4 h-4 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-rose-600 transition"
                                title={`Quitar paso #${num}`}
                              >
                                ✕
                              </button>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-stone-500 italic py-1">
                          Sin pasos específicos asignados: supervisará <strong>todos los pasos</strong> por defecto. Escribe arriba (ej: 12, 13, 14, 43) o abre el selector visual para restringir la supervisión.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta: Estaciones de Trabajo y Técnicos Duales */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-gray-200">
              <div>
                <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Estaciones de Trabajo y Técnicos ({stationsList.length})</span>
                </h4>
                <p className="text-[11px] text-gray-500">
                  Asigna hasta 2 técnicos por paso/estación (titular y co-operario de apoyo) y cumple la regla de limpieza.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {cleaningCount >= 2 ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{cleaningCount} Estaciones Limpieza (Válido)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>{cleaningCount}/2 Estaciones Limpieza (Faltan {2 - cleaningCount})</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleAutoDistribute}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-primary border border-stone-200 font-bold rounded-lg transition text-[11px] flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Distribuir Pasos</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddStation}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition text-[11px] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Estación</span>
                </button>
              </div>
            </div>

            {/* SEPARACIÓN EN DOS BLOQUES: ENSAMBLAJE Y LIMPIEZA */}
            <div className="space-y-6">

              {/* BLOQUE 1: LÍNEA PRINCIPAL DE ENSAMBLAJE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center shadow-2xs">
                      <Wrench className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                        <span>Línea Principal de Ensamblaje ({stationsList.filter(s => !s.is_cleaning_station).length} estaciones)</span>
                        <span className="text-[10px] bg-stone-100 text-primary font-bold px-2 py-0.5 rounded-full border border-stone-200">
                          Sin Pasos Limpieza
                        </span>
                      </h5>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {stationsList
                    .map((st, idx) => ({ st, idx }))
                    .filter(item => !item.st.is_cleaning_station)
                    .map(({ st, idx }) => renderModalStationCard(st, idx))}
                </div>
              </div>

              {/* BLOQUE 2: BLOQUE EXCLUSIVO DE LIMPIEZA */}
              <div className="bg-gradient-to-br from-emerald-50/60 via-teal-50/30 to-slate-50 p-4 rounded-2xl border-2 border-emerald-300 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-emerald-200/80">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                        <span>Bloque Exclusivo de Limpieza ({cleaningCount} estaciones)</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                          Obligatorio QC
                        </span>
                      </h5>
                      <p className="text-[10px] text-emerald-800">
                        Pasos de desprotección, retiro de películas, polvo y limpieza microfibra aislados aquí.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {stationsList
                    .map((st, idx) => ({ st, idx }))
                    .filter(item => item.st.is_cleaning_station)
                    .map(({ st, idx }) => renderModalStationCard(st, idx))}
                </div>
              </div>

            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm p-2">
            <div>
              {cleaningCount < 2 ? (
                <p className="text-rose-600 font-bold text-xs flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>Requiere mínimo 2 estaciones de limpieza para poder guardar.</span>
                </p>
              ) : (
                <p className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Cumple con las 2 estaciones de limpieza obligatorias.</span>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition touch-target"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || cleaningCount < 2}
                className="py-2.5 px-6 bg-primary hover:bg-primary text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 touch-target flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? "Guardando Cambios..." : "Guardar Cambios"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Modal Selector Visual de Pasos Reutilizable */}
        {visualPickerStation !== null && stationsList[visualPickerStation] && (
          <StepPickerModal
            isOpen={true}
            onClose={() => setVisualPickerStation(null)}
            stationIdx={visualPickerStation}
            station={stationsList[visualPickerStation]}
            modelSteps={modelSteps}
            allStations={stationsList}
            onToggleStep={handleToggleStep}
            onAddStepRange={handleAddStepRange}
            onClearStationSteps={handleClearStationSteps}
            onClaimAllFreeSteps={handleClaimAllFreeSteps}
          />
        )}

        {/* Modal Selector Visual de Pasos para Supervisor */}
        {supervisorPickerOpen && (
          <SupervisorStepPickerModal
            isOpen={true}
            onClose={() => setSupervisorPickerOpen(false)}
            supervisorName={supervisorName}
            modelSteps={modelSteps}
            supervisedSteps={supervisorSteps}
            onToggleStep={handleToggleSupervisorStep}
            onAddStepRange={handleAddSupervisorStepRange}
            onSelectAll={handleSelectAllSupervisorSteps}
            onSelectCleaningOnly={handleSelectCleaningOnlySupervisorSteps}
            onClearAll={handleClearSupervisorSteps}
          />
        )}
      </div>
    </div>
  );
}

// =============================================
// VISTA GESTIÓN DE TÉCNICOS
// =============================================
