import React, { useState, useEffect } from 'react';
import { Check, CheckCircle, AlertTriangle, Shield, Cpu, X, ShieldCheck, ArrowRightCircle, Trash2, RotateCcw, Trash, Camera } from 'lucide-react';
import { API_BASE } from '../utils/api';
import Badge from '../components/Badge';
import TransferUnitModal from '../modals/TransferUnitModal';
import SupervisorAuditModal from '../modals/SupervisorAuditModal';

export default function UnitDetailModal({ unit, order, stations, issues = [], currentUser, onPreviewPhoto, onClose, onSuccess, notify }) {
  const [loading, setLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
  const [supervisorAuditData, setSupervisorAuditData] = useState(null);
  const [unitLogs, setUnitLogs] = useState([]);
  const unitIssues = (issues || []).filter(i => i.unit_number === unit.unit_number);

  useEffect(() => {
    if (order?.order_id) {
      fetch(`${API_BASE}/orders/${order.order_id}/logs`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setUnitLogs(data.filter(l => l.unit_number === unit.unit_number && l.status === "PASS"));
          }
        })
        .catch(() => {});
      
      // Consultar auditoría de supervisión
      fetch(`${API_BASE}/supervisor/unit/${order.order_id}/${unit.unit_number}/audit`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.latest) setSupervisorAuditData(data.latest); })
        .catch(() => {});
    }
  }, [order?.order_id, unit.unit_number]);

  const unitPhotos = unitLogs.filter(l => l.photo_url);

  const handleResetUnit = async () => {
    if (!window.confirm(`¿Seguro que deseas reiniciar la PC #${unit.unit_number}? Su progreso volverá a Estación 1 y se limpiarán sus registros.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}/units/${unit.unit_number}/reset`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al reiniciar");
      onSuccess(data.message || `PC #${unit.unit_number} reiniciada`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUnit = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}/units/${unit.unit_number}/resume`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al reanudar PC");
      onSuccess(data.message || `PC #${unit.unit_number} reincorporada`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (currentUser?.role !== "ADMIN") {
      alert("La eliminación definitiva de unidades está reservada exclusivamente para el Administrador del Sistema.");
      return;
    }
    if (!window.confirm(`¿ELIMINAR definitivamente la PC #${unit.unit_number} de la orden? Esta acción reducirá el total de unidades del lote.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}/units/${unit.unit_number}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al eliminar");
      onSuccess(data.message || `PC #${unit.unit_number} eliminada`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorApproval = () => {
    setSupervisorModalOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
          <div className="bg-[#1B4332] text-white p-4 flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              <h3 className="text-sm font-bold">PC #{unit.unit_number.toString().padStart(2, '0')} — Ficha de Unidad</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold block">N° Serie</span>
                <p className="font-mono font-bold text-gray-900 text-[11px] break-all">{unit.serial_number}</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold block">Orden</span>
                <p className="font-bold text-primary">{order.order_id}</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold block">Estado Actual</span>
                <div className="mt-0.5">
                  {unit.overall_status === "PASSED" && <Badge variant="success">COMPLETADA</Badge>}
                  {unit.overall_status === "FAILED" && <Badge variant="danger">CON FALLA (BLOQUEADA)</Badge>}
                  {unit.overall_status === "IN_PROGRESS" && <Badge variant="warning">EN PROCESO</Badge>}
                  {unit.overall_status === "PENDING" && <Badge variant="neutral">EN COLA</Badge>}
                </div>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold block">Ubicación</span>
                <p className="font-bold text-emerald-700">
                  {unit.current_station > stations.length ? "EMPACADO ✓" : `Estación ${unit.current_station}`}
                </p>
              </div>
            </div>

            {/* Evidencia Fotográfica de Pasos Verificados */}
            {unitPhotos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Fotos de Verificación ({unitPhotos.length})</span>
                  </p>
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                    Evidencia OK
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {unitPhotos.map((l, idx) => (
                    <div
                      key={idx}
                      onClick={() => onPreviewPhoto && onPreviewPhoto({
                        url: l.photo_url,
                        title: `PC #${unit.unit_number.toString().padStart(2, '0')} · Paso #${l.step_number}`,
                        subtitle: `Estación ${l.station_number}`,
                        user_name: l.user_name,
                        timestamp: l.timestamp
                      })}
                      className="group relative rounded-xl overflow-hidden border border-emerald-200 bg-slate-900 cursor-pointer shadow-xs aspect-square"
                    >
                      <img
                        src={l.photo_url}
                        alt={`Paso ${l.step_number}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-white">
                        <span className="text-[10px] font-bold block leading-none">Paso #{l.step_number}</span>
                        <span className="text-[8px] text-slate-300 block truncate mt-0.5">{l.user_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reportes de Falla con Evidencia Fotográfica */}
            {unitIssues.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Incidencias / Fallas Reportadas ({unitIssues.length})</span>
                </p>
                {unitIssues.map((iss, idx) => (
                  <div key={idx} className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900 text-xs">{iss.issue_title}</span>
                      <Badge variant="danger">{iss.severity}</Badge>
                    </div>
                    {iss.description && (
                      <p className="text-[11px] text-rose-800 leading-relaxed">{iss.description}</p>
                    )}
                    <div className="text-[10px] text-rose-600 flex items-center justify-between">
                      <span>Reportado por: <strong>{iss.reported_by}</strong></span>
                      <span>Estación {iss.station_number}</span>
                    </div>
                    {iss.photo_url && (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-gray-700 block mb-1">📸 Foto de Evidencia:</span>
                        <div 
                          onClick={() => onPreviewPhoto && onPreviewPhoto({
                            url: iss.photo_url,
                            title: `Falla PC #${unit.unit_number} · ${iss.issue_title}`,
                            subtitle: `Reportado por ${iss.reported_by}`,
                            user_name: iss.reported_by
                          })}
                          className="block relative group overflow-hidden rounded-lg border border-rose-300 cursor-pointer"
                        >
                          <img
                            src={iss.photo_url}
                            alt="Foto de la falla"
                            className="w-full h-36 object-cover group-hover:scale-105 transition duration-200"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-2 py-0.5 rounded backdrop-blur-sm">
                            🔍 Clic para ampliar
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Acciones de gestión de la PC */}
            <div className="pt-2 border-t border-gray-200 space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acciones de Control</p>
              
              {unit.overall_status === "FAILED" && (
                <button
                  disabled={loading}
                  onClick={handleResumeUnit}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition disabled:opacity-50 touch-target"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>✓ Subsanar Falla y Reanudar PC en Línea</span>
                </button>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={() => setTransferModalOpen(true)}
                className="w-full py-2.5 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-primary font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 touch-target"
              >
                <ArrowRightCircle className="w-3.5 h-3.5 text-primary" />
                <span>Derivar / Mover a otra Estación</span>
              </button>

              {currentUser?.role === "SUPERVISOR" && (
                <button
                  type="button"
                  onClick={handleSupervisorApproval}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition touch-target"
                >
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>🛡️ Visto Bueno de Calidad (Supervisor)</span>
                </button>
              )}

              <div className={`grid ${currentUser?.role === "ADMIN" ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                <button
                  disabled={loading}
                  onClick={handleResetUnit}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 touch-target"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reiniciar a E1</span>
                </button>
                {currentUser?.role === "ADMIN" && (
                  <button
                    disabled={loading}
                    onClick={handleDeleteUnit}
                    className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 touch-target"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Eliminar PC</span>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-xs transition touch-target"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {transferModalOpen && (
        <TransferUnitModal
          unit={unit}
          order={order}
          currentStation={unit.current_station}
          allStations={stations}
          currentUser={currentUser || { name: "Supervisor / Admin" }}
          onClose={() => setTransferModalOpen(false)}
          onSuccess={(msg) => {
            setTransferModalOpen(false);
            onSuccess(msg);
          }}
        />
      )}

      {supervisorModalOpen && (
        <SupervisorAuditModal
          isOpen={supervisorModalOpen}
          onClose={() => setSupervisorModalOpen(false)}
          orderId={order.order_id}
          unitNumber={unit.unit_number}
          serialNumber={unit.serial_number}
          modelName={order.model_name}
          currentUser={currentUser}
          notify={notify}
          onSuccess={(res) => {
            setSupervisorModalOpen(false);
            setSupervisorAuditData({
              supervisor_name: currentUser?.name || "Supervisor de Calidad",
              status: res.unit?.supervisor_approved ? "APPROVED" : "REJECTED",
              created_at: new Date().toISOString(),
              notes: res.notes || ""
            });
            if (onSuccess) onSuccess(res.message || "✓ Visto Bueno registrado");
          }}
        />
      )}
    </>
  );
}

// =============================================
// MODAL AGREGAR PCS AL LOTE
// =============================================
