import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Check, CheckCircle, AlertTriangle, Plus, Loader2, Play, 
  ShieldCheck, PlusCircle, Wrench, Trash2, RotateCcw, 
  Sparkles, Layers, UserPlus, X 
} from 'lucide-react';
import { API_BASE } from '../utils/api';
import Card from '../components/Card';
import StepPickerModal from '../modals/StepPickerModal';
import SupervisorStepPickerModal from '../modals/SupervisorStepPickerModal';
import CreateModelModal from '../modals/CreateModelModal';
import { 
  formatStepNumbersRange, 
  parseStepNumbersInput, 
  isStepCleaning, 
  distributeStepsEqually 
} from '../utils/steps';

const DEFAULT_ASSEMBLY_NAMES = [
  "Chasis y Montaje de Fuente",
  "Placa Base, CPU y Memoria",
  "Tarjeta Gráfica y Cableado",
  "Configuración, BIOS y Pruebas",
  "Personalización y Software",
  "Control Técnico Final",
  "Pruebas Adicionales",
  "Ensamble Extra"
];

const DEFAULT_CLEANING_NAMES = [
  "Limpieza Intermedia y Desprotección",
  "Limpieza Final y Embalaje",
  "Inspección Estética y Microfibra",
  "Embalaje, Sellado y Rotulado"
];

