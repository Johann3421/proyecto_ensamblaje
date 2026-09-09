import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Check, CheckCircle, AlertTriangle, AlertCircle, Loader2, Play, Coffee, Inbox, Shield, RefreshCw, ShieldCheck, PlayCircle, ArrowRightCircle, ClipboardList, Users, Camera, Layers, Zap, Monitor, Sparkles } from 'lucide-react';
import { API_BASE } from '../utils/api';
import Card from '../components/Card';
import CameraCaptureModal from '../modals/CameraCaptureModal';
import ReassignStepModal from '../modals/ReassignStepModal';
import TransferUnitModal from '../modals/TransferUnitModal';
import SupervisorAuditModal from '../modals/SupervisorAuditModal';
import { formatStepNumbersRange } from '../utils/steps';

export default function OperatorWorkspaceView({ workspace, currentUser, onOpenMedia, onOpenIssue, onPreviewPhoto, onSelectUnit, onSelectOrder, onSelectStation, onRefresh, notify }) {
  if (!workspace || !workspace.active) {
    return (
      <Card className="p-8 text-center max-w-sm mx-auto">
        <Coffee className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-gray-900">Sin Tareas Asignadas</h3>
        <p className="text-xs text-gray-500 mt-1">El administrador no ha lanzado un lote o no estás asignado.</p>
        <button onClick={onRefresh} className="mt-4 text-xs bg-primary text-white px-4 py-2 rounded-lg font-semibold touch-target">
          Comprobar Nuevamente
        </button>
      </Card>
    );
  }

  const { 
    assignment, 
    order, 
    available_orders = [], 
    station_steps = [], 
    transferred_out_steps = [], 
    pending_prior_steps = [], 
    all_stations = [], 
    active_unit, 
    units_in_station = [], 
    completed_step_numbers = [], 
    completed_step_logs = [], 
    queue_units = [], 
    completed_units = [],
    is_support_operator = false,
    supervisor_audit = null
  } = workspace;

  const [completedSteps, setCompletedSteps] = useState(completed_step_numbers || []);
  const [stepLogsMap, setStepLogsMap] = useState({});
  const [submittingStep, setSubmittingStep] = useState(null);
  const [finishingUnit, setFinishingUnit] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [reassignStepModalData, setReassignStepModalData] = useState(null);
  const [photoStepModal, setPhotoStepModal] = useState(null);
  const [supervisorPhotoStepModal, setSupervisorPhotoStepModal] = useState(null);
  const [requirePhotoVerification, setRequirePhotoVerification] = useState(true);
  const [supervisorAuditModalOpen, setSupervisorAuditModalOpen] = useState(false);
  const [activeSupervisorAudit, setActiveSupervisorAudit] = useState(supervisor_audit);

  useEffect(() => {
    setActiveSupervisorAudit(supervisor_audit || null);
  }, [supervisor_audit, active_unit?.unit_number]);

  useEffect(() => {
    setCompletedSteps(completed_step_numbers || []);
    const map = {};
    (completed_step_logs || []).forEach(l => {
      map[l.step_number] = l;
    });
    setStepLogsMap(map);
  }, [completed_step_numbers, completed_step_logs, active_unit?.unit_number]);

  // Deduplicación reactiva infalible de pasos de la estación
  const uniqueStationSteps = useMemo(() => {
    const map = new Map();
    (station_steps || []).forEach(s => {
      if (!map.has(s.step_number)) {
        map.set(s.step_number, s);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.step_number - b.step_number);
  }, [station_steps]);

  // Deduplicación reactiva de pasos heredados pendientes (excluye duplicados y pasos de la estación actual)
  const filteredPendingPriorSteps = useMemo(() => {
    const stationStepNums = new Set(uniqueStationSteps.map(s => s.step_number));
    const map = new Map();
    (pending_prior_steps || []).forEach(s => {
      if (!stationStepNums.has(s.step_number) && !map.has(s.step_number)) {
        map.set(s.step_number, s);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.step_number - b.step_number);
  }, [pending_prior_steps, uniqueStationSteps]);

  const totalStationSteps = uniqueStationSteps.length;
  const isStationComplete = totalStationSteps > 0 && completedSteps.length >= totalStationSteps;

  const isSupervisorUser = currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN' || (order?.supervisor_id && currentUser.id === order.supervisor_id);
  const isSupport = is_support_operator || currentUser.id === 'OP-106' || (currentUser.email || '').toLowerCase().includes('apoyo');

  // Pasos específicos asignados para supervisión en esta orden
  const supervisedStepsSet = useMemo(() => {
    if (!order?.supervisor_steps) return null;
    const nums = order.supervisor_steps.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    return nums.length > 0 ? new Set(nums) : null;
  }, [order?.supervisor_steps]);

  const [filterSupervisorOnly, setFilterSupervisorOnly] = useState(false);

  // Pasos de la estación filtrados si el supervisor activa su filtro personal
  const displayedStationSteps = useMemo(() => {
    if (!filterSupervisorOnly || !supervisedStepsSet) return uniqueStationSteps;
    return uniqueStationSteps.filter(s => supervisedStepsSet.has(s.step_number));
  }, [uniqueStationSteps, filterSupervisorOnly, supervisedStepsSet]);

  const handleToggleStep = async (step) => {
    const isDone = completedSteps.includes(step.step_number);
    if (isDone) {
      // Desmarcar paso
      try {
        setSubmittingStep(step.step_number);
        const res = await fetch(`${API_BASE}/operator/uncheck-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order.order_id,
            unit_number: active_unit.unit_number,
            step_number: step.step_number,
            station_number: assignment.station_number,
            user_id: currentUser.id,
            user_name: currentUser.name,
            reason: "Desmarcado por operario para corrección"
          })
        });
        if (!res.ok) throw new Error("Error al desmarcar el paso");
        setCompletedSteps(prev => prev.filter(num => num !== step.step_number));
        setStepLogsMap(prev => {
          const updated = { ...prev };
          delete updated[step.step_number];
          return updated;
        });
        notify(`↩ Paso #${step.step_number} desmarcado`);
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        setSubmittingStep(null);
      }
    } else {
      // Si la foto está activa, abrir la cámara para verificar con foto
      if (requirePhotoVerification) {
        setPhotoStepModal(step);
      } else {
        // Marcar paso conforme sin foto
        try {
          setSubmittingStep(step.step_number);
          const res = await fetch(`${API_BASE}/operator/submit-step`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: order.order_id,
              unit_number: active_unit.unit_number,
              step_number: step.step_number,
              station_number: assignment.station_number,
              user_id: currentUser.id,
              user_name: currentUser.name,
              status: "PASS",
              notes: "Aprobado por operario"
            })
          });
          if (!res.ok) throw new Error("Error registrando el paso");
          setCompletedSteps(prev => [...prev, step.step_number]);
          notify(`✓ Paso #${step.step_number} verificado`);
          if (completedSteps.length + 1 >= totalStationSteps && confetti) {
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
          }
        } catch (err) {
          alert("Error: " + err.message);
        } finally {
          setSubmittingStep(null);
        }
      }
    }
  };

  const handleVerifyStepWithPhoto = async (step, photoUrl) => {
    try {
      setSubmittingStep(step.step_number);
      const res = await fetch(`${API_BASE}/operator/submit-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          unit_number: active_unit.unit_number,
          step_number: step.step_number,
          station_number: assignment.station_number,
          user_id: currentUser.id,
          user_name: currentUser.name,
          status: "PASS",
          photo_url: photoUrl,
          notes: "Verificado con fotografía de evidencia"
        })
      });
      if (!res.ok) throw new Error("Error registrando el paso con foto");
      
      setCompletedSteps(prev => [...new Set([...prev, step.step_number])]);
      setStepLogsMap(prev => ({
        ...prev,
        [step.step_number]: {
          step_number: step.step_number,
          photo_url: photoUrl,
          user_name: currentUser.name,
          is_supervisor_verified: false,
          timestamp: new Date().toISOString()
        }
      }));
      setPhotoStepModal(null);
      notify(`📸 ✓ Paso #${step.step_number} verificado con foto`);
      if (completedSteps.length + 1 >= totalStationSteps && confetti) {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingStep(null);
    }
  };

  const handleSupervisorVerifyStepPhoto = async (step, photoUrl) => {
    try {
      setSubmittingStep(step.step_number);
      const res = await fetch(`${API_BASE}/supervisor/verify-step-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          unit_number: active_unit.unit_number,
          step_number: step.step_number,
          station_number: assignment.station_number,
          supervisor_id: currentUser.id,
          supervisor_name: currentUser.name,
          photo_url: photoUrl,
          notes: `Cumplimiento verificado con foto por ${currentUser.name} (Supervisor de Calidad)`
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error registrando foto de cumplimiento por supervisor");
      }
      setCompletedSteps(prev => [...new Set([...prev, step.step_number])]);
      setStepLogsMap(prev => ({
        ...prev,
        [step.step_number]: {
          step_number: step.step_number,
          photo_url: photoUrl,
          user_name: `${currentUser.name} (Supervisor)`,
          is_supervisor_verified: true,
          timestamp: new Date().toISOString()
        }
      }));
      setSupervisorPhotoStepModal(null);
      notify(`🛡️ 📸 Cumplimiento del Paso #${step.step_number} verificado con foto por el supervisor`);
      if (completedSteps.length + 1 >= totalStationSteps && confetti) {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.8 } });
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingStep(null);
    }
  };

  const handleFinishStation = async () => {
    if (!active_unit) return;
    try {
      setFinishingUnit(true);
      const res = await fetch(`${API_BASE}/operator/finish-station`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          unit_number: active_unit.unit_number,
          station_number: assignment.station_number
        })
      });
      if (!res.ok) throw new Error("Error al despachar");
      const data = await res.json();
      notify(data.message);
      setCompletedSteps([]);
      onRefresh();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setFinishingUnit(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-3.5 fade-in pb-4">
      {/* Banner y Selector de Estación Exclusivo para Técnico de Apoyo / Refuerzo */}
      {isSupport && all_stations && all_stations.length > 0 && (
        <Card className="p-3 bg-stone-50 border border-stone-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                <Zap className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-stone-900 block leading-tight">
                    Modo Técnico de Apoyo / Refuerzo ({currentUser.name})
                  </span>
                  <span className="text-[9px] font-bold bg-stone-200 text-stone-800 px-1.5 py-0.5 rounded-md">
                    Operario Multiestación
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  Refuerza temporalmente cualquier estación según la demanda de la línea sin alterar la titularidad del puesto.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-stone-900 flex-shrink-0">Puesto a Reforzar:</span>
              <select
                value={assignment.station_number}
                onChange={(e) => onSelectStation && onSelectStation(parseInt(e.target.value, 10))}
                className="text-xs font-bold border border-stone-300 bg-white text-stone-900 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-primary/20 shadow-xs touch-target"
              >
                {all_stations.map(st => (
                  <option key={st.station_number} value={st.station_number}>
                    E{st.station_number}: {st.station_name} (Titular: {st.user_name}) {st.is_cleaning_station ? '[Limpieza]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Selector de Inspección para Supervisor y Admin (Nunca se muestra para Apoyo) */}
      {!isSupport && isSupervisorUser && all_stations && all_stations.length > 0 && (
        <Card className="p-3 bg-amber-50/70 border border-amber-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-amber-950 block leading-tight">
                    Modo Auditoría e Inspección ({currentUser.role === 'SUPERVISOR' ? 'Supervisor de Calidad' : 'Administrador'})
                  </span>
                  <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md">
                    Auditoría en Línea
                  </span>
                </div>
                <span className="text-[10px] text-amber-800 block mt-0.5">
                  Audita los puestos de ensamblaje en tiempo real y emite el V°B° normativo para liberar las unidades.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {supervisedStepsSet && (
                <button
                  type="button"
                  onClick={() => setFilterSupervisorOnly(!filterSupervisorOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                    filterSupervisorOnly
                      ? 'bg-primary text-white hover:bg-primary-light ring-2 ring-emerald-400'
                      : 'bg-white text-stone-800 border border-stone-300 hover:bg-stone-50'
                  }`}
                  title="Muestra únicamente los pasos que tienes asignados para supervisar"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>{filterSupervisorOnly ? `Mostrando mis pasos (${supervisedStepsSet.size})` : `Filtrar solo mis pasos (${supervisedStepsSet.size})`}</span>
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-amber-900 flex-shrink-0">Puesto a Auditar:</span>
                <select
                  value={assignment.station_number}
                  onChange={(e) => onSelectStation && onSelectStation(parseInt(e.target.value, 10))}
                  className="text-xs font-bold border border-amber-400 bg-white text-gray-900 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500 shadow-xs touch-target"
                >
                  {all_stations.map(st => (
                    <option key={st.station_number} value={st.station_number}>
                      E{st.station_number}: {st.station_name} (Operario: {st.user_name}) {st.is_cleaning_station ? '🧼 [Limpieza]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Header estación y Selector de Orden */}
      <Card className="p-3.5 border-l-4 border-l-[#1B4332] space-y-3">
        {/* Selector de Orden Activa para el Técnico */}
        {available_orders && available_orders.length > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
            <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-primary" />
              <span>Cambiar Orden de Trabajo:</span>
            </label>
            <select
              value={order.order_id}
              onChange={(e) => onSelectOrder && onSelectOrder(e.target.value)}
              className="text-xs font-bold border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-primary/20 focus:outline-none touch-target"
            >
              {available_orders.map(o => (
                <option key={o.order_id} value={o.order_id}>
                  {o.order_id} ({o.model_name}) · {o.is_assigned ? `Tu Estación: E${o.assigned_station}` : 'Estación 1'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold text-white px-2 py-0.5 rounded shadow-xs ${
                assignment.is_cleaning_station ? 'bg-emerald-600' : 'bg-[#1B4332]'
              }`}>
                E{assignment.station_number}
              </span>
              <h2 className="text-sm font-bold text-gray-900 truncate">{assignment.station_name}</h2>
              {assignment.is_cleaning_station && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  🧼 Estación de Limpieza Obligatoria
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Orden: <strong className="text-primary font-mono">{order.order_id}</strong> · Modelo: <strong>{order.model_name}</strong> ({order.total_units} PCs)
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs font-bold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 block">
              {formatStepNumbersRange(assignment.step_numbers || (assignment.start_step ? `${assignment.start_step}-${assignment.end_step}` : ""))}
            </span>
            <span className="text-[10px] text-gray-400 block mt-1">
              Operario: <strong>{assignment.user_name}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* SELECTOR RÁPIDO DE PCs (Libre Selección por el Técnico) */}
      {units_in_station.length > 1 && (
        <Card className="p-2.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Selección libre de PCs en tu estación ({units_in_station.length}):</span>
            </span>
            <span className="text-[9px] font-bold text-primary bg-white px-2 py-0.5 rounded-md border border-stone-200">
              Toca para cambiar
            </span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {units_in_station.map(u => {
              const isCurrent = active_unit && active_unit.unit_number === u.unit_number;
              return (
                <button
                  key={u.unit_number}
                  type="button"
                  onClick={() => onSelectUnit && onSelectUnit(u.unit_number)}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold transition touch-target flex items-center gap-1 ${
                    isCurrent
                      ? "bg-[#1B4332] text-white shadow-md scale-105"
                      : "bg-white hover:bg-stone-200 text-gray-700 border border-gray-200"
                  }`}
                >
                  <span>#{u.unit_number.toString().padStart(2, '0')}</span>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {active_unit ? (
        <Card className="overflow-hidden border-2 border-stone-300 shadow-md">
          {/* Header PC activa */}
          <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Trabajando en</span>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black">PC #{active_unit.unit_number.toString().padStart(2, '0')}</h3>
                  {units_in_station.length > 1 && (
                    <select
                      value={active_unit.unit_number}
                      onChange={(e) => onSelectUnit && onSelectUnit(parseInt(e.target.value, 10))}
                      className="text-xs bg-white/20 text-white font-bold border border-white/40 rounded-lg px-2 py-0.5 focus:outline-none touch-target"
                      title="Cambiar a otra PC disponible"
                    >
                      {units_in_station.map(u => (
                        <option key={u.unit_number} value={u.unit_number} className="text-gray-900 font-semibold">
                          PC #{u.unit_number.toString().padStart(2, '0')} {u.unit_number === active_unit.unit_number ? '(Activa)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="text-xs text-blue-200 font-mono">{active_unit.serial_number}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(true)}
                  className="flex flex-col items-center gap-0.5 bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-xl transition touch-target"
                  title="Derivar PC a otra estación"
                >
                  <ArrowRightCircle className="w-4 h-4 text-sky-200" />
                  <span className="text-[9px] font-bold text-white">Derivar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenIssue(active_unit, uniqueStationSteps[0] || { step_number: 1, operation: "Inspección de Unidad" })}
                  className="flex flex-col items-center gap-0.5 bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-xl transition touch-target"
                  title="Reportar Falla"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                  <span className="text-[9px] font-bold text-white">Falla</span>
                </button>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-100">Progreso PC #{active_unit.unit_number}</span>
                <span className="font-bold text-white">{completedSteps.length}/{totalStationSteps}</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${(completedSteps.length / totalStationSteps) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Switch de Verificación con Foto */}
            <div className="flex items-center justify-between pt-2 border-t border-white/20">
              <label className="text-[11px] font-bold text-blue-100 flex items-center gap-1.5 cursor-pointer">
                <Camera className="w-3.5 h-3.5 text-emerald-300" />
                <span>Foto de verificación:</span>
              </label>
              <button
                type="button"
                onClick={() => setRequirePhotoVerification(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 shadow-sm ${
                  requirePhotoVerification
                    ? "bg-emerald-400 text-slate-950 font-black"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                <span>{requirePhotoVerification ? "OBLIGATORIA (Activa)" : "LIBRE / OPCIONAL"}</span>
              </button>
            </div>
          </div>

          {/* BANNER DE CERTIFICACIÓN / V°B° OFICIAL SI YA ESTÁ APROBADA */}
          {activeSupervisorAudit?.status === "APPROVED" && (
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-950">
                      Unidad con V°B° Oficial del Supervisor QC
                    </span>
                    <span className="text-[9px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-md">
                      LIBERADA
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-800 block">
                    Auditado por <strong>{activeSupervisorAudit.supervisor_name}</strong> {activeSupervisorAudit.created_at ? `· ${new Date(activeSupervisorAudit.created_at).toLocaleDateString()} ${new Date(activeSupervisorAudit.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </span>
                </div>
              </div>
              {!isSupport && isSupervisorUser && (
                <button
                  type="button"
                  onClick={() => setSupervisorAuditModalOpen(true)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition touch-target flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Revisar / Modificar V°B°</span>
                </button>
              )}
            </div>
          )}

          {/* PROTOCOLO OFICIAL DE VERIFICACIÓN DEL SUPERVISOR QC (VISIBLE SOLO PARA SUPERVISOR/ADMIN) */}
          {!isSupport && isSupervisorUser && (
            <div className="p-3.5 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white border-b-2 border-amber-300 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                    🛡️
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-amber-950">
                        Protocolo de Verificación del Supervisor QC
                      </h4>
                      {activeSupervisorAudit?.status === "APPROVED" ? (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> V°B° APROBADO
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          ⏳ Pendiente de Auditoría
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-amber-800 mt-0.5">
                      Sigue los 5 pasos normativos antes de otorgar el Visto Bueno a la PC #{active_unit.unit_number.toString().padStart(2, '0')}:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setSupervisorAuditModalOpen(true)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm touch-target ${
                      activeSupervisorAudit?.status === "APPROVED"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-amber-600 hover:bg-amber-700 text-white shadow-md font-extrabold"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{activeSupervisorAudit?.status === "APPROVED" ? "Ver / Modificar V°B°" : "🛡️ Auditar y Emitir V°B°"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenIssue(active_unit, uniqueStationSteps[0] || { step_number: 1, operation: "Auditoría Supervisor" })}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition touch-target flex items-center gap-1"
                    title="Reportar defecto o rechazo"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Rechazo</span>
                  </button>
                </div>
              </div>

              {/* Guía detallada de los 5 pasos del supervisor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-xs flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-[11px] text-gray-900 block">1. Auditoría de Fotos</strong>
                    <span className="text-[10px] text-gray-500 leading-tight block">
                      Revisar fotos de placa madre, cooler, pasta térmica y precintos tomadas en las estaciones.
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-xs flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-[11px] text-gray-900 block">🧼 2. Doble Limpieza (Obligatoria)</strong>
                    <span className="text-[10px] text-gray-500 leading-tight block">
                      Inspeccionar que el chasis esté 100% libre de huellas, restos de cintillos cortados y polvo.
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-xs flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-[11px] text-gray-900 block">3. Hardware, BIOS & POST</strong>
                    <span className="text-[10px] text-gray-500 leading-tight block">
                      Comprobar encendido a la primera, RAM Dual Channel, XMP/EXPO y sin cables tocando ventiladores.
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-xs flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                  <div>
                    <strong className="text-[11px] text-gray-900 block">4. Trazabilidad & KENYA</strong>
                    <span className="text-[10px] text-gray-500 leading-tight block">
                      Serie ({active_unit.serial_number}) idéntica a etiqueta física y sticker frontal de marca KENYA OK.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASOS HEREDADOS DE OTRAS ESTACIONES (SI EXISTEN, DEDUPLICADOS) */}
          {filteredPendingPriorSteps && filteredPendingPriorSteps.length > 0 && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pasos Pendientes Heredados ({filteredPendingPriorSteps.length})</span>
                </span>
                <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                  Derivados
                </span>
              </div>
              <p className="text-[10px] text-amber-800 leading-tight">
                Esta PC llegó con procesos previos pendientes. Toca para completarlos:
              </p>
              <div className="space-y-1.5 pt-1">
                {filteredPendingPriorSteps.map((st) => {
                  const isDone = completedSteps.includes(st.step_number);
                  const isSubmitting = submittingStep === st.step_number;
                  const stepLog = stepLogsMap[st.step_number];

                  return (
                    <div
                      key={st.step_number}
                      className={`rounded-xl border p-2.5 transition select-none flex items-center justify-between gap-2 ${
                        isDone
                          ? "bg-emerald-50 border-emerald-400"
                          : "bg-white border-amber-300 hover:border-amber-400 shadow-sm"
                      }`}
                    >
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleToggleStep(st)}
                      >
                        <span className="text-xs font-bold text-gray-900 block">
                          #{st.step_number} {st.operation}
                        </span>
                        <span className="text-[10px] text-gray-500 block truncate">
                          {st.qc_criteria}
                        </span>
                        {stepLog?.photo_url && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewPhoto && onPreviewPhoto({
                                url: stepLog.photo_url,
                                title: `PC #${active_unit.unit_number} · Paso #${st.step_number}`,
                                subtitle: st.operation,
                                user_name: stepLog.user_name,
                                timestamp: stepLog.timestamp
                              });
                            }}
                            className="mt-1.5 inline-flex items-center gap-1.5 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-bold text-emerald-900 border border-emerald-300 transition"
                          >
                            <img src={stepLog.photo_url} alt="Foto" className="w-4 h-4 object-cover rounded border border-emerald-400" />
                            <span>Ver Foto</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPhotoStepModal(st)}
                          className="p-1.5 bg-stone-200 hover:bg-stone-200 text-primary rounded-lg text-xs"
                          title="Tomar foto para este paso"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStep(st)}
                          disabled={isSubmitting}
                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${
                            isDone ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isDone ? <Check className="w-3 h-3" /> : null}
                          <span>{isDone ? "Completado" : "Marcar"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASOS DERIVADOS A OTRAS ESTACIONES */}
          {transferred_out_steps && transferred_out_steps.length > 0 && (
            <div className="p-2.5 bg-stone-50 border-b border-stone-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-900 flex items-center gap-1.5">
                  <ArrowRightCircle className="w-3.5 h-3.5 text-primary" />
                  <span>Procesos derivados a otras áreas ({transferred_out_steps.length}):</span>
                </span>
                <span className="text-[9px] bg-stone-200 text-stone-900 font-semibold px-1.5 py-0.5 rounded">
                  En otra estación
                </span>
              </div>
              <div className="space-y-1">
                {transferred_out_steps.map((to, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-stone-200 text-xs">
                    <span className="text-[11px] font-semibold text-gray-800 truncate max-w-[220px]">
                      #{to.step_number} {to.operation}
                    </span>
                    <span className="text-[10px] font-bold text-primary bg-stone-100 px-2 py-0.5 rounded border border-stone-200 flex-shrink-0">
                      ➔ Estación {to.target_station}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de pasos principales de la estación (Deduplicados) */}
          <div className="p-3 space-y-3">
            {displayedStationSteps.length === 0 && (
              <div className="p-6 text-center text-stone-500 bg-stone-50 border border-dashed border-stone-300 rounded-2xl text-xs">
                <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-bold text-stone-900">No hay pasos asignados a tu supervisión en esta estación</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Tus {supervisedStepsSet?.size} pasos asignados se encuentran en otras estaciones de la línea.
                </p>
                <button
                  type="button"
                  onClick={() => setFilterSupervisorOnly(false)}
                  className="mt-3 px-3 py-1.5 bg-primary text-white font-bold rounded-lg text-xs hover:bg-stone-800 transition shadow-xs"
                >
                  Ver todos los pasos de la estación
                </button>
              </div>
            )}
            {displayedStationSteps.map((st) => {
              const isDone = completedSteps.includes(st.step_number);
              const isSubmitting = submittingStep === st.step_number;
              const stepLog = stepLogsMap[st.step_number];
              const isSupervisedByRole = isSupervisorUser && (!supervisedStepsSet || supervisedStepsSet.has(st.step_number));

              return (
                <div
                  key={st.step_number}
                  className={`w-full text-left rounded-2xl border-2 overflow-hidden transition-all duration-200 select-none ${
                    isDone
                      ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                      : isSubmitting
                        ? 'bg-stone-100 border-stone-300 scale-[0.99] opacity-80'
                        : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-md shadow-sm'
                  }`}
                >
                  <div className="flex items-stretch">
                    {/* Panel izquierdo — Checkbox visual grande interactivo */}
                    <div 
                      onClick={() => handleToggleStep(st)}
                      className={`w-14 sm:w-16 flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 transition-colors cursor-pointer ${
                        isDone ? 'bg-emerald-500 hover:bg-emerald-600' : isSubmitting ? 'bg-stone-400' : 'bg-stone-100 hover:bg-stone-200'
                      }`}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-7 h-7 text-white animate-spin" />
                      ) : isDone ? (
                        <>
                          <CheckCircle className="w-7 h-7 text-white" />
                          <span className="text-[9px] font-bold text-emerald-100 uppercase">Hecho</span>
                          <span className="text-[8px] text-emerald-200 opacity-90 font-mono">(Quitar)</span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-stone-400 bg-white flex items-center justify-center">
                            <Check className="w-4 h-4 text-stone-300" />
                          </div>
                          <span className="text-[9px] font-bold text-stone-500 uppercase">
                            {requirePhotoVerification ? "Foto" : "Toca"}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Contenido del paso */}
                    <div className="flex-1 min-w-0 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleToggleStep(st)}
                        >
                          <p className={`text-sm font-bold leading-snug mb-1 ${
                            isDone ? 'text-emerald-800' : 'text-stone-900'
                          }`}>
                            <span className={`text-[10px] font-bold mr-1.5 px-1.5 py-0.5 rounded ${
                              isDone ? 'bg-emerald-200 text-emerald-700' : 'bg-stone-200 text-stone-600'
                            }`}>
                              #{st.step_number}
                            </span>
                            {st.operation}
                            {st.is_delegated_in && (
                              <span className="text-[9px] font-bold bg-stone-200 text-stone-800 px-1.5 py-0.5 rounded border border-stone-200 ml-1.5 inline-block">
                                Recibido de E{st.delegated_from_station}
                              </span>
                            )}
                            {isSupervisorUser && (
                              supervisedStepsSet ? (
                                supervisedStepsSet.has(st.step_number) ? (
                                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded ml-1.5 inline-flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-700" />
                                    <span>Supervisión Asignada</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-stone-400 font-medium ml-1.5 hidden sm:inline">
                                    (Sin supervisión requerida)
                                  </span>
                                )
                              ) : null
                            )}
                          </p>

                          {/* Indicador de 2 técnicos asignados */}
                          {st.assigned_technicians && st.assigned_technicians.length > 1 && (
                            <div className="flex items-center gap-1.5 flex-wrap my-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md">
                                <Users className="w-3 h-3 text-indigo-600" />
                                <span>2 Técnicos:</span>
                                <strong>{st.assigned_technicians.map(t => t.name).join(' & ')}</strong>
                              </span>
                            </div>
                          )}

                          {st.description && (
                            <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{st.description}</p>
                          )}
                          <div className={`flex items-start gap-1.5 rounded-lg px-2 py-1.5 ${
                            isDone ? 'bg-emerald-100/70' : 'bg-stone-100 border border-stone-200'
                          }`}>
                            <AlertCircle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                              isDone ? 'text-emerald-700' : 'text-primary'
                            }`} />
                            <p className={`text-xs ${
                              isDone ? 'text-emerald-900 font-medium' : 'text-stone-900'
                            }`}>
                              <strong>Criterio de Calidad:</strong> {st.qc_criteria || "Verificación estándar de ensamblaje"}
                            </p>
                          </div>

                          {/* Miniatura y Badge de Foto de Evidencia Verificada */}
                          {(stepLog?.media_url || stepLog?.photo_url) && (
                            <div className="mt-2 flex items-center gap-2">
                              <img
                                src={stepLog.media_url || stepLog.photo_url}
                                alt={`Evidencia paso #${st.step_number}`}
                                className="w-12 h-12 rounded-lg object-cover border border-emerald-300 shadow-2xs cursor-pointer hover:opacity-90"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(stepLog.media_url || stepLog.photo_url, "_blank");
                                }}
                              />
                              <div className="text-[10px]">
                                <span className="font-bold text-emerald-800 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>{stepLog.is_supervisor_verified ? "Certificado por Supervisor" : "Foto registrada"}</span>
                                </span>
                                <span className={`text-[9px] block ${
                                  stepLog.is_supervisor_verified ? 'text-amber-800' : 'text-emerald-700'
                                }`}>
                                  {stepLog.is_supervisor_verified ? `Por ${stepLog.user_name} · ` : ''}Toca para ampliar foto
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Botón de Acción Directo de Supervisor para Tomar Foto de Cumplimiento */}
                          {isSupervisedByRole && (
                            <div className="mt-2.5 pt-2 border-t border-amber-100 flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSupervisorPhotoStepModal(st);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1.5 transition touch-target"
                                title="Supervisor: Tomar foto oficial evidenciando que ya se cumplió"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Foto Cumplimiento (Supervisor)</span>
                              </button>
                              <span className="text-[10px] text-amber-800 font-medium">
                                {isDone ? "Actualiza o valida cumplimiento" : "Valida con foto y aprueba paso"}
                              </span>
                            </div>
                          )}

                          {isDone ? (
                            <p className="text-[9px] text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                              <span>↩</span> Toca la casilla izquierda si deseas desmarcar
                            </p>
                          ) : !isSubmitting && (
                            <p className="text-[9px] text-gray-400 mt-2 flex items-center gap-1">
                              <Camera className="w-2.5 h-2.5 text-blue-500" />
                              {requirePhotoVerification ? "Toca para tomar foto de verificación y aprobar" : "Toca para marcar conforme"}
                            </p>
                          )}
                        </div>

                        {/* Botones de acción del paso */}
                        <div className="flex flex-col gap-1.5 ml-1 flex-shrink-0">
                          {/* Botón de Cámara para Supervisor */}
                          {isSupervisedByRole && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSupervisorPhotoStepModal(st);
                              }}
                              className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition shadow-xs"
                              title="Supervisor: Tomar foto de cumplimiento"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          )}

                          {/* Botón de Cámara Directo para Operario */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoStepModal(st);
                            }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition shadow-xs ${
                              isDone
                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300"
                                : "bg-stone-200 hover:bg-stone-200 text-primary border border-stone-300"
                            }`}
                            title={isDone ? "Volver a tomar / actualizar foto" : "Tomar foto y verificar paso"}
                          >
                            <Camera className="w-4 h-4" />
                          </button>

                          {st.media_url && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onOpenMedia(st); }}
                              className="w-8 h-8 bg-stone-100 hover:bg-stone-200 text-primary border border-stone-200 rounded-xl flex items-center justify-center transition"
                              title="Ver guía visual"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                          )}
                          {!isDone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReassignStepModalData(st);
                              }}
                              className="w-8 h-8 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl flex items-center justify-center transition shadow-xs"
                              title="Derivar este proceso a otra estación"
                            >
                              <ArrowRightCircle className="w-4 h-4 text-sky-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón finalizar */}
          <div className="p-3 pt-0">
            {isStationComplete ? (
              <button
                onClick={handleFinishStation}
                disabled={finishingUnit}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-base rounded-xl shadow-lg flex items-center justify-center gap-3 transition pulse-glow touch-target"
              >
                {finishingUnit ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /><span>Enviando...</span></>
                ) : (
                  <><ArrowRightCircle className="w-6 h-6" /><span>Enviar PC #{active_unit.unit_number} a siguiente estación</span></>
                )}
              </button>
            ) : (
              <div className="bg-gray-50 p-3 rounded-xl text-center text-xs text-gray-500 border border-gray-200">
                Completa los {totalStationSteps} pasos de la <strong>PC #{active_unit.unit_number}</strong> para habilitar su despacho.
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-700">Sin PCs en tu estación</h3>
          <p className="text-xs text-gray-400 mt-1">Esperando que la estación anterior despache unidades...</p>
        </Card>
      )}

      {/* Cola de otras PCs disponibles en esta estación */}
      {queue_units.length > 0 && (
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-primary" />
              <span>Otras PCs en tu estación ({queue_units.length}):</span>
            </h4>
            <span className="text-[10px] text-gray-400">Toca para cambiar</span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
            {queue_units.map(u => (
              <div
                key={u.unit_number}
                onClick={() => onSelectUnit && onSelectUnit(u.unit_number)}
                className="flex justify-between items-center p-2.5 bg-gray-50 hover:bg-stone-100 active:bg-stone-200 rounded-xl border border-gray-200 cursor-pointer transition touch-target"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-xs">PC #{u.unit_number.toString().padStart(2, '0')}</span>
                  <span className="text-gray-400 font-mono text-[10px] hidden sm:inline">{u.serial_number}</span>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-primary border border-stone-200 font-bold text-[11px] rounded-lg transition"
                >
                  Trabajar en esta PC
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Captura de Foto para Paso */}
      {photoStepModal && active_unit && (
        <CameraCaptureModal
          title={`PC #${active_unit.unit_number.toString().padStart(2, '0')} · Paso #${photoStepModal.step_number}`}
          subtitle={photoStepModal.operation}
          prefix={`step_${order.order_id}_pc${active_unit.unit_number}_p${photoStepModal.step_number}`}
          onCapture={(photoUrl) => {
            handleVerifyStepWithPhoto(photoStepModal, photoUrl);
          }}
          onClose={() => setPhotoStepModal(null)}
        />
      )}

      {/* Modal Captura de Foto de Cumplimiento (Supervisor) */}
      {supervisorPhotoStepModal && active_unit && (
        <CameraCaptureModal
          title={`🛡️ FOTO DE CUMPLIMIENTO (SUPERVISOR) · PC #${active_unit.unit_number.toString().padStart(2, '0')}`}
          subtitle={`Paso #${supervisorPhotoStepModal.step_number}: ${supervisorPhotoStepModal.operation}`}
          prefix={`sup_${order.order_id}_pc${active_unit.unit_number}_p${supervisorPhotoStepModal.step_number}`}
          onCapture={(photoUrl) => {
            handleSupervisorVerifyStepPhoto(supervisorPhotoStepModal, photoUrl);
          }}
          onClose={() => setSupervisorPhotoStepModal(null)}
        />
      )}

      {/* Modal Derivar Estación Completa */}
      {transferModalOpen && active_unit && (
        <TransferUnitModal
          unit={active_unit}
          order={order}
          currentStation={assignment.station_number}
          allStations={all_stations}
          currentUser={currentUser}
          onClose={() => setTransferModalOpen(false)}
          onSuccess={(msg) => {
            notify(msg);
            setTransferModalOpen(false);
            onRefresh();
          }}
        />
      )}

      {/* Modal Derivar Proceso / Paso Individual */}
      {reassignStepModalData && active_unit && (
        <ReassignStepModal
          step={reassignStepModalData}
          unit={active_unit}
          order={order}
          currentStation={assignment.station_number}
          allStations={all_stations}
          currentUser={currentUser}
          onClose={() => setReassignStepModalData(null)}
          onSuccess={(msg) => {
            notify(msg);
            setReassignStepModalData(null);
            onRefresh();
          }}
        />
      )}

      {/* Modal Oficial de Auditoría y V°B° del Supervisor QC */}
      {supervisorAuditModalOpen && active_unit && (
        <SupervisorAuditModal
          isOpen={supervisorAuditModalOpen}
          onClose={() => setSupervisorAuditModalOpen(false)}
          orderId={order.order_id}
          unitNumber={active_unit.unit_number}
          serialNumber={active_unit.serial_number}
          modelName={order.model_name}
          currentUser={currentUser}
          notify={notify}
          onSuccess={(res) => {
            setActiveSupervisorAudit({
              supervisor_name: currentUser.name,
              status: res.unit?.supervisor_approved ? "APPROVED" : "REJECTED",
              created_at: new Date().toISOString(),
              notes: res.notes || ""
            });
            onRefresh && onRefresh();
          }}
        />
      )}
    </div>
  );
}
