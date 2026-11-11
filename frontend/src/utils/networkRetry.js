/**
 * networkRetry.js - Resiliencia de red para Wi-Fi de planta industrial
 * 
 * Reintenta peticiones críticas (subida de evidencias fotográficas, cambios de estado)
 * ante micro-cortes de Wi-Fi o zonas muertas en línea de producción.
 */

export async function fetchWithRetry(url, options = {}, config = {}) {
  const {
    retries = 3,
    initialDelayMs = 700,
    backoffFactor = 2,
    retryOnStatus = [502, 503, 504, 408],
    onRetry = null
  } = config;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, options);

      // Si la respuesta fue exitosa o no está en la lista de reintentables, retornar
      if (response.ok || !retryOnStatus.includes(response.status)) {
        return response;
      }

      if (attempt === retries) {
        return response;
      }

      attempt++;
      if (typeof onRetry === 'function') {
        onRetry({ attempt, retries, delay, status: response.status });
      }
      await new Promise(r => setTimeout(r, delay));
      delay = Math.round(delay * backoffFactor + (Math.random() * 200));
    } catch (networkError) {
      // Error de red físico / sin conexión
      if (attempt >= retries) {
        throw networkError;
      }
      attempt++;
      if (typeof onRetry === 'function') {
        onRetry({ attempt, retries, delay, error: networkError });
      }
      await new Promise(r => setTimeout(r, delay));
      delay = Math.round(delay * backoffFactor + (Math.random() * 200));
    }
  }
}
