import React, { useState } from 'react';
import { Check, CheckCircle, AlertTriangle, Upload, Loader2, X, Trash2, Trash, Camera } from 'lucide-react';
import { API_BASE } from '../utils/api';
import { compressImageToOptimized } from '../utils/imageCompressor';
import CameraCaptureModal from '../modals/CameraCaptureModal';

export default function IssueReportModal({ data, currentUser, orderId, stationNumber, onClose, onSuccess }) {
  const { unit, step } = data;
  const [issueTitle, setIssueTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("CRITICAL");
  const [photoUrl, setPhotoUrl] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const compressedDataUrl = await compressImageToOptimized(file, 1280, 0.75);
      const res = await fetch(`${API_BASE}/camera/capture-base64`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressedDataUrl, prefix: `issue_pc${unit.unit_number}` })
      });
      if (!res.ok) throw new Error("Error al subir fotografía");
      const data = await res.json();
      setPhotoUrl(data.url);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoUrl) {
      alert("⚠️ Es OBLIGATORIO tomar o adjuntar una fotografía de la falla para generar el reporte.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/operator/report-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          unit_number: unit.unit_number,
          step_number: step?.step_number || 1,
          station_number: stationNumber || 1,
          reported_by: currentUser.name,
          issue_title: issueTitle,
          description,
          severity,
          photo_url: photoUrl
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error registrando incidencia");
      }
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
          <div className="bg-rose-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Reportar Falla — PC #{unit.unit_number}</span>
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Título de la Falla</label>
              <input
                type="text"
                required
                placeholder="Ej: Rayón en tapa frontal / GPU no detectada"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5 touch-target focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Severidad</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5 font-bold touch-target"
              >
                <option value="LOW">Baja (Cosmético)</option>
                <option value="MEDIUM">Media (Ajuste menor)</option>
                <option value="HIGH">Alta (Reemplazo)</option>
                <option value="CRITICAL">Crítica (Bloqueo total)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
              <textarea
                rows="2"
                required
                placeholder="Detalle exactamente lo observado..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5 touch-target focus:outline-none"
              ></textarea>
            </div>

            {/* SECCIÓN DE FOTOGRAFÍA OBLIGATORIA */}
            <div className="space-y-2 pt-1 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-rose-600" />
                  <span>Foto de la Falla</span>
                  <span className="text-[9px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-bold border border-rose-200">
                    OBLIGATORIO *
                  </span>
                </label>
                {photoUrl && (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Foto cargada
                  </span>
                )}
              </div>

              {photoUrl ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-black/5">
                  <img
                    src={photoUrl}
                    alt="Evidencia fotográfica"
                    className="w-full h-36 object-cover rounded-lg"
                  />
                  <div className="p-2 bg-slate-900/90 text-white flex items-center justify-between text-xs">
                    <span className="text-[11px] text-emerald-400 font-medium truncate">✓ Evidencia lista</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCameraOpen(true)}
                        className="px-2.5 py-1 bg-primary hover:bg-primary-light text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoUrl("")}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-50/70 rounded-xl border-2 border-dashed border-rose-300 space-y-2 text-center">
                  <p className="text-[11px] text-rose-800 leading-tight">
                    Toma una foto clara del defecto con la cámara para identificar la falla rápidamente.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCameraOpen(true)}
                      className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition touch-target"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Tomar Foto</span>
                    </button>
                    <label className="py-2.5 px-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition touch-target text-center">
                      {uploadingPhoto ? (
                        <><Loader2 className="w-4 h-4 animate-spin text-rose-600" /><span>Subiendo...</span></>
                      ) : (
                        <><Upload className="w-4 h-4 text-gray-500" /><span>📁 Archivo</span></>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingPhoto}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !photoUrl}
                className={`flex-1 py-3 text-xs font-bold text-white rounded-xl shadow transition touch-target flex items-center justify-center gap-1.5 ${
                  !photoUrl
                    ? "bg-gray-400 cursor-not-allowed opacity-75"
                    : "bg-rose-600 hover:bg-rose-700 active:scale-95"
                }`}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Registrando...</span></>
                ) : (
                  <span>Bloquear PC y Reportar</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {cameraOpen && (
        <CameraCaptureModal
          title={`Foto de Falla · PC #${unit.unit_number.toString().padStart(2, '0')}`}
          subtitle="Captura clara del defecto o daño"
          prefix={`issue_pc${unit.unit_number}`}
          onCapture={(url) => {
            setPhotoUrl(url);
            setCameraOpen(false);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  );
}