export default function CreateOrderView({ models = [], users = [], onSuccess, onRefreshModels, notify }) {
  const [modelName, setModelName] = useState(models[0]?.name || "PROWORK");
  const [orderId, setOrderId] = useState(`ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [partNumber, setPartNumber] = useState("90MB0YZ0-M0EAY0");
  const [totalUnits, setTotalUnits] = useState(50);

  // Múltiples Inspectores / Supervisores
  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [tempSupervisorId, setTempSupervisorId] = useState("");
  const [supervisorSteps, setSupervisorSteps] = useState([]);
  const [supervisorQuickInput, setSupervisorQuickInput] = useState("");
  const [supervisorPickerOpen, setSupervisorPickerOpen] = useState(false);

  // Cantidad de estaciones por bloque
  const [assemblyCount, setAssemblyCount] = useState(3);
  const [cleaningCount, setCleaningCount] = useState(2);

  // Estaciones separadas por bloque
  const [assemblyStations, setAssemblyStations] = useState([]);
  const [cleaningStations, setCleaningStations] = useState([]);

  // Pasos del modelo
  const [modelSteps, setModelSteps] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [createModelModalOpen, setCreateModelModalOpen] = useState(false);
  const [populatingSteps, setPopulatingSteps] = useState(false);

  // Inputs rápidos de texto por estación: { 'asmb_0': '...', 'clean_0': '...' }
  const [quickInputs, setQuickInputs] = useState({});

  // Modal selector visual: { type: 'ASSEMBLY' | 'CLEANING', idx: number }
  const [visualPickerTarget, setVisualPickerTarget] = useState(null);

  // Cargar checklist del modelo seleccionado
  const loadModelSteps = useCallback((mName) => {
    if (!mName) return;
    fetch(`${API_BASE}/models/${mName}/checklist`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setModelSteps(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadModelSteps(modelName);
  }, [modelName, loadModelSteps]);

  // Pasos divididos estrictamente por isStepCleaning
  const assemblySteps = useMemo(() => (modelSteps || []).filter(s => !isStepCleaning(s)), [modelSteps]);
  const cleaningSteps = useMemo(() => (modelSteps || []).filter(s => isStepCleaning(s)), [modelSteps]);

  const hasCleaningSteps = cleaningSteps.length > 0;

  // Cargar pasos estándar si el modelo no tiene pasos
  const handlePopulateStandardSteps = async (targetModel) => {
    try {
      setPopulatingSteps(true);
      const res = await fetch(`${API_BASE}/models/${targetModel}/populate-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "STANDARD", mode: "APPEND_MISSING" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al cargar plantilla");
      notify?.(data.message || `Pasos estándar cargados para ${targetModel}`, "success");
      loadModelSteps(targetModel);
      onRefreshModels?.();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setPopulatingSteps(false);
    }
  };

  // Inicializar estaciones de ensamblaje cuando cambie assemblyCount, users o assemblySteps
  useEffect(() => {
    const asmbNums = assemblySteps.map(s => s.step_number);
    const distributed = distributeStepsEqually(asmbNums, assemblyCount);

    setAssemblyStations(prev => {
      return Array.from({ length: assemblyCount }, (_, i) => {
        const existing = prev[i];
        const defaultOp = users[i % (users.length || 1)] || { id: `OP-${101 + i}`, name: `Operario ${i + 1}` };
        return {
          station_number: i + 1,
          station_name: existing?.station_name || DEFAULT_ASSEMBLY_NAMES[i] || `Estación Ensamblaje ${i + 1}`,
          user_id: existing?.user_id || defaultOp.id,
          user_name: existing?.user_name || defaultOp.name,
          secondary_user_id: existing?.secondary_user_id || "",
          secondary_user_name: existing?.secondary_user_name || "",
          is_cleaning_station: false,
          station_type: "ASSEMBLY",
          step_numbers: distributed[i] || []
        };
      });
    });
  }, [assemblyCount, users, assemblySteps]);

  // Inicializar estaciones de limpieza cuando cambie cleaningCount, users, cleaningSteps o assemblyCount
  useEffect(() => {
    const cleanNums = cleaningSteps.map(s => s.step_number);
    const actualCleanCount = hasCleaningSteps ? cleaningCount : 0;
    const distributed = distributeStepsEqually(cleanNums, actualCleanCount);

    setCleaningStations(prev => {
      return Array.from({ length: actualCleanCount }, (_, i) => {
        const existing = prev[i];
        const userOffset = (assemblyCount + i) % (users.length || 1);
        const defaultOp = users[userOffset] || { id: `OP-${201 + i}`, name: `Operario Limpieza ${i + 1}` };
        return {
          station_number: assemblyCount + i + 1,
          station_name: existing?.station_name || DEFAULT_CLEANING_NAMES[i] || `Estación Limpieza ${i + 1}`,
          user_id: existing?.user_id || defaultOp.id,
          user_name: existing?.user_name || defaultOp.name,
          secondary_user_id: existing?.secondary_user_id || "",
          secondary_user_name: existing?.secondary_user_name || "",
          is_cleaning_station: true,
          station_type: "CLEANING",
          step_numbers: distributed[i] || []
        };
      });
    });
  }, [cleaningCount, users, cleaningSteps, assemblyCount, hasCleaningSteps]);

  // Manejador: Auto-reparto exclusivo de ensamblaje
  const handleDistributeAssemblyOnly = () => {
    const asmbNums = assemblySteps.map(s => s.step_number);
    const distributed = distributeStepsEqually(asmbNums, assemblyStations.length);
    setAssemblyStations(prev => prev.map((st, i) => ({
      ...st,
      step_numbers: distributed[i] || []
    })));
    notify?.(`Pasos de ensamble (${asmbNums.length}) repartidos equitativamente entre las ${assemblyStations.length} estaciones de ensamble.`, "success");
  };

  // Manejador: Auto-reparto exclusivo de limpieza
  const handleDistributeCleaningOnly = () => {
    if (cleaningStations.length === 0) return;
    const cleanNums = cleaningSteps.map(s => s.step_number);
    const distributed = distributeStepsEqually(cleanNums, cleaningStations.length);
    setCleaningStations(prev => prev.map((st, i) => ({
      ...st,
      step_numbers: distributed[i] || []
    })));
    notify?.(`Pasos de limpieza (${cleanNums.length}) repartidos equitativamente entre las ${cleaningStations.length} estaciones de limpieza.`, "success");
  };

  // Manejador: Auto-reparto de ambos bloques
  const handleDistributeBothBlocks = () => {
    handleDistributeAssemblyOnly();
    if (hasCleaningSteps && cleaningStations.length > 0) {
      handleDistributeCleaningOnly();
    }
  };

  // Manejadores para agregar / quitar Inspectores
  const handleAddSupervisor = (uid) => {
    if (!uid) return;
    const u = users.find(x => x.id === uid);
    if (!u) return;
    if (selectedSupervisors.some(s => s.id === u.id)) {
      notify?.("El inspector ya fue añadido", "info");
      return;
    }
    setSelectedSupervisors(prev => [...prev, { id: u.id, name: u.name, role: u.role }]);
    setTempSupervisorId("");
  };

  const handleRemoveSupervisor = (uid) => {
    setSelectedSupervisors(prev => prev.filter(s => s.id !== uid));
  };

  // Manejadores de pasos para Ensamblaje
  const handleToggleAssemblyStep = (targetStationIdx, stepNum) => {
    // Validar que el paso sea efectivamente de ensamblaje
    if (!assemblySteps.some(s => s.step_number === stepNum)) return;

    setAssemblyStations(prev => prev.map((st, idx) => {
      const current = new Set(st.step_numbers || []);
      if (idx === targetStationIdx) {
        if (current.has(stepNum)) current.delete(stepNum);
        else current.add(stepNum);
      } else {
        current.delete(stepNum);
      }
      return { ...st, step_numbers: Array.from(current).sort((a, b) => a - b) };
    }));
  };

  const handleAddAssemblyStepRange = (targetStationIdx, from, to) => {
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    const asmbSet = new Set(assemblySteps.map(s => s.step_number));
    const toAdd = new Set();
    for (let i = min; i <= max; i++) {
      if (asmbSet.has(i)) toAdd.add(i);
    }

    setAssemblyStations(prev => prev.map((st, idx) => {
      const current = new Set(st.step_numbers || []);
      if (idx === targetStationIdx) {
        toAdd.forEach(n => current.add(n));
      } else {
        toAdd.forEach(n => current.delete(n));
      }
      return { ...st, step_numbers: Array.from(current).sort((a, b) => a - b) };
    }));
  };

  const handleAddAssemblyQuickSteps = (stationIdx) => {
    const key = `asmb_${stationIdx}`;
    const inputStr = quickInputs[key];
    if (!inputStr) return;
    const parsed = parseStepNumbersInput(inputStr, modelSteps.length || 500);
    const asmbSet = new Set(assemblySteps.map(s => s.step_number));
    const validToAdd = parsed.filter(n => asmbSet.has(n));

    if (validToAdd.length === 0) {
      notify?.("Los números ingresados no corresponden a pasos de ensamblaje", "warning");
      return;
    }

    const toAdd = new Set(validToAdd);
    setAssemblyStations(prev => prev.map((st, idx) => {
      const current = new Set(st.step_numbers || []);
      if (idx === stationIdx) {
        toAdd.forEach(n => current.add(n));
      } else {
        toAdd.forEach(n => current.delete(n));
      }
      return { ...st, step_numbers: Array.from(current).sort((a, b) => a - b) };
    }));
    setQuickInputs(prev => ({ ...prev, [key]: "" }));
  };

  const handleRemoveAssemblyStep = (stationIdx, stepNum) => {
    setAssemblyStations(prev => prev.map((st, idx) => {
      if (idx !== stationIdx) return st;
      return { ...st, step_numbers: (st.step_numbers || []).filter(n => n !== stepNum) };
    }));
  };

  const handleClearAssemblyStationSteps = (stationIdx) => {
    setAssemblyStations(prev => prev.map((st, idx) => {
      if (idx !== stationIdx) return st;
      return { ...st, step_numbers: [] };
    }));
  };

  const handleClaimAllFreeAssemblySteps = (stationIdx) => {
    const assigned = new Set();
    assemblyStations.forEach(st => (st.step_numbers || []).forEach(n => assigned.add(n)));
    const free = assemblySteps.map(s => s.step_number).filter(n => !assigned.has(n));
    if (free.length === 0) return;

    setAssemblyStations(prev => prev.map((st, idx) => {
      if (idx !== stationIdx) return st;
      const current = new Set(st.step_numbers || []);
      free.forEach(n => current.add(n));
      return { ...st, step_numbers: Array.from(current).sort((a, b) => a - b) };
    }));
  };

  // Manejadores de pasos para Limpieza
  const handleToggleCleaningStep = (targetStationIdx, stepNum) => {
    if (!cleaningSteps.some(s => s.step_number === stepNum)) return;

    setCleaningStations(prev => prev.map((st, idx) => {
      const current = new Set(st.step_numbers || []);
      if (idx === targetStationIdx) {
        if (current.has(stepNum)) current.delete(stepNum);
        else current.add(stepNum);
      } else {
        current.delete(stepNum);
      }
      return { ...st, step_numbers: Array.from(current).sort((a, b) => a - b) };
    }));
  };

  const handleAddCleaningStepRange = (targetStationIdx, from, to) => {
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    const cleanSet = new Set(cleaningSteps.map(s => s.step_number));
    const toAdd = new Set();
    for (let i = min; i <= max; i++) {
      if (cleanSet.has(i)) toAdd.add(i);
    }

    setCleaningStations(prev => prev.map((st, idx) => {
      const current = new Set(st.step_numbers || []);
      if (idx === targetStationIdx) {
        toAdd.forEach(n => current.add(n));
      } else {
        toAdd.forEach(n => current.delete(n));
      }
      return { ...st, step_numbers: Array.from(current).sort((a, b) => a - b) };
    }));
  };

  const handleAddCleaningQuickSteps = (stationIdx) => {
    const key = `clean_${stationIdx}`;
    const inputStr = quickInputs[key];
    if (!inputStr) return;
    const parsed = parseStepNumbersInput(inputStr, modelSteps.length || 500);
    const cleanSet = new Set(cleaningSteps.map(s => s.step_number));
    const validToAdd = parsed.filter(n => cleanSet.has(n));

    if (validToAdd.length === 0) {
      notify?.("Los números ingresados no corresponden a pasos de limpieza", "warning");
      return;
    }

    const toAdd = new Set(validToAdd);
    setCleaningStations(prev => prev.map((st, idx) => {
      const current = new Set(st.step_numbers || []);
      if (idx === stationIdx) {
        toAdd.forEach(n => current.add(n));
      } else {
        toAdd.forEach(n => current.delete(n));
      }
      return { ...st, step_numbers: Array.from(current).sort((a, b) => a - b) };
    }));
    setQuickInputs(prev => ({ ...prev, [key]: "" }));
  };

  const handleRemoveCleaningStep = (stationIdx, stepNum) => {
    setCleaningStations(prev => prev.map((st, idx) => {
      if (idx !== stationIdx) return st;
      return { ...st, step_numbers: (st.step_numbers || []).filter(n => n !== stepNum) };
    }));
  };

  const handleClearCleaningStationSteps = (stationIdx) => {
    setCleaningStations(prev => prev.map((st, idx) => {
      if (idx !== stationIdx) return st;
      return { ...st, step_numbers: [] };
    }));
  };

  const handleClaimAllFreeCleaningSteps = (stationIdx) => {
    const assigned = new Set();
    cleaningStations.forEach(st => (st.step_numbers || []).forEach(n => assigned.add(n)));
    const free = cleaningSteps.map(s => s.step_number).filter(n => !assigned.has(n));
    if (free.length === 0) return;

    setCleaningStations(prev => prev.map((st, idx) => {
      if (idx !== stationIdx) return st;
      const current = new Set(st.step_numbers || []);
      free.forEach(n => current.add(n));
      return { ...st, step_numbers: Array.from(current).sort((a, b) => a - b) };
    }));
  };

  // Cobertura independiente de cada bloque
  const assemblyCoverage = useMemo(() => {
    const assigned = new Set();
    const map = {};
    assemblyStations.forEach((st, idx) => {
      (st.step_numbers || []).forEach(n => {
        assigned.add(n);
        map[n] = { stationIdx: idx, stationNumber: st.station_number, stationName: st.station_name };
      });
    });
    const missing = assemblySteps.map(s => s.step_number).filter(n => !assigned.has(n));
    return {
      total: assemblySteps.length,
      assignedCount: assigned.size,
      missing,
      isComplete: missing.length === 0,
      map
    };
  }, [assemblyStations, assemblySteps]);

  const cleaningCoverage = useMemo(() => {
    const assigned = new Set();
    const map = {};
    cleaningStations.forEach((st, idx) => {
      (st.step_numbers || []).forEach(n => {
        assigned.add(n);
        map[n] = { stationIdx: idx, stationNumber: st.station_number, stationName: st.station_name };
      });
    });
    const missing = cleaningSteps.map(s => s.step_number).filter(n => !assigned.has(n));
    return {
      total: cleaningSteps.length,
      assignedCount: assigned.size,
      missing,
      isComplete: missing.length === 0,
      map
    };
  }, [cleaningStations, cleaningSteps]);

  const isGlobalComplete = assemblyCoverage.isComplete && (!hasCleaningSteps || cleaningCoverage.isComplete);

  // Manejadores para pasos del Supervisor
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
    setSupervisorSteps(prev => Array.from(new Set([...prev, ...range])).sort((a, b) => a - b));
  };

  const handleAddSupervisorQuickSteps = () => {
    if (!supervisorQuickInput.trim()) return;
    const newNums = parseStepNumbersInput(supervisorQuickInput, modelSteps.length || 500);
    if (newNums.length === 0) return;
    setSupervisorSteps(prev => Array.from(new Set([...prev, ...newNums])).sort((a, b) => a - b));
    setSupervisorQuickInput("");
  };

  const handleSelectAllSupervisorSteps = () => {
    setSupervisorSteps((modelSteps || []).map(s => s.step_number));
  };

  const handleSelectCleaningOnlySupervisorSteps = () => {
    setSupervisorSteps((cleaningSteps || []).map(s => s.step_number));
  };

  const handleClearSupervisorSteps = () => {
    setSupervisorSteps([]);
  };

  // Envío final del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasCleaningSteps && cleaningStations.length < 1) {
      alert("⚠️ Regla de Calidad Obligatoria: El modelo contiene pasos de limpieza. Debes asignar al menos 1 estación en el Bloque de Limpieza.");
      return;
    }

    if (!assemblyCoverage.isComplete) {
      alert(`⚠️ Faltan ${assemblyCoverage.missing.length} pasos de ensamblaje por asignar (${assemblyCoverage.missing.slice(0, 10).join(', ')}...). Asígnalos antes de iniciar.`);
      return;
    }

    if (hasCleaningSteps && !cleaningCoverage.isComplete) {
      alert(`⚠️ Faltan ${cleaningCoverage.missing.length} pasos de limpieza por asignar (${cleaningCoverage.missing.slice(0, 10).join(', ')}...). Asígnalos antes de iniciar.`);
      return;
    }

    // Unificar estaciones en secuencia estricta
    const combinedStations = [
      ...assemblyStations.map((st, idx) => ({
        ...st,
        station_number: idx + 1,
        is_cleaning_station: false,
        station_type: "ASSEMBLY"
      })),
      ...cleaningStations.map((st, idx) => ({
        ...st,
        station_number: assemblyStations.length + idx + 1,
        is_cleaning_station: true,
        station_type: "CLEANING"
      }))
    ];

    try {
      setSubmitting(true);
      const payloadStations = combinedStations.map((st) => {
        const nums = Array.from(new Set(st.step_numbers || [])).sort((a, b) => a - b);
        const sStart = nums.length > 0 ? Math.min(...nums) : 1;
        const sEnd = nums.length > 0 ? Math.max(...nums) : 1;
        return {
          station_number: st.station_number,
          user_id: st.user_id,
          user_name: st.user_name,
          secondary_user_id: st.secondary_user_id || null,
          secondary_user_name: st.secondary_user_name || null,
          station_name: st.station_name,
          is_cleaning_station: !!st.is_cleaning_station,
          station_type: st.is_cleaning_station ? "CLEANING" : "ASSEMBLY",
          start_step: sStart,
          end_step: sEnd,
          step_numbers: nums.join(",")
        };
      });

      const supIds = selectedSupervisors.map(s => s.id);
      const supNames = selectedSupervisors.map(s => s.name);

      const payload = {
        order_id: orderId,
        model_name: modelName,
        part_number: partNumber,
        total_units: parseInt(totalUnits, 10),
        supervisor_id: supIds.length > 0 ? supIds.join(", ") : null,
        supervisor_name: supNames.length > 0 ? supNames.join(", ") : null,
        supervisor_ids: supIds,
        supervisor_names: supNames,
        supervisor_steps: supervisorSteps.length > 0 ? supervisorSteps.join(",") : null,
        assignment_mode: "MANUAL",
        stations: payloadStations,
        created_by: "Admin / Supervisor QC"
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al crear la orden");
      }
      onSuccess(orderId);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Renderizador de tarjeta de estación genérico para ambos bloques
  const renderStationCard = (st, idx, type) => {
    const isClean = type === "CLEANING";
    const stepCount = (st.step_numbers || []).length;
    const rangeSummary = formatStepNumbersRange(st.step_numbers);
    const key = isClean ? `clean_${idx}` : `asmb_${idx}`;

    return (
      <div
        key={idx}
        className={`p-3.5 rounded-xl border transition space-y-3 ${
          isClean 
            ? "bg-emerald-50/60 border-emerald-300 shadow-xs" 
            : "bg-white border-stone-300 shadow-xs"
        }`}
      >
        {/* Fila 1: Nro de Estación, Nombre y Resumen */}
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 text-white ${
            isClean ? "bg-emerald-700" : "bg-[#1B4332]"
          }`}>
            {st.station_number}
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={st.station_name}
              onChange={(e) => {
                if (isClean) {
                  const copy = [...cleaningStations];
                  copy[idx].station_name = e.target.value;
                  setCleaningStations(copy);
                } else {
                  const copy = [...assemblyStations];
                  copy[idx].station_name = e.target.value;
                  setAssemblyStations(copy);
                }
              }}
              placeholder="Nombre de estación"
              className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white font-medium touch-target"
            />
          </div>

          <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border flex-shrink-0 ${
            isClean
              ? "text-emerald-900 bg-emerald-100 border-emerald-300"
              : "text-stone-900 bg-stone-100 border-stone-200"
          }`}>
            {stepCount} pasos ({rangeSummary})
          </span>
        </div>

        {/* Fila 2: Selectores de Técnicos Titular y Secundario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
              1er Técnico (Titular)
            </label>
            <select
              value={st.user_id}
              onChange={(e) => {
                const u = users.find(x => x.id === e.target.value);
                if (isClean) {
                  const copy = [...cleaningStations];
                  copy[idx].user_id = e.target.value;
                  copy[idx].user_name = u ? u.name : e.target.value;
                  setCleaningStations(copy);
                } else {
                  const copy = [...assemblyStations];
                  copy[idx].user_id = e.target.value;
                  copy[idx].user_name = u ? u.name : e.target.value;
                  setAssemblyStations(copy);
                }
              }}
              className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white touch-target font-medium"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.role === 'SUPERVISOR' ? '🛡️ ' : ''}{u.name} ({u.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5 flex items-center justify-between">
              <span>2do Técnico (Co-operario)</span>
              <span className="text-[9px] text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.2 rounded">Opcional</span>
            </label>
            <select
              value={st.secondary_user_id || ""}
              onChange={(e) => {
                const val = e.target.value;
                const u = users.find(x => x.id === val);
                if (isClean) {
                  const copy = [...cleaningStations];
                  copy[idx].secondary_user_id = val || null;
                  copy[idx].secondary_user_name = u ? u.name : null;
                  setCleaningStations(copy);
                } else {
                  const copy = [...assemblyStations];
                  copy[idx].secondary_user_id = val || null;
                  copy[idx].secondary_user_name = u ? u.name : null;
                  setAssemblyStations(copy);
                }
              }}
              className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white touch-target font-medium"
            >
              <option value="">-- Ninguno (1 solo técnico) --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  👥 {u.name} ({u.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 3: Botones de herramientas para esta estación */}
        <div className="flex items-center justify-end gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setVisualPickerTarget({ type, idx })}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Selector Visual</span>
          </button>
          <button
            type="button"
            onClick={() => isClean ? handleClearCleaningStationSteps(idx) : handleClearAssemblyStationSteps(idx)}
            className="p-1.5 bg-gray-50 hover:bg-rose-50 text-gray-500 hover:text-rose-600 border border-gray-200 rounded-lg text-xs transition flex-shrink-0"
            title="Quitar todos los pasos de esta estación"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fila 4: Input rápido para agregar pasos */}
        <div className="flex items-center gap-1.5 bg-gray-50 p-2 rounded-xl border border-gray-200">
          <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap hidden sm:inline">
            + Añadir paso(s):
          </span>
          <input
            type="text"
            placeholder={isClean ? "Ej: 12, 13 o 48-52..." : "Ej: 1-10 o 15, 20..."}
            value={quickInputs[key] || ""}
            onChange={(e) => setQuickInputs({ ...quickInputs, [key]: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (isClean) handleAddCleaningQuickSteps(idx);
                else handleAddAssemblyQuickSteps(idx);
              }
            }}
            className="flex-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => isClean ? handleAddCleaningQuickSteps(idx) : handleAddAssemblyQuickSteps(idx)}
            className={`px-3 py-1.5 text-white rounded-lg text-xs font-bold transition flex-shrink-0 ${
              isClean ? "bg-emerald-700 hover:bg-emerald-800" : "bg-[#1B4332] hover:bg-[#2D6A4F]"
            }`}
          >
            + Añadir
          </button>
        </div>

        {/* Fila 5: Chips de pasos con botón ✕ para quitar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-500 px-0.5">
            <span>Pasos asignados ({stepCount}):</span>
            <span className="text-gray-400">Toca ✕ para desasignar</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50/90 rounded-xl border border-dashed border-gray-300">
            {st.step_numbers && st.step_numbers.length > 0 ? (
              st.step_numbers.map(num => {
                const stepInfo = modelSteps.find(s => s.step_number === num);
                return (
                  <span
                    key={num}
                    title={stepInfo ? `Paso #${num}: ${stepInfo.operation}` : `Paso #${num}`}
                    className={`inline-flex items-center gap-1.5 bg-white hover:bg-rose-50 text-gray-800 hover:text-rose-700 pl-2 pr-1.5 py-1 rounded-lg text-xs font-bold border shadow-2xs transition group ${
                      isClean ? "border-emerald-300" : "border-gray-200 hover:border-rose-300"
                    }`}
                  >
                    <span className={isClean ? "text-emerald-700 font-mono" : "text-[#1B4332] font-mono"}>
                      #{num}
                    </span>
                    {stepInfo && (
                      <span className="text-[10px] text-gray-500 group-hover:text-rose-600 max-w-[120px] truncate hidden sm:inline">
                        {stepInfo.operation}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => isClean ? handleRemoveCleaningStep(idx, num) : handleRemoveAssemblyStep(idx, num)}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-rose-600 transition ml-0.5"
                      title={`Quitar paso #${num}`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-gray-400 italic py-1">
                Sin pasos asignados. Pulsa "Selector Visual" o escribe números arriba.
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 fade-in pb-8">
      <Card className="p-4">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-primary" />
          <span>Nueva Orden de Producción</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Parámetros del Lote */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Parámetros del Lote</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Modelo de PC</label>
                  <button
                    type="button"
                    onClick={() => setCreateModelModalOpen(true)}
                    className="text-[11px] font-bold text-[#1B4332] hover:text-[#2D6A4F] flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Nuevo Modelo</span>
                  </button>
                </div>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-medium touch-target"
                >
                  {models.map(m => (
                    <option key={m.name} value={m.name}>{m.name} ({m.step_count || 0} pasos)</option>
                  ))}
                </select>

                {/* Alerta si no hay pasos cargados */}
                {modelSteps.length === 0 && (
                  <div className="mt-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950 fade-in">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold">El modelo "{modelName}" no tiene pasos registrados</p>
                        <p className="text-[11px] text-amber-800">Se necesitan pasos en el checklist para asignarlos a las estaciones.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePopulateStandardSteps(modelName)}
                        disabled={populatingSteps}
                        className="px-3 py-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5 transition touch-target"
                      >
                        {populatingSteps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>Cargar Pasos Estándar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">N° de Orden</label>
                <input 
                  type="text" 
                  value={orderId} 
                  onChange={(e) => setOrderId(e.target.value)} 
                  required 
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-mono touch-target" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad de PCs</label>
                <input 
                  type="number" 
                  min="1" 
                  max="500" 
                  value={totalUnits} 
                  onChange={(e) => setTotalUnits(e.target.value)} 
                  required 
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-bold text-primary touch-target" 
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">N° de Parte</label>
                <input 
                  type="text" 
                  value={partNumber} 
                  onChange={(e) => setPartNumber(e.target.value)} 
                  required 
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-mono touch-target" 
                />
              </div>

              {/* SECCIÓN: MÚLTIPLES INSPECTORES DE CALIDAD */}
              <div className="col-span-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#1B4332]" />
                    <span>Inspectores / Supervisores de Calidad</span>
                  </label>
                  <span className="text-[10px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200 font-medium">
                    Puedes asignar 1 o más inspectores
                  </span>
                </div>

                {/* Selector para añadir inspectores */}
                <div className="flex items-center gap-2">
                  <select
                    value={tempSupervisorId}
                    onChange={(e) => setTempSupervisorId(e.target.value)}
                    className="flex-1 text-xs border border-stone-300 rounded-lg p-2 bg-white font-medium text-stone-900 touch-target focus:border-primary"
                  >
                    <option value="">-- Seleccionar inspector para añadir --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        [{u.role}] {u.name} ({u.id})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAddSupervisor(tempSupervisorId)}
                    disabled={!tempSupervisorId}
                    className="px-3.5 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] disabled:bg-stone-300 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Añadir Inspector</span>
                  </button>
                </div>

                {/* Lista de inspectores seleccionados */}
                <div className="mt-2.5 flex flex-wrap gap-2 min-h-[38px] p-2 bg-white rounded-xl border border-stone-200 items-center">
                  {selectedSupervisors.length > 0 ? (
                    selectedSupervisors.map(sup => (
                      <span
                        key={sup.id}
                        className="inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200/80 text-stone-900 px-2.5 py-1 rounded-lg text-xs font-bold border border-stone-300 shadow-2xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#1B4332]" />
                        <span>{sup.name}</span>
                        <span className="text-[10px] text-stone-500 font-mono">({sup.id})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSupervisor(sup.id)}
                          className="w-4 h-4 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-rose-600 transition"
                          title={`Quitar inspector ${sup.name}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400 italic">
                      Sin inspectores específicos asignados (cualquier supervisor podrá validar la orden).
                    </span>
                  )}
                </div>

                {/* Configuración de pasos a supervisar si hay inspectores */}
                {selectedSupervisors.length > 0 && (
                  <div className="mt-3 p-3 bg-white border border-stone-200 rounded-xl space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-900 text-xs">Pasos a Supervisar:</span>
                        <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
                          {supervisorSteps.length > 0 ? `${supervisorSteps.length} pasos asignados` : `Todos los pasos (${modelSteps.length || 0})`}
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
                        {hasCleaningSteps && (
                          <button
                            type="button"
                            onClick={handleSelectCleaningOnlySupervisorSteps}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg text-[11px] transition flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Solo Limpieza</span>
                          </button>
                        )}
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

                    <div className="flex items-center gap-1.5 bg-stone-50 p-1.5 rounded-xl border border-stone-200">
                      <span className="text-[11px] font-bold text-stone-700 whitespace-nowrap hidden sm:inline pl-1">
                        + Pasos específicos:
                      </span>
                      <input
                        type="text"
                        placeholder="Escribe números o rangos, ej: 1-10 o 12, 13..."
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
                        className="px-3 py-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-lg text-xs font-bold transition flex-shrink-0"
                      >
                        + Añadir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOTÓN GENERAL DE AUTO-REPARTO */}
          <div className="flex items-center justify-between p-3 bg-stone-100 border border-stone-300 rounded-xl">
            <div>
              <h3 className="text-xs font-bold text-stone-900">División de la Línea de Producción</h3>
              <p className="text-[11px] text-stone-600">
                Las estaciones de ensamblaje y limpieza se gestionan y dividen de forma completamente independiente.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDistributeBothBlocks}
              className="px-3.5 py-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 flex-shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Repartir Ambos Bloques</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* BLOQUE 1: ESTACIONES DE ENSAMBLAJE (EXCLUSIVAMENTE ENSAMBLE) */}
          {/* ========================================================= */}
          <div className="bg-white p-4 rounded-2xl border-2 border-stone-300 shadow-xs space-y-4">
            {/* Header del Bloque Ensamblaje */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1B4332] text-white flex items-center justify-center shadow-xs">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-stone-900">
                      Bloque de Ensamblaje
                    </h3>
                    <span className="text-[10px] bg-stone-100 text-stone-800 font-bold px-2 py-0.5 rounded-full border border-stone-300">
                      {assemblySteps.length} pasos de ensamble
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Solo incluye pasos de ensamblaje (chasis, placa, componentes y cableado). Cero mezcla con limpieza.
                  </p>
                </div>
              </div>

              {/* Selector de cantidad y botón de reparto */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-stone-600 font-bold">Estaciones:</label>
                  <select
                    value={assemblyCount}
                    onChange={(e) => setAssemblyCount(parseInt(e.target.value, 10))}
                    className="text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-[#1B4332] touch-target shadow-2xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'estación' : 'estaciones'}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleDistributeAssemblyOnly}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold text-xs rounded-lg border border-stone-300 transition flex items-center gap-1"
                  title="Dividir únicamente los pasos de ensamblaje entre las estaciones de este bloque"
                >
                  <RotateCcw className="w-3 h-3 text-[#1B4332]" />
                  <span>Repartir Ensamblaje</span>
                </button>
              </div>
            </div>

            {/* Alerta de cobertura de ensamblaje */}
            {!assemblyCoverage.isComplete ? (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Pasos de ensamble sin asignar ({assemblyCoverage.missing.length}):</strong> {assemblyCoverage.missing.slice(0, 10).join(', ')}{assemblyCoverage.missing.length > 10 ? '...' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleClaimAllFreeAssemblySteps(0)}
                  className="px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-bold rounded-md flex-shrink-0"
                >
                  Asignar a E1
                </button>
              </div>
            ) : (
              <div className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#1B4332] flex-shrink-0" />
                <span>
                  <strong>100% Cobertura de Ensamblaje:</strong> Todos los {assemblyCoverage.total} pasos de ensamble están asignados.
                </span>
              </div>
            )}

            {/* Tarjetas de estaciones de ensamblaje */}
            <div className="space-y-3">
              {assemblyStations.map((st, idx) => renderStationCard(st, idx, "ASSEMBLY"))}
            </div>
          </div>

          {/* ========================================================= */}
          {/* BLOQUE 2: ESTACIONES DE LIMPIEZA (EXCLUSIVAMENTE LIMPIEZA) */}
          {/* ========================================================= */}
          <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 p-4 rounded-2xl border-2 border-emerald-300 shadow-xs space-y-4">
            {/* Header del Bloque Limpieza */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-emerald-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-emerald-950">
                      Bloque de Limpieza
                    </h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      {cleaningSteps.length} pasos de limpieza
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Estaciones exclusivas para desprotección, limpieza de microfibra, sellado y embalaje.
                  </p>
                </div>
              </div>

              {/* Selector de cantidad y botón de reparto de limpieza */}
              {hasCleaningSteps ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-emerald-900 font-bold">Estaciones:</label>
                    <select
                      value={cleaningCount}
                      onChange={(e) => setCleaningCount(parseInt(e.target.value, 10))}
                      className="text-xs border border-emerald-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-emerald-800 touch-target shadow-2xs"
                    >
                      {[1, 2, 3, 4].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'estación' : 'estaciones'}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleDistributeCleaningOnly}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-lg border border-emerald-300 transition flex items-center gap-1"
                    title="Dividir únicamente los pasos de limpieza entre las estaciones de este bloque"
                  >
                    <RotateCcw className="w-3 h-3 text-emerald-700" />
                    <span>Repartir Limpieza</span>
                  </button>
                </div>
              ) : (
                <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                  Sin pasos de limpieza en este modelo
                </span>
              )}
            </div>

            {/* Alerta de cobertura de limpieza */}
            {hasCleaningSteps ? (
              !cleaningCoverage.isComplete ? (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      <strong>Pasos de limpieza sin asignar ({cleaningCoverage.missing.length}):</strong> {cleaningCoverage.missing.join(', ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClaimAllFreeCleaningSteps(0)}
                    className="px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-bold rounded-md flex-shrink-0"
                  >
                    Asignar a Limpieza 1
                  </button>
                </div>
              ) : (
                <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>
                    <strong>100% Cobertura de Limpieza:</strong> Todos los {cleaningCoverage.total} pasos de limpieza están asignados.
                  </span>
                </div>
              )
            ) : (
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600">
                ℹ️ Este modelo no tiene pasos marcados como limpieza. No se requieren estaciones de limpieza obligatorias.
              </div>
            )}

            {/* Tarjetas de estaciones de limpieza */}
            {hasCleaningSteps && (
              <div className="space-y-3">
                {cleaningStations.map((st, idx) => renderStationCard(st, idx, "CLEANING"))}
              </div>
            )}
          </div>

          {/* Botón de Enviar / Iniciar Línea */}
          <button
            type="submit"
            disabled={submitting || !isGlobalComplete}
            className="w-full py-3.5 bg-[#1B4332] hover:bg-[#2D6A4F] disabled:bg-gray-400 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition touch-target disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : !isGlobalComplete ? (
              <span>⚠️ Completa la asignación de todos los pasos antes de iniciar</span>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>Iniciar Línea de Producción ({assemblyStations.length + cleaningStations.length} Estaciones)</span>
              </>
            )}
          </button>
        </form>
      </Card>

      {/* Modal Selector Visual de Pasos (Adaptado para Ensamblaje o Limpieza) */}
      {visualPickerTarget !== null && (
        (() => {
          const { type, idx } = visualPickerTarget;
          const isClean = type === "CLEANING";
          const station = isClean ? cleaningStations[idx] : assemblyStations[idx];
          if (!station) return null;

          // Combinación de todas las estaciones para cálculo de transferencias dentro de la misma categoría
          const allStations = [
            ...assemblyStations.map((s, i) => ({ ...s, station_number: i + 1 })),
            ...cleaningStations.map((s, j) => ({ ...s, station_number: assemblyStations.length + j + 1 }))
          ];

          return (
            <StepPickerModal
              isOpen={true}
              onClose={() => setVisualPickerTarget(null)}
              stationIdx={idx}
              station={station}
              modelSteps={modelSteps}
              allStations={allStations}
              onToggleStep={isClean ? handleToggleCleaningStep : handleToggleAssemblyStep}
              onAddStepRange={isClean ? handleAddCleaningStepRange : handleAddAssemblyStepRange}
              onClearStationSteps={isClean ? handleClearCleaningStationSteps : handleClearAssemblyStationSteps}
              onClaimAllFreeSteps={isClean ? handleClaimAllFreeCleaningSteps : handleClaimAllFreeAssemblySteps}
            />
          );
        })()
      )}

      {/* Modal Selector Visual de Pasos para Supervisor */}
      {supervisorPickerOpen && (
        <SupervisorStepPickerModal
          isOpen={true}
          onClose={() => setSupervisorPickerOpen(false)}
          supervisorName={selectedSupervisors.map(s => s.name).join(", ") || "Inspectores QC"}
          modelSteps={modelSteps}
          supervisedSteps={supervisorSteps}
          onToggleStep={handleToggleSupervisorStep}
          onAddStepRange={handleAddSupervisorStepRange}
          onSelectAll={handleSelectAllSupervisorSteps}
          onSelectCleaningOnly={handleSelectCleaningOnlySupervisorSteps}
          onClearAll={handleClearSupervisorSteps}
        />
      )}

      {/* Modal Crear Nuevo Modelo */}
      <CreateModelModal
        isOpen={createModelModalOpen}
        onClose={() => setCreateModelModalOpen(false)}
        onSuccess={(newModelName) => {
          onRefreshModels?.();
          setModelName(newModelName);
        }}
        existingModels={models}
        notify={notify}
      />
    </div>
  );
}
