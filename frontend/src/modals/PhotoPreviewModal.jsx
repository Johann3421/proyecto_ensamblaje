import React, { useState, useEffect } from 'react';
import { Download, X, Camera, Video, Wrench, Clock, Calendar, Timer, User } from 'lucide-react';
import AdminPhotoCorrectionModal from './AdminPhotoCorrectionModal';
import { formatPeruTime, formatPeruDate, formatDuration } from '../utils/timeFormat';
import { registerBackHandler } from '../utils/backHandler';

export default function PhotoPreviewModal({ photo, currentUser, onClose, onPhotoCorrected }) {
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  useEffect(() => {
    return registerBackHandler(() => {
      if (showCorrectionModal) {
        setShowCorrectionModal(false);
        return true;
      }
      onClose();
      return true;
    });
  }, [showCorrectionModal, onClose]);

  if (!photo) return null;
  const { url, title, subtitle, operation, user_name, timestamp, order_id, unit_number, step_number, is_supervisor_verified } = photo;

  const isVideo = url && (url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm') || photo.type === 'video');

  // Construcción ergonómica e inequívoca del título (Ley de Tesler y Jakob)
  let displayTitle = title;
  if (!displayTitle) {
    const pcPart = unit_number ? `PC #${unit_number.toString().padStart(2, '0')}` : "";
    const stepPart = step_number ? `Paso #${step_number}` : "";
    const opPart = operation || "";
    displayTitle = [pcPart, stepPart, opPart].filter(Boolean).join(" · ") || (isVideo ? "Evidencia de Video (8s)" : "Evidencia Fotográfica");
  } else if (operation && !displayTitle.toLowerCase().includes(operation.toLowerCase())) {
    displayTitle = `${displayTitle}: ${operation}`;
  }

  const uploadDate = photo.peru_date || formatPeruDate(timestamp);
  const uploadTime = photo.peru_time || formatPeruTime(timestamp);
  const durationLabel = photo.duration_formatted || formatDuration(photo.duration_seconds);

  const canCorrect = (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERVISOR') && order_id && unit_number && step_number;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-2.5 sm:p-4 fade-in backdrop-blur-xs" 
        onClick={onClose}
      >
        <div 
          className="bg-slate-900 text-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[94vh] relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera Ergonómica con Título Inequívoco */}
          <div className="bg-slate-950 px-4 py-3 flex justify-between items-start sm:items-center border-b border-slate-800 gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`p-1 rounded flex-shrink-0 ${isVideo ? "bg-rose-500/10 text-rose-400" : is_supervisor_verified ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {isVideo ? <Video className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-white break-words">
                  {displayTitle}
                </h3>
              </div>
              {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
            </div>
            <button 
              onClick={onClose} 
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 hover:bg-white/10 rounded-xl transition text-slate-400 hover:text-white flex-shrink-0 touch-manipulation active:scale-95"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Visor Multimedia Central */}
          <div className="flex-1 bg-black p-2 flex items-center justify-center min-h-[260px] overflow-hidden">
            {isVideo ? (
              <video 
                src={url} 
                controls 
                autoPlay 
                muted
                loop 
                playsInline 
                className="max-h-[58vh] sm:max-h-[66vh] w-auto max-w-full rounded-lg shadow-md" 
              />
            ) : (
              <img 
                src={url} 
                alt={`Evidencia de ${displayTitle}`} 
                className="max-h-[58vh] sm:max-h-[66vh] w-auto max-w-full object-contain rounded-lg shadow-md" 
              />
            )}
          </div>

          {/* Pie de Evidencia: Chunking de Metadatos (Ley de Miller) y Thumb Zone (Ley de Fitts) */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2.5 text-xs">
            {/* Metadatos segmentados en tarjetas Bento compactas */}
            <div className="flex items-center gap-2 text-slate-300 flex-wrap">
              {user_name && (
                <span className="inline-flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Por: <strong className="text-emerald-300 font-semibold">{user_name}</strong></span>
                </span>
              )}
              {uploadDate && (
                <span className="inline-flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-mono text-sky-300">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Fecha: <strong>{uploadDate}</strong></span>
                </span>
              )}
              {uploadTime && (
                <span className="inline-flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-mono text-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hora PE: <strong>{uploadTime}</strong></span>
                </span>
              )}
              {durationLabel && (
                <span className="inline-flex items-center gap-1.5 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-600/70 text-xs font-bold text-blue-300">
                  <Timer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tomó: {durationLabel}</span>
                </span>
              )}
            </div>

            {/* Barra de Acciones Táctiles (Ley de Fitts & Thumb Zone: min-h-[48px], 1-1-...) */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
              {canCorrect && (
                <button 
                  type="button"
                  onClick={() => setShowCorrectionModal(true)}
                  className="min-h-[48px] px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-sm touch-manipulation"
                  title="Rechazar foto o retroceder PC de estación para corrección"
                >
                  <Wrench className="w-4 h-4" />
                  <span className="hidden sm:inline">Corregir / Devolver PC</span>
                  <span className="sm:hidden">Corregir</span>
                </button>
              )}
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                download 
                className="min-h-[48px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition touch-manipulation"
              >
                <Download className="w-4 h-4" />
                <span>Descargar</span>
              </a>
              <button 
                onClick={onClose} 
                className="min-h-[48px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md touch-manipulation"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCorrectionModal && (
        <AdminPhotoCorrectionModal
          photo={photo}
          currentUser={currentUser}
          currentStation={photo.station_number || 1}
          onClose={() => setShowCorrectionModal(false)}
          onSuccess={(msg) => {
            onPhotoCorrected && onPhotoCorrected(msg);
            onClose();
          }}
        />
      )}
    </>
  );
}
