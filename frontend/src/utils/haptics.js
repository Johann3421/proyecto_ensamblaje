/**
 * haptics.js - Feedback Háptico para Entorno Industrial / Móvil
 * 
 * Diseñado para operadores con guantes y smartphones en planta:
 * - Tap sutil para pulsaciones de botón / checkboxes.
 * - Doble pulso para confirmaciones exitosas (foto tomada, paso completado, fin de estación).
 * - Pulso sostenido / triple para alertas de falla o rechazo.
 */

export const hapticPatterns = {
  selection: 10,
  tap: 20,
  success: [40, 30, 50],
  warning: 65,
  error: [80, 50, 90]
};

export function triggerHaptic(pattern) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignorar si el dispositivo no soporta vibración o permisos restringidos
  }
}

export const hapticTap = () => triggerHaptic(hapticPatterns.tap);
export const hapticSelection = () => triggerHaptic(hapticPatterns.selection);
export const hapticSuccess = () => triggerHaptic(hapticPatterns.success);
export const hapticWarning = () => triggerHaptic(hapticPatterns.warning);
export const hapticError = () => triggerHaptic(hapticPatterns.error);

