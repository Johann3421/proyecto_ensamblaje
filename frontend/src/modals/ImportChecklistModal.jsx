import React, { useState } from 'react';
import { Check, CheckCircle, AlertTriangle, AlertCircle, Download, Upload, Loader2, X } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function ImportChecklistModal({ modelName, onClose, onSuccess, notify }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
        setSelectedFile(file);
        setErrorMessage("");
      } else {
        setErrorMessage("Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV (.csv)");
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
      const res = await fetch(`${API_BASE}/models/${modelName}/import-excel`, {
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
        <div className="bg-[#1B4332] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Importar Checklist de Pasos</h3>
              <p className="text-[11px] text-blue-100">Modelo: <span className="font-semibold text-white">{modelName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con pasos guiados */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* PASO 1: Descargar Plantilla */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl border border-stone-200/80">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-block text-[10px] font-bold text-primary bg-stone-200/80 px-2 py-0.5 rounded-full">
                  PASO 1 · PLANTILLA
                </span>
                <h4 className="text-xs font-bold text-gray-900">Descarga la Plantilla Oficial Excel</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Contiene el formato oficial pre-configurado con 5 ejemplos prácticos de ensamble y las columnas exactas requeridas: <code className="text-[10px] bg-white px-1 py-0.5 rounded border text-stone-800">Paso_Nro</code>, <code className="text-[10px] bg-white px-1 py-0.5 rounded border text-stone-800">Operacion</code>, <code className="text-[10px] bg-white px-1 py-0.5 rounded border text-stone-800">Criterio_Control_Calidad</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.open(`${API_BASE}/checklist/template?model_name=${modelName}`, "_blank")}
                className="flex-shrink-0 text-xs bg-white hover:bg-stone-100 text-[#1B4332] border border-stone-300 font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition touch-target"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar</span>
              </button>
            </div>
          </div>

          {/* PASO 2: Subir archivo */}
          <div className="space-y-2">
            <span className="inline-block text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
              PASO 2 · SUBIDA
            </span>
            <h4 className="text-xs font-bold text-gray-900">Sube tu archivo completado (.xlsx, .xls o .csv)</h4>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                dragOver
                  ? "border-blue-500 bg-stone-100/50"
                  : selectedFile
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-gray-300 hover:border-gray-400 bg-gray-50/50"
              }`}
              onClick={() => document.getElementById("checklist-file-input").click()}
            >
              <input
                id="checklist-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
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
                  <div className="w-10 h-10 rounded-full bg-stone-100 text-primary flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-800">
                    Arrastra aquí tu archivo Excel o CSV
                  </p>
                  <p className="text-[11px] text-gray-500">o haz clic para buscar en tu dispositivo</p>
                  <p className="text-[10px] text-gray-400">Archivos soportados: .xlsx, .xls, .csv</p>
                </div>
              )}
            </div>
          </div>

          {/* Advertencia / Nota */}
          <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[11px] leading-tight">
              <strong>Nota:</strong> Los pasos contenidos en el archivo reemplazarán los pasos actuales del modelo <strong>{modelName}</strong>.
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
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
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
