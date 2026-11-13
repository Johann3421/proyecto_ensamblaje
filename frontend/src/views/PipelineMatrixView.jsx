import React, { useState, useRef, useEffect } from 'react';
import { Check, CheckCircle, AlertTriangle, AlertCircle, Plus, Edit, Loader2, Shield, Cpu, RefreshCw, X, Columns, ShieldCheck, Trash2, RotateCcw, Trash, Camera, MoreHorizontal, Layers, LayoutGrid } from 'lucide-react';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { hapticSelection } from '../utils/haptics';
import { formatPeruDate, formatPeruTime, formatPeruDateTime } from '../utils/timeFormat';

export default function PipelineMatrixView({ matrixData, orders, selectedOrder, setSelectedOrder, onOpenEmergency, onSelectUnit, onRefresh, onOpenAddUnits, onOpenResetOrder, onOpenDeleteOrder, onOpenEditOrder, onPreviewPhoto }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table';
  });
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);
  if (!matrixData || !matrixData.order) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-bento p-8 text-center mx-auto max-w-sm space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <div>
          <h3 className="text-sm font-bold text-stone-900">Conectando con el Pipeline...</h3>
          <p className="text-xs text-stone-500 mt-1">Obteniendo estado en tiempo real.</p>
        </div>
        <button onClick={onRefresh} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm inline-flex items-center gap-1.5 transition">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar Conexión</span>
        </button>
      </div>
    );
  }

  const { order, stations = [], units = [], issues = [] } = matrixData;
  const total = units.length;
  const passed = units.filter(u => u.overall_status === "PASSED").length;
  const failed = units.filter(u => u.overall_status === "FAILED").length;
  const inProgress = units.filter(u => u.overall_status === "IN_PROGRESS").length;
  const pending = total - passed - failed - inProgress;
  const completionPercentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="space-y-4 fade-in">
      {/* Header Bento Modular de la Orden */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-bento p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100/60">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 truncate tracking-tight">{order.order_id}</h2>
                <span className="bg-stone-100 text-stone-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-stone-200/70">
                  {order.model_name}
                </span>
                {order.supervisor_name && (
                  <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200/70 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Supervisor: {order.supervisor_name}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5 truncate">
                Lote de {order.total_units} PCs · {order.total_stations} Estaciones físicas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {orders.length > 0 && (
              <select
                value={selectedOrder || ""}
                onChange={(e) => setSelectedOrder(e.target.value)}
                className="text-xs border border-stone-200/90 rounded-xl px-3 py-2 bg-stone-50 font-semibold text-stone-700 outline-none hover:bg-stone-100 transition cursor-pointer"
              >
                {orders.map(o => (
                  <option key={o.order_id} value={o.order_id}>
                    {o.order_id} ({o.model_name})
                  </option>
                ))}
              </select>
            )}

            {/* 1. Botón Secundario Frecuente */}
            <button
              onClick={onOpenEditOrder}
              className="text-xs bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition"
              title="Editar parámetros de la orden, modelo, supervisor y estaciones"
            >
              <Edit className="w-3.5 h-3.5 text-stone-600" />
              <span>Editar Orden</span>
            </button>

            {/* 2. ÚNICO Botón Primario Destacado */}
            <button
              onClick={onOpenAddUnits}
              className="text-xs bg-[#0071E3] hover:bg-[#0077ED] text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Agregar PCs a esta orden"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Agregar PC</span>
            </button>

            {/* 3. Menú Overflow (···) para Acciones Críticas o Secundarias */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition flex items-center justify-center border border-stone-200/80"
                title="Más opciones de la orden"
              >
                <MoreHorizontal className="w-4 h-4 text-stone-600" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 z-40 fade-in">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onRefresh?.(); }}
                    className="w-full text-left px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition font-medium"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                    <span>Actualizar Datos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onOpenEmergency?.(); }}
                    className="w-full text-left px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition font-medium"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-stone-500" />
                    <span>Reasignar Técnico</span>
                  </button>

                  <div className="border-t border-stone-100 my-1"></div>

                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onOpenResetOrder?.(); }}
                    className="w-full text-left px-3.5 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Reiniciar Todo el Lote</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onOpenDeleteOrder?.(); }}
                    className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Eliminar Orden</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Completadas */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-bento">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Aprobadas</span>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
              {completionPercentage}%
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            {passed}
          </div>
          <p className="text-[11px] text-stone-400 mt-1 font-medium">De {total} PCs en total</p>
        </div>

        {/* En Proceso */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-bento">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">En Proceso</span>
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-blue-600 tracking-tight">
            {inProgress}
          </div>
          <p className="text-[11px] text-stone-400 mt-1 font-medium">PCs en ensamblaje activo</p>
        </div>

        {/* Con Falla */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-bento">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Con Falla</span>
            <span className="bg-rose-50 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full border border-rose-200/60">
              {issues.length} {issues.length === 1 ? 'ticket' : 'tickets'}
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
            {failed}
          </div>
          <p className="text-[11px] text-stone-400 mt-1 font-medium">En revisión técnica</p>
        </div>

        {/* En Cola */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-bento">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">En Cola</span>
            <span className="bg-stone-100 text-stone-600 text-xs font-bold px-2 py-0.5 rounded-full">
              Pendientes
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-800 tracking-tight">
            {pending}
          </div>
          <p className="text-[11px] text-stone-400 mt-1 font-medium">Por iniciar en Estación 1</p>
        </div>
      </div>

      {/* Barra de progreso Bento */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-bento">
        <div className="flex justify-between items-center text-xs font-semibold text-stone-700 mb-2">
          <span>Progreso General del Lote</span>
          <span className="font-bold text-stone-900">{passed} de {total} PCs completadas</span>
        </div>
        <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden p-0.5">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Matriz de Trazabilidad Bento Table / Cards Móviles */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-bento overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Columns className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-stone-900 text-sm">Matriz de Trazabilidad por Estación</h3>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
            {/* Toggle Ergonómico de Vista (Fase 3 - Optimización Móvil) */}
            <div className="bg-stone-100 p-0.5 rounded-xl border border-stone-200/80 flex items-center">
              <button
                type="button"
                onClick={() => { hapticSelection(); setViewMode('cards'); }}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 touch-manipulation active:scale-95 ${
                  viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Vista optimizada para pantallas táctiles y celular"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Puestos Móvil</span>
              </button>
              <button
                type="button"
                onClick={() => { hapticSelection(); setViewMode('table'); }}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 touch-manipulation active:scale-95 ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Vista Matriz Completa en tabla"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Matriz Tabla</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-stone-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>OK</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>Activo</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Falla</span>
            </div>
          </div>
        </div>

        {viewMode === 'cards' ? (
          /* Vista de Puestos Móvil (Bento Cards por Estación) */
          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-stone-50/50">
            {stations.map(st => {
              const unitsInStation = units.filter(u => u.current_station === st.station_number && u.overall_status !== "PASSED");
              const unitsCompletedHere = units.filter(u => u.current_station > st.station_number || u.overall_status === "PASSED");
              return (
                <div key={st.station_number} className="bg-white rounded-2xl border border-stone-200/90 p-3.5 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200/60">
                          E{st.station_number}
                        </span>
                        <span>Estación {st.station_number}</span>
                      </span>
                      <span className="text-[11px] text-stone-500 block mt-0.5 truncate max-w-[180px]">
                        👤 {st.user_name || "Sin técnico"}
                      </span>
                    </div>
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {unitsInStation.length} activa{unitsInStation.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-stone-100">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">
                      PCs en este Puesto:
                    </span>
                    {unitsInStation.length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-1">Puesto libre / sin PCs en cola</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {unitsInStation.map(u => {
                          const isFailed = u.overall_status === "FAILED";
                          return (
                            <button
                              key={u.unit_number}
                              type="button"
                              onClick={() => { hapticSelection(); onSelectUnit(u); }}
                              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 touch-manipulation border ${
                                isFailed
                                  ? "bg-rose-50 border-rose-300 text-rose-800 shadow-xs"
                                  : "bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100 shadow-xs"
                              }`}
                              title="Toca para ver detalle o auditar"
                            >
                              {isFailed ? (
                                <X className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                              )}
                              <span>PC #{u.unit_number.toString().padStart(2, '0')}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-stone-500 pt-1">
                    <span>Despachadas: <strong className="text-emerald-700">{unitsCompletedHere.length}</strong></span>
                    <span>Total Orden: {units.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista Matriz Tabla Clásica con scroll suave */
          <div className="table-mobile-scroll overflow-x-auto w-full relative">
            <table className="w-full text-left border-collapse text-xs min-w-[540px]">
              <thead>
                <tr className="bg-stone-50/70 text-stone-600 border-b border-stone-200/80">
                  <th className="py-3 px-4 font-semibold sticky left-0 bg-stone-50/90 z-10 w-24 border-r border-stone-200/80">PC</th>
                  {stations.map(st => (
                    <th key={st.station_number} className="py-3 px-3 font-semibold border-l border-stone-200/50 whitespace-nowrap">
                      <div className="text-stone-900 font-bold">Estación {st.station_number}</div>
                      <div className="text-[11px] text-stone-400 font-normal hidden sm:block truncate max-w-[120px]">
                        {st.user_name}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-4 font-semibold border-l border-stone-200/50 text-center w-28">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {units.map((unit) => {
                  const isFinished = unit.overall_status === "PASSED";
                  const isFailed = unit.overall_status === "FAILED";
                  return (
                    <tr
                      key={unit.unit_number}
                      onClick={() => onSelectUnit(unit)}
                      className="hover:bg-blue-50/40 active:bg-blue-50/80 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-bold text-stone-900 sticky left-0 bg-white z-10 border-r border-stone-200/80 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.05)]">
                        #{unit.unit_number.toString().padStart(2, '0')}
                      </td>
                      {stations.map(st => {
                        let state = "queue";
                        if (isFailed && unit.current_station === st.station_number) state = "failed";
                        else if (unit.current_station > st.station_number) state = "passed";
                        else if (unit.current_station === st.station_number && !isFinished) state = "active";

                        return (
                          <td key={st.station_number} className="py-2.5 px-3 border-l border-stone-100 text-center">
                            {state === "passed" && (
                              <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 inline-flex items-center justify-center border border-emerald-200/60">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                            {state === "active" && (
                              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse mx-auto block shadow-xs"></span>
                            )}
                            {state === "failed" && (
                              <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 inline-flex items-center justify-center border border-rose-200/60">
                                <X className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                            {state === "queue" && <span className="text-stone-300 text-xs">—</span>}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 border-l border-stone-100 text-center">
                        {isFinished && <Badge variant="success">OK</Badge>}
                        {isFailed && <Badge variant="danger">Falla</Badge>}
                        {!isFinished && !isFailed && <Badge variant="warning">E{unit.current_station}</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel de Fallas Bento Grid con Fotos de Evidencia */}
      {issues.length > 0 && (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-bento space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">
                Fallas Reportadas ({issues.length})
              </h3>
            </div>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/60">
              Evidencia Fotográfica
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {issues.map((iss, idx) => (
              <div
                key={idx}
                className="bg-rose-50/40 border border-rose-200/70 rounded-2xl p-3.5 space-y-2 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-xs font-black text-rose-900 bg-rose-100 px-2 py-0.5 rounded-md mr-1.5">
                      PC #{iss.unit_number.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs font-bold text-stone-900">{iss.issue_title}</span>
                  </div>
                  <Badge variant="danger">{iss.severity}</Badge>
                </div>

                {iss.description && (
                  <p className="text-[11px] text-stone-600 leading-tight line-clamp-2">{iss.description}</p>
                )}

                {iss.photo_url && (
                  <div
                    onClick={() => onPreviewPhoto && onPreviewPhoto({
                      url: iss.photo_url,
                      title: `PC #${iss.unit_number.toString().padStart(2, '0')} · Falla: ${iss.issue_title}`,
                      subtitle: `Estación ${iss.station_number} · Reportado por ${iss.reported_by}`,
                      user_name: iss.reported_by,
                      timestamp: iss.created_at,
                      peru_date: formatPeruDate(iss.created_at),
                      peru_time: formatPeruTime(iss.created_at),
                      peru_datetime: formatPeruDateTime(iss.created_at)
                    })}
                    className="block relative rounded-xl overflow-hidden border border-rose-200 group cursor-pointer"
                  >
                    <img
                      src={iss.photo_url}
                      alt="Evidencia fotográfica"
                      className="w-full h-28 object-cover group-hover:scale-105 transition"
                    />
                    <span className="absolute bottom-1.5 right-1.5 bg-black/75 text-white text-[9px] px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      <span>Ver Foto</span>
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1.5 border-t border-rose-100">
                  <span>E{iss.station_number} · <strong className="text-stone-700">{iss.reported_by}</strong></span>
                  <span className={`font-semibold ${iss.status === 'OPEN' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {iss.status === 'OPEN' ? 'ABIERTO' : 'RESUELTO'}
                  </span>
                </div>

                {iss.status === 'OPEN' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetUnit = (matrixData?.units || []).find(u => u.unit_number === iss.unit_number) || {
                        unit_number: iss.unit_number,
                        overall_status: "FAILED",
                        current_station: iss.station_number
                      };
                      onSelectUnit && onSelectUnit(targetUnit);
                    }}
                    className="w-full py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs touch-target"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                    <span>Subsanar Falla en PC #{iss.unit_number.toString().padStart(2, '0')}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
