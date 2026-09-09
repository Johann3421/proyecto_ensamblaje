import React, { useState, useEffect, useRef } from 'react';
import { Check, AlertCircle, Upload, Loader2, X, RotateCcw, Camera } from 'lucide-react';
import { API_BASE } from '../utils/api';
import { compressImageToOptimized } from '../utils/imageCompressor';

export default function CameraCaptureModal({ title = "Tomar Foto con Cámara", subtitle = null, prefix = "step", onCapture, onClose }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageSizeKb, setImageSizeKb] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const startCamera = async (mode) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraError(null);
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      setCameraError("No se pudo acceder a la cámara automáticamente. Verifique permisos o use el selector de cámara nativo.");
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const handleToggleFacingMode = () => {
    setFacingMode(prev => (prev === "environment" ? "user" : "environment"));
  };

  const handleTakeSnapshot = async () => {
    if (!videoRef.current) return;
    try {
      setCompressing(true);
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL("image/jpeg", 0.9);

      // Comprimir inmediatamente en el navegador a WebP/JPEG optimizado
      const optimizedDataUrl = await compressImageToOptimized(rawDataUrl, 1280, 0.75);
      const approxKb = Math.round((optimizedDataUrl.length * 0.75) / 1024);
      setImageSizeKb(approxKb);
      setCapturedImage(optimizedDataUrl);
    } catch (err) {
      console.error("Error al capturar y comprimir:", err);
      alert("Error procesando foto: " + err.message);
    } finally {
      setCompressing(false);
    }
  };

  const handleFilePicked = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setCompressing(true);
      const optimizedDataUrl = await compressImageToOptimized(file, 1280, 0.75);
      const approxKb = Math.round((optimizedDataUrl.length * 0.75) / 1024);
      setImageSizeKb(approxKb);
      setCapturedImage(optimizedDataUrl);
      setCameraError(null);
    } catch (err) {
      alert("Error procesando imagen: " + err.message);
    } finally {
      setCompressing(false);
    }
  };

  const handleConfirmAndUpload = async () => {
    if (!capturedImage) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/camera/capture-base64`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedImage, prefix })
      });
      if (!res.ok) throw new Error("Error al procesar fotografía en backend");
      const data = await res.json();
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      onCapture(data.url, data.type || "image");
    } catch (err) {
      alert("Error al subir foto: " + err.message);
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setImageSizeKb(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-4 fade-in">
      <div className="bg-[#1e293b] text-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-700">
        <div className="bg-slate-900 px-4 py-3 flex justify-between items-center border-b border-slate-800">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold truncate">{title}</h3>
            </div>
            {subtitle && <p className="text-[11px] text-slate-400 truncate mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={() => {
              if (stream) stream.getTracks().forEach(t => t.stop());
              onClose();
            }}
            className="p-1 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {cameraError ? (
            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300">{cameraError}</p>
              <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow">
                <Camera className="w-4 h-4" />
                <span>Abrir Cámara del Dispositivo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFilePicked}
                />
              </label>
            </div>
          ) : (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-700">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                    <div className="text-[11px] text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                      Enfoca el componente o paso verificado
                    </div>
                  </div>
                  {compressing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                      <span className="text-xs text-white font-semibold">Optimizando y comprimiendo foto...</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={capturedImage}
                    alt="Captura de cámara"
                    className="w-full h-full object-contain"
                  />
                  {imageSizeKb && (
                    <div className="absolute bottom-2 right-2 bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm font-mono">
                      ⚡ {imageSizeKb} KB (Ultra-ligero)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Controles */}
          <div className="flex gap-2 pt-1">
            {!capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
                  title="Cambiar cámara frontal/trasera"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Girar</span>
                </button>
                <label className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer" title="Cargar desde galería">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Galería</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFilePicked}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleTakeSnapshot}
                  disabled={!!cameraError || compressing}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-light disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
                >
                  <Camera className="w-4 h-4" />
                  <span>{compressing ? "Comprimiendo..." : "Capturar Foto"}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Tomar Otra</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndUpload}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando evidencia...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar y Verificar</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MODAL IMPORTAR CHECKLIST CON PLANTILLA OFICIAL
// =============================================
