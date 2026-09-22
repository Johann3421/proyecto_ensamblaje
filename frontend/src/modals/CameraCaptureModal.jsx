import React, { useState, useEffect, useRef } from 'react';
import { Check, AlertCircle, Upload, Loader2, X, RotateCcw, Camera, ZoomIn, ZoomOut, Smartphone, RefreshCw, Zap, ZapOff, Video, Square, Play } from 'lucide-react';
import { API_BASE } from '../utils/api';
import { compressImageToOptimized } from '../utils/imageCompressor';

export default function CameraCaptureModal({ title = "Tomar Evidencia con Cámara", subtitle = null, prefix = "step", onCapture, onClose }) {
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

  // Modo Foto o Video (8s máx sin audio)
  const [mediaMode, setMediaMode] = useState("photo"); // 'photo' | 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [capturedVideoBlob, setCapturedVideoBlob] = useState(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState(null);
  const [videoSizeKb, setVideoSizeKb] = useState(null);

  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Estados de control de Zoom (Hardware + Digital)
  const [zoom, setZoom] = useState(1);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 3, step: 0.1 });

  // Control de Flash / Linterna
  const [torchOn, setTorchOn] = useState(false);

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
      setTorchOn(false);

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

  // Alternar linterna / flash en cámara trasera
  const handleToggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const nextTorch = !torchOn;
    try {
      if (typeof track.applyConstraints === 'function') {
        await track.applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setTorchOn(nextTorch);
      } else {
        throw new Error("applyConstraints no soportado");
      }
    } catch (e) {
      console.warn("Fallo al alternar flash/linterna:", e);
      alert("El sensor actual no admite control directo de linterna por navegador. Puede usar el botón 'Cámara Celular' para capturar con el flash nativo de su teléfono.");
    }
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

  // Iniciar grabación de video de 8 segundos con auto-stop y sin audio
  const handleStartRecording = () => {
    if (!stream) return;
    try {
      setCameraError(null);
      videoChunksRef.current = [];
      setRecordingSeconds(0);

      // Detectar códec ligero admitido (VP8/WebM o MP4)
      let options = { videoBitsPerSecond: 800000 };
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          options.mimeType = 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          options.mimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          options.mimeType = 'video/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'video/webm';
        const blob = new Blob(videoChunksRef.current, { type: mime });
        const approxKb = Math.round(blob.size / 1024);
        const url = URL.createObjectURL(blob);
        setCapturedVideoBlob(blob);
        setCapturedVideoUrl(url);
        setVideoSizeKb(approxKb);
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      recorder.start(250); // Muestreo cada 250ms
      setIsRecording(true);

      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingSeconds(elapsed);
        // Auto-stop al alcanzar los 8.0 segundos
        if (elapsed >= 8.0) {
          handleStopRecording();
        }
      }, 100);
    } catch (err) {
      console.error("Error al iniciar grabación:", err);
      alert("No se pudo iniciar grabación de video: " + err.message);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleFilePicked = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setCompressing(true);
      if (file.type && file.type.startsWith('video/')) {
        const approxKb = Math.round(file.size / 1024);
        const url = URL.createObjectURL(file);
        setCapturedVideoBlob(file);
        setCapturedVideoUrl(url);
        setVideoSizeKb(approxKb);
        setMediaMode("video");
      } else {
        const optimizedDataUrl = await compressImageToOptimized(file, 1280, 0.75);
        const approxKb = Math.round((optimizedDataUrl.length * 0.75) / 1024);
        setImageSizeKb(approxKb);
        setCapturedImage(optimizedDataUrl);
        setMediaMode("photo");
      }
      setCameraError(null);
    } catch (err) {
      alert("Error procesando archivo: " + err.message);
    } finally {
      setCompressing(false);
    }
  };

  const handleConfirmAndUpload = async () => {
    if (mediaMode === "video") {
      if (!capturedVideoBlob) return;
      try {
        setLoading(true);
        const formData = new FormData();
        const ext = capturedVideoBlob.type?.includes("mp4") ? "mp4" : "webm";
        formData.append("file", capturedVideoBlob, `evidence_${Date.now()}.${ext}`);
        formData.append("prefix", prefix);

        const res = await fetch(`${API_BASE}/camera/upload-video`, {
          method: "POST",
          body: formData
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Error al procesar video en backend");
        }
        const data = await res.json();
        if (stream) stream.getTracks().forEach(track => track.stop());
        onCapture(data.url, data.type || "video");
      } catch (err) {
        alert("Error al subir video: " + err.message);
        setLoading(false);
      }
      return;
    }

    // Modo Foto
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
    if (capturedVideoUrl) {
      URL.revokeObjectURL(capturedVideoUrl);
    }
    setCapturedVideoBlob(null);
    setCapturedVideoUrl(null);
    setVideoSizeKb(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
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
          {/* Selector de Modo: Foto o Video (8s) */}
          {!capturedImage && !capturedVideoUrl && (
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
              <button
                type="button"
                onClick={() => { setMediaMode("photo"); handleRetake(); }}
                disabled={isRecording}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  mediaMode === "photo"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Foto Estándar</span>
              </button>
              <button
                type="button"
                onClick={() => { setMediaMode("video"); handleRetake(); }}
                disabled={isRecording}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  mediaMode === "video"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video Corto (Máx 8s · Mudo)</span>
              </button>
            </div>
          )}

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
                    accept="image/*,video/*"
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
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFilePicked}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-700">
              {!capturedImage && !capturedVideoUrl ? (
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

                  {/* Barra de progreso de grabación de 8 segundos */}
                  {isRecording && (
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-black/60 z-20 overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 transition-all duration-100 ease-linear shadow-sm"
                        style={{ width: `${Math.min(100, (recordingSeconds / 8.0) * 100)}%` }}
                      />
                    </div>
                  )}

                  {/* Indicador de Grabación Activa */}
                  {isRecording && (
                    <div className="absolute top-3 left-3 z-20 bg-rose-950/90 text-rose-200 border border-rose-500/60 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-2 backdrop-blur-sm shadow-lg animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm" />
                      <span>REC 00:0{Math.floor(recordingSeconds)} / 00:08</span>
                    </div>
                  )}

                  {/* Controles superiores: Flash y Selector de Lente */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      className={`border px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1.5 shadow transition ${
                        torchOn
                          ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400 font-black'
                          : 'bg-black/65 hover:bg-black/85 text-slate-200 border-white/20'
                      }`}
                      title="Activar / Desactivar Flash o Linterna"
                    >
                      {torchOn ? <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" /> : <ZapOff className="w-3.5 h-3.5 text-slate-300" />}
                      <span>{torchOn ? "Flash ON" : "Flash"}</span>
                    </button>

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
                  {!isRecording && (
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
                  )}

                  {/* Mensaje guía central */}
                  {zoom === 1 && !isRecording && (
                    <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                      <div className="text-[10px] text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 font-medium">
                        {mediaMode === "video" ? "Muestra el funcionamiento (Auto-stop en 8s)" : "Enfoca el componente de la PC"}
                      </div>
                    </div>
                  )}

                  {compressing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
                      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                      <span className="text-xs text-white font-semibold">Procesando archivo...</span>
                    </div>
                  )}
                </>
              ) : capturedVideoUrl ? (
                /* Previsualización del Video Capturado */
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <video
                    src={capturedVideoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  {videoSizeKb && (
                    <div className="absolute bottom-2 right-2 bg-rose-950/90 text-rose-200 border border-rose-500/50 text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm font-mono shadow-sm">
                      🎥 {videoSizeKb} KB · 8s máx (Sin audio)
                    </div>
                  )}
                </div>
              ) : (
                /* Previsualización de Foto Capturada */
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
          {!capturedImage && !capturedVideoUrl && !cameraError && !isRecording && (
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
            {!capturedImage && !capturedVideoUrl ? (
              <>
                {/* Botón directo a Cámara Nativa del Teléfono */}
                {!isRecording && (
                  <label
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-emerald-300 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                    title="Abrir app de cámara original de tu celular"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Cámara Celular</span>
                    <input
                      type="file"
                      accept={mediaMode === "video" ? "video/*" : "image/*"}
                      capture="environment"
                      className="hidden"
                      onChange={handleFilePicked}
                    />
                  </label>
                )}

                {/* Subir archivo de galería */}
                {!isRecording && (
                  <label
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                    title="Cargar desde galería de imágenes o videos"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Galería</span>
                    <input
                      type="file"
                      accept={mediaMode === "video" ? "video/*" : "image/*"}
                      className="hidden"
                      onChange={handleFilePicked}
                    />
                  </label>
                )}

                {/* Botón Principal: Foto o Video según modo activo */}
                {mediaMode === "video" ? (
                  isRecording ? (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-rose-950/40 animate-pulse"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Detener y Guardar ({(8 - recordingSeconds).toFixed(1)}s restantes)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      disabled={!!cameraError || compressing}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-rose-950/40"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
                      <span>Grabar Video (8s)</span>
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={handleTakeSnapshot}
                    disabled={!!cameraError || compressing}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{compressing ? "Comprimiendo..." : "Capturar Foto"}</span>
                  </button>
                )}
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
                  <span>Tomar Otra Vez</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndUpload}
                  disabled={loading}
                  className={`flex-1 py-2.5 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ${
                    mediaMode === "video" 
                      ? "bg-rose-600 hover:bg-rose-500 shadow-rose-950/40" 
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{mediaMode === "video" ? "Comprimiendo video H.264..." : "Guardando evidencia..."}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{mediaMode === "video" ? "Confirmar Video (8s)" : "Confirmar y Verificar"}</span>
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
