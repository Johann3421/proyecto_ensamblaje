import React, { useState } from 'react';
import { Check, CheckCircle, AlertTriangle, AlertCircle, Download, Upload, Loader2, X, Sparkles, Wrench } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function ImportChecklistModal({ modelName, category = "ALL", onClose, onSuccess, notify }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isCleaning = category === "CLEANING";
  const isAssembly = category === "ASSEMBLY";

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
      const res = await fetch(`${API_BASE}/models/${modelName}/import-excel?category=${category}`, {
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
        <div className={`text-white p-4 flex justify-between items-center ${
          isCleaning ? "bg-emerald-800" : isAssembly ? "bg-stone-800" : "bg-[#1B4332]"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              {isCleaning ? <Sparkles className="w-4 h-4 text-emerald-200" /> : isAssembly ? <Wrench className="w-4 h-4 text-stone-200" /> : <Upload className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {isCleaning ? "Importar Pasos de Limpieza QC" : isAssembly ? "Importar Pasos de Ensamblaje" : "Importar Checklist de Pasos"}
              </h3>
              <p className="text-[11px] text-stone-200">
                Modelo: <span className="font-semibold text-white">{modelName}</span>
                {isCleaning && " · Bloque Exclusivo de Limpieza"}
                {isAssembly && " · Bloque de Ensamblaje"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con pasos guiados */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* PASO 1: Descargar Plantilla */}
          <div className={`p-3.5 rounded-xl border ${
            isCleaning ? "bg-emerald-50/60 border-emerald-200" : isAssembly ? "bg-stone-50 border-stone-200" : "bg-stone-50 border-stone-200"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isCleaning ? "text-emerald-800 bg-emerald-100" : isAssembly ? "text-stone-800 bg-stone-200" : "text-primary bg-stone-200"
                }`}>
                  PASO 1 · PLANTILLA {isCleaning ? "DE LIMPIEZA" : isAssembly ? "DE ENSAMBLAJE" : "GENERAL"}
                </span>
                <h4 className="text-xs font-bold text-gray-900">
                  {isCleaning ? "Plantilla Oficial para Pasos de Limpieza" : isAssembly ? "Plantilla Oficial para Ensamblaje" : "Descarga la Plantilla Oficial Excel"}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isCleaning
                    ? "Contiene ejemplos reales de retiro de películas, soplado, desinfección con microfibra y sellos QC. Al importar, se asignarán al bloque de limpieza sin borrar el ensamble."
                    : isAssembly
                    ? "Contiene ejemplos prácticos de montaje de hardware, CPU, RAM, cables y pruebas BIOS. Al importar, actualiza solo el ensamble."
                    : "Formato pre-configurado con columnas: Paso_Nro, Operacion, Descripcion_Detallada, Criterio_Control_Calidad, Tipo_Paso."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.open(`${API_BASE}/checklist/template?model_name=${modelName}&category=${category}`, "_blank")}
                className={`flex-shrink-0 text-xs border font-bold px-3 py-2 rounded-lg shadow-2xs flex items-center gap-1.5 transition touch-target ${
                  isCleaning ? "bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-white hover:bg-stone-100 text-stone-800 border-stone-300"
                }`}
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
            <h4 className="text-xs font-bold text-gray-900">
              Sube tu archivo para {isCleaning ? "Limpieza" : isAssembly ? "Ensamblaje" : "el Modelo"} (.xlsx, .xls o .csv)
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

          {/* Advertencia / Nota */}
          <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[11px] leading-tight">
              <strong>Nota:</strong>{" "}
              {isCleaning
                ? `Los pasos del archivo actualizarán únicamente el Bloque de Limpieza del modelo ${modelName}. Los pasos de ensamblaje permanecerán intactos.`
                : isAssembly
                ? `Los pasos del archivo actualizarán únicamente el Bloque de Ensamblaje del modelo ${modelName}. Los pasos de limpieza permanecerán intactos.`
                : `Los pasos contenidos en el archivo reemplazarán los pasos del modelo ${modelName}.`}
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
