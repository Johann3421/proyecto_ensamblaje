import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, CheckCircle, AlertTriangle, Plus, Loader2, Play, Shield, ShieldCheck, PlusCircle, Wrench, Trash2, RotateCcw, Trash, Sparkles, Layers } from 'lucide-react';
import { API_BASE } from '../utils/api';
import Card from '../components/Card';
import StepPickerModal from '../modals/StepPickerModal';
import SupervisorStepPickerModal from '../modals/SupervisorStepPickerModal';
import CreateModelModal from '../modals/CreateModelModal';
import { formatStepNumbersRange, parseStepNumbersInput, isStepCleaning, distributeStepsSeparatingCleaning } from '../utils/steps';

export default function CreateOrderView({ models, users, onSuccess, onRefreshModels, notify }) {
  const [modelName, setModelName] = useState(models[0]?.name || "PROWORK");
  const [orderId, setOrderId] = useState(`ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [partNumber, setPartNumber] = useState("90MB0YZ0-M0EAY0");
  const [totalUnits, setTotalUnits] = useState(50);
  const [supervisorId, setSupervisorId] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorSteps, setSupervisorSteps] = useState([]);
  const [supervisorQuickInput, setSupervisorQuickInput] = useState("");
  const [supervisorPickerOpen, setSupervisorPickerOpen] = useState(false);
  const [stationCount, setStationCount] = useState(5);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [modelSteps, setModelSteps] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [quickInputs, setQuickInputs] = useState({});
  const [visualPickerStation, setVisualPickerStation] = useState(null);
  const [createModelModalOpen, setCreateModelModalOpen] = useState(false);
  const [populatingSteps, setPopulatingSteps] = useState(false);

  const loadModelSteps = useCallback((mName) => {
    fetch(`${API_BASE}/models/${mName}/checklist`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setModelSteps(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadModelSteps(modelName);
  }, [modelName, loadModelSteps]);

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
      notify?.(data.message || `52 pasos cargados para ${targetModel}`, "success");
      loadModelSteps(targetModel);
      onRefreshModels?.();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setPopulatingSteps(false);
    }
  };

  // Pool de pasos catalogados como limpieza
  const [cleaningPool, setCleaningPool] = useState(() => new Set([12, 13, 14, 43, 52]));
  const [newCleaningStepInput, setNewCleaningStepInput] = useState("");

  // Auto-detectar pasos de limpieza al cargar pasos del modelo
  useEffect(() => {
    if (modelSteps && modelSteps.length > 0) {
      const detected = modelSteps.filter(isStepCleaning).map(s => s.step_number);
      if (detected.length > 0) {
        const detectedSet = new Set(detected);
        setCleaningPool(detectedSet);
        setSelectedOperators(curr => distributeStepsSeparatingCleaning(curr, modelSteps, detectedSet));
      }
    }
  }, [modelSteps]);

  const handleToggleCleaningStepInPool = (stepNum) => {
    setCleaningPool(prev => {
      const next = new Set(prev);
      if (next.has(stepNum)) next.delete(stepNum);
      else next.add(stepNum);
      setSelectedOperators(curr => distributeStepsSeparatingCleaning(curr, modelSteps, next));
      return next;
    });
  };

  const handleAddStepToCleaningPool = (val) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setCleaningPool(prev => {
        const next = new Set([...prev, num]);
        setSelectedOperators(curr => distributeStepsSeparatingCleaning(curr, modelSteps, next));
        return next;
      });
      setNewCleaningStepInput("");
    }
  };

  const handleResetCleaningPool = () => {
    const detected = modelSteps.filter(isStepCleaning).map(s => s.step_number);
    const next = new Set(detected.length > 0 ? detected : [12, 13, 14, 43, 52]);
    setCleaningPool(next);
    setSelectedOperators(curr => distributeStepsSeparatingCleaning(curr, modelSteps, next));
    notify?.("Pool de limpieza restaurado con los pasos recomendados", "info");
  };

  // Inicializar estaciones cuando cambia la cantidad, usuarios o modelo
  useEffect(() => {
    const defaultAssemblyNames = [
      "Chasis y Montaje de Fuente",
      "Placas, Memorias y Tarjeta Gráfica",
      "Configuración, BIOS y Pruebas",
      "Personalización, Software y Serie",
      "Pruebas Finales y Control Técnico"
    ];

    const initial = Array.from({ length: stationCount }, (_, i) => {
      const op = users[i % users.length] || { id: `OP-${101 + i}`, name: `Operario ${i + 1}` };
      const isCleaning = stationCount >= 2 && (i === stationCount - 1 || i === stationCount - 2 || i === Math.floor(stationCount / 2));
      let defaultName = defaultAssemblyNames[i] || `Estación ${i + 1}`;
      if (isCleaning) {
        if (i === stationCount - 1) defaultName = "Limpieza Final y Embalaje";
        else defaultName = "Limpieza Intermedia y Desprotección";
      }
      return {
        station_number: i + 1,
        user_id: op.id,
        user_name: op.name,
        secondary_user_id: "",
        secondary_user_name: "",
        station_name: defaultName,
        is_cleaning_station: isCleaning,
        station_type: isCleaning ? "CLEANING" : "ASSEMBLY",
        step_numbers: []
      };
    });

    const distributed = distributeStepsSeparatingCleaning(initial, modelSteps, cleaningPool);
    setSelectedOperators(distributed);
  }, [stationCount, users, modelSteps]);

  // Manejador: Asignar / Quitar paso individual a una estación
  const handleToggleStep = (targetStationIdx, stepNum) => {
    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        const currentSteps = new Set(st.step_numbers || []);
        if (idx === targetStationIdx) {
          if (currentSteps.has(stepNum)) {
            currentSteps.delete(stepNum);
          } else {
            currentSteps.add(stepNum);
          }
        } else {
          // Si el paso fue asignado a la estación destino, removerlo de otras
          currentSteps.delete(stepNum);
        }
        return {
          ...st,
          step_numbers: Array.from(currentSteps).sort((a, b) => a - b)
        };
      });
    });
  };

  // Manejador: Asignar rango rápido a una estación
  const handleAddStepRange = (targetStationIdx, from, to) => {
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    const toAdd = new Set();
    for (let i = min; i <= max; i++) toAdd.add(i);

    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        const current = new Set(st.step_numbers || []);
        if (idx === targetStationIdx) {
          toAdd.forEach(n => current.add(n));
        } else {
          toAdd.forEach(n => current.delete(n));
        }
        return {
          ...st,
          step_numbers: Array.from(current).sort((a, b) => a - b)
        };
      });
    });
  };

  // Manejador: Agregar pasos por texto rápido (ej: "9" o "17-31" o "9, 17-31")
  const handleAddQuickSteps = (stationIdx) => {
    const inputStr = quickInputs[stationIdx];
    if (!inputStr) return;
    const parsed = parseStepNumbersInput(inputStr, modelSteps.length || 200);
    if (parsed.length === 0) return;

    const toAdd = new Set(parsed);
    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        const current = new Set(st.step_numbers || []);
        if (idx === stationIdx) {
          toAdd.forEach(n => current.add(n));
        } else {
          toAdd.forEach(n => current.delete(n));
        }
        return {
          ...st,
          step_numbers: Array.from(current).sort((a, b) => a - b)
        };
      });
    });
    setQuickInputs(prev => ({ ...prev, [stationIdx]: "" }));
  };

  // Manejador: Quitar un paso individual (desde las fichas de la tarjeta)
  const handleRemoveStep = (stationIdx, stepNum) => {
    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        if (idx !== stationIdx) return st;
        return {
          ...st,
          step_numbers: (st.step_numbers || []).filter(n => n !== stepNum)
        };
      });
    });
  };

  // Manejador: Vaciar todos los pasos de una estación
  const handleClearStationSteps = (stationIdx) => {
    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        if (idx !== stationIdx) return st;
        return { ...st, step_numbers: [] };
      });
    });
  };

  // Manejador: Asignar todos los pasos libres a una estación
  const handleClaimAllFreeSteps = (stationIdx) => {
    const total = modelSteps.length || 52;
    const allAssigned = new Set();
    selectedOperators.forEach(st => {
      (st.step_numbers || []).forEach(n => allAssigned.add(n));
    });
    const free = [];
    for (let i = 1; i <= total; i++) {
      if (!allAssigned.has(i)) free.push(i);
    }
    if (free.length === 0) return;

    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        if (idx !== stationIdx) return st;
        const current = new Set(st.step_numbers || []);
        free.forEach(n => current.add(n));
        return { ...st, step_numbers: Array.from(current).sort((a, b) => a - b) };
      });
    });
  };

  // Manejador: Auto-distribuir equitativamente separando limpieza de ensamble
  const handleDistributeAuto = () => {
    setSelectedOperators(prev => distributeStepsSeparatingCleaning(prev, modelSteps, cleaningPool));
    notify?.("Pasos distribuidos: Las estaciones de ensamblaje NO contienen pasos de limpieza.", "success");
  };

  // Manejadores para Pasos Asignados a Supervisión
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

  // Análisis de cobertura global
  const coverageAnalysis = useMemo(() => {
    const total = modelSteps.length || 52;
    const stepToStation = {};
    selectedOperators.forEach((st, idx) => {
      (st.step_numbers || []).forEach(num => {
        stepToStation[num] = { stationIdx: idx, stationNumber: st.station_number, stationName: st.station_name };
      });
    });

    const missing = [];
    for (let i = 1; i <= total; i++) {
      if (!stepToStation[i]) missing.push(i);
    }

    const assignedCount = Object.keys(stepToStation).length;
    const isComplete = missing.length === 0;

    return {
      total,
      assignedCount,
      missing,
      isComplete,
      stepToStation
    };
  }, [selectedOperators, modelSteps]);

  // Conteo de estaciones de limpieza
  const cleaningCount = useMemo(() => {
    return (selectedOperators || []).filter(s => s.is_cleaning_station).length;
  }, [selectedOperators]);
  const hasEnoughCleaning = cleaningCount >= 2;

  const STATION_COLORS = [
    { bg: "bg-primary", text: "text-primary", border: "border-stone-300", light: "bg-stone-100" },
    { bg: "bg-emerald-600", text: "text-emerald-700", border: "border-emerald-400", light: "bg-emerald-50" },
    { bg: "bg-amber-600", text: "text-amber-700", border: "border-amber-400", light: "bg-amber-50" },
    { bg: "bg-purple-600", text: "text-purple-700", border: "border-purple-400", light: "bg-purple-50" },
    { bg: "bg-cyan-600", text: "text-cyan-700", border: "border-cyan-400", light: "bg-cyan-50" },
    { bg: "bg-rose-600", text: "text-rose-700", border: "border-rose-400", light: "bg-rose-50" },
    { bg: "bg-indigo-600", text: "text-indigo-700", border: "border-indigo-400", light: "bg-indigo-50" },
    { bg: "bg-teal-600", text: "text-teal-700", border: "border-teal-400", light: "bg-teal-50" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cleaningCount < 2) {
      alert("⚠️ Regla de Calidad Obligatoria: La línea de producción debe incluir al menos 2 estaciones designadas para Limpieza.");
      return;
    }

    if (!coverageAnalysis.isComplete) {
      alert(`⚠️ Faltan ${coverageAnalysis.missing.length} pasos por asignar en la línea (${coverageAnalysis.missing.slice(0, 10).join(', ')}...). Por favor, asigna todos los pasos antes de iniciar.`);
      return;
    }

    try {
      setSubmitting(true);
      const payloadStations = selectedOperators.map((st) => {
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
          station_type: st.station_type || (st.is_cleaning_station ? "CLEANING" : "ASSEMBLY"),
          start_step: sStart,
          end_step: sEnd,
          step_numbers: nums.join(",")
        };
      });

      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          model_name: modelName,
          part_number: partNumber,
          total_units: parseInt(totalUnits, 10),
          supervisor_id: supervisorId || null,
          supervisor_name: supervisorName || null,
          supervisor_steps: supervisorId && supervisorSteps.length > 0 ? supervisorSteps.join(",") : null,
          assignment_mode: "MANUAL",
          stations: payloadStations,
          created_by: "Admin / Supervisor QC"
        })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Error al crear orden"); }
      onSuccess(orderId);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStationCard = (st, idx) => {
    const color = STATION_COLORS[idx % STATION_COLORS.length];
    const stepCount = (st.step_numbers || []).length;
    const rangeSummary = formatStepNumbersRange(st.step_numbers);
    const isCleaning = Boolean(st.is_cleaning_station);

    return (
      <div
        key={idx}
        className={`p-3.5 rounded-xl border transition ${
          isCleaning ? "bg-emerald-50/50 border-emerald-300 shadow-xs" : "bg-white border-gray-200 shadow-xs"
        } space-y-3`}
      >
        {/* Fila 1: Estación, Nombre, Limpieza toggle y Resumen */}
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 ${
            isCleaning ? "bg-emerald-600 text-white" : `${color.bg} text-white`
          }`}>
            {st.station_number}
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={st.station_name}
              onChange={(e) => {
                const copy = [...selectedOperators];
                copy[idx].station_name = e.target.value;
                setSelectedOperators(copy);
              }}
              placeholder="Nombre de estación"
              className="w-full text-xs border border-gray-300 rounded-lg p-2 touch-target bg-white font-medium"
            />
          </div>

          {/* Toggle Limpieza */}
          <button
            type="button"
            onClick={() => {
              const copy = [...selectedOperators];
              const nextCleaning = !copy[idx].is_cleaning_station;
              copy[idx].is_cleaning_station = nextCleaning;
              copy[idx].station_type = nextCleaning ? "CLEANING" : "ASSEMBLY";
              setSelectedOperators(copy);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1 flex-shrink-0 ${
              isCleaning
                ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
            title={isCleaning ? "Estación de limpieza activa. Clic para cambiar a ensamblaje." : "Marcar como estación de limpieza"}
          >
            <span>🧼</span>
            <span>{isCleaning ? "Limpieza OK" : "+ Limpieza"}</span>
          </button>

          {/* Resumen de pasos asignados */}
          <span className="text-[10px] font-bold text-stone-900 bg-stone-100 px-2.5 py-1.5 rounded-lg border border-stone-200 flex-shrink-0">
            {stepCount}p ({rangeSummary})
          </span>
        </div>

        {/* Fila 2: Selectores de 1er y 2do Técnico */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                1er Técnico (Titular)
              </label>
              <select
                value={st.user_id}
                onChange={(e) => {
                  const copy = [...selectedOperators];
                  const u = users.find(u => u.id === e.target.value);
                  copy[idx].user_id = e.target.value;
                  copy[idx].user_name = u ? u.name : e.target.value;
                  setSelectedOperators(copy);
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
                <span className="text-[9px] text-primary font-semibold bg-stone-100 px-1.5 py-0.2 rounded">Opcional</span>
              </label>
              <select
                value={st.secondary_user_id || ""}
                onChange={(e) => {
                  const copy = [...selectedOperators];
                  const val = e.target.value;
                  const u = users.find(x => x.id === val);
                  copy[idx].secondary_user_id = val || null;
                  copy[idx].secondary_user_name = u ? u.name : null;
                  setSelectedOperators(copy);
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

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setVisualPickerStation(idx)}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-primary border border-stone-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Selector Visual</span>
            </button>
            <button
              type="button"
              onClick={() => handleClearStationSteps(idx)}
              className="p-1.5 bg-gray-50 hover:bg-rose-50 text-gray-500 hover:text-rose-600 border border-gray-200 rounded-lg text-xs transition flex-shrink-0"
              title="Quitar todos los pasos de esta estación"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Fila 3: Barra para agregar pasos por texto (ej: 9 o 17-31) */}
        <div className="flex items-center gap-1.5 bg-gray-50 p-2 rounded-xl border border-gray-200">
          <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap hidden sm:inline">
            + Agregar paso(s):
          </span>
          <input
            type="text"
            placeholder="Escribe números o rangos, ej: 9 o 17-31 o 9, 17-31..."
            value={quickInputs[idx] || ""}
            onChange={(e) => setQuickInputs({ ...quickInputs, [idx]: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddQuickSteps(idx);
              }
            }}
            className="flex-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleAddQuickSteps(idx)}
            className="px-3 py-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-lg text-xs font-bold transition flex-shrink-0"
          >
            + Añadir
          </button>
        </div>

        {/* Fila 4: Fichas / Chips interactivas de pasos (Quitar a voluntad con [✕]) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-500 px-0.5">
            <span>Pasos en esta estación ({stepCount}):</span>
            <span className="text-gray-400">Toca ✕ para quitar cualquier paso</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50/90 rounded-xl border border-dashed border-gray-300">
            {st.step_numbers && st.step_numbers.length > 0 ? (
              st.step_numbers.map(num => {
                const stepInfo = modelSteps.find(s => s.step_number === num);
                return (
                  <span
                    key={num}
                    title={stepInfo ? `Paso #${num}: ${stepInfo.operation} · Clic en ✕ para quitar` : `Paso #${num}`}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-rose-50 text-gray-800 hover:text-rose-700 pl-2 pr-1.5 py-1 rounded-lg text-xs font-bold border border-gray-200 hover:border-rose-300 shadow-2xs transition group"
                  >
                    <span className={isCleaning ? "text-emerald-700 group-hover:text-rose-700" : "text-primary group-hover:text-rose-700"}>#{num}</span>
                    {stepInfo && (
                      <span className="text-[10px] text-gray-500 group-hover:text-rose-600 max-w-[120px] truncate hidden sm:inline">
                        {stepInfo.operation}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx, num)}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-rose-600 transition"
                      title={`Quitar paso #${num}`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-gray-400 italic py-1">
                Sin pasos asignados. Escribe arriba (ej: 9 o 17-31) o abre el selector visual.
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
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-3">
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

                {/* Alerta de modelo sin pasos */}
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
                <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} required className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-mono touch-target" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad de PCs</label>
                <input type="number" min="1" max="500" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} required className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-bold text-primary touch-target" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">N° de Parte</label>
                <input type="text" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} required className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-mono touch-target" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Supervisor de Calidad Asignado</span>
                  </span>
                  <span className="text-[10px] text-primary font-semibold bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                    Rol: Validar y tomar fotos de cumplimiento
                  </span>
                </label>
                <select
                  value={supervisorId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setSupervisorId(sid);
                    const u = users.find(x => x.id === sid);
                    setSupervisorName(u ? u.name : "");
                    if (!sid) {
                      setSupervisorSteps([]);
                    }
                  }}
                  className="w-full text-xs border border-stone-300 rounded-lg p-2.5 bg-stone-50 font-medium text-stone-900 touch-target focus:border-primary focus:bg-white"
                >
                  <option value="">-- Sin supervisor específico asignado --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      [{u.role}] {u.name}
                    </option>
                  ))}
                </select>

                {/* Apartado para seleccionar qué pasos va a supervisar */}
                {supervisorId && (
                  <div className="mt-2.5 p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
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
          </div>

          {/* Configuración y Asignación de Estaciones */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Estaciones y Asignación de Pasos</h3>
                <span className="text-[10px] bg-stone-200 text-stone-800 font-bold px-2 py-0.5 rounded-full border border-stone-200">
                  {modelSteps.length || 52} pasos totales
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-semibold">Cantidad de Puestos:</label>
                <select
                  value={stationCount}
                  onChange={(e) => setStationCount(parseInt(e.target.value, 10))}
                  className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-primary touch-target shadow-2xs"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} estaciones</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Regla Obligatoria: 2 Estaciones de Limpieza */}
            {hasEnoughCleaning ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    <strong>Regla de Calidad OK:</strong> {cleaningCount} estaciones designadas para Limpieza obligatoria.
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md">
                  {cleaningCount} / 2 Requeridas
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Regla Obligatoria:</strong> Se requieren al menos <strong>2 estaciones de limpieza</strong>. Pulsa el botón <strong>"🧼 Limpieza"</strong> en las estaciones correspondientes.
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md flex-shrink-0">
                  {cleaningCount} / 2
                </span>
              </div>
            )}

            {/* MAPA VISUAL GLOBAL DE PASOS */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">
                    Mapa de Pasos ({coverageAnalysis.assignedCount} / {coverageAnalysis.total} asignados):
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Colores según estación. Haz clic en un paso para asignarlo o editarlo.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDistributeAuto}
                    className="text-xs bg-stone-100 hover:bg-stone-200 text-primary font-bold px-2.5 py-1 rounded-lg border border-stone-200 transition flex items-center gap-1"
                    title="Repartir todos los pasos equitativamente entre las estaciones"
                  >
                    <span>Reparto Equitativo</span>
                  </button>
                </div>
              </div>

              {/* Botones de pasos en la tira general */}
              <div className="flex flex-wrap gap-1 p-2 bg-slate-50 rounded-xl border border-gray-200 max-h-36 overflow-y-auto">
                {Array.from({ length: coverageAnalysis.total }, (_, i) => i + 1).map(stepNum => {
                  const owner = coverageAnalysis.stepToStation[stepNum];
                  const color = owner ? STATION_COLORS[(owner.stationNumber - 1) % STATION_COLORS.length] : null;
                  const stepItem = modelSteps.find(s => s.step_number === stepNum);

                  return (
                    <button
                      key={stepNum}
                      type="button"
                      onClick={() => {
                        const targetIdx = owner ? owner.stationIdx : 0;
                        setVisualPickerStation(targetIdx);
                      }}
                      title={stepItem ? `#${stepNum}: ${stepItem.operation} (${owner ? `Asignado a E${owner.stationNumber}` : 'LIBRE'})` : `#${stepNum}`}
                      className={`w-7 h-7 rounded-lg font-bold text-[11px] flex items-center justify-center transition shadow-2xs ${
                        owner
                          ? `${color.bg} text-white hover:scale-110`
                          : "bg-white text-rose-600 border-2 border-dashed border-rose-400 hover:bg-rose-50 animate-pulse font-extrabold"
                      }`}
                    >
                      {stepNum}
                    </button>
                  );
                })}
              </div>

              {/* Alerta de pasos sin asignar si existen */}
              {!coverageAnalysis.isComplete && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span className="truncate">
                      <strong>Pasos sin asignar ({coverageAnalysis.missing.length}):</strong> {coverageAnalysis.missing.slice(0, 15).join(', ')}{coverageAnalysis.missing.length > 15 ? '...' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClaimAllFreeSteps(0)}
                    className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded flex-shrink-0"
                  >
                    Asignar a E1
                  </button>
                </div>
              )}
            </div>

            {/* SEPARACIÓN EN DOS BLOQUES EXCLUSIVOS: 1) ENSAMBLAJE  2) LIMPIEZA OBLIGATORIA */}
            <div className="space-y-6">

              {/* BLOQUE 1: ESTACIONES DE ENSAMBLAJE (LÍNEA PRINCIPAL) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center shadow-2xs">
                      <Wrench className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                        <span>Línea Principal de Ensamblaje ({selectedOperators.filter(s => !s.is_cleaning_station).length} estaciones)</span>
                        <span className="text-[10px] bg-stone-100 text-primary font-bold px-2 py-0.5 rounded-full border border-stone-200">
                          Sin Limpieza
                        </span>
                      </h4>
                      <p className="text-[10px] text-gray-500">
                        Pasos de ensamble de chasis, componentes, cableado y configuración (aislados de pasos de limpieza).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedOperators
                    .map((st, idx) => ({ st, idx }))
                    .filter(item => !item.st.is_cleaning_station)
                    .map(({ st, idx }) => renderStationCard(st, idx))}
                </div>
              </div>

              {/* BLOQUE 2: BLOQUE EXCLUSIVO DE LIMPIEZA (OBLIGATORIO QC) */}
              <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 p-4 rounded-2xl border-2 border-emerald-300 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                          Bloque Exclusivo de Limpieza
                        </h4>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                          Obligatorio QC
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Estaciones dedicadas a desprotección de acrílicos, remoción de polvo, huellas y limpieza final con microfibra.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-900 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300">
                      🧼 {cleaningCount} Estaciones Asignadas
                    </span>
                  </div>
                </div>

                {/* Sub-bloque: Gestor del Pool de Pasos de Limpieza */}
                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">
                        Pool de Pasos de Limpieza ({Array.from(cleaningPool).length} pasos aislados):
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                        Auto-excluidos de ensamble
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetCleaningPool}
                      className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 self-start sm:self-auto"
                      title="Restablecer pasos recomendados según el checklist del modelo"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Auto-detectar pasos</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-500">
                    Cualquier paso marcado aquí se asignará <strong>únicamente</strong> a las estaciones de este bloque y <strong>jamás</strong> caerá en las estaciones de ensamblaje al distribuir de forma automática.
                  </p>

                  {/* Fichas de pasos de limpieza en el pool */}
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-gray-200 min-h-[42px] items-center">
                    {Array.from(cleaningPool).sort((a, b) => a - b).map(stepNum => {
                      const stepItem = modelSteps.find(s => s.step_number === stepNum);
                      return (
                        <span
                          key={stepNum}
                          className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-1 rounded-lg text-xs font-bold shadow-2xs group"
                          title={stepItem ? `#${stepNum}: ${stepItem.operation}` : `Paso #${stepNum}`}
                        >
                          <span>🧼 #{stepNum}</span>
                          {stepItem && (
                            <span className="text-[10px] text-emerald-800 max-w-[130px] truncate hidden sm:inline font-medium">
                              {stepItem.operation}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleCleaningStepInPool(stepNum)}
                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-emerald-600 hover:text-white hover:bg-rose-600 transition"
                            title={`Remover paso #${stepNum} del pool de limpieza`}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                    {cleaningPool.size === 0 && (
                      <span className="text-[11px] text-gray-400 italic">
                        No hay pasos en el pool de limpieza. Pulsa "Auto-detectar" o escribe un número abajo.
                      </span>
                    )}
                  </div>

                  {/* Input rápido para añadir paso al pool de limpieza */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap">
                      + Aislar otro paso a Limpieza:
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={modelSteps.length || 500}
                      placeholder="N° de paso"
                      value={newCleaningStepInput}
                      onChange={(e) => setNewCleaningStepInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddStepToCleaningPool(newCleaningStepInput);
                        }
                      }}
                      className="w-24 text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddStepToCleaningPool(newCleaningStepInput)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex-shrink-0"
                    >
                      + Agregar al Pool
                    </button>
                  </div>
                </div>

                {/* Tarjetas de Estaciones de Limpieza */}
                <div className="space-y-3">
                  {selectedOperators
                    .map((st, idx) => ({ st, idx }))
                    .filter(item => item.st.is_cleaning_station)
                    .map(({ st, idx }) => renderStationCard(st, idx))}
                </div>

                {cleaningCount < 2 && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Se requieren al menos 2 estaciones en este bloque de limpieza para cumplir la regla QC.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...selectedOperators];
                        for (let i = copy.length - 1; i >= 0; i--) {
                          if (!copy[i].is_cleaning_station) {
                            copy[i].is_cleaning_station = true;
                            copy[i].station_type = "CLEANING";
                            copy[i].station_name = "Limpieza Intermedia";
                            break;
                          }
                        }
                        setSelectedOperators(distributeStepsSeparatingCleaning(copy, modelSteps, cleaningPool));
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shadow-2xs flex-shrink-0"
                    >
                      + Convertir Estación a Limpieza
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !hasEnoughCleaning || !coverageAnalysis.isComplete}
            className="w-full py-3.5 bg-[#1B4332] hover:bg-[#2D6A4F] disabled:bg-gray-400 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition touch-target disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : !hasEnoughCleaning ? (
              <span>⚠️ Mínimo 2 estaciones de limpieza requeridas</span>
            ) : !coverageAnalysis.isComplete ? (
              <span>⚠️ Faltan pasos por asignar ({coverageAnalysis.missing.length} libres)</span>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>Iniciar Línea de Producción</span>
              </>
            )}
          </button>
        </form>
      </Card>

      {/* Modal Selector Visual de Pasos */}
      {visualPickerStation !== null && selectedOperators[visualPickerStation] && (
        <StepPickerModal
          isOpen={true}
          onClose={() => setVisualPickerStation(null)}
          stationIdx={visualPickerStation}
          station={selectedOperators[visualPickerStation]}
          modelSteps={modelSteps}
          allStations={selectedOperators}
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

// =============================================
// 3. EDITOR DE CHECKLISTS
// =============================================
