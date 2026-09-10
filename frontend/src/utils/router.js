/**
 * Router nativo para QC KENYA.
 * Mantiene sincronizada la URL del navegador (/pipeline, /checklists, /tecnicos, etc.)
 * para que al refrescar la página (F5) o compartir enlaces se conserve la ubicación exacta.
 */

export const ROUTE_MAP = {
  matrix: {
    path: '/pipeline',
    aliases: ['/pipeline', '/matriz', '/matrix', '/'],
    hashAliases: ['#pipeline', '#/pipeline', '#matrix', '#/matrix', '']
  },
  'create-order': {
    path: '/nueva-orden',
    aliases: ['/nueva-orden', '/orden', '/create-order'],
    hashAliases: ['#nueva-orden', '#/nueva-orden', '#orden', '#/orden', '#create-order', '#/create-order']
  },
  technicians: {
    path: '/tecnicos',
    aliases: ['/tecnicos', '/usuarios', '/technicians'],
    hashAliases: ['#tecnicos', '#/tecnicos', '#usuarios', '#/usuarios', '#technicians', '#/technicians']
  },
  checklists: {
    path: '/checklists',
    aliases: ['/checklists', '/checklist', '/pasos'],
    hashAliases: ['#checklists', '#/checklists', '#checklist', '#/checklist', '#pasos', '#/pasos']
  },
  audit: {
    path: '/auditoria',
    aliases: ['/auditoria', '/audit', '/logs'],
    hashAliases: ['#auditoria', '#/auditoria', '#audit', '#/audit', '#logs', '#/logs']
  },
  operator: {
    path: '/estacion',
    aliases: ['/estacion', '/operario', '/operator', '/apoyo'],
    hashAliases: ['#estacion', '#/estacion', '#operario', '#/operario', '#operator', '#/operator']
  }
};

/**
 * Obtiene la pestaña activa correspondiente a la URL actual
 */
export function getCurrentRouteTab(userRole = 'ADMIN') {
  if (typeof window === 'undefined') return 'matrix';

  const pathname = (window.location.pathname || '').toLowerCase().replace(/\/+$/, '') || '/';
  const hash = (window.location.hash || '').toLowerCase();

  // 1. Evaluar si existe hash
  if (hash) {
    for (const [tabId, config] of Object.entries(ROUTE_MAP)) {
      if (config.hashAliases.some(h => h && (hash === h || hash.startsWith(h + '?') || hash.startsWith(h + '/')))) {
        return sanitizeTabForRole(tabId, userRole);
      }
    }
  }

  // 2. Evaluar pathname
  for (const [tabId, config] of Object.entries(ROUTE_MAP)) {
    for (const alias of config.aliases) {
      if (alias === '/') {
        if (pathname === '/') return sanitizeTabForRole('matrix', userRole);
      } else if (pathname === alias || pathname.startsWith(alias + '/') || pathname.startsWith(alias + '?')) {
        return sanitizeTabForRole(tabId, userRole);
      }
    }
  }

  // 3. Fallback predeterminado por rol
  return sanitizeTabForRole('matrix', userRole);
}

/**
 * Valida si el rol del usuario tiene permitido ver la pestaña solicitada
 */
export function sanitizeTabForRole(tabId, userRole) {
  if (userRole === 'OPERATOR') {
    return 'operator';
  }
  if (userRole === 'SUPERVISOR') {
    if (['matrix', 'operator', 'checklists', 'audit'].includes(tabId)) {
      return tabId;
    }
    return 'matrix';
  }
  // ADMIN
  if (['matrix', 'create-order', 'technicians', 'checklists', 'audit'].includes(tabId)) {
    return tabId;
  }
  return 'matrix';
}

/**
 * Actualiza la URL del navegador mediante History API
 */
export function updateBrowserRoute(tabId, subParams = {}, replace = false) {
  if (typeof window === 'undefined') return;

  const baseConfig = ROUTE_MAP[tabId];
  if (!baseConfig) return;

  let newPath = baseConfig.path;

  // Sub-rutas específicas para el apartado de checklists
  if (tabId === 'checklists' && subParams.section) {
    const sec = String(subParams.section).toLowerCase();
    if (sec === 'cleaning' || sec === 'limpieza') newPath = '/checklists/limpieza';
    else if (sec === 'assembly' || sec === 'ensamblaje') newPath = '/checklists/ensamblaje';
    else if (sec === 'all' || sec === 'todos') newPath = '/checklists/todos';
    else if (sec === 'grouped' || sec === 'secciones') newPath = '/checklists';
  }

  // Preservar query params
  const currentSearch = new URLSearchParams(window.location.search);
  const query = new URLSearchParams();

  if (tabId === 'checklists') {
    const model = subParams.model || currentSearch.get('model');
    if (model) query.set('model', model);
  }

  if (tabId === 'matrix' || tabId === 'audit' || tabId === 'operator') {
    const order = subParams.order || currentSearch.get('order');
    if (order) query.set('order', order);
  }

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const targetUrl = `${newPath}${queryString}`;

  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (currentUrl !== targetUrl) {
    if (replace) {
      window.history.replaceState({ tab: tabId, subParams }, '', targetUrl);
    } else {
      window.history.pushState({ tab: tabId, subParams }, '', targetUrl);
    }
  }
}

/**
 * Extrae parámetros contextuales de la URL actual (modelo, apartado/sección, orden)
 * Compatible tanto con History API (pathname) como con Hash routing
 */
export function getRouteParams() {
  if (typeof window === 'undefined') return { model: null, order: null, section: null };

  const pathname = (window.location.pathname || '').toLowerCase();
  const hash = (window.location.hash || '').toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  let hashQuery = null;
  if (hash.includes('?')) {
    try {
      hashQuery = new URLSearchParams(hash.substring(hash.indexOf('?')));
    } catch (_) {}
  }

  let section = null;
  if (pathname.includes('/limpieza') || hash.includes('/limpieza')) section = 'CLEANING';
  else if (pathname.includes('/ensamblaje') || hash.includes('/ensamblaje')) section = 'ASSEMBLY';
  else if (pathname.includes('/todos') || hash.includes('/todos')) section = 'ALL';
  else {
    const rawSec = searchParams.get('seccion') || searchParams.get('section') || hashQuery?.get('seccion') || hashQuery?.get('section');
    if (rawSec) {
      const s = rawSec.toUpperCase();
      if (['CLEANING', 'ASSEMBLY', 'ALL', 'GROUPED'].includes(s)) section = s;
      else if (s === 'LIMPIEZA') section = 'CLEANING';
      else if (s === 'ENSAMBLAJE') section = 'ASSEMBLY';
      else if (s === 'TODOS') section = 'ALL';
      else if (s === 'SECCIONES') section = 'GROUPED';
    }
  }

  const model = searchParams.get('model') || searchParams.get('modelo') || hashQuery?.get('model') || hashQuery?.get('modelo') || null;
  const order = searchParams.get('order') || searchParams.get('orden') || hashQuery?.get('order') || hashQuery?.get('orden') || null;

  return {
    model: model ? decodeURIComponent(model) : null,
    order: order ? decodeURIComponent(order) : null,
    section: section
  };
}
