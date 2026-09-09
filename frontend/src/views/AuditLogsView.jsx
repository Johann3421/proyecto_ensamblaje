import React, { useState, useEffect } from 'react';
import { Shield, FileText, Camera } from 'lucide-react';
import { API_BASE } from '../utils/api';
import Badge from '../components/Badge';
import Card from '../components/Card';

export default function AuditLogsView({ selectedOrder, orders = [], onPreviewPhoto }) {
  const [logs, setLogs] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState(selectedOrder || orders[0]?.order_id || "");
  const [filterUser, setFilterUser] = useState("");

  useEffect(() => {
    if (activeOrderId) {
      fetch(`${API_BASE}/orders/${activeOrderId}/logs`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (Array.isArray(data)) setLogs(data); })
        .catch(() => {});
    }
  }, [activeOrderId]);

  const filteredLogs = logs.filter(l =>
    !filterUser || (l.user_name || "").toLowerCase().includes(filterUser.toLowerCase())
  );

  return (
    <div className="space-y-4 fade-in">
      <Card className="p-3">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <span>Registro de Auditoría Forense</span>
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          {orders.length > 0 && (
            <select
              value={activeOrderId || ""}
              onChange={(e) => setActiveOrderId(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 font-semibold touch-target"
            >
              {orders.map(o => <option key={o.order_id} value={o.order_id}>{o.order_id}</option>)}
            </select>
          )}
          <input
            type="text"
            placeholder="Filtrar por técnico..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-3 py-2.5 touch-target w-full"
          />
        </div>
      </Card>

      {/* Logs como tarjetas en mobile */}
      <div className="space-y-2">
        {filteredLogs.map(l => (
          <Card key={l.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-900">PC #{l.unit_number.toString().padStart(2, '0')}</span>
                  <span className="text-xs text-primary font-semibold">Paso {l.step_number}</span>
                  <span className="text-[10px] text-gray-500">E{l.station_number}</span>
                </div>
                <p className="text-xs font-semibold text-gray-800 truncate">{l.user_name}</p>
                <p className="text-[10px] text-gray-400 font-mono">{new Date(l.timestamp).toLocaleString("es-PE")}</p>
                {l.notes && <p className="text-[10px] text-gray-500 italic">{l.notes}</p>}

                {l.photo_url && (
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => onPreviewPhoto && onPreviewPhoto({
                        url: l.photo_url,
                        title: `PC #${l.unit_number.toString().padStart(2, '0')} · Paso #${l.step_number}`,
                        subtitle: `Estación ${l.station_number}`,
                        user_name: l.user_name,
                        timestamp: l.timestamp
                      })}
                      className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-800 transition group"
                    >
                      <img src={l.photo_url} alt="Evidencia" className="w-6 h-6 object-cover rounded border border-emerald-300 group-hover:scale-105 transition" />
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ver Foto de Evidencia</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {l.status === "PASS" && <Badge variant="success">PASS</Badge>}
                {l.status === "FAIL" && <Badge variant="danger">FAIL</Badge>}
                {l.status === "REASSIGNED" && <Badge variant="warning">REASIG.</Badge>}
              </div>
            </div>
          </Card>
        ))}
        {filteredLogs.length === 0 && (
          <Card className="p-8 text-center">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No hay registros de auditoría aún.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
