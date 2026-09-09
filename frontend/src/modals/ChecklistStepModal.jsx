import React, { useState } from 'react';
import { Upload, X, Wrench, Trash2, Trash, Sparkles, Camera } from 'lucide-react';
import { API_BASE } from '../utils/api';
import CameraCaptureModal from '../modals/CameraCaptureModal';
import { isStepCleaning } from '../utils/steps';

export default function ChecklistStepModal({ item, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    ...item,
    is_cleaning: Boolean(item?.is_cleaning !== undefined ? item.is_cleaning : isStepCleaning(item))
  });
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      setUploading(true);
      const res = await fetch(`${API_BASE}/upload-media`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Error al subir");
      const data = await res.json();
      setFormData(prev => ({ ...prev, media_url: data.url, media_type: data.type }));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-[#1B4332] text-white p-4 flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-sm font-bold">
              {formData.id ? `Editar Paso #${formData.step_number}` : "Nuevo Paso"}
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">N°</label>
                <input
                  type="number"
                  required
                  value={formData.step_number}
                  onChange={(e) => setFormData({ ...formData, step_number: parseInt(e.target.value, 10) })}
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 font-bold touch-target"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Operación</label>
                <input
                  type="text"
                  required
                  value={formData.operation}
                  onChange={(e) => setFormData({ ...formData, operation: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 touch-target"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
              <textarea
                rows="2"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5"
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Criterio de Calidad</label>
              <textarea
                rows="2"
                required
                value={formData.qc_criteria}
                onChange={(e) => setFormData({ ...formData, qc_criteria: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5"
              ></textarea>
            </div>

            {/* Campo Exclusivo: Clasificación del Paso (Ensamblaje vs Limpieza QC) */}
            <div className={`p-3.5 rounded-xl border transition space-y-2.5 ${
              formData.is_cleaning
                ? "bg-emerald-50/80 border-emerald-300 shadow-2xs"
                : "bg-stone-50 border-stone-200 shadow-2xs"
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  {formData.is_cleaning ? <Sparkles className="w-4 h-4 text-emerald-600" /> : <Wrench className="w-4 h-4 text-primary" />}
                  <span>Clasificación del Paso (Asignación)</span>
                </label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  formData.is_cleaning
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-stone-200 text-stone-800 border-stone-300"
                }`}>
                  {formData.is_cleaning ? "🧼 Paso de Limpieza QC" : "⚙️ Paso de Ensamblaje"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_cleaning: false }))}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 ${
                    !formData.is_cleaning
                      ? "bg-white border-blue-600 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-white/60 border-gray-200 hover:bg-white text-gray-600"
                  }`}
                >
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                    ⚙️ Ensamblaje
                  </span>
                  <span className="text-[10px] text-gray-500 leading-tight">
                    Para estaciones de armado físico, componentes, cableado y configuración.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_cleaning: true }))}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 ${
                    formData.is_cleaning
                      ? "bg-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-white/60 border-gray-200 hover:bg-white text-gray-600"
                  }`}
                >
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    🧼 Limpieza QC
                  </span>
                  <span className="text-[10px] text-emerald-700 leading-tight">
                    Para estaciones de limpieza, retiro de películas, polvo y microfibra.
                  </span>
                </button>
              </div>

              <p className="text-[10px] text-gray-500">
                {formData.is_cleaning
                  ? "✨ Los pasos marcados como Limpieza se asignan automáticamente de forma exclusiva a las estaciones de limpieza (aislados de ensamble)."
                  : "ℹ️ Los pasos de ensamblaje se distribuyen equitativamente entre los puestos de armado general."}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-700">Multimedia (GIF/Imagen)</label>
              <input
                type="text"
                placeholder="URL de imagen o GIF..."
                value={formData.media_url || ""}
                onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="block w-full py-2.5 bg-stone-100 text-primary border border-stone-200 text-xs font-semibold rounded-xl cursor-pointer hover:bg-stone-200 text-center touch-target transition flex items-center justify-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? "Subiendo..." : "📁 Subir Archivo"}</span>
                  <input type="file" accept="image/*,.gif" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="w-full py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-xl hover:bg-emerald-100 text-center touch-target flex items-center justify-center gap-1.5 transition"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Tomar Foto</span>
                </button>
              </div>
              {formData.media_url && (
                <div className="relative group">
                  <img src={formData.media_url} alt="Preview" className="w-full max-h-36 object-cover rounded-xl border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, media_url: "" }))}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1 rounded-lg text-xs transition"
                    title="Eliminar multimedia"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target">
                Cancelar
              </button>
              {formData.id && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(formData.id)}
                  className="px-4 py-3 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition touch-target flex items-center justify-center gap-1"
                  title="Eliminar este paso"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              )}
              <button type="submit" className="flex-1 py-3 text-xs font-bold bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl shadow transition touch-target">
                Guardar Paso
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Cámara */}
      {cameraOpen && (
        <CameraCaptureModal
          onCapture={(url, type) => {
            setFormData(prev => ({ ...prev, media_url: url, media_type: type }));
            setCameraOpen(false);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  );
}

// =============================================
// MODAL DE VISTO BUENO Y AUDITORÍA DEL SUPERVISOR QC
// =============================================
