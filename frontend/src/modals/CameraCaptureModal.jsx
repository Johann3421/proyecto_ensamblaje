import React, { useState, useEffect, useRef } from 'react';
import { Check, AlertCircle, Upload, Loader2, X, RotateCcw, Camera, ZoomIn, ZoomOut, Smartphone, RefreshCw } from 'lucide-react';
import { API_BASE } from '../utils/api';
import { compressImageToOptimized } from '../utils/imageCompressor';

export default function CameraCaptureModal({ title = "Tomar Foto con Cámara", subtitle = null, prefix = "step", onCapture, onClose }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageSizeKb, setImageSizeKb] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // Estados de control de Zoom (Hardware + Digital)
  const [zoom, setZoom] = useState(1);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 3, step: 0.1 });

  // Enumerar cámaras físicas disponibles
  const enumerateCameras = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
    } catch (e) {
      console.warn("No se pudieron listar cámaras:", e);
    }
  };

  const startCamera = async (deviceIdToUse = selectedDeviceId, mode = facingMode) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraError(null);
      setZoom(1);

      const videoConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      };

      if (deviceIdToUse) {
        videoConstraints.deviceId = { exact: deviceIdToUse };
      } else {
        videoConstraints.facingMode = mode;
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      await enumerateCameras();

      // Detectar capacidades de Zoom y Enfoque continuo por hardware
      const track = newStream.getVideoTracks()[0];
      if (track) {
        if (typeof track.getCapabilities === 'function') {
          const caps = track.getCapabilities();
          if (caps.zoom) {
            setHasHardwareZoom(true);
            setZoomRange({
              min: caps.zoom.min || 1,
              max: Math.min(caps.zoom.max || 5, 8),
              step: caps.zoom.step || 0.1
            });
          } else {
            setHasHardwareZoom(false);
            setZoomRange({ min: 1, max: 4, step: 0.1 });
          }
        } else {
          setHasHardwareZoom(false);
          setZoomRange({ min: 1, max: 4, step: 0.1 });
        }

        // Intentar enfoque continuo si el sensor lo soporta
        if (typeof track.applyConstraints === 'function') {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: "continuous" }]
            });
          } catch {
            // Ignorar si el navegador no permite focusMode por hardware
          }
        }
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      setCameraError("No se pudo iniciar la cámara web. Puede abrir la app de cámara nativa de su teléfono.");
    }
  };

  useEffect(() => {
    startCamera(selectedDeviceId, facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, selectedDeviceId]);

  // Aplicar cambio de zoom (Hardware si existe, sino digital reactivo)
  const applyZoom = async (newZoom) => {
    const clamped = Math.max(zoomRange.min, Math.min(zoomRange.max, parseFloat(Number(newZoom).toFixed(1))));
    setZoom(clamped);

    if (hasHardwareZoom && stream) {
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.applyConstraints === 'function') {
        try {
          await track.applyConstraints({ advanced: [{ zoom: clamped }] });
        } catch (e) {
          console.warn("Fallo al aplicar zoom por hardware:", e);
        }
      }
    }
  };

  // Alternar entre los diferentes lentes traseros/delanteros detectados
  const handleCycleCamera = () => {
    if (videoDevices.length <= 1) {
      // Si el navegador no los diferenció, alternar facingMode
      setFacingMode(prev => (prev === "environment" ? "user" : "environment"));
      setSelectedDeviceId(null);
      return;
    }
    const currentIdx = videoDevices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIdx = (currentIdx + 1) % videoDevices.length;
    setSelectedDeviceId(videoDevices[nextIdx].deviceId);
  };

  const handleTakeSnapshot = async () => {
    if (!videoRef.current) return;
    try {
      setCompressing(true);
      const video = videoRef.current;
      const vWidth = video.videoWidth || 1280;
      const vHeight = video.videoHeight || 720;

      const canvas = document.createElement("canvas");
      canvas.width = vWidth;
      canvas.height = vHeight;
      const ctx = canvas.getContext("2d");

      if (hasHardwareZoom || zoom <= 1) {
        // Zoom aplicado directamente por el sensor de la cámara
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        // Zoom digital mediante recorte central proporcional exacto
        const cropW = vWidth / zoom;
        const cropH = vHeight / zoom;
        const cropX = (vWidth - cropW) / 2;
        const cropY = (vHeight - cropH) / 2;
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      }

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

  // Obtener etiqueta amigable del lente activo
  const activeDeviceLabel = () => {
    if (selectedDeviceId) {
      const dev = videoDevices.find(d => d.deviceId === selectedDeviceId);
      if (dev?.label) return dev.label.replace(/\(.*\)/, '').trim() || "Lente Seleccionado";
    }
    return facingMode === "environment" ? "Lente Trasero" : "Frontal";
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-3 sm:p-4 fade-in">
      <div className="bg-[#1e293b] text-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-700">
        {/* Cabecera */}
        <div className="bg-slate-900 px-4 py-3 flex justify-between items-center border-b border-slate-800">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
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
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow">
                  <Smartphone className="w-4 h-4" />
                  <span>Abrir Cámara Nativa del Teléfono</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFilePicked}
                  />
                </label>
                <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>Subir de Galería</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFilePicked}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-700">
              {!capturedImage ? (
                <>
                  {/* Vista previa de cámara con soporte de zoom digital en vivo */}
                  <div className="w-full h-full overflow-hidden flex items-center justify-center relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{
                        transform: !hasHardwareZoom && zoom > 1 ? `scale(${zoom})` : 'none',
                        transformOrigin: 'center center',
                        transition: 'transform 0.12s ease-out'
                      }}
                    />
                  </div>

                  {/* Selector rápido de Lente en esquina superior derecha */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                    <button
                      type="button"
                      onClick={handleCycleCamera}
                      className="bg-black/65 hover:bg-black/85 text-slate-200 border border-white/20 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1.5 shadow"
                      title="Cambiar lente (Principal, Gran angular, etc.)"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-400" />
                      <span className="truncate max-w-[120px]">{activeDeviceLabel()}</span>
                    </button>
                  </div>

                  {/* Botones de Acceso Rápido a Zoom (1x, 1.5x, 2x, 3x) */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/75 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 z-10 shadow-lg">
                    {[1, 1.5, 2, 3].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyZoom(preset)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition ${
                          Math.abs(zoom - preset) < 0.15
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {preset}x
                      </button>
                    ))}
                  </div>

                  {/* Mensaje guía central */}
                  {zoom === 1 && (
                    <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                      <div className="text-[10px] text-white/90 bg-black/50 px-2.5 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                        Enfoca el componente de la PC
                      </div>
                    </div>
                  )}

                  {compressing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
                      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                      <span className="text-xs text-white font-semibold">Optimizando y recortando foto...</span>
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
                    <div className="absolute bottom-2 right-2 bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm font-mono">
                      ⚡ {imageSizeKb} KB (Optimizada)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Slider fino de Zoom si la cámara está activa */}
          {!capturedImage && !cameraError && (
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
              <ZoomOut className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="range"
                min={zoomRange.min}
                max={zoomRange.max}
                step={zoomRange.step}
                value={zoom}
                onChange={(e) => applyZoom(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <ZoomIn className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-[10px] font-mono font-bold text-emerald-400 w-8 text-right">
                {zoom.toFixed(1)}x
              </span>
            </div>
          )}

          {/* Barra de Acciones Inferior */}
          <div className="flex gap-2 pt-1">
            {!capturedImage ? (
              <>
                {/* Botón directo a Cámara Nativa del Teléfono con todo el zoom óptico y lentes */}
                <label
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-emerald-300 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  title="Abrir app de cámara original de tu celular (Acceso a lentes 0.5x, 1x, 3x nativos)"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Cámara Celular</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFilePicked}
                  />
                </label>

                {/* Subir archivo de galería */}
                <label
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  title="Cargar desde galería de imágenes"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Galería</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFilePicked}
                  />
                </label>

                {/* Botón Principal: Capturar Foto con la cámara web */}
                <button
                  type="button"
                  onClick={handleTakeSnapshot}
                  disabled={!!cameraError || compressing}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40"
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
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40"
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
