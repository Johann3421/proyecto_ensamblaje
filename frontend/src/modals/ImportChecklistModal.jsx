import React, { useState } from 'react';
import { Check, CheckCircle, AlertTriangle, AlertCircle, Download, Upload, Loader2, X, Sparkles, Wrench } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function ImportChecklistModal({ modelName, category = "ASSEMBLY", onClose, onSuccess, notify }) {
  const [selectedCategory, setSelectedCategory] = useState(category === "CLEANING" ? "CLEANING" : "ASSEMBLY");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isCleaning = selectedCategory === "CLEANING";
  const isAssembly = selectedCategory === "ASSEMBLY";

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) {
        setSelectedFile(file);
        setErrorMessage("");
      } else {
        setErrorMessage("Por favor selecciona un archivo Excel (.xlsx, .xls), CSV (.csv) o texto (.txt, .tsv)");
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMessage("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      const res = await fetch(`${API_BASE}/models/${modelName}/import-excel?category=${selectedCategory}`, {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al importar el archivo");
      }
      notify(data.message || `Se importaron pasos correctamente para ${modelName}`);
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || "Error al procesar el archivo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`text-white p-4 flex justify-between items-center transition-colors ${
          isCleaning ? "bg-emerald-800" : "bg-stone-900"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              {isCleaning ? <Sparkles className="w-4 h-4 text-emerald-200" /> : <Wrench className="w-4 h-4 text-stone-200" />}
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {isCleaning ? "Importar a Limpieza QC" : "Importar a Ensamblaje"}
              </h3>
              <p className="text-[11px] text-stone-200">
                Modelo: <span className="font-semibold text-white">{modelName}</span> · Prioridad 100% al apartado seleccionado
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con pasos guiados */}
        <div className="p-4 space-y-3.5 overflow-y-auto">
          {/* Selector de Apartado Destino */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Apartado de Destino:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("ASSEMBLY")}
                className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  isAssembly
                    ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isAssembly ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"}`}>
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Apartado Ensamblaje</p>
                  <p className={`text-[10px] leading-tight ${isAssembly ? "text-stone-300" : "text-stone-500"}`}>
                    Todo el Excel va a Ensamblaje
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("CLEANING")}
                className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  isCleaning
                    ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isCleaning ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Apartado Limpieza QC</p>
                  <p className={`text-[10px] leading-tight ${isCleaning ? "text-emerald-200" : "text-stone-500"}`}>
                    Todo el Excel va a Limpieza
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* PASO 1: Descargar Plantilla Oficial */}
          <div className={`p-3 rounded-xl border ${
            isCleaning ? "bg-emerald-50/60 border-emerald-200" : "bg-stone-50 border-stone-200"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-gray-900">
                  {isCleaning ? "Plantilla para Pasos de Limpieza" : "Plantilla para Pasos de Ensamblaje"}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isCleaning
                    ? "Columnas pre-configuradas para soplado, microfibra, sellos QC y empaque."
                    : "Columnas para montaje de componentes, armado físico, cableado y configuración."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.open(`${API_BASE}/checklist/template?model_name=${modelName}&category=${selectedCategory}`, "_blank")}
                className={`flex-shrink-0 text-xs border font-bold px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 transition touch-target ${
                  isCleaning ? "bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-white hover:bg-stone-100 text-stone-800 border-stone-300"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Plantilla</span>
              </button>
            </div>
          </div>

          {/* PASO 2: Subir archivo */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-gray-900">
              Seleccionar Archivo (.xlsx, .xls, .csv o .txt)
            </h4>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                dragOver
                  ? "border-emerald-500 bg-emerald-50/50"
                  : selectedFile
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-gray-300 hover:border-gray-400 bg-gray-50/50"
              }`}
              onClick={() => document.getElementById("checklist-file-input").click()}
            >
              <input
                id="checklist-file-input"
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-gray-900">{selectedFile.name}</p>
                  <p className="text-[10px] text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB · Listo para procesar</p>
                  <p className="text-[10px] text-primary underline">Clic para seleccionar otro archivo</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-800">
                    Arrastra aquí tu archivo Excel, CSV o TXT
                  </p>
                  <p className="text-[11px] text-gray-500">o haz clic para buscar en tu dispositivo</p>
                  <p className="text-[10px] text-gray-400">Archivos soportados: .xlsx, .xls, .csv, .tsv, .txt</p>
                </div>
              )}
            </div>
          </div>

          {/* Advertencia / Nota de Asignación */}
          <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
            isCleaning ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-stone-100 border-stone-200 text-stone-800"
          }`}>
            <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isCleaning ? "text-emerald-700" : "text-stone-700"}`} />
            <p className="text-[11px] leading-tight">
              <strong>Prioridad de asignación:</strong>{" "}
              {isCleaning
                ? `El 100% de los pasos del archivo se asignarán al Apartado de Limpieza QC. Los pasos de ensamblaje existentes no serán alterados.`
                : `El 100% de los pasos del archivo se asignarán al Apartado de Ensamblaje (incluso si contienen palabras de limpieza en su texto). Los pasos de limpieza QC existentes se conservan intactos.`}
            </p>
          </div>

          {/* Mensaje de Error */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <p className="text-xs">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 py-2.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition touch-target"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl shadow transition touch-target flex items-center justify-center gap-1.5 ${
              !selectedFile || isUploading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : isCleaning
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importando pasos...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirmar e Importar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MODAL CREAR NUEVO MODELO DE COMPUTADORA
// =============================================
