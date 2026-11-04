import React from 'react';
import { Check, AlertTriangle, AlertCircle, Plus, Edit, Loader2, Shield, Cpu, RefreshCw, X, Columns, ShieldCheck, Trash2, RotateCcw, Trash, Camera } from 'lucide-react';
import Badge from '../components/Badge';
import Card from '../components/Card';

export default function PipelineMatrixView({ matrixData, orders, selectedOrder, setSelectedOrder, onOpenEmergency, onSelectUnit, onRefresh, onOpenAddUnits, onOpenResetOrder, onOpenDeleteOrder, onOpenEditOrder, onPreviewPhoto }) {
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
                className="text-xs border border-stone-200 rounded-xl px-3 py-2 bg-stone-50 font-semibold text-stone-700 outline-none hover:bg-stone-100 transition cursor-pointer"
              >
                {orders.map(o => (
                  <option key={o.order_id} value={o.order_id}>
                    {o.order_id} ({o.model_name})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={onOpenEditOrder}
              className="text-xs bg-stone-100 hover:bg-stone-200/80 text-stone-800 border border-stone-200/80 px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition"
              title="Editar parámetros de la orden, modelo, supervisor y estaciones"
            >
              <Edit className="w-3.5 h-3.5 text-stone-600" />
              <span>Editar</span>
            </button>
            <button
              onClick={onOpenAddUnits}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition shadow-xs"
              title="Agregar PCs a esta orden"
            >
              <Plus className="w-4 h-4" />
              <span>+ PC</span>
            </button>
            <button
              onClick={onOpenResetOrder}
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition"
              title="Reiniciar y limpiar todo el lote a Estación 1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Reiniciar</span>
            </button>
            <button
              onClick={onOpenEmergency}
              className="text-xs bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200/80 px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition"
              title="Reasignación de emergencia de técnico"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Reasignar</span>
            </button>
            <button
              onClick={onOpenDeleteOrder}
              className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 px-2.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition"
              title="Eliminar orden por completo"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            </button>
            <button
              onClick={onRefresh}
              className="p-2 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition text-stone-600"
              title="Actualizar datos"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
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

      {/* Matriz de Trazabilidad Bento Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-bento overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Columns className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-stone-900 text-sm">Matriz de Trazabilidad por Estación</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>OK</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>Activo</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Falla</span>
          </div>
        </div>

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
                      user_name: iss.reported_by
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
