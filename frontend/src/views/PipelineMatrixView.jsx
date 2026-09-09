import React from 'react';
import { Check, AlertTriangle, AlertCircle, Plus, Edit, Loader2, Shield, Cpu, RefreshCw, X, Columns, ShieldCheck, Trash2, RotateCcw, Trash, Camera } from 'lucide-react';
import Badge from '../components/Badge';
import Card from '../components/Card';

export default function PipelineMatrixView({ matrixData, orders, selectedOrder, setSelectedOrder, onOpenEmergency, onSelectUnit, onRefresh, onOpenAddUnits, onOpenResetOrder, onOpenDeleteOrder, onOpenEditOrder }) {
  if (!matrixData || !matrixData.order) {
    return (
      <Card className="p-8 text-center mx-auto max-w-sm space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <div>
          <h3 className="text-sm font-bold text-gray-800">Conectando con el Pipeline...</h3>
          <p className="text-xs text-gray-500 mt-1">Obteniendo estado en tiempo real.</p>
        </div>
        <button onClick={onRefresh} className="text-xs bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold px-4 py-2 rounded-lg shadow inline-flex items-center gap-1.5 transition">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar Conexión</span>
        </button>
      </Card>
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
      {/* Header de orden */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-stone-100 text-primary flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-sm font-bold text-stone-900 truncate">{order.order_id}</h2>
                <Badge variant="info">{order.model_name}</Badge>
                {order.supervisor_name && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    <span>Supervisor: {order.supervisor_name}</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-stone-500 truncate">
                {order.total_units} PCs · {order.total_stations} Estaciones {order.supervisor_name ? `· Sup: ${order.supervisor_name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {orders.length > 0 && (
              <select
                value={selectedOrder || ""}
                onChange={(e) => setSelectedOrder(e.target.value)}
                className="text-xs border border-stone-300 rounded-lg px-2 py-1.5 bg-stone-50 font-medium text-stone-700 touch-target"
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
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-xs touch-target"
              title="Editar parámetros de la orden, modelo, supervisor y estaciones"
            >
              <Edit className="w-4 h-4 text-stone-700" />
              <span>Editar Orden</span>
            </button>
            <button
              onClick={onOpenAddUnits}
              className="text-xs bg-primary hover:bg-primary-light text-white px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-sm touch-target"
              title="Agregar PCs a esta orden"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar PC</span>
            </button>
            <button
              onClick={onOpenResetOrder}
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition touch-target"
              title="Reiniciar y limpiar todo el lote a Estación 1"
            >
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Limpiar </span>Lote
            </button>
            <button
              onClick={onOpenEmergency}
              className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 px-2.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition touch-target"
              title="Reasignación de emergencia de técnico"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="hidden md:inline">Reasignar</span>
            </button>
            <button
              onClick={onOpenDeleteOrder}
              className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition touch-target"
              title="Eliminar orden por completo"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span className="hidden lg:inline">Eliminar</span>
            </button>
            <button
              onClick={onRefresh}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition touch-target"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-l-4 border-l-emerald-600">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Completadas</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-600">{passed}</span>
            <span className="text-xs text-emerald-700 font-bold">{completionPercentage}%</span>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-amber-700 uppercase">En Proceso</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-amber-600">{inProgress}</span>
            <span className="text-xs text-amber-600">activas</span>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-rose-600">
          <p className="text-[10px] font-bold text-rose-700 uppercase">Con Falla</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-rose-600">{failed}</span>
            <span className="text-xs text-rose-600">{issues.length} tickets</span>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-gray-400">
          <p className="text-[10px] font-bold text-gray-500 uppercase">En Cola</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-gray-700">{pending}</span>
            <span className="text-xs text-gray-500">pendiente</span>
          </div>
        </Card>
      </div>

      {/* Barra progreso general */}
      <Card className="p-3">
        <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
          <span>Progreso del Lote</span>
          <span>{passed} / {total} PCs</span>
        </div>
        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </Card>

      {/* Tabla scroll horizontal en mobile */}
      <Card className="overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
            <Columns className="w-4 h-4 text-primary" />
            <span>Matriz de Trazabilidad</span>
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>OK</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse"></span>Activo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>Falla</span>
          </div>
        </div>

        <div className="table-mobile-scroll">
          <table className="w-full text-left border-collapse text-xs min-w-[480px]">
            <thead>
              <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <th className="py-2 px-3 font-bold sticky left-0 bg-gray-50 z-10 w-20">PC</th>
                {stations.map(st => (
                  <th key={st.station_number} className="py-2 px-3 font-bold border-l border-gray-200 whitespace-nowrap">
                    <div className="text-gray-800 font-semibold">E{st.station_number}</div>
                    <div className="text-[10px] text-gray-500 font-normal hidden sm:block truncate max-w-[100px]">
                      {st.user_name}
                    </div>
                  </th>
                ))}
                <th className="py-2 px-3 font-bold border-l border-gray-200 text-center w-24">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {units.map((unit) => {
                const isFinished = unit.overall_status === "PASSED";
                const isFailed = unit.overall_status === "FAILED";
                return (
                  <tr
                    key={unit.unit_number}
                    onClick={() => onSelectUnit(unit)}
                    className="hover:bg-stone-100/50 active:bg-stone-200 cursor-pointer transition"
                  >
                    <td className="py-2 px-3 font-bold text-gray-900 sticky left-0 bg-white z-10">
                      #{unit.unit_number.toString().padStart(2, '0')}
                    </td>
                    {stations.map(st => {
                      let state = "queue";
                      if (isFailed && unit.current_station === st.station_number) state = "failed";
                      else if (unit.current_station > st.station_number) state = "passed";
                      else if (unit.current_station === st.station_number && !isFinished) state = "active";

                      return (
                        <td key={st.station_number} className="py-2 px-2 border-l border-gray-200 text-center">
                          {state === "passed" && <Check className="w-4 h-4 text-emerald-600 mx-auto" />}
                          {state === "active" && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping mx-auto block"></span>}
                          {state === "failed" && <X className="w-4 h-4 text-rose-600 mx-auto" />}
                          {state === "queue" && <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 border-l border-gray-200 text-center">
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
      </Card>

      {/* Panel de Fallas con Fotos de Evidencia */}
      {issues.length > 0 && (
        <Card className="p-4 border-l-4 border-l-rose-600 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-stone-900">
                Fallas Reportadas ({issues.length})
              </h3>
            </div>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Evidencia Fotográfica
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {issues.map((iss, idx) => (
              <div
                key={idx}
                className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 space-y-2 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-xs font-black text-rose-900 bg-rose-200 px-1.5 py-0.5 rounded mr-1">
                      PC #{iss.unit_number.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs font-bold text-stone-900">{iss.issue_title}</span>
                  </div>
                  <Badge variant="danger">{iss.severity}</Badge>
                </div>

                {iss.description && (
                  <p className="text-[11px] text-stone-700 leading-tight line-clamp-2">{iss.description}</p>
                )}

                {iss.photo_url && (
                  <a
                    href={iss.photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative rounded-lg overflow-hidden border border-rose-300 group"
                  >
                    <img
                      src={iss.photo_url}
                      alt="Evidencia fotográfica"
                      className="w-full h-28 object-cover group-hover:scale-105 transition"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold backdrop-blur-sm flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      <span>Ver Foto</span>
                    </span>
                  </a>
                )}

                <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-rose-200">
                  <span>E{iss.station_number} · <strong>{iss.reported_by}</strong></span>
                  <span className={`font-semibold ${iss.status === 'OPEN' ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {iss.status === 'OPEN' ? 'ABIERTO' : 'RESUELTO'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
