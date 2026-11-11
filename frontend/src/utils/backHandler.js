/**
 * Gestor global de navegación móvil y botón "Atrás" (Android Back Button / Gestos / Popstate).
 * Permite que los modales, visores de evidencia y sub-vistas intercepten el botón Atrás
 * en orden LIFO (último en abrirse, primero en cerrarse) sin salir abruptamente del sistema.
 */

const backHandlers = [];

/**
 * Registra un manejador para interceptar el retroceso del navegador/móvil.
 * Debe retornar `true` si manejó la acción (ej. cerró un modal), o `false` para delegar al nivel superior.
 * Retorna una función de limpieza para desregistrar.
 */
export function registerBackHandler(handler) {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.lastIndexOf(handler);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * Ejecuta el manejador más reciente en la pila.
 * Retorna `true` si algún manejador procesó la acción.
 */
export function executeBackHandlers() {
  for (let i = backHandlers.length - 1; i >= 0; i--) {
    try {
      const handled = backHandlers[i]();
      if (handled) return true;
    } catch (err) {
      console.error("[BackHandler] Error ejecutando manejador de retroceso:", err);
    }
  }
  return false;
}
