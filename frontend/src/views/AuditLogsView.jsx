import React, { useState, useEffect, useMemo } from 'react';
import { Shield, FileText, Camera, Filter, Layers, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { API_BASE } from '../utils/api';
import Badge from '../components/Badge';
import Card from '../components/Card';

export default function AuditLogsView({ selectedOrder, orders = [], onSelectOrder, onPreviewPhoto }) {
  const [logs, setLogs] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState(selectedOrder || orders[0]?.order_id || "");
  const [filterUser, setFilterUser] = useState("");
  const [filterUnit, setFilterUnit] = useState(""); // "" significa todas las PCs
  const [activeSubTab, setActiveSubTab] = useState("photos"); // "photos" o "logs"

  useEffect(() => {
    if (selectedOrder && selectedOrder !== activeOrderId) {
      setActiveOrderId(selectedOrder);
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (activeOrderId) {
      fetch(`${API_BASE}/orders/${activeOrderId}/logs`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (Array.isArray(data)) setLogs(data); })
        .catch(() => {});
    }
  }, [activeOrderId]);

  // Obtener lista ordenada de números de PC presentes en la orden
  const availableUnits = useMemo(() => {
    const set = new Set(logs.map(l => l.unit_number));
    return Array.from(set).filter(n => typeof n === 'number').sort((a, b) => a - b);
  }, [logs]);

  // Filtrado de logs según usuario y PC seleccionada
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchUser = !filterUser || (l.user_name || "").toLowerCase().includes(filterUser.toLowerCase());
      const matchUnit = !filterUnit || Number(l.unit_number) === Number(filterUnit);
      return matchUser && matchUnit;
    });
  }, [logs, filterUser, filterUnit]);

  // Agrupación de fotos estrictamente por PC
  const photosByUnit = useMemo(() => {
    const groups = {};
    logs.forEach(l => {
      if (!l.photo_url) return;
      if (filterUnit && Number(l.unit_number) !== Number(filterUnit)) return;
      if (filterUser && !(l.user_name || "").toLowerCase().includes(filterUser.toLowerCase())) return;

      const uNum = l.unit_number;
      if (!groups[uNum]) groups[uNum] = [];
      groups[uNum].push(l);
    });

    // Ordenar fotos de cada PC por número de paso
    Object.keys(groups).forEach(u => {
      groups[u].sort((a, b) => a.step_number - b.step_number);
    });

    return groups;
  }, [logs, filterUnit, filterUser]);

  const unitKeysWithPhotos = Object.keys(photosByUnit).map(Number).sort((a, b) => a - b);
  const totalPhotosCount = unitKeysWithPhotos.reduce((acc, k) => acc + (photosByUnit[k]?.length || 0), 0);

  return (
    <div className="space-y-4 fade-in">
      {/* Barra de Filtros y Configuración */}
      <Card className="p-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-800" />
            <span>Auditoría y Evidencias Forenses</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {logs.length} registros · {totalPhotosCount} fotos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {orders.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Orden de Trabajo</label>
              <select
                value={activeOrderId || ""}
                onChange={(e) => {
                  setActiveOrderId(e.target.value);
                  setFilterUnit("");
                  onSelectOrder?.(e.target.value);
                }}
                className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 font-semibold touch-target w-full"
              >
                {orders.map(o => <option key={o.order_id} value={o.order_id}>{o.order_id} ({o.model_name})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Organizar por PC</label>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white font-semibold touch-target w-full"
            >
              <option value="">Todas las PCs ({availableUnits.length} disponibles)</option>
              {availableUnits.map(u => (
                <option key={u} value={u}>
                  PC #{u.toString().padStart(2, '0')} {photosByUnit[u] ? `· ${photosByUnit[u].length} foto(s)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Filtrar por Técnico</label>
            <input
              type="text"
              placeholder="Buscar técnico..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-2 touch-target w-full"
            />
          </div>
        </div>

        {/* Pestañas de Vista: Galería por PC vs Lista de Registros */}
        <div className="flex border-b border-gray-200 mt-3 pt-1">
          <button
            type="button"
            onClick={() => setActiveSubTab("photos")}
            className={`pb-2 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeSubTab === "photos"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Fotos Organizadas por PC ({totalPhotosCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("logs")}
            className={`pb-2 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeSubTab === "logs"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Historial Completo ({filteredLogs.length})</span>
          </button>
        </div>
      </Card>

      {/* VISTA 1: FOTOS ORGANIZADAS ESTRICTAMENTE POR PC */}
      {activeSubTab === "photos" && (
        <div className="space-y-4">
          {unitKeysWithPhotos.map(uNum => {
            const unitPhotos = photosByUnit[uNum] || [];
            return (
              <Card key={uNum} className="overflow-hidden border border-gray-200">
                {/* Encabezado de la PC */}
                <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black px-2 py-0.5 rounded border border-emerald-500/30">
                      PC #{uNum.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      Evidencias Fotográficas
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-black/40 px-2 py-0.5 rounded">
                    {unitPhotos.length} {unitPhotos.length === 1 ? 'foto' : 'fotos'}
                  </span>
                </div>

                {/* Cuadrícula de fotos exclusivas de esta PC */}
                <div className="p-3 bg-stone-50/50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {unitPhotos.map((l, idx) => (
                      <div
                        key={idx}
                        onClick={() => onPreviewPhoto && onPreviewPhoto({
                          url: l.photo_url,
                          order_id: l.order_id || activeOrderId,
                          unit_number: l.unit_number,
                          step_number: l.step_number,
                          station_number: l.station_number,
                          title: `PC #${l.unit_number.toString().padStart(2, '0')} · Paso #${l.step_number}: ${l.operation || 'Paso ' + l.step_number}`,
                          subtitle: `Estación ${l.station_number} · Verificado por ${l.user_name}`,
                          operation: l.operation,
                          user_name: l.user_name,
                          timestamp: l.timestamp
                        })}
                        className="group relative rounded-xl overflow-hidden border border-stone-200 bg-slate-950 cursor-pointer shadow-xs hover:shadow-md transition flex flex-col aspect-square"
                      >
                        <img
                          src={l.photo_url}
                          alt={`Paso #${l.step_number}: ${l.operation}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 text-white">
                          <span className="text-[11px] font-bold block leading-tight truncate">
                            #{l.step_number} {l.operation || `Paso ${l.step_number}`}
                          </span>
                          <div className="flex items-center justify-between text-[9px] text-slate-300 mt-0.5">
                            <span>E{l.station_number} · {l.user_name}</span>
                            {l.is_supervisor_verified && (
                              <span className="text-amber-300 font-bold">SUP</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}

          {unitKeysWithPhotos.length === 0 && (
            <Card className="p-8 text-center border-dashed">
              <Camera className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-600">No hay fotos registradas para el criterio seleccionado.</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {filterUnit ? `No se encontraron fotografías para la PC #${filterUnit.toString().padStart(2, '0')}.` : "Los técnicos aún no han capturado fotos de evidencia."}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* VISTA 2: HISTORIAL COMPLETO DE LOGS CON FOTOS Y DETALLES */}
      {activeSubTab === "logs" && (
        <div className="space-y-2">
          {filteredLogs.map(l => (
            <Card key={l.id} className="p-3 hover:border-gray-300 transition">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-900 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                      PC #{l.unit_number.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs text-emerald-800 font-bold">
                      Paso #{l.step_number}: {l.operation || `Paso ${l.step_number}`}
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                      Estación {l.station_number}
                    </span>
                    {l.is_supervisor_verified && (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        Verificación Supervisor
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    Técnico: <span className="font-bold text-slate-900">{l.user_name}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">{new Date(l.timestamp).toLocaleString("es-PE")}</p>
                  {l.notes && <p className="text-[10px] text-gray-600 bg-stone-50 p-1.5 rounded border border-stone-200 italic">{l.notes}</p>}

                  {l.photo_url && (
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={() => onPreviewPhoto && onPreviewPhoto({
                          url: l.photo_url,
                          order_id: l.order_id || activeOrderId,
                          unit_number: l.unit_number,
                          step_number: l.step_number,
                          station_number: l.station_number,
                          title: `PC #${l.unit_number.toString().padStart(2, '0')} · Paso #${l.step_number}: ${l.operation || 'Paso ' + l.step_number}`,
                          subtitle: `Estación ${l.station_number} · Verificado por ${l.user_name}`,
                          operation: l.operation,
                          user_name: l.user_name,
                          timestamp: l.timestamp
                        })}
                        className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-800 transition group"
                      >
                        <img src={l.photo_url} alt="Evidencia" className="w-6 h-6 object-cover rounded border border-emerald-300 group-hover:scale-105 transition" />
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ver Foto: #{l.step_number} {l.operation || ''}</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {l.status === "PASS" && <Badge variant="success">PASS</Badge>}
                  {l.status === "FAIL" && <Badge variant="danger">FAIL</Badge>}
                  {l.status === "UNCHECK" && <Badge variant="warning">DESMARC.</Badge>}
                  {l.status === "REASSIGNED" && <Badge variant="warning">REASIG.</Badge>}
                  {l.status === "ADMIN_CORRECTION" && <Badge variant="warning">CORREC. ADMIN</Badge>}
                </div>
              </div>
            </Card>
          ))}
          {filteredLogs.length === 0 && (
            <Card className="p-8 text-center border-dashed">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No hay registros de auditoría que coincidan con los filtros.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
