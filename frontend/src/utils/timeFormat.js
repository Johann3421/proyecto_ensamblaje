/**
 * Utilidades para formateo de Fecha y Hora Perú (America/Lima / UTC-5)
 * y cálculo/formateo de duraciones de tiempo tomadas entre pasos.
 * Cumple con Ley de Jakob (formatos estándar y familiares) y Ley de Tesler.
 */

export function formatPeruDate(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch {
    return "";
  }
}

export function formatPeruTime(isoString, includeSeconds = true) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: true
    }).format(d);
  } catch {
    return "";
  }
}

export function formatPeruDateTime(isoString, includeSeconds = true) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: true
    }).format(d);
  } catch {
    return "";
  }
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return null;
  const s = Math.max(0, Math.round(Number(seconds)));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem_s = s % 60;
  if (m < 60) return rem_s > 0 ? `${m}m ${rem_s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem_m = m % 60;
  return `${h}h ${rem_m.toString().padStart(2, '0')}m`;
}


