import React, { useState } from 'react';
import { X, AlertTriangle, RotateCcw, Trash2, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { API_BASE } from '../utils/api';
import { compressImageToOptimized } from '../utils/imageCompressor';

export default function AdminPhotoCorrectionModal({ photo, currentUser, currentStation = 1, onClose, onSuccess }) {
  const [action, setAction] = useState("DELETE"); // "DELETE" o "REPLACE"
  const [reason, setReason] = useState("");
  const [returnToStation, setReturnToStation] = useState(
    currentStation > 1 ? currentStation - 1 : 0
  );
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const optimizedBase64 = await compressImageToOptimized(file, 1280, 0.75);
      const res = await fetch(`${API_BASE}/camera/capture-base64`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: optimizedBase64,
          prefix: `admin_corr_${photo.order_id}_pc${photo.unit_number}_p${photo.step_number}`
        })
      });
      if (!res.ok) throw new Error("Error al procesar foto de reemplazo");
      const data = await res.json();
      setNewPhotoUrl(data.url);
    } catch (err) {
      alert("Error subiendo foto: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Por favor indica en qué se equivocó el técnico o el motivo de la corrección.");
      return;
    }
    if (action === "REPLACE" && !newPhotoUrl) {
      alert("Por favor selecciona o sube la nueva fotografía de reemplazo.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/admin/correct-step-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: photo.order_id,
          unit_number: photo.unit_number,
          step_number: photo.step_number,
          action,
          reason: reason.trim(),
          admin_name: currentUser?.name || "Administrador",
          return_to_station: returnToStation > 0 ? returnToStation : null,
          new_photo_url: action === "REPLACE" ? newPhotoUrl : null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al procesar corrección");

      onSuccess(data.message);
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Generar lista de posibles estaciones de retorno previas
  const returnOptions = [];
  returnOptions.push({ value: 0, label: "Mantener en la estación actual" });
  for (let s = 1; s <= Math.max(1, currentStation); s++) {
    returnOptions.push({ value: s, label: `Devolver y reabrir Estación ${s}` });
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/85 flex items-center justify-center p-3 sm:p-4 fade-in backdrop-blur-xs" onClick={onClose}>
      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-700 relative z-10" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="bg-slate-950 px-4 py-3 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Corrección Administrativa de Evidencia</h3>
              <p className="text-[11px] text-slate-400">
                PC #{photo.unit_number?.toString().padStart(2, '0')} · Paso #{photo.step_number}: {photo.operation || ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* Acción a realizar */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Acción a realizar:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction("DELETE")}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition ${
                  action === "DELETE"
                    ? "bg-rose-950/60 border-rose-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                }`}
              >
                <Trash2 className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold block text-[11px] text-rose-200">Rechazar / Borrar</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">Reabre el paso para que el técnico lo rehaga</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAction("REPLACE")}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition ${
                  action === "REPLACE"
                    ? "bg-emerald-950/60 border-emerald-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                }`}
              >
                <Upload className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold block text-[11px] text-emerald-200">Reemplazar Foto</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">Sustituye la imagen por una corregida</span>
                </div>
              </button>
            </div>
          </div>

          {/* Subida de nueva foto si es REPLACE */}
          {action === "REPLACE" && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-slate-300 block">Nueva Fotografía:</label>
              <div className="flex items-center gap-2">
                <label className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{uploading ? "Comprimiendo..." : "Seleccionar Archivo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                {newPhotoUrl && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Foto lista para guardar
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Motivo del error técnico */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Observación / En qué se equivocó el técnico <span className="text-rose-400">*</span>:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Foto borrosa no se distingue el conector ATX / Perno con torque flojo en tarjeta madre..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 touch-target"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Esta observación quedará registrada en el historial forense inmutable y será visible para el técnico en su estación.
            </p>
          </div>

          {/* Retorno de estación */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Retroceder PC a Estación anterior (para subsanación):
            </label>
            <select
              value={returnToStation}
              onChange={(e) => setReturnToStation(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400 touch-target"
            >
              {returnOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim() || (action === "REPLACE" && !newPhotoUrl)}
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Procesando...</span></>
              ) : (
                <span>Confirmar Corrección</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
