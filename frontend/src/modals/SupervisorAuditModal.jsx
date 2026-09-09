import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Check, CheckCircle, AlertTriangle, Loader2, Shield, X, ShieldCheck, Camera } from 'lucide-react';
import { API_BASE } from '../utils/api';
import CameraCaptureModal from '../modals/CameraCaptureModal';

export default function SupervisorAuditModal({ isOpen, onClose, orderId, unitNumber, serialNumber, modelName, currentUser, onSuccess, notify }) {
  const [checks, setChecks] = useState({
    photos: true,
    cleaning: true,
    hardware: true,
    traceability: true,
    aesthetics: true
  });
  const [status, setStatus] = useState("APPROVED");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const selectedChecks = [
        checks.photos ? "📸 Evidencias Fotográficas Auditadas" : null,
        checks.cleaning ? "🧼 Limpieza Intermedia y Final Conforme" : null,
        checks.hardware ? "⚙️ Hardware, BIOS y Pruebas Verificados" : null,
        checks.traceability ? "🏷️ Trazabilidad, Serie y Marca KENYA Validados" : null,
        checks.aesthetics ? "📦 Integridad Estética y Embalaje Conforme" : null
      ].filter(Boolean);

      const res = await fetch(`${API_BASE}/supervisor/approve-unit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          unit_number: unitNumber,
          supervisor_id: currentUser?.id || "SUP-01",
          supervisor_name: currentUser?.name || "Supervisor de Calidad",
          status: status,
          checks: selectedChecks,
          photo_url: photoUrl,
          notes: notes || (status === "APPROVED" ? "Visto Bueno de Calidad Oficial Conforme" : "Observaciones en auditoría")
        })
      });
      if (!res.ok) throw new Error("Error registrando Visto Bueno del Supervisor");
      const data = await res.json();
      if (notify) notify(data.message);
      if (onSuccess) onSuccess(data);
      if (status === "APPROVED" && typeof confetti === "function") {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      }
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-200" />
            <div>
              <h3 className="text-sm font-bold">Visto Bueno de Calidad (Supervisor QC)</h3>
              <p className="text-[10px] text-amber-100 font-mono">PC #{unitNumber?.toString().padStart(2, '0')} · {orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1">
            <span className="text-[11px] font-bold text-amber-950 block">
              🛡️ Protocolo Oficial de Verificación y Dictamen de Calidad
            </span>
            <p className="text-[10px] text-amber-800 leading-relaxed">
              Como Supervisor de Planta, verifica los 5 puntos de la norma antes de liberar o bloquear esta unidad ({modelName}):
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-gray-800">1. Lista de Verificación (Checklist de Supervisión):</label>
            
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={checks.photos} 
                onChange={(e) => setChecks(prev => ({ ...prev, photos: e.target.checked }))} 
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-900 block">📸 Evidencias Fotográficas Auditadas</span>
                <span className="text-[10px] text-gray-500 block">Las fotos tomadas en los puestos son nítidas y demuestran stickers, cooler y cableado correctos.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={checks.cleaning} 
                onChange={(e) => setChecks(prev => ({ ...prev, cleaning: e.target.checked }))} 
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-900 block">🧼 Control de Limpieza Intermedia y Final</span>
                <span className="text-[10px] text-gray-500 block">Chasis sin residuos de cintillos cortados, virutas metálicas, polvo ni huellas dactilares.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={checks.hardware} 
                onChange={(e) => setChecks(prev => ({ ...prev, hardware: e.target.checked }))} 
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-900 block">⚙️ Hardware, BIOS y Pruebas Térmicas</span>
                <span className="text-[10px] text-gray-500 block">Memoria RAM total reconocida con perfil óptimo, firmware UEFI y arranque POST conforme.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={checks.traceability} 
                onChange={(e) => setChecks(prev => ({ ...prev, traceability: e.target.checked }))} 
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-900 block">🏷️ Trazabilidad, N° de Serie y Marca KENYA</span>
                <span className="text-[10px] text-gray-500 block">Serie física ({serialNumber || 'KENYA'}) coincide con etiqueta y base de datos. Logo KENYA alineado.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={checks.aesthetics} 
                onChange={(e) => setChecks(prev => ({ ...prev, aesthetics: e.target.checked }))} 
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-900 block">📦 Integridad Estética y Embalaje</span>
                <span className="text-[10px] text-gray-500 block">Vidrio templado y chasis sin rayaduras, espumas de protección y accesorios completos.</span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-800 mb-1.5">2. Dictamen Oficial del Supervisor:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("APPROVED")}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-1.5 ${
                  status === "APPROVED" 
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-sm" 
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>✓ APROBADO (V°B°)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus("REJECTED")}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-1.5 ${
                  status === "REJECTED" 
                    ? "bg-rose-600 text-white border-rose-700 shadow-sm" 
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>⚠️ RECHAZAR / OBSERVAR</span>
              </button>
            </div>
          </div>

          {/* Foto de Cumplimiento Opcional tomada por el Supervisor */}
          <div>
            <label className="block text-[11px] font-bold text-gray-800 mb-1.5">
              3. Foto de Cumplimiento Tomada por el Supervisor:
            </label>
            {photoUrl ? (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-xl border border-amber-300">
                <img src={photoUrl} alt="Foto cumplimiento" className="w-12 h-12 object-cover rounded-lg border border-amber-400" />
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-bold text-amber-950 block">📸 Foto de Cumplimiento Adjunta</span>
                  <span className="text-[10px] text-amber-800">Se registrará como evidencia oficial del supervisor</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold"
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="p-1 text-gray-400 hover:text-rose-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Camera className="w-4 h-4 text-amber-600" />
                <span>Tomar Foto de Cumplimiento (Supervisor)</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              4. Notas / Observaciones de Auditoría (Opcional):
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Verificado ensamblaje y evidencias fotográficas. Unidad liberada para embalaje."
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 focus:border-amber-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition touch-target flex items-center justify-center gap-1.5 ${
                status === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{status === "APPROVED" ? "Firmar Visto Bueno" : "Registrar Rechazo"}</span>
            </button>
          </div>
        </form>

        {cameraOpen && (
          <CameraCaptureModal
            title={`Foto de Cumplimiento · PC #${unitNumber}`}
            subtitle="Evidencia para Dictamen del Supervisor"
            prefix={`audit_${orderId}_pc${unitNumber}`}
            onCapture={(url) => {
              setPhotoUrl(url);
              setCameraOpen(false);
            }}
            onClose={() => setCameraOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// =============================================
// MODAL DETALLE PC (CON REPORTE DE FALLAS Y EVIDENCIA FOTOGRÁFICA DE PASOS)
// =============================================
