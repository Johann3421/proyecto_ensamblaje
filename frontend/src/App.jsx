import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import LoginPage from './LoginPage';
import {
  Check, CheckCircle, AlertTriangle, AlertCircle, Plus, Edit, Download,
  Upload, Loader2, Play, Coffee, Inbox, Shield, Cpu, RefreshCw, X,
  Columns, Grid, ShieldCheck, FileText, PlusCircle, CheckSquare,
  Image as ImageIcon, PlayCircle, ArrowRightCircle, Search, Menu,
  ChevronDown, ChevronUp, LayoutDashboard, ClipboardList, Settings,
  Wrench, Eye, Users, UserPlus, Trash2, RotateCcw, Trash, UserCheck, Sparkles, Camera, Layers
} from 'lucide-react';

const API_BASE = '/api';

const Badge = ({ children, variant = "neutral", className = "" }) => {
  const styles = {
    neutral: "bg-gray-100 text-gray-700 border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[variant] || styles.neutral} ${className}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

// =============================================
// COMPRESOR DE IMÁGENES EN CLIENTE (ZERO SERVER SATURATION)
// Convierte fotos pesadas (8-15MB) a WebP/JPEG ultra-ligero (60-100KB) en milisegundos
// =============================================
async function compressImageToOptimized(source, maxWidth = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const processImage = (img) => {
      try {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl || !dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    if (typeof source === "string") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => processImage(img);
      img.onerror = () => reject(new Error("No se pudo procesar la imagen capturada"));
      img.src = source;
    } else if (source instanceof File || source instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processImage(img);
        img.onerror = () => reject(new Error("No se pudo cargar el archivo"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Error leyendo el archivo"));
      reader.readAsDataURL(source);
    } else {
      reject(new Error("Formato de imagen no soportado"));
    }
  });
}

// =============================================
// HELPERS PARA GESTIÓN Y FORMATEO DE PASOS
// =============================================
function formatStepNumbersRange(nums) {
  if (!nums) return "Sin pasos";
  const clean = (Array.isArray(nums) ? nums : String(nums).split(/[,;\s]+/))
    .map(x => parseInt(x, 10))
    .filter(n => !isNaN(n) && n > 0);
  if (clean.length === 0) return "Sin pasos";
  const sorted = [...new Set(clean)].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `P${start}` : `P${start}–${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `P${start}` : `P${start}–${end}`);
  return ranges.join(", ");
}

function parseStepNumbersInput(inputStr, maxLimit = 500) {
  if (!inputStr) return [];
  const parts = String(inputStr).split(/[,;\s]+/);
  const result = new Set();
  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const rangeMatch = trimmed.match(/^(\d+)(?:-|\.\.)(\d+)$/);
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10);
      const to = parseInt(rangeMatch[2], 10);
      const min = Math.min(from, to);
      const max = Math.min(Math.max(from, to), maxLimit);
      for (let i = min; i <= max; i++) {
        if (i >= 1) result.add(i);
      }
    } else if (/^\d+$/.test(trimmed)) {
      const n = parseInt(trimmed, 10);
      if (n >= 1 && n <= maxLimit) result.add(n);
    }
  });
  return Array.from(result).sort((a, b) => a - b);
}

// =============================================
// MODAL LIGHTBOX / VISOR DE FOTO DE EVIDENCIA
// =============================================
function PhotoPreviewModal({ photo, onClose }) {
  if (!photo) return null;
  const { url, title, subtitle, user_name, timestamp } = photo;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-4 fade-in" onClick={onClose}>
      <div 
        className="bg-slate-900 text-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-950 px-4 py-3 flex justify-between items-center border-b border-slate-800">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white truncate">{title || "Evidencia Fotográfica"}</h3>
            </div>
            {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 bg-black p-2 flex items-center justify-center min-h-[260px] overflow-hidden">
          <img 
            src={url} 
            alt="Evidencia fotográfica" 
            className="max-h-[60vh] sm:max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-md" 
          />
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 text-slate-300">
            {user_name && (
              <span>Verificado por: <strong className="text-emerald-400 font-semibold">{user_name}</strong></span>
            )}
            {timestamp && (
              <span className="text-slate-400 font-mono text-[11px]">{new Date(timestamp).toLocaleString("es-PE")}</span>
            )}
          </div>
          <div className="flex gap-2">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              download 
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
            </a>
            <button 
              onClick={onClose} 
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// APP PRINCIPAL
// =============================================
export default function App() {
  // ——— Auth State ———
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState({ id: "ADM-01", name: "Ing. Carlos Mendoza", role: "ADMIN", avatar: "CM" });
  const [activeTab, setActiveTab] = useState("matrix");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [models, setModels] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [matrixData, setMatrixData] = useState(null);
  const [notification, setNotification] = useState(null);
  const [operatorWorkspace, setOperatorWorkspace] = useState(null);
  const [activeMediaModal, setActiveMediaModal] = useState(null);
  const [activeIssueModal, setActiveIssueModal] = useState(null);
  const [activePhotoPreview, setActivePhotoPreview] = useState(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [selectedUnitDetail, setSelectedUnitDetail] = useState(null);
  const [addUnitsModalOpen, setAddUnitsModalOpen] = useState(false);
  const [resetOrderModalOpen, setResetOrderModalOpen] = useState(false);
  const [deleteOrderModalOpen, setDeleteOrderModalOpen] = useState(false);
  const [editOrderModalOpen, setEditOrderModalOpen] = useState(false);
  const [operatorStationFilter, setOperatorStationFilter] = useState(null);

  // ——— Auth: Check saved token on mount ———
  useEffect(() => {
    const savedToken = localStorage.getItem('qc_token');
    const savedUser = localStorage.getItem('qc_user');
    if (savedToken && savedUser) {
      // Verify token is still valid
      fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
        .then(r => {
          if (r.ok) return r.json();
          throw new Error('Token expired');
        })
        .then(user => {
          setAuthToken(savedToken);
          setCurrentUser(user);
          setIsAuthenticated(true);
          setActiveTab(user.role === 'OPERATOR' ? 'operator' : 'matrix');
        })
        .catch(() => {
          localStorage.removeItem('qc_token');
          localStorage.removeItem('qc_user');
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  const handleLogin = (token, user) => {
    setAuthToken(token);
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveTab(user.role === 'OPERATOR' ? 'operator' : 'matrix');
  };

  const handleLogout = () => {
    localStorage.removeItem('qc_token');
    localStorage.removeItem('qc_user');
    setAuthToken(null);
    setIsAuthenticated(false);
    setCurrentUser({ id: '', name: '', role: '', avatar: '' });
    setOrders([]);
    setMatrixData(null);
    setOperatorWorkspace(null);
  };

  // Helper to add auth headers to fetch calls
  const authHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  };

  const notify = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadInitialData = async () => {
    try {
      const [resUsers, resModels, resOrders] = await Promise.all([
        fetch(`${API_BASE}/users`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/models`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/orders`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      if (Array.isArray(resUsers) && resUsers.length > 0) {
        setUsers(resUsers);
        // Si el usuario actual está en la lista, sincronizar su nombre
        const currentUpdated = resUsers.find(u => u.id === currentUser?.id);
        if (currentUpdated) {
          setCurrentUser(currentUpdated);
          localStorage.setItem('qc_user', JSON.stringify(currentUpdated));
        }
      }
      if (Array.isArray(resModels)) setModels(resModels);
      if (Array.isArray(resOrders) && resOrders.length > 0) {
        setOrders(resOrders);
        if (!selectedOrder || !resOrders.some(o => o.order_id === selectedOrder)) {
          setSelectedOrder(resOrders[0].order_id);
        }
      }
    } catch (err) {
      console.warn("API load error:", err);
    }
  };

  const loadMatrixData = () => {
    if (selectedOrder) {
      fetch(`${API_BASE}/orders/${selectedOrder}/matrix`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setMatrixData(data); })
        .catch(err => console.error("Error matriz:", err));
    }
  };

  const loadOperatorWorkspace = (unitNumber = null, orderId = null, stationNumber = null) => {
    if (!currentUser?.id) return;
    const params = new URLSearchParams();
    if (unitNumber) params.append("unit_number", unitNumber);
    if (orderId) params.append("order_id", orderId);
    else if (selectedOrder) params.append("order_id", selectedOrder);

    const targetStation = stationNumber !== null ? stationNumber : operatorStationFilter;
    if (targetStation) params.append("station_number", targetStation);

    const qs = params.toString() ? `?${params.toString()}` : "";
    fetch(`${API_BASE}/operator/${currentUser.id}/station${qs}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setOperatorWorkspace(data);
          if (data.order?.order_id && data.order.order_id !== selectedOrder) {
            setSelectedOrder(data.order.order_id);
          }
        }
      })
      .catch(err => console.error("Error workspace operario:", err));
  };

  useEffect(() => { if (isAuthenticated) loadInitialData(); }, [isAuthenticated]);
  useEffect(() => { loadMatrixData(); }, [selectedOrder]);
  useEffect(() => {
    if (activeTab === "operator" || currentUser.role === "OPERATOR") {
      loadOperatorWorkspace(null, selectedOrder);
    }
  }, [activeTab, currentUser, selectedOrder]);

  // User change is no longer needed - auth handles this
  // Kept for backward compatibility with technicians panel
  const handleUserChange = (userId) => {
    // Only admin can switch to view other users' perspectives
    if (currentUser.role !== 'ADMIN') return;
    const u = users.find(x => x.id === userId);
    if (u) {
      setMobileMenuOpen(false);
    }
  };

  const navigate = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const ADMIN_TABS = [
    { id: "matrix", label: "Pipeline", shortLabel: "Pipeline", icon: Grid },
    { id: "create-order", label: "Nueva Orden", shortLabel: "Orden", icon: PlusCircle },
    { id: "technicians", label: "Técnicos", shortLabel: "Técnicos", icon: Users },
    { id: "checklists", label: "Checklists", shortLabel: "Checks", icon: FileText },
    { id: "audit", label: "Auditoría", shortLabel: "Auditor", icon: ShieldCheck },
  ];

  const SUPERVISOR_TABS = [
    { id: "matrix", label: "Pipeline", shortLabel: "Pipeline", icon: Grid },
    { id: "operator", label: "Supervisión & V°B°", shortLabel: "Supervisión", icon: ShieldCheck },
    { id: "checklists", label: "Checklists", shortLabel: "Checks", icon: FileText },
    { id: "audit", label: "Auditoría", shortLabel: "Auditor", icon: ShieldCheck },
  ];

  const isSupportUser = currentUser?.id === "OP-106" || (currentUser?.email || "").includes("apoyo");

  const OPERATOR_TABS = [
    { id: "operator", label: isSupportUser ? "Puesto de Apoyo" : "Mi Estación", shortLabel: isSupportUser ? "Apoyo" : "Trabajo", icon: CheckSquare },
  ];

  const tabs = currentUser.role === "ADMIN"
    ? ADMIN_TABS
    : currentUser.role === "SUPERVISOR"
      ? SUPERVISOR_TABS
      : OPERATOR_TABS;

  // ——— Auth Loading Screen ———
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-3 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" style={{ borderWidth: '3px' }} />
          <p className="text-slate-400 text-sm mt-4">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // ——— Show Login Page if not authenticated ———
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f3f2f1]">
      {/* ——— HEADER ——— */}
      <header className="bg-[#0078d4] text-white shadow-md flex-shrink-0 z-40">
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-white px-2 py-1 rounded text-[#0078d4] font-black text-sm tracking-wider flex-shrink-0">
              KENYA
            </div>
            <div className="hidden sm:block h-5 w-px bg-blue-300/40"></div>
            <h1 className="hidden sm:flex font-semibold text-sm tracking-wide items-center gap-2">
              <span>Control de Calidad</span>
              <span className="text-xs bg-blue-900/40 px-2 py-0.5 rounded text-blue-100 font-mono">
                V2.0
              </span>
            </h1>
          </div>

          {/* Nav Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === tab.id ? "bg-white/20 text-white font-semibold" : "hover:bg-white/10 text-blue-100"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Controles derecha */}
          <div className="flex items-center gap-2">
            {/* User info badge */}
            <div className="flex items-center gap-1.5 bg-blue-900/40 px-2 py-1 rounded-lg border border-blue-400/30 text-xs">
              <span className="hidden sm:inline text-blue-200">
                {currentUser.role === 'ADMIN' ? '👑' : currentUser.role === 'SUPERVISOR' ? '🛡️' : '🔧'}
              </span>
              <span className="text-white font-medium text-xs max-w-[120px] sm:max-w-none truncate">
                {currentUser.name}
              </span>
              {currentUser.role === 'SUPERVISOR' && (
                <span className="text-[10px] bg-amber-400/30 text-amber-200 px-1.5 py-0.5 rounded font-bold border border-amber-400/40 ml-0.5">
                  Supervisor
                </span>
              )}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-white text-[#0078d4] font-bold text-xs flex items-center justify-center shadow flex-shrink-0">
              {currentUser.avatar || (currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'U')}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-white/20 transition text-blue-100 hover:text-white"
              title="Cerrar sesión"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>

            {/* Botón menú mobile */}
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-white/20 transition"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Dropdown Menú Mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#005a9e] border-t border-blue-500/50 px-3 py-2 space-y-1 fade-in z-50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition touch-target ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white font-semibold"
                    : "text-blue-100 hover:bg-white/10"
                }`}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* NOTIFICACIÓN FLOTANTE */}
      {notification && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 fade-in w-[calc(100%-2rem)] max-w-md ${
          notification.type === "success"
            ? "bg-emerald-600 text-white border-emerald-700"
            : "bg-rose-600 text-white border-rose-700"
        }`}>
          {notification.type === "success" ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{notification.message}</span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {activeTab === "matrix" && (
            <PipelineMatrixView
              matrixData={matrixData}
              orders={orders}
              selectedOrder={selectedOrder}
              setSelectedOrder={setSelectedOrder}
              onOpenEmergency={() => setEmergencyModalOpen(true)}
              onSelectUnit={(unit) => setSelectedUnitDetail(unit)}
              onRefresh={() => { loadInitialData(); loadMatrixData(); }}
              onOpenAddUnits={() => setAddUnitsModalOpen(true)}
              onOpenResetOrder={() => setResetOrderModalOpen(true)}
              onOpenDeleteOrder={() => setDeleteOrderModalOpen(true)}
              onOpenEditOrder={() => setEditOrderModalOpen(true)}
            />
          )}
          {activeTab === "create-order" && (
            <CreateOrderView
              models={models}
              users={users}
              onSuccess={(orderId) => {
                notify("¡Orden y línea de producción creada exitosamente!");
                loadInitialData();
                setSelectedOrder(orderId);
                navigate("matrix");
              }}
              onRefreshModels={loadInitialData}
              notify={notify}
            />
          )}
          {activeTab === "technicians" && (
            <TechniciansManagementView
              users={users}
              onRefreshUsers={() => {
                loadInitialData();
                loadMatrixData();
                loadOperatorWorkspace();
              }}
              notify={notify}
            />
          )}
          {activeTab === "checklists" && (
            <ChecklistEditorView
              models={models}
              notify={notify}
              onRefreshModels={loadInitialData}
            />
          )}
          {activeTab === "audit" && (
            <AuditLogsView 
              selectedOrder={selectedOrder} 
              orders={orders} 
              onPreviewPhoto={(photo) => setActivePhotoPreview(photo)} 
            />
          )}
          {activeTab === "operator" && (
            <OperatorWorkspaceView
              workspace={operatorWorkspace}
              currentUser={currentUser}
              onOpenMedia={(item) => setActiveMediaModal(item)}
              onOpenIssue={(unit, step) => setActiveIssueModal({ unit, step })}
              onPreviewPhoto={(photo) => setActivePhotoPreview(photo)}
              onSelectUnit={(unitNum) => loadOperatorWorkspace(unitNum, selectedOrder, operatorStationFilter)}
              onSelectOrder={(ordId) => {
                setSelectedOrder(ordId);
                loadOperatorWorkspace(null, ordId, operatorStationFilter);
              }}
              onSelectStation={(stNum) => {
                setOperatorStationFilter(stNum);
                loadOperatorWorkspace(null, selectedOrder, stNum);
              }}
              onRefresh={() => loadOperatorWorkspace(null, selectedOrder, operatorStationFilter)}
              notify={notify}
            />
          )}
        </div>
      </main>

      {/* ——— BOTTOM NAV MOBILE ——— */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-40 flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 touch-target transition-colors ${
              activeTab === tab.id ? "text-[#0078d4]" : "text-gray-500"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">{tab.shortLabel}</span>
          </button>
        ))}
      </nav>

      {/* MODALES */}
      {activeMediaModal && <MediaViewerModal item={activeMediaModal} onClose={() => setActiveMediaModal(null)} />}
      {activePhotoPreview && <PhotoPreviewModal photo={activePhotoPreview} onClose={() => setActivePhotoPreview(null)} />}
      {activeIssueModal && (
        <IssueReportModal
          data={activeIssueModal}
          currentUser={currentUser}
          orderId={operatorWorkspace?.order?.order_id}
          stationNumber={operatorWorkspace?.assignment?.station_number}
          onPreviewPhoto={(photo) => setActivePhotoPreview(photo)}
          onClose={() => setActiveIssueModal(null)}
          onSuccess={() => {
            notify("Incidencia registrada y PC bloqueada para revisión", "danger");
            setActiveIssueModal(null);
            loadOperatorWorkspace();
          }}
        />
      )}
      {emergencyModalOpen && matrixData && (
        <EmergencyReassignModal
          order={matrixData.order}
          stations={matrixData.stations}
          operators={users.filter(u => u.role === "OPERATOR")}
          onClose={() => setEmergencyModalOpen(false)}
          onSuccess={(msg) => {
            notify(msg);
            setEmergencyModalOpen(false);
            loadInitialData();
          }}
        />
      )}
      {addUnitsModalOpen && matrixData && (
        <AddUnitsModal
          order={matrixData.order}
          onClose={() => setAddUnitsModalOpen(false)}
          onSuccess={(msg) => {
            notify(msg);
            setAddUnitsModalOpen(false);
            loadMatrixData();
          }}
        />
      )}
      {resetOrderModalOpen && matrixData && (
        <ResetOrderModal
          order={matrixData.order}
          onClose={() => setResetOrderModalOpen(false)}
          onSuccess={(msg) => {
            notify(msg);
            setResetOrderModalOpen(false);
            loadMatrixData();
          }}
        />
      )}
      {deleteOrderModalOpen && matrixData && (
        <DeleteOrderModal
          order={matrixData.order}
          onClose={() => setDeleteOrderModalOpen(false)}
          onSuccess={(msg) => {
            notify(msg);
            setDeleteOrderModalOpen(false);
            loadInitialData();
          }}
        />
      )}
      {editOrderModalOpen && matrixData && (
        <EditOrderModal
          order={matrixData.order}
          stations={matrixData.stations}
          models={models}
          users={users}
          onClose={() => setEditOrderModalOpen(false)}
          onSuccess={(msg) => {
            notify(msg || "Orden actualizada exitosamente");
            setEditOrderModalOpen(false);
            loadInitialData();
            loadMatrixData();
          }}
          notify={notify}
        />
      )}
      {selectedUnitDetail && matrixData && (
        <UnitDetailModal
          unit={selectedUnitDetail}
          order={matrixData.order}
          stations={matrixData.stations}
          issues={matrixData.issues || []}
          currentUser={currentUser}
          onPreviewPhoto={(photo) => setActivePhotoPreview(photo)}
          onClose={() => setSelectedUnitDetail(null)}
          onSuccess={(msg) => {
            notify(msg);
            setSelectedUnitDetail(null);
            loadMatrixData();
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

// =============================================
// 1. MATRIZ DE PIPELINE
// =============================================
function PipelineMatrixView({ matrixData, orders, selectedOrder, setSelectedOrder, onOpenEmergency, onSelectUnit, onRefresh, onOpenAddUnits, onOpenResetOrder, onOpenDeleteOrder, onOpenEditOrder }) {
  if (!matrixData || !matrixData.order) {
    return (
      <Card className="p-8 text-center mx-auto max-w-sm space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <div>
          <h3 className="text-sm font-bold text-gray-800">Conectando con el Pipeline...</h3>
          <p className="text-xs text-gray-500 mt-1">Obteniendo estado en tiempo real.</p>
        </div>
        <button onClick={onRefresh} className="text-xs bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold px-4 py-2 rounded-lg shadow inline-flex items-center gap-1.5 transition">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar Conexión</span>
        </button>
      </Card>
    );
  }

  const { order, stations = [], units = [], issues = [] } = matrixData;
  const total = units.length;
  const passed = units.filter(u => u.overall_status === "PASSED").length;
  const failed = units.filter(u => u.overall_status === "FAILED").length;
  const inProgress = units.filter(u => u.overall_status === "IN_PROGRESS").length;
  const pending = total - passed - failed - inProgress;
  const completionPercentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="space-y-4 fade-in">
      {/* Header de orden */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0078d4] flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-sm font-bold text-gray-900 truncate">{order.order_id}</h2>
                <Badge variant="info">{order.model_name}</Badge>
                {order.supervisor_name && (
                  <Badge variant="purple" className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    <span>Supervisor: {order.supervisor_name}</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {order.total_units} PCs · {order.total_stations} Estaciones {order.supervisor_name ? `· Sup: ${order.supervisor_name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {orders.length > 0 && (
              <select
                value={selectedOrder || ""}
                onChange={(e) => setSelectedOrder(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-gray-50 font-medium text-gray-700 touch-target"
              >
                {orders.map(o => (
                  <option key={o.order_id} value={o.order_id}>
                    {o.order_id} ({o.model_name})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={onOpenEditOrder}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-xs touch-target"
              title="Editar parámetros de la orden, modelo, supervisor y estaciones"
            >
              <Edit className="w-4 h-4 text-indigo-600" />
              <span>✏️ Editar Orden</span>
            </button>
            <button
              onClick={onOpenAddUnits}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-sm touch-target"
              title="Agregar PCs a esta orden"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar PC</span>
            </button>
            <button
              onClick={onOpenResetOrder}
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition touch-target"
              title="Reiniciar y limpiar todo el lote a Estación 1"
            >
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Limpiar </span>Lote
            </button>
            <button
              onClick={onOpenEmergency}
              className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 px-2.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition touch-target"
              title="Reasignación de emergencia de técnico"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="hidden md:inline">Reasignar</span>
            </button>
            <button
              onClick={onOpenDeleteOrder}
              className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition touch-target"
              title="Eliminar orden por completo"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span className="hidden lg:inline">Eliminar</span>
            </button>
            <button
              onClick={onRefresh}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition touch-target"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-l-4 border-l-emerald-600">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Completadas</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-600">{passed}</span>
            <span className="text-xs text-emerald-700 font-bold">{completionPercentage}%</span>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-amber-700 uppercase">En Proceso</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-amber-600">{inProgress}</span>
            <span className="text-xs text-amber-600">activas</span>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-rose-600">
          <p className="text-[10px] font-bold text-rose-700 uppercase">Con Falla</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-rose-600">{failed}</span>
            <span className="text-xs text-rose-600">{issues.length} tickets</span>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-gray-400">
          <p className="text-[10px] font-bold text-gray-500 uppercase">En Cola</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-gray-700">{pending}</span>
            <span className="text-xs text-gray-500">pendiente</span>
          </div>
        </Card>
      </div>

      {/* Barra progreso general */}
      <Card className="p-3">
        <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
          <span>Progreso del Lote</span>
          <span>{passed} / {total} PCs</span>
        </div>
        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </Card>

      {/* Tabla scroll horizontal en mobile */}
      <Card className="overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
            <Columns className="w-4 h-4 text-blue-600" />
            <span>Matriz de Trazabilidad</span>
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>OK</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse"></span>Activo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>Falla</span>
          </div>
        </div>

        <div className="table-mobile-scroll">
          <table className="w-full text-left border-collapse text-xs min-w-[480px]">
            <thead>
              <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <th className="py-2 px-3 font-bold sticky left-0 bg-gray-50 z-10 w-20">PC</th>
                {stations.map(st => (
                  <th key={st.station_number} className="py-2 px-3 font-bold border-l border-gray-200 whitespace-nowrap">
                    <div className="text-gray-800 font-semibold">E{st.station_number}</div>
                    <div className="text-[10px] text-gray-500 font-normal hidden sm:block truncate max-w-[100px]">
                      {st.user_name}
                    </div>
                  </th>
                ))}
                <th className="py-2 px-3 font-bold border-l border-gray-200 text-center w-24">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {units.map((unit) => {
                const isFinished = unit.overall_status === "PASSED";
                const isFailed = unit.overall_status === "FAILED";
                return (
                  <tr
                    key={unit.unit_number}
                    onClick={() => onSelectUnit(unit)}
                    className="hover:bg-blue-50/50 active:bg-blue-100 cursor-pointer transition"
                  >
                    <td className="py-2 px-3 font-bold text-gray-900 sticky left-0 bg-white z-10">
                      #{unit.unit_number.toString().padStart(2, '0')}
                    </td>
                    {stations.map(st => {
                      let state = "queue";
                      if (isFailed && unit.current_station === st.station_number) state = "failed";
                      else if (unit.current_station > st.station_number) state = "passed";
                      else if (unit.current_station === st.station_number && !isFinished) state = "active";

                      return (
                        <td key={st.station_number} className="py-2 px-2 border-l border-gray-200 text-center">
                          {state === "passed" && <Check className="w-4 h-4 text-emerald-600 mx-auto" />}
                          {state === "active" && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping mx-auto block"></span>}
                          {state === "failed" && <X className="w-4 h-4 text-rose-600 mx-auto" />}
                          {state === "queue" && <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 border-l border-gray-200 text-center">
                      {isFinished && <Badge variant="success">OK</Badge>}
                      {isFailed && <Badge variant="danger">Falla</Badge>}
                      {!isFinished && !isFailed && <Badge variant="warning">E{unit.current_station}</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Panel de Fallas con Fotos de Evidencia */}
      {issues.length > 0 && (
        <Card className="p-4 border-l-4 border-l-rose-600 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-gray-900">
                🚨 Fallas Reportadas en Producción ({issues.length})
              </h3>
            </div>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Evidencia Fotográfica
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {issues.map((iss, idx) => (
              <div
                key={idx}
                className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 space-y-2 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-xs font-black text-rose-900 bg-rose-200 px-1.5 py-0.5 rounded mr-1">
                      PC #{iss.unit_number.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{iss.issue_title}</span>
                  </div>
                  <Badge variant="danger">{iss.severity}</Badge>
                </div>

                {iss.description && (
                  <p className="text-[11px] text-gray-700 leading-tight line-clamp-2">{iss.description}</p>
                )}

                {iss.photo_url && (
                  <a
                    href={iss.photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative rounded-lg overflow-hidden border border-rose-300 group"
                  >
                    <img
                      src={iss.photo_url}
                      alt="Evidencia fotográfica"
                      className="w-full h-28 object-cover group-hover:scale-105 transition"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold backdrop-blur-sm">
                      📸 Ver Foto Completa
                    </span>
                  </a>
                )}

                <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-rose-200">
                  <span>E{iss.station_number} · <strong>{iss.reported_by}</strong></span>
                  <span className="font-semibold text-rose-700">{iss.status === 'OPEN' ? '🔴 ABIERTO' : '🟢 RESUELTO'}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================
// MODAL SELECTOR VISUAL DE PASOS (PICKER INTERACTIVO)
// Permite agregar/quitar cualquier paso individual o rangos a voluntad
// =============================================
function StepPickerModal({
  isOpen,
  onClose,
  stationIdx,
  station,
  modelSteps,
  allStations,
  onToggleStep,
  onAddStepRange,
  onClearStationSteps,
  onClaimAllFreeSteps
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");

  if (!isOpen || !station) return null;

  const currentStepNumbers = new Set(station.step_numbers || []);
  const totalSteps = modelSteps.length || 0;

  // Mapa de pasos asignados a cada estación
  const stepOwnerMap = {};
  (allStations || []).forEach((st, idx) => {
    (st.step_numbers || []).forEach(num => {
      stepOwnerMap[num] = { stationIdx: idx, stationNumber: st.station_number, stationName: st.station_name };
    });
  });

  const filteredSteps = (modelSteps || []).filter(s => {
    const term = searchTerm.toLowerCase();
    return s.step_number.toString().includes(term) ||
           (s.operation && s.operation.toLowerCase().includes(term)) ||
           (s.description && s.description.toLowerCase().includes(term));
  });

  const handleApplyRange = (e) => {
    e.preventDefault();
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (!isNaN(from) && !isNaN(to) && from >= 1 && to >= from) {
      onAddStepRange(stationIdx, from, to);
      setRangeFrom("");
      setRangeTo("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header del Modal */}
        <div className="bg-[#0078d4] text-white p-4 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {station.station_number}
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold truncate">
                Asignar Pasos a Estación {station.station_number}: {station.station_name}
              </h3>
              <p className="text-[11px] text-blue-100 truncate">
                Técnico: <strong>{station.user_name}</strong> · Asignados: <strong className="text-white">{currentStepNumbers.size} pasos</strong> ({formatStepNumbersRange(Array.from(currentStepNumbers))})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg touch-target flex items-center justify-center flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Herramientas de filtro y rangos */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-2.5 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar por número o nombre de operación (ej: 9, pasta, BIOS)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            {/* Asignar Rango Rápido */}
            <form onSubmit={handleApplyRange} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-600 whitespace-nowrap">Rango:</span>
              <span className="text-[10px] text-gray-400">De</span>
              <input
                type="number"
                min="1"
                max={totalSteps}
                placeholder="17"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="w-12 text-center p-1 text-xs font-bold border border-gray-200 rounded focus:border-blue-500"
              />
              <span className="text-[10px] text-gray-400">A</span>
              <input
                type="number"
                min="1"
                max={totalSteps}
                placeholder="31"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="w-12 text-center p-1 text-xs font-bold border border-gray-200 rounded focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition flex-shrink-0"
              >
                + Asignar
              </button>
            </form>
          </div>

          {/* Acciones de selección masiva */}
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <span className="text-[11px] text-gray-500">
              💡 Toca cualquier paso para <strong>asignarlo</strong> o <strong>quitarlo</strong>. Si pertenece a otra estación, se transferirá a esta.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onClaimAllFreeSteps(stationIdx)}
                className="text-[11px] text-blue-700 hover:underline font-bold"
              >
                + Asignar pasos libres
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => onClearStationSteps(stationIdx)}
                className="text-[11px] text-rose-600 hover:underline font-bold"
              >
                Vaciar estación
              </button>
            </div>
          </div>
        </div>

        {/* Lista interactiva de pasos */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredSteps.map(step => {
            const isAssignedToThis = currentStepNumbers.has(step.step_number);
            const otherOwner = !isAssignedToThis ? stepOwnerMap[step.step_number] : null;

            return (
              <div
                key={step.step_number}
                onClick={() => onToggleStep(stationIdx, step.step_number)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                  isAssignedToThis
                    ? "bg-blue-50/80 border-blue-400 shadow-xs hover:bg-blue-100/70"
                    : otherOwner
                      ? "bg-amber-50/40 border-amber-200 hover:bg-amber-100/40 opacity-85"
                      : "bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                {/* Badge número */}
                <div className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs ${
                  isAssignedToThis
                    ? "bg-blue-600 text-white"
                    : otherOwner
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-700 border border-gray-300"
                }`}>
                  #{step.step_number}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-bold truncate ${isAssignedToThis ? "text-blue-950" : "text-gray-900"}`}>
                      {step.operation}
                    </h4>

                    {/* Estado y Acción */}
                    {isAssignedToThis ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Asignado a E{station.station_number}</span>
                        <span className="text-rose-600 font-extrabold ml-1 hover:text-rose-800" title="Quitar">✕</span>
                      </span>
                    ) : otherOwner ? (
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0" title="Transferir a esta estación">
                        <span>En E{otherOwner.stationNumber} ({otherOwner.stationName})</span>
                        <span className="text-blue-600 font-extrabold ml-1">→ Mover aquí</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-full flex-shrink-0 hover:bg-blue-100 hover:text-blue-700">
                        + Asignar libre
                      </span>
                    )}
                  </div>

                  {step.description && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                      {step.description}
                    </p>
                  )}
                  {step.qc_criteria && (
                    <span className="text-[10px] text-emerald-700 font-medium block mt-0.5 truncate">
                      Criterio QC: {step.qc_criteria}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredSteps.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-xs">
              No se encontraron pasos coincidentes con "{searchTerm}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-100 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs font-semibold text-gray-700">
            Total en Estación {station.station_number}: <strong className="text-blue-700">{currentStepNumbers.size} pasos</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs font-bold rounded-xl shadow-xs transition touch-target"
          >
            ✓ Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// 2. CREADOR DE ORDEN (CON SELECCIÓN Y GESTIÓN LIBRE DE PASOS)
// =============================================
function CreateOrderView({ models, users, onSuccess, onRefreshModels, notify }) {
  const [modelName, setModelName] = useState(models[0]?.name || "PROWORK");
  const [orderId, setOrderId] = useState(`ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [partNumber, setPartNumber] = useState("90MB0YZ0-M0EAY0");
  const [totalUnits, setTotalUnits] = useState(50);
  const [supervisorId, setSupervisorId] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [stationCount, setStationCount] = useState(5);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [modelSteps, setModelSteps] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [quickInputs, setQuickInputs] = useState({});
  const [visualPickerStation, setVisualPickerStation] = useState(null);
  const [createModelModalOpen, setCreateModelModalOpen] = useState(false);
  const [populatingSteps, setPopulatingSteps] = useState(false);

  const loadModelSteps = useCallback((mName) => {
    fetch(`${API_BASE}/models/${mName}/checklist`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setModelSteps(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadModelSteps(modelName);
  }, [modelName, loadModelSteps]);

  const handlePopulateStandardSteps = async (targetModel) => {
    try {
      setPopulatingSteps(true);
      const res = await fetch(`${API_BASE}/models/${targetModel}/populate-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "STANDARD", mode: "APPEND_MISSING" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al cargar plantilla");
      notify?.(data.message || `52 pasos cargados para ${targetModel}`, "success");
      loadModelSteps(targetModel);
      onRefreshModels?.();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setPopulatingSteps(false);
    }
  };

  // Función para calcular la distribución equitativa de pasos
  const calculateEqualDistribution = useCallback((numStations, stepsList) => {
    const totalSteps = (stepsList || []).length || 52;
    const baseCount = Math.floor(totalSteps / numStations);
    const remainder = totalSteps % numStations;
    let currentStart = 1;
    const result = [];

    for (let i = 0; i < numStations; i++) {
      const extra = i + 1 <= remainder ? 1 : 0;
      const count = baseCount + extra;
      const currentEnd = currentStart + count - 1;
      const stSteps = [];
      for (let s = currentStart; s <= currentEnd; s++) {
        stSteps.push(s);
      }
      result.push(stSteps);
      currentStart = currentEnd + 1;
    }
    return result;
  }, []);

  // Inicializar estaciones cuando cambia la cantidad, usuarios o el modelo
  useEffect(() => {
    const defaultNames = [
      "Chasis, Montaje y Placas",
      "Protecciones, Discos y GPU",
      "Limpieza Intermedia y BIOS",
      "Personalización, Software y Serie",
      "Stickers, Limpieza Final y Embalaje"
    ];
    const distribution = calculateEqualDistribution(stationCount, modelSteps);

    const initial = Array.from({ length: stationCount }, (_, i) => {
      const op = users[i % users.length] || { id: `OP-${101 + i}`, name: `Operario ${i + 1}` };
      const isCleaning = stationCount >= 2 && (i === stationCount - 1 || i === Math.floor(stationCount / 2));
      return {
        station_number: i + 1,
        user_id: op.id,
        user_name: op.name,
        secondary_user_id: "",
        secondary_user_name: "",
        station_name: defaultNames[i] || `Estación ${i + 1}`,
        is_cleaning_station: isCleaning,
        station_type: isCleaning ? "CLEANING" : "ASSEMBLY",
        step_numbers: distribution[i] || []
      };
    });
    setSelectedOperators(initial);
  }, [stationCount, users, modelSteps, calculateEqualDistribution]);

  // Manejador: Asignar / Quitar paso individual a una estación
  const handleToggleStep = (targetStationIdx, stepNum) => {
    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        const currentSteps = new Set(st.step_numbers || []);
        if (idx === targetStationIdx) {
          if (currentSteps.has(stepNum)) {
            currentSteps.delete(stepNum);
          } else {
            currentSteps.add(stepNum);
          }
        } else {
          // Si el paso fue asignado a la estación destino, removerlo de otras
          currentSteps.delete(stepNum);
        }
        return {
          ...st,
          step_numbers: Array.from(currentSteps).sort((a, b) => a - b)
        };
      });
    });
  };

  // Manejador: Asignar rango rápido a una estación
  const handleAddStepRange = (targetStationIdx, from, to) => {
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    const toAdd = new Set();
    for (let i = min; i <= max; i++) toAdd.add(i);

    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        const current = new Set(st.step_numbers || []);
        if (idx === targetStationIdx) {
          toAdd.forEach(n => current.add(n));
        } else {
          toAdd.forEach(n => current.delete(n));
        }
        return {
          ...st,
          step_numbers: Array.from(current).sort((a, b) => a - b)
        };
      });
    });
  };

  // Manejador: Agregar pasos por texto rápido (ej: "9" o "17-31" o "9, 17-31")
  const handleAddQuickSteps = (stationIdx) => {
    const inputStr = quickInputs[stationIdx];
    if (!inputStr) return;
    const parsed = parseStepNumbersInput(inputStr, modelSteps.length || 200);
    if (parsed.length === 0) return;

    const toAdd = new Set(parsed);
    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        const current = new Set(st.step_numbers || []);
        if (idx === stationIdx) {
          toAdd.forEach(n => current.add(n));
        } else {
          toAdd.forEach(n => current.delete(n));
        }
        return {
          ...st,
          step_numbers: Array.from(current).sort((a, b) => a - b)
        };
      });
    });
    setQuickInputs(prev => ({ ...prev, [stationIdx]: "" }));
  };

  // Manejador: Quitar un paso individual (desde las fichas de la tarjeta)
  const handleRemoveStep = (stationIdx, stepNum) => {
    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        if (idx !== stationIdx) return st;
        return {
          ...st,
          step_numbers: (st.step_numbers || []).filter(n => n !== stepNum)
        };
      });
    });
  };

  // Manejador: Vaciar todos los pasos de una estación
  const handleClearStationSteps = (stationIdx) => {
    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        if (idx !== stationIdx) return st;
        return { ...st, step_numbers: [] };
      });
    });
  };

  // Manejador: Asignar todos los pasos libres a una estación
  const handleClaimAllFreeSteps = (stationIdx) => {
    const total = modelSteps.length || 52;
    const allAssigned = new Set();
    selectedOperators.forEach(st => {
      (st.step_numbers || []).forEach(n => allAssigned.add(n));
    });
    const free = [];
    for (let i = 1; i <= total; i++) {
      if (!allAssigned.has(i)) free.push(i);
    }
    if (free.length === 0) return;

    setSelectedOperators(prev => {
      return prev.map((st, idx) => {
        if (idx !== stationIdx) return st;
        const current = new Set(st.step_numbers || []);
        free.forEach(n => current.add(n));
        return { ...st, step_numbers: Array.from(current).sort((a, b) => a - b) };
      });
    });
  };

  // Manejador: Auto-distribuir equitativamente con un solo clic
  const handleDistributeAuto = () => {
    const distribution = calculateEqualDistribution(stationCount, modelSteps);
    setSelectedOperators(prev => {
      return prev.map((st, idx) => ({
        ...st,
        step_numbers: distribution[idx] || []
      }));
    });
  };

  // Análisis de cobertura global
  const coverageAnalysis = useMemo(() => {
    const total = modelSteps.length || 52;
    const stepToStation = {};
    selectedOperators.forEach((st, idx) => {
      (st.step_numbers || []).forEach(num => {
        stepToStation[num] = { stationIdx: idx, stationNumber: st.station_number, stationName: st.station_name };
      });
    });

    const missing = [];
    for (let i = 1; i <= total; i++) {
      if (!stepToStation[i]) missing.push(i);
    }

    const assignedCount = Object.keys(stepToStation).length;
    const isComplete = missing.length === 0;

    return {
      total,
      assignedCount,
      missing,
      isComplete,
      stepToStation
    };
  }, [selectedOperators, modelSteps]);

  // Conteo de estaciones de limpieza
  const cleaningCount = useMemo(() => {
    return (selectedOperators || []).filter(s => s.is_cleaning_station).length;
  }, [selectedOperators]);
  const hasEnoughCleaning = cleaningCount >= 2;

  const STATION_COLORS = [
    { bg: "bg-blue-600", text: "text-blue-700", border: "border-blue-400", light: "bg-blue-50" },
    { bg: "bg-emerald-600", text: "text-emerald-700", border: "border-emerald-400", light: "bg-emerald-50" },
    { bg: "bg-amber-600", text: "text-amber-700", border: "border-amber-400", light: "bg-amber-50" },
    { bg: "bg-purple-600", text: "text-purple-700", border: "border-purple-400", light: "bg-purple-50" },
    { bg: "bg-cyan-600", text: "text-cyan-700", border: "border-cyan-400", light: "bg-cyan-50" },
    { bg: "bg-rose-600", text: "text-rose-700", border: "border-rose-400", light: "bg-rose-50" },
    { bg: "bg-indigo-600", text: "text-indigo-700", border: "border-indigo-400", light: "bg-indigo-50" },
    { bg: "bg-teal-600", text: "text-teal-700", border: "border-teal-400", light: "bg-teal-50" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cleaningCount < 2) {
      alert("⚠️ Regla de Calidad Obligatoria: La línea de producción debe incluir al menos 2 estaciones designadas para Limpieza.");
      return;
    }

    if (!coverageAnalysis.isComplete) {
      alert(`⚠️ Faltan ${coverageAnalysis.missing.length} pasos por asignar en la línea (${coverageAnalysis.missing.slice(0, 10).join(', ')}...). Por favor, asigna todos los pasos antes de iniciar.`);
      return;
    }

    try {
      setSubmitting(true);
      const payloadStations = selectedOperators.map((st) => {
        const nums = Array.from(new Set(st.step_numbers || [])).sort((a, b) => a - b);
        const sStart = nums.length > 0 ? Math.min(...nums) : 1;
        const sEnd = nums.length > 0 ? Math.max(...nums) : 1;
        return {
          station_number: st.station_number,
          user_id: st.user_id,
          user_name: st.user_name,
          secondary_user_id: st.secondary_user_id || null,
          secondary_user_name: st.secondary_user_name || null,
          station_name: st.station_name,
          is_cleaning_station: !!st.is_cleaning_station,
          station_type: st.station_type || (st.is_cleaning_station ? "CLEANING" : "ASSEMBLY"),
          start_step: sStart,
          end_step: sEnd,
          step_numbers: nums.join(",")
        };
      });

      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          model_name: modelName,
          part_number: partNumber,
          total_units: parseInt(totalUnits, 10),
          supervisor_id: supervisorId || null,
          supervisor_name: supervisorName || null,
          assignment_mode: "MANUAL",
          stations: payloadStations,
          created_by: "Admin / Supervisor QC"
        })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Error al crear orden"); }
      onSuccess(orderId);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 fade-in pb-8">
      <Card className="p-4">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-blue-600" />
          <span>Nueva Orden de Producción</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Parámetros del Lote */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Parámetros del Lote</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Modelo de PC</label>
                  <button
                    type="button"
                    onClick={() => setCreateModelModalOpen(true)}
                    className="text-[11px] font-bold text-[#0078d4] hover:text-[#106ebe] flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Nuevo Modelo</span>
                  </button>
                </div>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-medium touch-target"
                >
                  {models.map(m => (
                    <option key={m.name} value={m.name}>{m.name} ({m.step_count || 0} pasos)</option>
                  ))}
                </select>

                {/* Alerta de modelo sin pasos */}
                {modelSteps.length === 0 && (
                  <div className="mt-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950 fade-in">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold">El modelo "{modelName}" no tiene pasos registrados</p>
                        <p className="text-[11px] text-amber-800">Se necesitan pasos en el checklist para asignarlos a las estaciones.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePopulateStandardSteps(modelName)}
                        disabled={populatingSteps}
                        className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5 transition touch-target"
                      >
                        {populatingSteps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>⚡ Cargar 52 Pasos Estándar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">N° de Orden</label>
                <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} required className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-mono touch-target" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad de PCs</label>
                <input type="number" min="1" max="500" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} required className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-bold text-blue-700 touch-target" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">N° de Parte</label>
                <input type="text" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} required className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-mono touch-target" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Supervisor de Calidad Asignado</span>
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Rol: Validar y tomar fotos de cumplimiento
                  </span>
                </label>
                <select
                  value={supervisorId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setSupervisorId(sid);
                    const u = users.find(x => x.id === sid);
                    setSupervisorName(u ? u.name : "");
                  }}
                  className="w-full text-xs border border-purple-200 rounded-lg p-2.5 bg-purple-50/40 font-medium text-purple-900 touch-target"
                >
                  <option value="">-- Sin supervisor específico asignado --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.role === 'SUPERVISOR' ? '🛡️ ' : u.role === 'ADMIN' ? '👑 ' : '👤 '}{u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Configuración y Asignación de Estaciones */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Estaciones y Asignación de Pasos</h3>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  {modelSteps.length || 52} pasos totales
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-semibold">Cantidad de Puestos:</label>
                <select
                  value={stationCount}
                  onChange={(e) => setStationCount(parseInt(e.target.value, 10))}
                  className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-blue-600 touch-target shadow-2xs"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} estaciones</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Regla Obligatoria: 2 Estaciones de Limpieza */}
            {hasEnoughCleaning ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    <strong>Regla de Calidad OK:</strong> {cleaningCount} estaciones designadas para Limpieza obligatoria.
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md">
                  {cleaningCount} / 2 Requeridas
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Regla Obligatoria:</strong> Se requieren al menos <strong>2 estaciones de limpieza</strong>. Pulsa el botón <strong>"🧼 Limpieza"</strong> en las estaciones correspondientes.
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md flex-shrink-0">
                  {cleaningCount} / 2
                </span>
              </div>
            )}

            {/* MAPA VISUAL GLOBAL DE PASOS */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">
                    Mapa de Pasos ({coverageAnalysis.assignedCount} / {coverageAnalysis.total} asignados):
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Colores según estación. Haz clic en un paso para asignarlo o editarlo.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDistributeAuto}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-lg border border-blue-200 transition flex items-center gap-1"
                    title="Repartir todos los pasos equitativamente entre las estaciones"
                  >
                    <span>⚖️ Reparto Equitativo</span>
                  </button>
                </div>
              </div>

              {/* Botones de pasos en la tira general */}
              <div className="flex flex-wrap gap-1 p-2 bg-slate-50 rounded-xl border border-gray-200 max-h-36 overflow-y-auto">
                {Array.from({ length: coverageAnalysis.total }, (_, i) => i + 1).map(stepNum => {
                  const owner = coverageAnalysis.stepToStation[stepNum];
                  const color = owner ? STATION_COLORS[(owner.stationNumber - 1) % STATION_COLORS.length] : null;
                  const stepItem = modelSteps.find(s => s.step_number === stepNum);

                  return (
                    <button
                      key={stepNum}
                      type="button"
                      onClick={() => {
                        const targetIdx = owner ? owner.stationIdx : 0;
                        setVisualPickerStation(targetIdx);
                      }}
                      title={stepItem ? `#${stepNum}: ${stepItem.operation} (${owner ? `Asignado a E${owner.stationNumber}` : 'LIBRE'})` : `#${stepNum}`}
                      className={`w-7 h-7 rounded-lg font-bold text-[11px] flex items-center justify-center transition shadow-2xs ${
                        owner
                          ? `${color.bg} text-white hover:scale-110`
                          : "bg-white text-rose-600 border-2 border-dashed border-rose-400 hover:bg-rose-50 animate-pulse font-extrabold"
                      }`}
                    >
                      {stepNum}
                    </button>
                  );
                })}
              </div>

              {/* Alerta de pasos sin asignar si existen */}
              {!coverageAnalysis.isComplete && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span className="truncate">
                      <strong>Pasos sin asignar ({coverageAnalysis.missing.length}):</strong> {coverageAnalysis.missing.slice(0, 15).join(', ')}{coverageAnalysis.missing.length > 15 ? '...' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClaimAllFreeSteps(0)}
                    className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded flex-shrink-0"
                  >
                    Asignar a E1
                  </button>
                </div>
              )}
            </div>

            {/* TARJETAS DE ESTACIONES (SELECCIÓN Y RETIRO LIBRE DE PASOS) */}
            <div className="space-y-3">
              {selectedOperators.map((st, idx) => {
                const color = STATION_COLORS[idx % STATION_COLORS.length];
                const stepCount = (st.step_numbers || []).length;
                const rangeSummary = formatStepNumbersRange(st.step_numbers);

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition ${
                      st.is_cleaning_station ? "bg-emerald-50/40 border-emerald-300" : "bg-white border-gray-200"
                    } space-y-3 shadow-xs`}
                  >
                    {/* Fila 1: Estación, Nombre, Limpieza toggle y Resumen */}
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                        st.is_cleaning_station ? "bg-emerald-600 text-white" : `${color.bg} text-white`
                      }`}>
                        {st.station_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={st.station_name}
                          onChange={(e) => {
                            const copy = [...selectedOperators];
                            copy[idx].station_name = e.target.value;
                            setSelectedOperators(copy);
                          }}
                          placeholder="Nombre de estación"
                          className="w-full text-xs border border-gray-300 rounded-lg p-2 touch-target bg-white font-medium"
                        />
                      </div>

                      {/* Toggle Limpieza */}
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...selectedOperators];
                          const nextCleaning = !copy[idx].is_cleaning_station;
                          copy[idx].is_cleaning_station = nextCleaning;
                          copy[idx].station_type = nextCleaning ? "CLEANING" : "ASSEMBLY";
                          setSelectedOperators(copy);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1 flex-shrink-0 ${
                          st.is_cleaning_station
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                            : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                        title="Marcar como estación obligatoria de limpieza"
                      >
                        <span>🧼</span>
                        <span>{st.is_cleaning_station ? "Limpieza OK" : "+ Limpieza"}</span>
                      </button>

                      {/* Resumen de pasos asignados */}
                      <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 flex-shrink-0">
                        {stepCount}p ({rangeSummary})
                      </span>
                    </div>

                    {/* Fila 2: Selectores de 1er y 2do Técnico */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                            1er Técnico (Titular)
                          </label>
                          <select
                            value={st.user_id}
                            onChange={(e) => {
                              const copy = [...selectedOperators];
                              const u = users.find(u => u.id === e.target.value);
                              copy[idx].user_id = e.target.value;
                              copy[idx].user_name = u ? u.name : e.target.value;
                              setSelectedOperators(copy);
                            }}
                            className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white touch-target font-medium"
                          >
                            {users.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.role === 'SUPERVISOR' ? '🛡️ ' : ''}{u.name} ({u.id})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5 flex items-center justify-between">
                            <span>2do Técnico (Co-operario)</span>
                            <span className="text-[9px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded">Opcional</span>
                          </label>
                          <select
                            value={st.secondary_user_id || ""}
                            onChange={(e) => {
                              const copy = [...selectedOperators];
                              const val = e.target.value;
                              const u = users.find(x => x.id === val);
                              copy[idx].secondary_user_id = val || null;
                              copy[idx].secondary_user_name = u ? u.name : null;
                              setSelectedOperators(copy);
                            }}
                            className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white touch-target font-medium"
                          >
                            <option value="">-- Ninguno (1 solo técnico) --</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>
                                👥 {u.name} ({u.id})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setVisualPickerStation(idx)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>📋 Selector Visual</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearStationSteps(idx)}
                          className="p-1.5 bg-gray-50 hover:bg-rose-50 text-gray-500 hover:text-rose-600 border border-gray-200 rounded-lg text-xs transition flex-shrink-0"
                          title="Quitar todos los pasos de esta estación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Fila 3: Barra para agregar pasos por texto (ej: 9 o 17-31) */}
                    <div className="flex items-center gap-1.5 bg-gray-50 p-2 rounded-xl border border-gray-200">
                      <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap hidden sm:inline">
                        + Agregar paso(s):
                      </span>
                      <input
                        type="text"
                        placeholder="Escribe números o rangos, ej: 9 o 17-31 o 9, 17-31..."
                        value={quickInputs[idx] || ""}
                        onChange={(e) => setQuickInputs({ ...quickInputs, [idx]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddQuickSteps(idx);
                          }
                        }}
                        className="flex-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddQuickSteps(idx)}
                        className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg text-xs font-bold transition flex-shrink-0"
                      >
                        + Añadir
                      </button>
                    </div>

                    {/* Fila 4: Fichas / Chips interactivas de pasos (Quitar a voluntad con [✕]) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 px-0.5">
                        <span>Pasos en esta estación ({stepCount}):</span>
                        <span className="text-gray-400">Toca ✕ para quitar cualquier paso</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50/90 rounded-xl border border-dashed border-gray-300">
                        {st.step_numbers && st.step_numbers.length > 0 ? (
                          st.step_numbers.map(num => {
                            const stepInfo = modelSteps.find(s => s.step_number === num);
                            return (
                              <span
                                key={num}
                                title={stepInfo ? `Paso #${num}: ${stepInfo.operation} · Clic en ✕ para quitar` : `Paso #${num}`}
                                className="inline-flex items-center gap-1.5 bg-white hover:bg-rose-50 text-gray-800 hover:text-rose-700 pl-2 pr-1.5 py-1 rounded-lg text-xs font-bold border border-gray-200 hover:border-rose-300 shadow-2xs transition group"
                              >
                                <span className="text-blue-700 group-hover:text-rose-700">#{num}</span>
                                {stepInfo && (
                                  <span className="text-[10px] text-gray-500 group-hover:text-rose-600 max-w-[120px] truncate hidden sm:inline">
                                    {stepInfo.operation}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStep(idx, num)}
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-rose-600 transition"
                                  title={`Quitar paso #${num}`}
                                >
                                  ✕
                                </button>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-gray-400 italic py-1">
                            Sin pasos asignados. Escribe arriba (ej: 9 o 17-31) o abre el selector visual.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !hasEnoughCleaning || !coverageAnalysis.isComplete}
            className="w-full py-3.5 bg-[#0078d4] hover:bg-[#106ebe] disabled:bg-gray-400 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition touch-target disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : !hasEnoughCleaning ? (
              <span>⚠️ Mínimo 2 estaciones de limpieza requeridas</span>
            ) : !coverageAnalysis.isComplete ? (
              <span>⚠️ Faltan pasos por asignar ({coverageAnalysis.missing.length} libres)</span>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>Iniciar Línea de Producción</span>
              </>
            )}
          </button>
        </form>
      </Card>

      {/* Modal Selector Visual de Pasos */}
      {visualPickerStation !== null && selectedOperators[visualPickerStation] && (
        <StepPickerModal
          isOpen={true}
          onClose={() => setVisualPickerStation(null)}
          stationIdx={visualPickerStation}
          station={selectedOperators[visualPickerStation]}
          modelSteps={modelSteps}
          allStations={selectedOperators}
          onToggleStep={handleToggleStep}
          onAddStepRange={handleAddStepRange}
          onClearStationSteps={handleClearStationSteps}
          onClaimAllFreeSteps={handleClaimAllFreeSteps}
        />
      )}

      {/* Modal Crear Nuevo Modelo */}
      <CreateModelModal
        isOpen={createModelModalOpen}
        onClose={() => setCreateModelModalOpen(false)}
        onSuccess={(newModelName) => {
          onRefreshModels?.();
          setModelName(newModelName);
        }}
        existingModels={models}
        notify={notify}
      />
    </div>
  );
}

// =============================================
// 3. EDITOR DE CHECKLISTS
// =============================================
function ChecklistEditorView({ models, notify, onRefreshModels }) {
  const [selectedModel, setSelectedModel] = useState(models[0]?.name || "PROWORK");
  const [steps, setSteps] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [createModelModalOpen, setCreateModelModalOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);

  const loadDiagnostics = useCallback((mName) => {
    fetch(`${API_BASE}/models/${mName}/diagnostics`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDiagnostics(data); })
      .catch(() => {});
  }, []);

  const loadSteps = useCallback(() => {
    fetch(`${API_BASE}/models/${selectedModel}/checklist`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) setSteps(data);
        loadDiagnostics(selectedModel);
      })
      .catch(() => {});
  }, [selectedModel, loadDiagnostics]);

  useEffect(() => { loadSteps(); }, [selectedModel, loadSteps]);

  // Handler: Resecuenciar pasos 1 a N
  const handleResequence = async () => {
    try {
      setProcessingAction("resequence");
      const res = await fetch(`${API_BASE}/models/${selectedModel}/resequence`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al resecuenciar");
      notify?.(data.message || "Pasos renumerados consecutivamente", "success");
      loadSteps();
      onRefreshModels?.();
    } catch (err) {
      notify?.("Error: " + err.message, "danger");
    } finally {
      setProcessingAction(null);
    }
  };

  // Handler: Rellenar pasos faltantes de la plantilla estándar
  const handleFillMissing = async (mode = "APPEND_MISSING") => {
    try {
      setProcessingAction("fill");
      const res = await fetch(`${API_BASE}/models/${selectedModel}/populate-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "STANDARD", mode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al completar pasos");
      notify?.(data.message || "Pasos completados exitosamente", "success");
      loadSteps();
      onRefreshModels?.();
    } catch (err) {
      notify?.("Error: " + err.message, "danger");
    } finally {
      setProcessingAction(null);
    }
  };

  // Handler: Eliminar modelo completo
  const handleDeleteModel = async () => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente el modelo '${selectedModel}' y todos sus pasos asociados? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      setProcessingAction("delete-model");
      const res = await fetch(`${API_BASE}/models/${selectedModel}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al eliminar modelo");
      notify?.(data.message || `Modelo '${selectedModel}' eliminado`, "success");
      onRefreshModels?.();
      const remaining = models.filter(m => m.name !== selectedModel);
      if (remaining.length > 0) {
        setSelectedModel(remaining[0].name);
      }
    } catch (err) {
      notify?.("Error: " + err.message, "danger");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeleteAllSteps = async () => {
    try {
      setIsDeletingAll(true);
      const res = await fetch(`${API_BASE}/models/${selectedModel}/checklist`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al eliminar pasos");
      notify(data.message || `Se eliminaron todos los pasos del modelo ${selectedModel}`);
      setConfirmDeleteAll(false);
      loadSteps();
      onRefreshModels?.();
    } catch (err) {
      notify("Error: " + err.message);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteSingleStep = async (stepId, stepNum) => {
    if (!stepId) return;
    if (!window.confirm(`¿Eliminar el paso #${stepNum}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/models/${selectedModel}/checklist/${stepId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Error al eliminar el paso");
      notify(`Paso #${stepNum} eliminado`);
      loadSteps();
      onRefreshModels?.();
    } catch (err) {
      notify("Error: " + err.message);
    }
  };

  const filteredSteps = steps.filter(s =>
    (s.operation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.qc_criteria || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 fade-in">
      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500">Modelo:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-xs font-bold border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-blue-800 touch-target focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
              <Badge variant="info">{steps.length} Pasos</Badge>

              {/* Botón Nuevo Modelo */}
              <button
                type="button"
                onClick={() => setCreateModelModalOpen(true)}
                className="text-xs bg-[#0078d4] hover:bg-[#106ebe] text-white font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition touch-target"
                title="Crear un nuevo modelo de computadora"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nuevo Modelo</span>
              </button>

              {/* Botón Eliminar Modelo */}
              {models.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeleteModel}
                  disabled={processingAction === "delete-model"}
                  className="text-xs bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-700 border border-gray-200 hover:border-rose-300 px-2.5 py-2 rounded-lg flex items-center gap-1 transition touch-target"
                  title={`Eliminar permanentemente el modelo ${selectedModel}`}
                >
                  <Trash className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Eliminar Modelo</span>
                </button>
              )}
            </div>

            {/* Botón Borrar Todos los Pasos */}
            <button
              onClick={() => setConfirmDeleteAll(true)}
              disabled={steps.length === 0}
              className={`text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition touch-target ${
                steps.length === 0
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-sm active:scale-95"
              }`}
              title="Borrar permanentemente todos los pasos del modelo actual"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Borrar Todos los Pasos</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEditingItem({ model_name: selectedModel, step_number: steps.length + 1, operation: "", description: "", qc_criteria: "", media_url: "" })}
              className="text-xs bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition touch-target"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Paso</span>
            </button>

            {/* Botón Descargar Plantilla Excel */}
            <button
              onClick={() => window.open(`${API_BASE}/checklist/template?model_name=${selectedModel}`, "_blank")}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition touch-target"
              title="Descargar plantilla Excel oficial con ejemplos e instrucciones para importar"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Plantilla para Importar</span>
            </button>

            {/* Botón Importar Pasos */}
            <button
              onClick={() => setImportModalOpen(true)}
              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition touch-target"
              title="Subir archivo Excel o CSV usando la plantilla para cargar pasos"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Importar Pasos</span>
            </button>

            {/* Exportar Excel */}
            <button
              onClick={() => window.open(`${API_BASE}/models/${selectedModel}/export-excel`, "_blank")}
              disabled={steps.length === 0}
              className={`text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition touch-target ${
                steps.length === 0
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300"
              }`}
              title="Exportar pasos actuales a Excel"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar paso por operación, criterio o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* ASISTENTE DE PASOS FALTANTES Y CALIDAD */}
      {diagnostics && (
        <Card className={`p-4 border transition ${
          diagnostics.is_healthy
            ? "bg-emerald-50/40 border-emerald-300"
            : diagnostics.total_steps === 0
              ? "bg-blue-50/40 border-blue-300"
              : "bg-amber-50/50 border-amber-300"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className={`p-2 rounded-xl flex-shrink-0 ${
                diagnostics.is_healthy ? "bg-emerald-100 text-emerald-700" : diagnostics.total_steps === 0 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
              }`}>
                {diagnostics.is_healthy ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : diagnostics.total_steps === 0 ? (
                  <ClipboardList className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-gray-900">
                    Control de Calidad y Pasos: {selectedModel}
                  </h3>
                  {diagnostics.is_healthy ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Secuencia Completa y Continua</span>
                    </span>
                  ) : diagnostics.missing_in_sequence.length > 0 ? (
                    <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full">
                      ⚠️ {diagnostics.missing_in_sequence.length} pasos faltantes en secuencia
                    </span>
                  ) : diagnostics.total_steps === 0 ? (
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">
                      Modelo sin pasos
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                      {diagnostics.recommendations.length} sugerencia(s)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {diagnostics.total_steps} pasos registrados · {diagnostics.has_cleaning ? "🧼 Limpieza cubierta" : "⚠️ Requiere pasos de limpieza"} · {diagnostics.has_bios ? "✓ BIOS verificado" : "Falta BIOS"}
                </p>
              </div>
            </div>

            {/* Acciones de reparación directa */}
            <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
              {diagnostics.missing_in_sequence.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleResequence}
                    disabled={processingAction === "resequence"}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition touch-target"
                    title="Renumerar los pasos de 1 a N eliminando saltos numéricos"
                  >
                    {processingAction === "resequence" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>🛠️ Re-secuenciar (1 a N)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillMissing("APPEND_MISSING")}
                    disabled={processingAction === "fill"}
                    className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition touch-target"
                    title="Insertar los pasos estándar en los huecos faltantes"
                  >
                    {processingAction === "fill" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>⚡ Rellenar Pasos Faltantes</span>
                  </button>
                </>
              )}

              {diagnostics.total_steps === 0 && (
                <button
                  type="button"
                  onClick={() => handleFillMissing("REPLACE")}
                  disabled={processingAction === "fill"}
                  className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition touch-target"
                >
                  {processingAction === "fill" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>⚡ Cargar Plantilla Maestra (52 Pasos)</span>
                </button>
              )}

              {diagnostics.total_steps > 0 && diagnostics.total_steps < 52 && diagnostics.missing_in_sequence.length === 0 && (
                <button
                  type="button"
                  onClick={() => handleFillMissing("APPEND_MISSING")}
                  disabled={processingAction === "fill"}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition touch-target"
                  title="Incorporar pasos restantes del catálogo maestro de 52 pasos"
                >
                  {processingAction === "fill" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  <span>+ Añadir Pasos Estándar ({52 - diagnostics.total_steps})</span>
                </button>
              )}
            </div>
          </div>

          {/* Recomendaciones detalladas si existen */}
          {diagnostics.recommendations.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-gray-200/60 text-xs text-gray-700 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Diagnóstico de Calidad:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-600">
                {diagnostics.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Lista de pasos o Estado Vacío */}
      {steps.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-2">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Checklist vacío para {selectedModel}</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
            Este modelo actualmente no tiene pasos registrados. Puedes cargar la <strong>Plantilla Oficial</strong> completa de 52 pasos en un clic, descargar la plantilla Excel, o agregarlos manualmente uno por uno.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            <button
              onClick={() => handleFillMissing("REPLACE")}
              disabled={processingAction === "fill"}
              className="text-xs bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition touch-target"
            >
              {processingAction === "fill" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>⚡ Cargar 52 Pasos Estándar</span>
            </button>
            <button
              onClick={() => window.open(`${API_BASE}/checklist/template?model_name=${selectedModel}`, "_blank")}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition touch-target"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Plantilla Excel</span>
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition touch-target"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Archivo</span>
            </button>
            <button
              onClick={() => setEditingItem({ model_name: selectedModel, step_number: 1, operation: "", description: "", qc_criteria: "", media_url: "" })}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition touch-target"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Paso Manual</span>
            </button>
          </div>
        </Card>
      ) : filteredSteps.length === 0 ? (
        <Card className="p-6 text-center text-xs text-gray-500">
          No se encontraron pasos que coincidan con "{searchTerm}"
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSteps.map((st, idx) => {
            const prevStep = idx > 0 ? filteredSteps[idx - 1] : null;
            const hasGapBefore = prevStep && st.step_number > prevStep.step_number + 1;
            const gapCount = hasGapBefore ? (st.step_number - prevStep.step_number - 1) : 0;

            return (
              <React.Fragment key={st.step_number || st.id || idx}>
                {hasGapBefore && (
                  <div className="p-2.5 bg-amber-50/90 border border-dashed border-amber-300 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-950 my-1 fade-in">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="font-semibold">
                        Salto numérico: Faltan {gapCount} paso(s) entre #{prevStep.step_number} y #{st.step_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleResequence}
                        disabled={processingAction === "resequence"}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold shadow-2xs transition"
                        title="Renumerar para que sea continuo"
                      >
                        🛠️ Re-secuenciar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillMissing("APPEND_MISSING")}
                        disabled={processingAction === "fill"}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition"
                        title="Rellenar los pasos estándar correspondientes"
                      >
                        ⚡ Rellenar
                      </button>
                    </div>
                  </div>
                )}
                <Card className="overflow-hidden">
                  <button
                    onClick={() => setExpandedStep(expandedStep === st.step_number ? null : st.step_number)}
                    className="w-full flex items-center gap-3 p-3 text-left touch-target"
                  >
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {st.step_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{st.operation}</p>
                      {st.qc_criteria && <p className="text-[10px] text-gray-500 truncate">{st.qc_criteria}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {st.media_url && <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
                      {expandedStep === st.step_number ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {expandedStep === st.step_number && (
                    <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-2 fade-in">
                      {st.description && <p className="text-xs text-gray-700">{st.description}</p>}
                      <div className="bg-blue-50 p-2 rounded-lg text-xs text-blue-800">
                        <span className="font-semibold">Criterio QC: </span>{st.qc_criteria}
                      </div>
                      {st.media_url && (
                        <img src={st.media_url} alt={st.operation} className="w-full max-h-40 object-cover rounded-lg" />
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setEditingItem(st)}
                          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition touch-target"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar Paso</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSingleStep(st.id, st.step_number)}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition touch-target"
                          title="Eliminar este paso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Modal de Edición de Paso */}
      {editingItem && (
        <ChecklistStepModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onDelete={(id) => {
            handleDeleteSingleStep(id, editingItem.step_number);
            setEditingItem(null);
          }}
          onSave={async (saved) => {
            await fetch(`${API_BASE}/models/${selectedModel}/checklist`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(saved)
            });
            notify("Paso guardado correctamente");
            setEditingItem(null);
            loadSteps();
            onRefreshModels?.();
          }}
        />
      )}

      {/* Modal Importar Pasos con Plantilla */}
      {importModalOpen && (
        <ImportChecklistModal
          modelName={selectedModel}
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => {
            loadSteps();
            onRefreshModels?.();
          }}
          notify={notify}
        />
      )}

      {/* Modal Confirmación: Borrar Todos los Pasos */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">¿Eliminar todos los pasos?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Modelo: <span className="font-bold text-blue-700">{selectedModel}</span> · <span className="font-semibold text-gray-700">{steps.length} pasos</span>
              </p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left flex items-start gap-2 text-rose-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <p className="text-[11px] leading-tight">
                Esta acción vaciará el checklist completo de este modelo. Puedes respaldar los pasos exportándolos a Excel antes de continuar.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(false)}
                disabled={isDeletingAll}
                className="flex-1 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAllSteps}
                disabled={isDeletingAll}
                className="flex-1 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow transition touch-target flex items-center justify-center gap-1.5"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Borrando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, borrar todos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Nuevo Modelo */}
      <CreateModelModal
        isOpen={createModelModalOpen}
        onClose={() => setCreateModelModalOpen(false)}
        onSuccess={(newModelName) => {
          onRefreshModels?.();
          setSelectedModel(newModelName);
        }}
        existingModels={models}
        notify={notify}
      />
    </div>
  );
}

// =============================================
// 4. ESPACIO DE TRABAJO DEL OPERARIO (CON SELECCIÓN LIBRE, DERIVACIÓN Y FOTO-VERIFICACIÓN)
// =============================================
function OperatorWorkspaceView({ workspace, currentUser, onOpenMedia, onOpenIssue, onPreviewPhoto, onSelectUnit, onSelectOrder, onSelectStation, onRefresh, notify }) {
  if (!workspace || !workspace.active) {
    return (
      <Card className="p-8 text-center max-w-sm mx-auto">
        <Coffee className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-gray-900">Sin Tareas Asignadas</h3>
        <p className="text-xs text-gray-500 mt-1">El administrador no ha lanzado un lote o no estás asignado.</p>
        <button onClick={onRefresh} className="mt-4 text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold touch-target">
          Comprobar Nuevamente
        </button>
      </Card>
    );
  }

  const { 
    assignment, 
    order, 
    available_orders = [], 
    station_steps = [], 
    transferred_out_steps = [], 
    pending_prior_steps = [], 
    all_stations = [], 
    active_unit, 
    units_in_station = [], 
    completed_step_numbers = [], 
    completed_step_logs = [], 
    queue_units = [], 
    completed_units = [],
    is_support_operator = false,
    supervisor_audit = null
  } = workspace;

  const [completedSteps, setCompletedSteps] = useState(completed_step_numbers || []);
  const [stepLogsMap, setStepLogsMap] = useState({});
  const [submittingStep, setSubmittingStep] = useState(null);
  const [finishingUnit, setFinishingUnit] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [reassignStepModalData, setReassignStepModalData] = useState(null);
  const [photoStepModal, setPhotoStepModal] = useState(null);
  const [supervisorPhotoStepModal, setSupervisorPhotoStepModal] = useState(null);
  const [requirePhotoVerification, setRequirePhotoVerification] = useState(true);
  const [supervisorAuditModalOpen, setSupervisorAuditModalOpen] = useState(false);
  const [activeSupervisorAudit, setActiveSupervisorAudit] = useState(supervisor_audit);

  useEffect(() => {
    setActiveSupervisorAudit(supervisor_audit || null);
  }, [supervisor_audit, active_unit?.unit_number]);

  useEffect(() => {
    setCompletedSteps(completed_step_numbers || []);
    const map = {};
    (completed_step_logs || []).forEach(l => {
      map[l.step_number] = l;
    });
    setStepLogsMap(map);
  }, [completed_step_numbers, completed_step_logs, active_unit?.unit_number]);

  // Deduplicación reactiva infalible de pasos de la estación
  const uniqueStationSteps = useMemo(() => {
    const map = new Map();
    (station_steps || []).forEach(s => {
      if (!map.has(s.step_number)) {
        map.set(s.step_number, s);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.step_number - b.step_number);
  }, [station_steps]);

  // Deduplicación reactiva de pasos heredados pendientes (excluye duplicados y pasos de la estación actual)
  const filteredPendingPriorSteps = useMemo(() => {
    const stationStepNums = new Set(uniqueStationSteps.map(s => s.step_number));
    const map = new Map();
    (pending_prior_steps || []).forEach(s => {
      if (!stationStepNums.has(s.step_number) && !map.has(s.step_number)) {
        map.set(s.step_number, s);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.step_number - b.step_number);
  }, [pending_prior_steps, uniqueStationSteps]);

  const totalStationSteps = uniqueStationSteps.length;
  const isStationComplete = totalStationSteps > 0 && completedSteps.length >= totalStationSteps;

  const isSupervisorUser = currentUser.role === 'SUPERVISOR' || currentUser.role === 'ADMIN' || (order?.supervisor_id && currentUser.id === order.supervisor_id);
  const isSupport = is_support_operator || currentUser.id === 'OP-106' || (currentUser.email || '').toLowerCase().includes('apoyo');

  const handleToggleStep = async (step) => {
    const isDone = completedSteps.includes(step.step_number);
    if (isDone) {
      // Desmarcar paso
      try {
        setSubmittingStep(step.step_number);
        const res = await fetch(`${API_BASE}/operator/uncheck-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order.order_id,
            unit_number: active_unit.unit_number,
            step_number: step.step_number,
            station_number: assignment.station_number,
            user_id: currentUser.id,
            user_name: currentUser.name,
            reason: "Desmarcado por operario para corrección"
          })
        });
        if (!res.ok) throw new Error("Error al desmarcar el paso");
        setCompletedSteps(prev => prev.filter(num => num !== step.step_number));
        setStepLogsMap(prev => {
          const updated = { ...prev };
          delete updated[step.step_number];
          return updated;
        });
        notify(`↩ Paso #${step.step_number} desmarcado`);
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        setSubmittingStep(null);
      }
    } else {
      // Si la foto está activa, abrir la cámara para verificar con foto
      if (requirePhotoVerification) {
        setPhotoStepModal(step);
      } else {
        // Marcar paso conforme sin foto
        try {
          setSubmittingStep(step.step_number);
          const res = await fetch(`${API_BASE}/operator/submit-step`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: order.order_id,
              unit_number: active_unit.unit_number,
              step_number: step.step_number,
              station_number: assignment.station_number,
              user_id: currentUser.id,
              user_name: currentUser.name,
              status: "PASS",
              notes: "Aprobado por operario"
            })
          });
          if (!res.ok) throw new Error("Error registrando el paso");
          setCompletedSteps(prev => [...prev, step.step_number]);
          notify(`✓ Paso #${step.step_number} verificado`);
          if (completedSteps.length + 1 >= totalStationSteps && confetti) {
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
          }
        } catch (err) {
          alert("Error: " + err.message);
        } finally {
          setSubmittingStep(null);
        }
      }
    }
  };

  const handleVerifyStepWithPhoto = async (step, photoUrl) => {
    try {
      setSubmittingStep(step.step_number);
      const res = await fetch(`${API_BASE}/operator/submit-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          unit_number: active_unit.unit_number,
          step_number: step.step_number,
          station_number: assignment.station_number,
          user_id: currentUser.id,
          user_name: currentUser.name,
          status: "PASS",
          photo_url: photoUrl,
          notes: "Verificado con fotografía de evidencia"
        })
      });
      if (!res.ok) throw new Error("Error registrando el paso con foto");
      
      setCompletedSteps(prev => [...new Set([...prev, step.step_number])]);
      setStepLogsMap(prev => ({
        ...prev,
        [step.step_number]: {
          step_number: step.step_number,
          photo_url: photoUrl,
          user_name: currentUser.name,
          is_supervisor_verified: false,
          timestamp: new Date().toISOString()
        }
      }));
      setPhotoStepModal(null);
      notify(`📸 ✓ Paso #${step.step_number} verificado con foto`);
      if (completedSteps.length + 1 >= totalStationSteps && confetti) {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingStep(null);
    }
  };

  const handleSupervisorVerifyStepPhoto = async (step, photoUrl) => {
    try {
      setSubmittingStep(step.step_number);
      const res = await fetch(`${API_BASE}/supervisor/verify-step-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          unit_number: active_unit.unit_number,
          step_number: step.step_number,
          station_number: assignment.station_number,
          supervisor_id: currentUser.id,
          supervisor_name: currentUser.name,
          photo_url: photoUrl,
          notes: `Cumplimiento verificado con foto por ${currentUser.name} (Supervisor de Calidad)`
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error registrando foto de cumplimiento por supervisor");
      }
      setCompletedSteps(prev => [...new Set([...prev, step.step_number])]);
      setStepLogsMap(prev => ({
        ...prev,
        [step.step_number]: {
          step_number: step.step_number,
          photo_url: photoUrl,
          user_name: `${currentUser.name} (Supervisor)`,
          is_supervisor_verified: true,
          timestamp: new Date().toISOString()
        }
      }));
      setSupervisorPhotoStepModal(null);
      notify(`🛡️ 📸 Cumplimiento del Paso #${step.step_number} verificado con foto por el supervisor`);
      if (completedSteps.length + 1 >= totalStationSteps && confetti) {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.8 } });
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingStep(null);
    }
  };

  const handleFinishStation = async () => {
    if (!active_unit) return;
    try {
      setFinishingUnit(true);
      const res = await fetch(`${API_BASE}/operator/finish-station`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          unit_number: active_unit.unit_number,
          station_number: assignment.station_number
        })
      });
      if (!res.ok) throw new Error("Error al despachar");
      const data = await res.json();
      notify(data.message);
      setCompletedSteps([]);
      onRefresh();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setFinishingUnit(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-3.5 fade-in pb-4">
      {/* Banner y Selector de Estación Exclusivo para Técnico de Apoyo / Refuerzo */}
      {isSupport && all_stations && all_stations.length > 0 && (
        <Card className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-blue-950 block leading-tight">
                    Modo Técnico de Apoyo / Refuerzo ({currentUser.name})
                  </span>
                  <span className="text-[9px] font-bold bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-md">
                    Operario Multiestación
                  </span>
                </div>
                <span className="text-[10px] text-blue-700 block mt-0.5">
                  Refuerza temporalmente cualquier estación según la demanda de la línea sin alterar la titularidad del puesto.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-blue-900 flex-shrink-0">Puesto a Reforzar:</span>
              <select
                value={assignment.station_number}
                onChange={(e) => onSelectStation && onSelectStation(parseInt(e.target.value, 10))}
                className="text-xs font-bold border border-blue-400 bg-white text-gray-900 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 shadow-xs touch-target"
              >
                {all_stations.map(st => (
                  <option key={st.station_number} value={st.station_number}>
                    E{st.station_number}: {st.station_name} (Titular: {st.user_name}) {st.is_cleaning_station ? '🧼 [Limpieza]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Selector de Inspección para Supervisor y Admin (Nunca se muestra para Apoyo) */}
      {!isSupport && isSupervisorUser && all_stations && all_stations.length > 0 && (
        <Card className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                🛡️
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-amber-950 block leading-tight">
                    Modo Auditoría e Inspección ({currentUser.role === 'SUPERVISOR' ? 'Supervisor de Calidad' : 'Administrador'})
                  </span>
                  <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md">
                    Auditoría en Línea
                  </span>
                </div>
                <span className="text-[10px] text-amber-800 block mt-0.5">
                  Audita los puestos de ensamblaje en tiempo real y emite el V°B° normativo para liberar las unidades.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-amber-900 flex-shrink-0">Puesto a Auditar:</span>
              <select
                value={assignment.station_number}
                onChange={(e) => onSelectStation && onSelectStation(parseInt(e.target.value, 10))}
                className="text-xs font-bold border border-amber-400 bg-white text-gray-900 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500 shadow-xs touch-target"
              >
                {all_stations.map(st => (
                  <option key={st.station_number} value={st.station_number}>
                    E{st.station_number}: {st.station_name} (Operario: {st.user_name}) {st.is_cleaning_station ? '🧼 [Limpieza]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Header estación y Selector de Orden */}
      <Card className="p-3.5 border-l-4 border-l-[#0078d4] space-y-3">
        {/* Selector de Orden Activa para el Técnico */}
        {available_orders && available_orders.length > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
            <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
              <span>Cambiar Orden de Trabajo:</span>
            </label>
            <select
              value={order.order_id}
              onChange={(e) => onSelectOrder && onSelectOrder(e.target.value)}
              className="text-xs font-bold border border-blue-200 bg-blue-50/60 hover:bg-blue-50 text-blue-950 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none touch-target"
            >
              {available_orders.map(o => (
                <option key={o.order_id} value={o.order_id}>
                  {o.order_id} ({o.model_name}) · {o.is_assigned ? `Tu Estación: E${o.assigned_station}` : 'Estación 1'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold text-white px-2 py-0.5 rounded shadow-xs ${
                assignment.is_cleaning_station ? 'bg-emerald-600' : 'bg-[#0078d4]'
              }`}>
                E{assignment.station_number}
              </span>
              <h2 className="text-sm font-bold text-gray-900 truncate">{assignment.station_name}</h2>
              {assignment.is_cleaning_station && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  🧼 Estación de Limpieza Obligatoria
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Orden: <strong className="text-blue-700 font-mono">{order.order_id}</strong> · Modelo: <strong>{order.model_name}</strong> ({order.total_units} PCs)
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 block">
              {formatStepNumbersRange(assignment.step_numbers || (assignment.start_step ? `${assignment.start_step}-${assignment.end_step}` : ""))}
            </span>
            <span className="text-[10px] text-gray-400 block mt-1">
              Operario: <strong>{assignment.user_name}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* SELECTOR RÁPIDO DE PCs (Libre Selección por el Técnico) */}
      {units_in_station.length > 1 && (
        <Card className="p-2.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Selección libre de PCs en tu estación ({units_in_station.length}):</span>
            </span>
            <span className="text-[9px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
              Toca para cambiar
            </span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {units_in_station.map(u => {
              const isCurrent = active_unit && active_unit.unit_number === u.unit_number;
              return (
                <button
                  key={u.unit_number}
                  type="button"
                  onClick={() => onSelectUnit && onSelectUnit(u.unit_number)}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold transition touch-target flex items-center gap-1 ${
                    isCurrent
                      ? "bg-[#0078d4] text-white shadow-md scale-105"
                      : "bg-white hover:bg-blue-100 text-gray-700 border border-gray-200"
                  }`}
                >
                  <span>🖥️ #{u.unit_number.toString().padStart(2, '0')}</span>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {active_unit ? (
        <Card className="overflow-hidden border-2 border-blue-400 shadow-md">
          {/* Header PC activa */}
          <div className="bg-gradient-to-r from-[#0078d4] to-[#106ebe] text-white p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Trabajando en</span>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black">🖥️ PC #{active_unit.unit_number.toString().padStart(2, '0')}</h3>
                  {units_in_station.length > 1 && (
                    <select
                      value={active_unit.unit_number}
                      onChange={(e) => onSelectUnit && onSelectUnit(parseInt(e.target.value, 10))}
                      className="text-xs bg-white/20 text-white font-bold border border-white/40 rounded-lg px-2 py-0.5 focus:outline-none touch-target"
                      title="Cambiar a otra PC disponible"
                    >
                      {units_in_station.map(u => (
                        <option key={u.unit_number} value={u.unit_number} className="text-gray-900 font-semibold">
                          PC #{u.unit_number.toString().padStart(2, '0')} {u.unit_number === active_unit.unit_number ? '(Activa)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="text-xs text-blue-200 font-mono">{active_unit.serial_number}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(true)}
                  className="flex flex-col items-center gap-0.5 bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-xl transition touch-target"
                  title="Derivar PC a otra estación"
                >
                  <ArrowRightCircle className="w-4 h-4 text-sky-200" />
                  <span className="text-[9px] font-bold text-white">Derivar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenIssue(active_unit, uniqueStationSteps[0] || { step_number: 1, operation: "Inspección de Unidad" })}
                  className="flex flex-col items-center gap-0.5 bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-xl transition touch-target"
                  title="Reportar Falla"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                  <span className="text-[9px] font-bold text-white">Falla</span>
                </button>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-100">Progreso PC #{active_unit.unit_number}</span>
                <span className="font-bold text-white">{completedSteps.length}/{totalStationSteps}</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${(completedSteps.length / totalStationSteps) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Switch de Verificación con Foto */}
            <div className="flex items-center justify-between pt-2 border-t border-white/20">
              <label className="text-[11px] font-bold text-blue-100 flex items-center gap-1.5 cursor-pointer">
                <Camera className="w-3.5 h-3.5 text-emerald-300" />
                <span>Foto de verificación:</span>
              </label>
              <button
                type="button"
                onClick={() => setRequirePhotoVerification(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 shadow-sm ${
                  requirePhotoVerification
                    ? "bg-emerald-400 text-slate-950 font-black"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                <span>{requirePhotoVerification ? "📸 OBLIGATORIA (Activa)" : "LIBRE / OPCIONAL"}</span>
              </button>
            </div>
          </div>

          {/* BANNER DE CERTIFICACIÓN / V°B° OFICIAL SI YA ESTÁ APROBADA */}
          {activeSupervisorAudit?.status === "APPROVED" && (
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-950">
                      Unidad con V°B° Oficial del Supervisor QC
                    </span>
                    <span className="text-[9px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-md">
                      LIBERADA
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-800 block">
                    Auditado por <strong>{activeSupervisorAudit.supervisor_name}</strong> {activeSupervisorAudit.created_at ? `· ${new Date(activeSupervisorAudit.created_at).toLocaleDateString()} ${new Date(activeSupervisorAudit.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </span>
                </div>
              </div>
              {!isSupport && isSupervisorUser && (
                <button
                  type="button"
                  onClick={() => setSupervisorAuditModalOpen(true)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition touch-target flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Revisar / Modificar V°B°</span>
                </button>
              )}
            </div>
          )}

          {/* PROTOCOLO OFICIAL DE VERIFICACIÓN DEL SUPERVISOR QC (VISIBLE SOLO PARA SUPERVISOR/ADMIN) */}
          {!isSupport && isSupervisorUser && (
            <div className="p-3.5 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white border-b-2 border-amber-300 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                    🛡️
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-amber-950">
                        Protocolo de Verificación del Supervisor QC
                      </h4>
                      {activeSupervisorAudit?.status === "APPROVED" ? (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> V°B° APROBADO
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          ⏳ Pendiente de Auditoría
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-amber-800 mt-0.5">
                      Sigue los 5 pasos normativos antes de otorgar el Visto Bueno a la PC #{active_unit.unit_number.toString().padStart(2, '0')}:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setSupervisorAuditModalOpen(true)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm touch-target ${
                      activeSupervisorAudit?.status === "APPROVED"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-amber-600 hover:bg-amber-700 text-white shadow-md font-extrabold"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{activeSupervisorAudit?.status === "APPROVED" ? "Ver / Modificar V°B°" : "🛡️ Auditar y Emitir V°B°"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenIssue(active_unit, uniqueStationSteps[0] || { step_number: 1, operation: "Auditoría Supervisor" })}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition touch-target flex items-center gap-1"
                    title="Reportar defecto o rechazo"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Rechazo</span>
                  </button>
                </div>
              </div>

              {/* Guía detallada de los 5 pasos del supervisor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-xs flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-[11px] text-gray-900 block">📸 1. Auditoría de Fotos</strong>
                    <span className="text-[10px] text-gray-500 leading-tight block">
                      Revisar fotos de placa madre, cooler, pasta térmica y precintos tomadas en las estaciones.
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-xs flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-[11px] text-gray-900 block">🧼 2. Doble Limpieza (Obligatoria)</strong>
                    <span className="text-[10px] text-gray-500 leading-tight block">
                      Inspeccionar que el chasis esté 100% libre de huellas, restos de cintillos cortados y polvo.
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-xs flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-[11px] text-gray-900 block">⚙️ 3. Hardware, BIOS & POST</strong>
                    <span className="text-[10px] text-gray-500 leading-tight block">
                      Comprobar encendido a la primera, RAM Dual Channel, XMP/EXPO y sin cables tocando ventiladores.
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-xs flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                  <div>
                    <strong className="text-[11px] text-gray-900 block">🏷️ 4. Trazabilidad & KENYA</strong>
                    <span className="text-[10px] text-gray-500 leading-tight block">
                      Serie ({active_unit.serial_number}) idéntica a etiqueta física y sticker frontal de marca KENYA OK.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASOS HEREDADOS DE OTRAS ESTACIONES (SI EXISTEN, DEDUPLICADOS) */}
          {filteredPendingPriorSteps && filteredPendingPriorSteps.length > 0 && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pasos Pendientes Heredados ({filteredPendingPriorSteps.length})</span>
                </span>
                <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                  Derivados
                </span>
              </div>
              <p className="text-[10px] text-amber-800 leading-tight">
                Esta PC llegó con procesos previos pendientes. Toca para completarlos:
              </p>
              <div className="space-y-1.5 pt-1">
                {filteredPendingPriorSteps.map((st) => {
                  const isDone = completedSteps.includes(st.step_number);
                  const isSubmitting = submittingStep === st.step_number;
                  const stepLog = stepLogsMap[st.step_number];

                  return (
                    <div
                      key={st.step_number}
                      className={`rounded-xl border p-2.5 transition select-none flex items-center justify-between gap-2 ${
                        isDone
                          ? "bg-emerald-50 border-emerald-400"
                          : "bg-white border-amber-300 hover:border-amber-400 shadow-sm"
                      }`}
                    >
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleToggleStep(st)}
                      >
                        <span className="text-xs font-bold text-gray-900 block">
                          #{st.step_number} {st.operation}
                        </span>
                        <span className="text-[10px] text-gray-500 block truncate">
                          {st.qc_criteria}
                        </span>
                        {stepLog?.photo_url && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewPhoto && onPreviewPhoto({
                                url: stepLog.photo_url,
                                title: `PC #${active_unit.unit_number} · Paso #${st.step_number}`,
                                subtitle: st.operation,
                                user_name: stepLog.user_name,
                                timestamp: stepLog.timestamp
                              });
                            }}
                            className="mt-1.5 inline-flex items-center gap-1.5 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-bold text-emerald-900 border border-emerald-300 transition"
                          >
                            <img src={stepLog.photo_url} alt="Foto" className="w-4 h-4 object-cover rounded border border-emerald-400" />
                            <span>📸 Ver Foto</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPhotoStepModal(st)}
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs"
                          title="Tomar foto para este paso"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStep(st)}
                          disabled={isSubmitting}
                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${
                            isDone ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isDone ? <Check className="w-3 h-3" /> : null}
                          <span>{isDone ? "Completado" : "Marcar"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASOS DERIVADOS A OTRAS ESTACIONES */}
          {transferred_out_steps && transferred_out_steps.length > 0 && (
            <div className="p-2.5 bg-blue-50/70 border-b border-blue-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-950 flex items-center gap-1.5">
                  <ArrowRightCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Procesos derivados a otras áreas ({transferred_out_steps.length}):</span>
                </span>
                <span className="text-[9px] bg-blue-200/80 text-blue-900 font-semibold px-1.5 py-0.5 rounded">
                  En otra estación
                </span>
              </div>
              <div className="space-y-1">
                {transferred_out_steps.map((to, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-blue-100 text-xs">
                    <span className="text-[11px] font-semibold text-gray-800 truncate max-w-[220px]">
                      #{to.step_number} {to.operation}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex-shrink-0">
                      ➔ Estación {to.target_station}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de pasos principales de la estación (Deduplicados) */}
          <div className="p-3 space-y-3">
            {uniqueStationSteps.map((st) => {
              const isDone = completedSteps.includes(st.step_number);
              const isSubmitting = submittingStep === st.step_number;
              const stepLog = stepLogsMap[st.step_number];

              return (
                <div
                  key={st.step_number}
                  className={`w-full text-left rounded-2xl border-2 overflow-hidden transition-all duration-200 select-none ${
                    isDone
                      ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                      : isSubmitting
                        ? 'bg-blue-50 border-blue-300 scale-[0.99] opacity-80'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md shadow-sm'
                  }`}
                >
                  <div className="flex items-stretch">
                    {/* Panel izquierdo — Checkbox visual grande interactivo */}
                    <div 
                      onClick={() => handleToggleStep(st)}
                      className={`w-14 sm:w-16 flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4 transition-colors cursor-pointer ${
                        isDone ? 'bg-emerald-500 hover:bg-emerald-600' : isSubmitting ? 'bg-blue-400' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-7 h-7 text-white animate-spin" />
                      ) : isDone ? (
                        <>
                          <CheckCircle className="w-7 h-7 text-white" />
                          <span className="text-[9px] font-bold text-emerald-100 uppercase">Hecho</span>
                          <span className="text-[8px] text-emerald-200 opacity-90 font-mono">(Quitar)</span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400 bg-white flex items-center justify-center">
                            <Check className="w-4 h-4 text-gray-300" />
                          </div>
                          <span className="text-[9px] font-bold text-gray-500 uppercase">
                            {requirePhotoVerification ? "Foto" : "Toca"}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Contenido del paso */}
                    <div className="flex-1 min-w-0 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleToggleStep(st)}
                        >
                          <p className={`text-sm font-bold leading-snug mb-1 ${
                            isDone ? 'text-emerald-800' : 'text-gray-900'
                          }`}>
                            <span className={`text-[10px] font-bold mr-1.5 px-1.5 py-0.5 rounded ${
                              isDone ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-500'
                            }`}>
                              #{st.step_number}
                            </span>
                            {st.operation}
                            {st.is_delegated_in && (
                              <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 ml-1.5 inline-block">
                                Recibido de E{st.delegated_from_station}
                              </span>
                            )}
                          </p>

                          {/* Indicador de 2 técnicos asignados */}
                          {st.assigned_technicians && st.assigned_technicians.length > 1 && (
                            <div className="flex items-center gap-1.5 flex-wrap my-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md">
                                <Users className="w-3 h-3 text-indigo-600" />
                                <span>2 Técnicos:</span>
                                <strong>{st.assigned_technicians.map(t => t.name).join(' & ')}</strong>
                              </span>
                            </div>
                          )}

                          {st.description && (
                            <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{st.description}</p>
                          )}
                          <div className={`flex items-start gap-1.5 rounded-lg px-2 py-1.5 ${
                            isDone ? 'bg-emerald-100/70' : 'bg-blue-50 border border-blue-100'
                          }`}>
                            <span className="text-[10px] flex-shrink-0">🔍</span>
                            <span className={`text-[10px] font-medium leading-snug ${
                              isDone ? 'text-emerald-700' : 'text-blue-800'
                            }`}>
                              {st.qc_criteria}
                            </span>
                          </div>

                          {/* Miniatura y Badge de Foto de Evidencia Verificada */}
                          {stepLog?.photo_url && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreviewPhoto && onPreviewPhoto({
                                  url: stepLog.photo_url,
                                  title: `PC #${active_unit.unit_number.toString().padStart(2, '0')} · Paso #${st.step_number}`,
                                  subtitle: st.operation,
                                  user_name: stepLog.user_name || currentUser.name,
                                  timestamp: stepLog.timestamp
                                });
                              }}
                              className={`mt-2.5 inline-flex items-center gap-2 border px-2.5 py-1.5 rounded-xl cursor-pointer transition group shadow-xs ${
                                stepLog.is_supervisor_verified
                                  ? 'bg-amber-50/90 hover:bg-amber-100 border-amber-300'
                                  : 'bg-emerald-100/90 hover:bg-emerald-200 border-emerald-300'
                              }`}
                            >
                              <img 
                                src={stepLog.photo_url} 
                                alt="Foto evidencia" 
                                className="w-8 h-8 object-cover rounded-lg border border-emerald-400 group-hover:scale-105 transition"
                              />
                              <div className="text-left">
                                <span className={`text-[11px] font-bold flex items-center gap-1 ${
                                  stepLog.is_supervisor_verified ? 'text-amber-950' : 'text-emerald-950'
                                }`}>
                                  {stepLog.is_supervisor_verified ? (
                                    <>
                                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Foto de Cumplimiento (Supervisor)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Camera className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>Foto de Evidencia Guardada</span>
                                    </>
                                  )}
                                </span>
                                <span className={`text-[9px] block ${
                                  stepLog.is_supervisor_verified ? 'text-amber-800' : 'text-emerald-700'
                                }`}>
                                  {stepLog.is_supervisor_verified ? `Por ${stepLog.user_name} · ` : ''}🔍 Toca para ampliar foto
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Botón de Acción Directo de Supervisor para Tomar Foto de Cumplimiento */}
                          {isSupervisorUser && (
                            <div className="mt-2.5 pt-2 border-t border-amber-100 flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSupervisorPhotoStepModal(st);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1.5 transition touch-target"
                                title="Supervisor: Tomar foto oficial evidenciando que ya se cumplió"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>📸 Foto Cumplimiento (Supervisor)</span>
                              </button>
                              <span className="text-[10px] text-amber-800 font-medium">
                                {isDone ? "Actualiza o valida cumplimiento" : "Valida con foto y aprueba paso"}
                              </span>
                            </div>
                          )}

                          {isDone ? (
                            <p className="text-[9px] text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                              <span>↩</span> Toca la casilla izquierda si deseas desmarcar
                            </p>
                          ) : !isSubmitting && (
                            <p className="text-[9px] text-gray-400 mt-2 flex items-center gap-1">
                              <Camera className="w-2.5 h-2.5 text-blue-500" />
                              {requirePhotoVerification ? "Toca para tomar foto de verificación y aprobar" : "Toca para marcar conforme"}
                            </p>
                          )}
                        </div>

                        {/* Botones de acción del paso */}
                        <div className="flex flex-col gap-1.5 ml-1 flex-shrink-0">
                          {/* Botón de Cámara para Supervisor */}
                          {isSupervisorUser && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSupervisorPhotoStepModal(st);
                              }}
                              className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition shadow-xs"
                              title="Supervisor: Tomar foto de cumplimiento"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          )}

                          {/* Botón de Cámara Directo para Operario */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoStepModal(st);
                            }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition shadow-xs ${
                              isDone
                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300"
                                : "bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300"
                            }`}
                            title={isDone ? "Volver a tomar / actualizar foto" : "Tomar foto y verificar paso"}
                          >
                            <Camera className="w-4 h-4" />
                          </button>

                          {st.media_url && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onOpenMedia(st); }}
                              className="w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl flex items-center justify-center transition"
                              title="Ver guía visual"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                          )}
                          {!isDone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReassignStepModalData(st);
                              }}
                              className="w-8 h-8 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl flex items-center justify-center transition shadow-xs"
                              title="Derivar este proceso a otra estación"
                            >
                              <ArrowRightCircle className="w-4 h-4 text-sky-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón finalizar */}
          <div className="p-3 pt-0">
            {isStationComplete ? (
              <button
                onClick={handleFinishStation}
                disabled={finishingUnit}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-base rounded-xl shadow-lg flex items-center justify-center gap-3 transition pulse-glow touch-target"
              >
                {finishingUnit ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /><span>Enviando...</span></>
                ) : (
                  <><ArrowRightCircle className="w-6 h-6" /><span>Enviar PC #{active_unit.unit_number} a siguiente estación</span></>
                )}
              </button>
            ) : (
              <div className="bg-gray-50 p-3 rounded-xl text-center text-xs text-gray-500 border border-gray-200">
                Completa los {totalStationSteps} pasos de la <strong>PC #{active_unit.unit_number}</strong> para habilitar su despacho.
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-700">Sin PCs en tu estación</h3>
          <p className="text-xs text-gray-400 mt-1">Esperando que la estación anterior despache unidades...</p>
        </Card>
      )}

      {/* Cola de otras PCs disponibles en esta estación */}
      {queue_units.length > 0 && (
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <span>Otras PCs en tu estación ({queue_units.length}):</span>
            </h4>
            <span className="text-[10px] text-gray-400">Toca para cambiar</span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
            {queue_units.map(u => (
              <div
                key={u.unit_number}
                onClick={() => onSelectUnit && onSelectUnit(u.unit_number)}
                className="flex justify-between items-center p-2.5 bg-gray-50 hover:bg-blue-50 active:bg-blue-100 rounded-xl border border-gray-200 cursor-pointer transition touch-target"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-xs">🖥️ PC #{u.unit_number.toString().padStart(2, '0')}</span>
                  <span className="text-gray-400 font-mono text-[10px] hidden sm:inline">{u.serial_number}</span>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] rounded-lg transition"
                >
                  ⚡ Trabajar en esta PC
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Captura de Foto para Paso */}
      {photoStepModal && active_unit && (
        <CameraCaptureModal
          title={`PC #${active_unit.unit_number.toString().padStart(2, '0')} · Paso #${photoStepModal.step_number}`}
          subtitle={photoStepModal.operation}
          prefix={`step_${order.order_id}_pc${active_unit.unit_number}_p${photoStepModal.step_number}`}
          onCapture={(photoUrl) => {
            handleVerifyStepWithPhoto(photoStepModal, photoUrl);
          }}
          onClose={() => setPhotoStepModal(null)}
        />
      )}

      {/* Modal Captura de Foto de Cumplimiento (Supervisor) */}
      {supervisorPhotoStepModal && active_unit && (
        <CameraCaptureModal
          title={`🛡️ FOTO DE CUMPLIMIENTO (SUPERVISOR) · PC #${active_unit.unit_number.toString().padStart(2, '0')}`}
          subtitle={`Paso #${supervisorPhotoStepModal.step_number}: ${supervisorPhotoStepModal.operation}`}
          prefix={`sup_${order.order_id}_pc${active_unit.unit_number}_p${supervisorPhotoStepModal.step_number}`}
          onCapture={(photoUrl) => {
            handleSupervisorVerifyStepPhoto(supervisorPhotoStepModal, photoUrl);
          }}
          onClose={() => setSupervisorPhotoStepModal(null)}
        />
      )}

      {/* Modal Derivar Estación Completa */}
      {transferModalOpen && active_unit && (
        <TransferUnitModal
          unit={active_unit}
          order={order}
          currentStation={assignment.station_number}
          allStations={all_stations}
          currentUser={currentUser}
          onClose={() => setTransferModalOpen(false)}
          onSuccess={(msg) => {
            notify(msg);
            setTransferModalOpen(false);
            onRefresh();
          }}
        />
      )}

      {/* Modal Derivar Proceso / Paso Individual */}
      {reassignStepModalData && active_unit && (
        <ReassignStepModal
          step={reassignStepModalData}
          unit={active_unit}
          order={order}
          currentStation={assignment.station_number}
          allStations={all_stations}
          currentUser={currentUser}
          onClose={() => setReassignStepModalData(null)}
          onSuccess={(msg) => {
            notify(msg);
            setReassignStepModalData(null);
            onRefresh();
          }}
        />
      )}

      {/* Modal Oficial de Auditoría y V°B° del Supervisor QC */}
      {supervisorAuditModalOpen && active_unit && (
        <SupervisorAuditModal
          isOpen={supervisorAuditModalOpen}
          onClose={() => setSupervisorAuditModalOpen(false)}
          orderId={order.order_id}
          unitNumber={active_unit.unit_number}
          serialNumber={active_unit.serial_number}
          modelName={order.model_name}
          currentUser={currentUser}
          notify={notify}
          onSuccess={(res) => {
            setActiveSupervisorAudit({
              supervisor_name: currentUser.name,
              status: res.unit?.supervisor_approved ? "APPROVED" : "REJECTED",
              created_at: new Date().toISOString(),
              notes: res.notes || ""
            });
            onRefresh && onRefresh();
          }}
        />
      )}
    </div>
  );
}

// =============================================
// MODAL DERIVAR / REASIGNAR PASO INDIVIDUAL
// =============================================
function ReassignStepModal({ step, unit, order, currentStation, allStations, currentUser, onClose, onSuccess }) {
  const availableStations = (allStations || []).filter(s => s.station_number !== currentStation);
  const [targetStation, setTargetStation] = useState(availableStations[0]?.station_number || 1);
  const [scope, setScope] = useState("UNIT"); // "UNIT" o "ALL"
  const [reason, setReason] = useState("Carga de trabajo en estación actual / Apoyo de otra área");
  const [submitting, setSubmitting] = useState(false);

  const handleReassign = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/operator/reassign-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          unit_number: scope === "UNIT" ? unit.unit_number : null,
          step_number: step.step_number,
          from_station: currentStation,
          target_station: parseInt(targetStation, 10),
          transferred_by: currentUser.name,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al reasignar paso");
      onSuccess(data.message || `Paso #${step.step_number} reasignado a Estación ${targetStation}`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ArrowRightCircle className="w-5 h-5 text-sky-200" />
            <span>Derivar Proceso a Otra Estación</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleReassign} className="p-4 space-y-3 text-xs">
          <div className="bg-sky-50 p-3 rounded-xl border border-sky-200 text-sky-950 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">Proceso Seleccionado</span>
            <p className="font-bold text-sm text-sky-900">
              #{step.step_number} {step.operation}
            </p>
            {step.qc_criteria && (
              <p className="text-[11px] text-sky-700">{step.qc_criteria}</p>
            )}
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Estación de Destino (Área que realizará este proceso)
            </label>
            <select
              value={targetStation}
              onChange={(e) => setTargetStation(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 font-bold touch-target bg-white focus:ring-2 focus:ring-sky-500"
            >
              {availableStations.map(st => (
                <option key={st.station_number} value={st.station_number}>
                  Estación {st.station_number}: {st.station_name} ({st.user_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1.5">
              Alcance de la Reasignación
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`p-2.5 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition ${
                scope === "UNIT" ? "border-blue-600 bg-blue-50/70 text-blue-900 font-bold" : "border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}>
                <input
                  type="radio"
                  name="stepScope"
                  value="UNIT"
                  checked={scope === "UNIT"}
                  onChange={() => setScope("UNIT")}
                  className="text-blue-600"
                />
                <span className="text-xs">Solo para PC #{unit.unit_number}</span>
              </label>

              <label className={`p-2.5 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition ${
                scope === "ALL" ? "border-blue-600 bg-blue-50/70 text-blue-900 font-bold" : "border-gray-200 hover:bg-gray-50 text-gray-700"
              }`}>
                <input
                  type="radio"
                  name="stepScope"
                  value="ALL"
                  checked={scope === "ALL"}
                  onChange={() => setScope("ALL")}
                  className="text-blue-600"
                />
                <span className="text-xs">Para todo el lote</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Motivo de la Derivación
            </label>
            <textarea
              rows="2"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Falta de herramienta en E1 / Técnico ocupado / Terminar en E5..."
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 touch-target focus:outline-none focus:ring-2 focus:ring-sky-500"
            ></textarea>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow transition touch-target flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Derivando...</span></>
              ) : (
                <span>Derivar Proceso</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// MODAL DERIVAR / TRANSFERIR PC A OTRA ESTACIÓN
// =============================================
function TransferUnitModal({ unit, order, currentStation, allStations, currentUser, onClose, onSuccess }) {
  const availableStations = (allStations || []).filter(s => s.station_number !== currentStation);
  const [targetStation, setTargetStation] = useState(availableStations[0]?.station_number || 1);
  const [reason, setReason] = useState("Carga de trabajo / Finalizar procesos pendientes");
  const [submitting, setSubmitting] = useState(false);

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/operator/transfer-station`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          unit_number: unit.unit_number,
          from_station: currentStation,
          target_station: parseInt(targetStation, 10),
          transferred_by: currentUser.name,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al derivar unidad");
      onSuccess(data.message || `PC #${unit.unit_number} derivada a Estación ${targetStation}`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ArrowRightCircle className="w-5 h-5 text-blue-200" />
            <span>Derivar PC #{unit.unit_number} a otra Estación</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleTransfer} className="p-4 space-y-3.5 text-xs">
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-blue-900 space-y-1">
            <p className="font-semibold text-[11px]">
              📍 Estación actual: <strong>Estación {currentStation}</strong>
            </p>
            <p className="text-[11px] text-blue-700 leading-snug">
              La PC viajará a la estación de destino para que otro técnico continúe o finalice las asignaciones pendientes.
            </p>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Estación de Destino
            </label>
            <select
              value={targetStation}
              onChange={(e) => setTargetStation(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 font-bold touch-target bg-white focus:ring-2 focus:ring-blue-500"
            >
              {availableStations.map(st => (
                <option key={st.station_number} value={st.station_number}>
                  Estación {st.station_number}: {st.station_name} ({st.user_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Motivo / Indicaciones para el técnico de destino
            </label>
            <textarea
              rows="2.5"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Completar pruebas de arranque y cerrar tapa en Estación 5..."
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 touch-target focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition touch-target flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Derivando...</span></>
              ) : (
                <span>Derivar PC #{unit.unit_number}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// 5. AUDITORÍA FORENSE
// =============================================
function AuditLogsView({ selectedOrder, orders = [], onPreviewPhoto }) {
  const [logs, setLogs] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState(selectedOrder || orders[0]?.order_id || "");
  const [filterUser, setFilterUser] = useState("");

  useEffect(() => {
    if (activeOrderId) {
      fetch(`${API_BASE}/orders/${activeOrderId}/logs`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (Array.isArray(data)) setLogs(data); })
        .catch(() => {});
    }
  }, [activeOrderId]);

  const filteredLogs = logs.filter(l =>
    !filterUser || (l.user_name || "").toLowerCase().includes(filterUser.toLowerCase())
  );

  return (
    <div className="space-y-4 fade-in">
      <Card className="p-3">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>Registro de Auditoría Forense</span>
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          {orders.length > 0 && (
            <select
              value={activeOrderId || ""}
              onChange={(e) => setActiveOrderId(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 font-semibold touch-target"
            >
              {orders.map(o => <option key={o.order_id} value={o.order_id}>{o.order_id}</option>)}
            </select>
          )}
          <input
            type="text"
            placeholder="Filtrar por técnico..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-3 py-2.5 touch-target w-full"
          />
        </div>
      </Card>

      {/* Logs como tarjetas en mobile */}
      <div className="space-y-2">
        {filteredLogs.map(l => (
          <Card key={l.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-900">PC #{l.unit_number.toString().padStart(2, '0')}</span>
                  <span className="text-xs text-blue-700 font-semibold">Paso {l.step_number}</span>
                  <span className="text-[10px] text-gray-500">E{l.station_number}</span>
                </div>
                <p className="text-xs font-semibold text-gray-800 truncate">{l.user_name}</p>
                <p className="text-[10px] text-gray-400 font-mono">{new Date(l.timestamp).toLocaleString("es-PE")}</p>
                {l.notes && <p className="text-[10px] text-gray-500 italic">{l.notes}</p>}

                {l.photo_url && (
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => onPreviewPhoto && onPreviewPhoto({
                        url: l.photo_url,
                        title: `PC #${l.unit_number.toString().padStart(2, '0')} · Paso #${l.step_number}`,
                        subtitle: `Estación ${l.station_number}`,
                        user_name: l.user_name,
                        timestamp: l.timestamp
                      })}
                      className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-800 transition group"
                    >
                      <img src={l.photo_url} alt="Evidencia" className="w-6 h-6 object-cover rounded border border-emerald-300 group-hover:scale-105 transition" />
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>📸 Ver Foto de Evidencia</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {l.status === "PASS" && <Badge variant="success">PASS</Badge>}
                {l.status === "FAIL" && <Badge variant="danger">FAIL</Badge>}
                {l.status === "REASSIGNED" && <Badge variant="warning">REASIG.</Badge>}
              </div>
            </div>
          </Card>
        ))}
        {filteredLogs.length === 0 && (
          <Card className="p-8 text-center">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No hay registros de auditoría aún.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

// =============================================
// MODAL VISOR MULTIMEDIA
// =============================================
function MediaViewerModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden shadow-2xl">
        <div className="bg-[#0078d4] text-white p-4 flex justify-between items-start">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Guía Visual</span>
            <h3 className="text-sm font-bold leading-tight">Paso #{item.step_number}: {item.operation}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded flex-shrink-0 touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center min-h-[200px] max-h-[350px]">
            {item.media_url ? (
              <img src={item.media_url} alt={item.operation} className="max-h-[350px] w-full object-contain" />
            ) : (
              <div className="text-gray-400 text-center p-8">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Sin imagen asignada</p>
              </div>
            )}
          </div>
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
            <h4 className="text-xs font-bold text-blue-900">Criterio de Aceptación:</h4>
            <p className="text-xs text-blue-800 mt-1">{item.qc_criteria}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#0078d4] hover:bg-[#106ebe] text-white font-bold text-sm rounded-xl shadow touch-target transition"
          >
            Entendido, Regresar
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MODAL REPORTE DE FALLAS (CON FOTO OBLIGATORIA)
// =============================================
function IssueReportModal({ data, currentUser, orderId, stationNumber, onClose, onSuccess }) {
  const { unit, step } = data;
  const [issueTitle, setIssueTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("CRITICAL");
  const [photoUrl, setPhotoUrl] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const compressedDataUrl = await compressImageToOptimized(file, 1280, 0.75);
      const res = await fetch(`${API_BASE}/camera/capture-base64`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressedDataUrl, prefix: `issue_pc${unit.unit_number}` })
      });
      if (!res.ok) throw new Error("Error al subir fotografía");
      const data = await res.json();
      setPhotoUrl(data.url);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoUrl) {
      alert("⚠️ Es OBLIGATORIO tomar o adjuntar una fotografía de la falla para generar el reporte.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/operator/report-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          unit_number: unit.unit_number,
          step_number: step?.step_number || 1,
          station_number: stationNumber || 1,
          reported_by: currentUser.name,
          issue_title: issueTitle,
          description,
          severity,
          photo_url: photoUrl
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error registrando incidencia");
      }
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
          <div className="bg-rose-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Reportar Falla — PC #{unit.unit_number}</span>
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Título de la Falla</label>
              <input
                type="text"
                required
                placeholder="Ej: Rayón en tapa frontal / GPU no detectada"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5 touch-target focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Severidad</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5 font-bold touch-target"
              >
                <option value="LOW">Baja (Cosmético)</option>
                <option value="MEDIUM">Media (Ajuste menor)</option>
                <option value="HIGH">Alta (Reemplazo)</option>
                <option value="CRITICAL">Crítica (Bloqueo total)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
              <textarea
                rows="2"
                required
                placeholder="Detalle exactamente lo observado..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5 touch-target focus:outline-none"
              ></textarea>
            </div>

            {/* SECCIÓN DE FOTOGRAFÍA OBLIGATORIA */}
            <div className="space-y-2 pt-1 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-rose-600" />
                  <span>Foto de la Falla</span>
                  <span className="text-[9px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-bold border border-rose-200">
                    OBLIGATORIO *
                  </span>
                </label>
                {photoUrl && (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Foto cargada
                  </span>
                )}
              </div>

              {photoUrl ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-black/5">
                  <img
                    src={photoUrl}
                    alt="Evidencia fotográfica"
                    className="w-full h-36 object-cover rounded-lg"
                  />
                  <div className="p-2 bg-slate-900/90 text-white flex items-center justify-between text-xs">
                    <span className="text-[11px] text-emerald-400 font-medium truncate">✓ Evidencia lista</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCameraOpen(true)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoUrl("")}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-50/70 rounded-xl border-2 border-dashed border-rose-300 space-y-2 text-center">
                  <p className="text-[11px] text-rose-800 leading-tight">
                    Toma una foto clara del defecto con la cámara para identificar la falla rápidamente.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCameraOpen(true)}
                      className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition touch-target"
                    >
                      <Camera className="w-4 h-4" />
                      <span>📸 Tomar Foto</span>
                    </button>
                    <label className="py-2.5 px-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition touch-target text-center">
                      {uploadingPhoto ? (
                        <><Loader2 className="w-4 h-4 animate-spin text-rose-600" /><span>Subiendo...</span></>
                      ) : (
                        <><Upload className="w-4 h-4 text-gray-500" /><span>📁 Archivo</span></>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingPhoto}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !photoUrl}
                className={`flex-1 py-3 text-xs font-bold text-white rounded-xl shadow transition touch-target flex items-center justify-center gap-1.5 ${
                  !photoUrl
                    ? "bg-gray-400 cursor-not-allowed opacity-75"
                    : "bg-rose-600 hover:bg-rose-700 active:scale-95"
                }`}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Registrando...</span></>
                ) : (
                  <span>Bloquear PC y Reportar</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {cameraOpen && (
        <CameraCaptureModal
          title={`Foto de Falla · PC #${unit.unit_number.toString().padStart(2, '0')}`}
          subtitle="Captura clara del defecto o daño"
          prefix={`issue_pc${unit.unit_number}`}
          onCapture={(url) => {
            setPhotoUrl(url);
            setCameraOpen(false);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  );
}

// =============================================
// MODAL REASIGNACIÓN DE EMERGENCIA
// =============================================
function EmergencyReassignModal({ order, stations, operators, onClose, onSuccess }) {
  const [stationNumber, setStationNumber] = useState(stations[0]?.station_number || 1);
  const [newUserId, setNewUserId] = useState(operators[0]?.id || "");
  const [reason, setReason] = useState("Ausencia / Retraso de Operario");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetUser = operators.find(o => o.id === newUserId);
    if (!targetUser) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/orders/reassign-emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          station_number: parseInt(stationNumber, 10),
          new_user_id: targetUser.id,
          new_user_name: targetUser.name,
          reason
        })
      });
      if (!res.ok) throw new Error("Error al reasignar");
      const data = await res.json();
      onSuccess(data.message);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl">
        <div className="bg-amber-600 text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>Reasignación de Emergencia</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Estación a Transferir</label>
            <select
              value={stationNumber}
              onChange={(e) => setStationNumber(parseInt(e.target.value, 10))}
              className="w-full text-xs border border-gray-300 rounded-xl p-3 touch-target"
            >
              {stations.map(st => (
                <option key={st.station_number} value={st.station_number}>
                  E{st.station_number}: {st.station_name} ({st.user_name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nuevo Técnico</label>
            <select
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-3 font-bold text-blue-700 touch-target"
            >
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-3 touch-target"
            />
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[10px] text-amber-900">
            El historial previo queda intacto. El nuevo técnico inicia desde este momento.
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow transition touch-target">
              {submitting ? "Reasignando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// MODAL CAPTURA DE CÁMARA EN TIEMPO REAL (CON COMPRESIÓN WEB/CLIENTE)
// =============================================
function CameraCaptureModal({ title = "Tomar Foto con Cámara", subtitle = null, prefix = "step", onCapture, onClose }) {
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
              <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow">
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
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
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
function ImportChecklistModal({ modelName, onClose, onSuccess, notify }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
        setSelectedFile(file);
        setErrorMessage("");
      } else {
        setErrorMessage("Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV (.csv)");
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
      const res = await fetch(`${API_BASE}/models/${modelName}/import-excel`, {
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
        <div className="bg-[#0078d4] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Importar Checklist de Pasos</h3>
              <p className="text-[11px] text-blue-100">Modelo: <span className="font-semibold text-white">{modelName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con pasos guiados */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* PASO 1: Descargar Plantilla */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl border border-blue-200/80">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                  PASO 1 · PLANTILLA
                </span>
                <h4 className="text-xs font-bold text-gray-900">Descarga la Plantilla Oficial Excel</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Contiene el formato oficial pre-configurado con 5 ejemplos prácticos de ensamble y las columnas exactas requeridas: <code className="text-[10px] bg-white px-1 py-0.5 rounded border text-blue-800">Paso_Nro</code>, <code className="text-[10px] bg-white px-1 py-0.5 rounded border text-blue-800">Operacion</code>, <code className="text-[10px] bg-white px-1 py-0.5 rounded border text-blue-800">Criterio_Control_Calidad</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.open(`${API_BASE}/checklist/template?model_name=${modelName}`, "_blank")}
                className="flex-shrink-0 text-xs bg-white hover:bg-blue-50 text-[#0078d4] border border-blue-300 font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition touch-target"
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
            <h4 className="text-xs font-bold text-gray-900">Sube tu archivo completado (.xlsx, .xls o .csv)</h4>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                dragOver
                  ? "border-blue-500 bg-blue-50/50"
                  : selectedFile
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-gray-300 hover:border-gray-400 bg-gray-50/50"
              }`}
              onClick={() => document.getElementById("checklist-file-input").click()}
            >
              <input
                id="checklist-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
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
                  <p className="text-[10px] text-blue-600 underline">Clic para seleccionar otro archivo</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-800">
                    Arrastra aquí tu archivo Excel o CSV
                  </p>
                  <p className="text-[11px] text-gray-500">o haz clic para buscar en tu dispositivo</p>
                  <p className="text-[10px] text-gray-400">Archivos soportados: .xlsx, .xls, .csv</p>
                </div>
              )}
            </div>
          </div>

          {/* Advertencia / Nota */}
          <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[11px] leading-tight">
              <strong>Nota:</strong> Los pasos contenidos en el archivo reemplazarán los pasos actuales del modelo <strong>{modelName}</strong>.
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
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
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
function CreateModelModal({ isOpen, onClose, onSuccess, existingModels = [], notify }) {
  const [modelName, setModelName] = useState("");
  const [description, setDescription] = useState("");
  const [initStrategy, setInitStrategy] = useState("STANDARD"); // "STANDARD", "CLONE", "EMPTY"
  const [cloneSource, setCloneSource] = useState(existingModels[0]?.name || "PROWORK");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = modelName.trim().toUpperCase();
    if (!cleanName) {
      setErrorMsg("El nombre del modelo es obligatorio.");
      return;
    }
    if (existingModels.some(m => (m.name || "").toUpperCase() === cleanName)) {
      setErrorMsg(`El modelo '${cleanName}' ya existe.`);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const payload = {
        name: cleanName,
        description: description.trim(),
        template: initStrategy,
        clone_from: initStrategy === "CLONE" ? cloneSource : undefined
      };

      const res = await fetch(`${API_BASE}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear modelo");

      notify?.(`Modelo '${cleanName}' creado con éxito (${data.step_count || 0} pasos)`, "success");
      onSuccess?.(cleanName);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Error al procesar la solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 fade-in backdrop-blur-xs" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] animate-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0078d4] to-[#106ebe] text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Crear Nuevo Modelo de PC</h3>
              <p className="text-[11px] text-blue-100">Configura una nueva línea de producto y su checklist</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nombre del modelo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nombre del Modelo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: GAMER-ULTRA, SLIM-OFFICE, WORKSTATION-AI"
              value={modelName}
              onChange={e => setModelName(e.target.value.toUpperCase())}
              className="w-full text-xs font-bold uppercase tracking-wider border border-gray-300 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition"
              autoFocus
            />
            <span className="text-[10px] text-gray-400 mt-1 block">Se registrará automáticamente en mayúsculas.</span>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Descripción / Línea de Producto
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Línea gamer de alto rendimiento con refrigeración líquida y GPU RTX"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white focus:border-blue-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* Estrategia de pasos iniciales */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-800">
              Checklist Inicial de Pasos:
            </label>

            <div className="space-y-2">
              {/* Opción 1: Plantilla Estándar */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                initStrategy === "STANDARD" ? "bg-blue-50/70 border-blue-400 shadow-xs" : "bg-white border-gray-200 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="initStrategy"
                  value="STANDARD"
                  checked={initStrategy === "STANDARD"}
                  onChange={() => setInitStrategy("STANDARD")}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>⚡ Plantilla Maestra SekaiTech (52 Pasos)</span>
                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">Recomendado</span>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                    Incluye los 52 pasos completos: montajes de chasis, BIOS, Windows, software, estaciones obligatorias de limpieza intermedia y final.
                  </p>
                </div>
              </label>

              {/* Opción 2: Clonar de modelo existente */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                initStrategy === "CLONE" ? "bg-indigo-50/70 border-indigo-400 shadow-xs" : "bg-white border-gray-200 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="initStrategy"
                  value="CLONE"
                  checked={initStrategy === "CLONE"}
                  onChange={() => setInitStrategy("CLONE")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs flex-1">
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                    <span>📋 Clonar pasos desde otro modelo</span>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Copia idénticamente los pasos y criterios de inspección de un modelo existente.
                  </p>
                  {initStrategy === "CLONE" && (
                    <div className="mt-2">
                      <select
                        value={cloneSource}
                        onChange={e => setCloneSource(e.target.value)}
                        className="w-full text-xs font-bold border border-indigo-300 rounded-lg p-2 bg-white text-indigo-900"
                      >
                        {existingModels.map(m => (
                          <option key={m.name} value={m.name}>
                            {m.name} ({m.step_count || 0} pasos)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </label>

              {/* Opción 3: En blanco */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                initStrategy === "EMPTY" ? "bg-amber-50/70 border-amber-400 shadow-xs" : "bg-white border-gray-200 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="initStrategy"
                  value="EMPTY"
                  checked={initStrategy === "EMPTY"}
                  onChange={() => setInitStrategy("EMPTY")}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-gray-900">📄 Modelo en blanco (0 Pasos)</div>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Crea el modelo vacío para cargar los pasos luego mediante archivo Excel o manualmente.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !modelName.trim()}
              className="px-5 py-2.5 bg-[#0078d4] hover:bg-[#106ebe] disabled:bg-gray-300 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition touch-target disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando Modelo...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Modelo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// MODAL EDICIÓN PASO CHECKLIST
// =============================================
function ChecklistStepModal({ item, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({ ...item });
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      setUploading(true);
      const res = await fetch(`${API_BASE}/upload-media`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Error al subir");
      const data = await res.json();
      setFormData(prev => ({ ...prev, media_url: data.url, media_type: data.type }));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-[#0078d4] text-white p-4 flex justify-between items-center sticky top-0 z-10">
            <h3 className="text-sm font-bold">
              {formData.id ? `Editar Paso #${formData.step_number}` : "Nuevo Paso"}
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">N°</label>
                <input
                  type="number"
                  required
                  value={formData.step_number}
                  onChange={(e) => setFormData({ ...formData, step_number: parseInt(e.target.value, 10) })}
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 font-bold touch-target"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Operación</label>
                <input
                  type="text"
                  required
                  value={formData.operation}
                  onChange={(e) => setFormData({ ...formData, operation: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 touch-target"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
              <textarea
                rows="2"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5"
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Criterio de Calidad</label>
              <textarea
                rows="2"
                required
                value={formData.qc_criteria}
                onChange={(e) => setFormData({ ...formData, qc_criteria: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5"
              ></textarea>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-700">Multimedia (GIF/Imagen)</label>
              <input
                type="text"
                placeholder="URL de imagen o GIF..."
                value={formData.media_url || ""}
                onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded-xl p-2.5"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="block w-full py-2.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-xl cursor-pointer hover:bg-blue-100 text-center touch-target transition flex items-center justify-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? "Subiendo..." : "📁 Subir Archivo"}</span>
                  <input type="file" accept="image/*,.gif" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="w-full py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-xl hover:bg-emerald-100 text-center touch-target flex items-center justify-center gap-1.5 transition"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>📸 Tomar Foto</span>
                </button>
              </div>
              {formData.media_url && (
                <div className="relative group">
                  <img src={formData.media_url} alt="Preview" className="w-full max-h-36 object-cover rounded-xl border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, media_url: "" }))}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1 rounded-lg text-xs transition"
                    title="Eliminar multimedia"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target">
                Cancelar
              </button>
              {formData.id && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(formData.id)}
                  className="px-4 py-3 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition touch-target flex items-center justify-center gap-1"
                  title="Eliminar este paso"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              )}
              <button type="submit" className="flex-1 py-3 text-xs font-bold bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-xl shadow transition touch-target">
                Guardar Paso
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Cámara */}
      {cameraOpen && (
        <CameraCaptureModal
          onCapture={(url, type) => {
            setFormData(prev => ({ ...prev, media_url: url, media_type: type }));
            setCameraOpen(false);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  );
}

// =============================================
// MODAL DE VISTO BUENO Y AUDITORÍA DEL SUPERVISOR QC
// =============================================
function SupervisorAuditModal({ isOpen, onClose, orderId, unitNumber, serialNumber, modelName, currentUser, onSuccess, notify }) {
  const [checks, setChecks] = useState({
    photos: true,
    cleaning: true,
    hardware: true,
    traceability: true,
    aesthetics: true
  });
  const [status, setStatus] = useState("APPROVED");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const selectedChecks = [
        checks.photos ? "📸 Evidencias Fotográficas Auditadas" : null,
        checks.cleaning ? "🧼 Limpieza Intermedia y Final Conforme" : null,
        checks.hardware ? "⚙️ Hardware, BIOS y Pruebas Verificados" : null,
        checks.traceability ? "🏷️ Trazabilidad, Serie y Marca KENYA Validados" : null,
        checks.aesthetics ? "📦 Integridad Estética y Embalaje Conforme" : null
      ].filter(Boolean);

      const res = await fetch(`${API_BASE}/supervisor/approve-unit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          unit_number: unitNumber,
          supervisor_id: currentUser?.id || "SUP-01",
          supervisor_name: currentUser?.name || "Supervisor de Calidad",
          status: status,
          checks: selectedChecks,
          photo_url: photoUrl,
          notes: notes || (status === "APPROVED" ? "Visto Bueno de Calidad Oficial Conforme" : "Observaciones en auditoría")
        })
      });
      if (!res.ok) throw new Error("Error registrando Visto Bueno del Supervisor");
      const data = await res.json();
      if (notify) notify(data.message);
      if (onSuccess) onSuccess(data);
      if (status === "APPROVED" && typeof confetti === "function") {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      }
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-200" />
            <div>
              <h3 className="text-sm font-bold">Visto Bueno de Calidad (Supervisor QC)</h3>
              <p className="text-[10px] text-amber-100 font-mono">PC #{unitNumber?.toString().padStart(2, '0')} · {orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1">
            <span className="text-[11px] font-bold text-amber-950 block">
              🛡️ Protocolo Oficial de Verificación y Dictamen de Calidad
            </span>
            <p className="text-[10px] text-amber-800 leading-relaxed">
              Como Supervisor de Planta, verifica los 5 puntos de la norma antes de liberar o bloquear esta unidad ({modelName}):
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-gray-800">1. Lista de Verificación (Checklist de Supervisión):</label>
            
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={checks.photos} 
                onChange={(e) => setChecks(prev => ({ ...prev, photos: e.target.checked }))} 
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-900 block">📸 Evidencias Fotográficas Auditadas</span>
                <span className="text-[10px] text-gray-500 block">Las fotos tomadas en los puestos son nítidas y demuestran stickers, cooler y cableado correctos.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={checks.cleaning} 
                onChange={(e) => setChecks(prev => ({ ...prev, cleaning: e.target.checked }))} 
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-900 block">🧼 Control de Limpieza Intermedia y Final</span>
                <span className="text-[10px] text-gray-500 block">Chasis sin residuos de cintillos cortados, virutas metálicas, polvo ni huellas dactilares.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={checks.hardware} 
                onChange={(e) => setChecks(prev => ({ ...prev, hardware: e.target.checked }))} 
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-900 block">⚙️ Hardware, BIOS y Pruebas Térmicas</span>
                <span className="text-[10px] text-gray-500 block">Memoria RAM total reconocida con perfil óptimo, firmware UEFI y arranque POST conforme.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={checks.traceability} 
                onChange={(e) => setChecks(prev => ({ ...prev, traceability: e.target.checked }))} 
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-900 block">🏷️ Trazabilidad, N° de Serie y Marca KENYA</span>
                <span className="text-[10px] text-gray-500 block">Serie física ({serialNumber || 'KENYA'}) coincide con etiqueta y base de datos. Logo KENYA alineado.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
              <input 
                type="checkbox" 
                checked={checks.aesthetics} 
                onChange={(e) => setChecks(prev => ({ ...prev, aesthetics: e.target.checked }))} 
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-900 block">📦 Integridad Estética y Embalaje</span>
                <span className="text-[10px] text-gray-500 block">Vidrio templado y chasis sin rayaduras, espumas de protección y accesorios completos.</span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-800 mb-1.5">2. Dictamen Oficial del Supervisor:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("APPROVED")}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-1.5 ${
                  status === "APPROVED" 
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-sm" 
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>✓ APROBADO (V°B°)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus("REJECTED")}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-1.5 ${
                  status === "REJECTED" 
                    ? "bg-rose-600 text-white border-rose-700 shadow-sm" 
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>⚠️ RECHAZAR / OBSERVAR</span>
              </button>
            </div>
          </div>

          {/* Foto de Cumplimiento Opcional tomada por el Supervisor */}
          <div>
            <label className="block text-[11px] font-bold text-gray-800 mb-1.5">
              3. Foto de Cumplimiento Tomada por el Supervisor:
            </label>
            {photoUrl ? (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-xl border border-amber-300">
                <img src={photoUrl} alt="Foto cumplimiento" className="w-12 h-12 object-cover rounded-lg border border-amber-400" />
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-bold text-amber-950 block">📸 Foto de Cumplimiento Adjunta</span>
                  <span className="text-[10px] text-amber-800">Se registrará como evidencia oficial del supervisor</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold"
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="p-1 text-gray-400 hover:text-rose-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Camera className="w-4 h-4 text-amber-600" />
                <span>📸 Tomar Foto de Cumplimiento (Supervisor)</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              4. Notas / Observaciones de Auditoría (Opcional):
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Verificado ensamblaje y evidencias fotográficas. Unidad liberada para embalaje."
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 focus:border-amber-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition touch-target flex items-center justify-center gap-1.5 ${
                status === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{status === "APPROVED" ? "Firmar Visto Bueno" : "Registrar Rechazo"}</span>
            </button>
          </div>
        </form>

        {cameraOpen && (
          <CameraCaptureModal
            title={`Foto de Cumplimiento · PC #${unitNumber}`}
            subtitle="Evidencia para Dictamen del Supervisor"
            prefix={`audit_${orderId}_pc${unitNumber}`}
            onCapture={(url) => {
              setPhotoUrl(url);
              setCameraOpen(false);
            }}
            onClose={() => setCameraOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// =============================================
// MODAL DETALLE PC (CON REPORTE DE FALLAS Y EVIDENCIA FOTOGRÁFICA DE PASOS)
// =============================================
function UnitDetailModal({ unit, order, stations, issues = [], currentUser, onPreviewPhoto, onClose, onSuccess, notify }) {
  const [loading, setLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
  const [supervisorAuditData, setSupervisorAuditData] = useState(null);
  const [unitLogs, setUnitLogs] = useState([]);
  const unitIssues = (issues || []).filter(i => i.unit_number === unit.unit_number);

  useEffect(() => {
    if (order?.order_id) {
      fetch(`${API_BASE}/orders/${order.order_id}/logs`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setUnitLogs(data.filter(l => l.unit_number === unit.unit_number && l.status === "PASS"));
          }
        })
        .catch(() => {});
      
      // Consultar auditoría de supervisión
      fetch(`${API_BASE}/supervisor/unit/${order.order_id}/${unit.unit_number}/audit`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.latest) setSupervisorAuditData(data.latest); })
        .catch(() => {});
    }
  }, [order?.order_id, unit.unit_number]);

  const unitPhotos = unitLogs.filter(l => l.photo_url);

  const handleResetUnit = async () => {
    if (!window.confirm(`¿Seguro que deseas reiniciar la PC #${unit.unit_number}? Su progreso volverá a Estación 1 y se limpiarán sus registros.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}/units/${unit.unit_number}/reset`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al reiniciar");
      onSuccess(data.message || `PC #${unit.unit_number} reiniciada`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUnit = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}/units/${unit.unit_number}/resume`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al reanudar PC");
      onSuccess(data.message || `PC #${unit.unit_number} reincorporada`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (currentUser?.role !== "ADMIN") {
      alert("La eliminación definitiva de unidades está reservada exclusivamente para el Administrador del Sistema.");
      return;
    }
    if (!window.confirm(`¿ELIMINAR definitivamente la PC #${unit.unit_number} de la orden? Esta acción reducirá el total de unidades del lote.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}/units/${unit.unit_number}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al eliminar");
      onSuccess(data.message || `PC #${unit.unit_number} eliminada`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorApproval = () => {
    setSupervisorModalOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
          <div className="bg-[#0078d4] text-white p-4 flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              <h3 className="text-sm font-bold">PC #{unit.unit_number.toString().padStart(2, '0')} — Ficha de Unidad</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold block">N° Serie</span>
                <p className="font-mono font-bold text-gray-900 text-[11px] break-all">{unit.serial_number}</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold block">Orden</span>
                <p className="font-bold text-blue-700">{order.order_id}</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold block">Estado Actual</span>
                <div className="mt-0.5">
                  {unit.overall_status === "PASSED" && <Badge variant="success">COMPLETADA</Badge>}
                  {unit.overall_status === "FAILED" && <Badge variant="danger">CON FALLA (BLOQUEADA)</Badge>}
                  {unit.overall_status === "IN_PROGRESS" && <Badge variant="warning">EN PROCESO</Badge>}
                  {unit.overall_status === "PENDING" && <Badge variant="neutral">EN COLA</Badge>}
                </div>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold block">Ubicación</span>
                <p className="font-bold text-emerald-700">
                  {unit.current_station > stations.length ? "EMPACADO ✓" : `Estación ${unit.current_station}`}
                </p>
              </div>
            </div>

            {/* Evidencia Fotográfica de Pasos Verificados */}
            {unitPhotos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Fotos de Verificación ({unitPhotos.length})</span>
                  </p>
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                    Evidencia OK
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {unitPhotos.map((l, idx) => (
                    <div
                      key={idx}
                      onClick={() => onPreviewPhoto && onPreviewPhoto({
                        url: l.photo_url,
                        title: `PC #${unit.unit_number.toString().padStart(2, '0')} · Paso #${l.step_number}`,
                        subtitle: `Estación ${l.station_number}`,
                        user_name: l.user_name,
                        timestamp: l.timestamp
                      })}
                      className="group relative rounded-xl overflow-hidden border border-emerald-200 bg-slate-900 cursor-pointer shadow-xs aspect-square"
                    >
                      <img
                        src={l.photo_url}
                        alt={`Paso ${l.step_number}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-white">
                        <span className="text-[10px] font-bold block leading-none">Paso #{l.step_number}</span>
                        <span className="text-[8px] text-slate-300 block truncate mt-0.5">{l.user_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reportes de Falla con Evidencia Fotográfica */}
            {unitIssues.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Incidencias / Fallas Reportadas ({unitIssues.length})</span>
                </p>
                {unitIssues.map((iss, idx) => (
                  <div key={idx} className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900 text-xs">{iss.issue_title}</span>
                      <Badge variant="danger">{iss.severity}</Badge>
                    </div>
                    {iss.description && (
                      <p className="text-[11px] text-rose-800 leading-relaxed">{iss.description}</p>
                    )}
                    <div className="text-[10px] text-rose-600 flex items-center justify-between">
                      <span>Reportado por: <strong>{iss.reported_by}</strong></span>
                      <span>Estación {iss.station_number}</span>
                    </div>
                    {iss.photo_url && (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-gray-700 block mb-1">📸 Foto de Evidencia:</span>
                        <div 
                          onClick={() => onPreviewPhoto && onPreviewPhoto({
                            url: iss.photo_url,
                            title: `Falla PC #${unit.unit_number} · ${iss.issue_title}`,
                            subtitle: `Reportado por ${iss.reported_by}`,
                            user_name: iss.reported_by
                          })}
                          className="block relative group overflow-hidden rounded-lg border border-rose-300 cursor-pointer"
                        >
                          <img
                            src={iss.photo_url}
                            alt="Foto de la falla"
                            className="w-full h-36 object-cover group-hover:scale-105 transition duration-200"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-2 py-0.5 rounded backdrop-blur-sm">
                            🔍 Clic para ampliar
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Acciones de gestión de la PC */}
            <div className="pt-2 border-t border-gray-200 space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acciones de Control</p>
              
              {unit.overall_status === "FAILED" && (
                <button
                  disabled={loading}
                  onClick={handleResumeUnit}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition disabled:opacity-50 touch-target"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>✓ Subsanar Falla y Reanudar PC en Línea</span>
                </button>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={() => setTransferModalOpen(true)}
                className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 touch-target"
              >
                <ArrowRightCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Derivar / Mover a otra Estación</span>
              </button>

              {currentUser?.role === "SUPERVISOR" && (
                <button
                  type="button"
                  onClick={handleSupervisorApproval}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition touch-target"
                >
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>🛡️ Visto Bueno de Calidad (Supervisor)</span>
                </button>
              )}

              <div className={`grid ${currentUser?.role === "ADMIN" ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                <button
                  disabled={loading}
                  onClick={handleResetUnit}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 touch-target"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reiniciar a E1</span>
                </button>
                {currentUser?.role === "ADMIN" && (
                  <button
                    disabled={loading}
                    onClick={handleDeleteUnit}
                    className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 touch-target"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Eliminar PC</span>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-xs transition touch-target"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {transferModalOpen && (
        <TransferUnitModal
          unit={unit}
          order={order}
          currentStation={unit.current_station}
          allStations={stations}
          currentUser={currentUser || { name: "Supervisor / Admin" }}
          onClose={() => setTransferModalOpen(false)}
          onSuccess={(msg) => {
            setTransferModalOpen(false);
            onSuccess(msg);
          }}
        />
      )}

      {supervisorModalOpen && (
        <SupervisorAuditModal
          isOpen={supervisorModalOpen}
          onClose={() => setSupervisorModalOpen(false)}
          orderId={order.order_id}
          unitNumber={unit.unit_number}
          serialNumber={unit.serial_number}
          modelName={order.model_name}
          currentUser={currentUser}
          notify={notify}
          onSuccess={(res) => {
            setSupervisorModalOpen(false);
            setSupervisorAuditData({
              supervisor_name: currentUser?.name || "Supervisor de Calidad",
              status: res.unit?.supervisor_approved ? "APPROVED" : "REJECTED",
              created_at: new Date().toISOString(),
              notes: res.notes || ""
            });
            if (onSuccess) onSuccess(res.message || "✓ Visto Bueno registrado");
          }}
        />
      )}
    </>
  );
}

// =============================================
// MODAL AGREGAR PCS AL LOTE
// =============================================
function AddUnitsModal({ order, onClose, onSuccess }) {
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (count < 1) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: parseInt(count, 10) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al agregar PCs");
      onSuccess(data.message);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-[#0078d4] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            <h3 className="text-sm font-bold">Agregar PCs a la Orden</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleAdd} className="p-4 space-y-4 text-xs">
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
            <p className="font-semibold text-blue-900">Orden activa: {order.order_id}</p>
            <p className="text-blue-700 text-[11px] mt-0.5">Modelo: {order.model_name} · Total actual: {order.total_units} PCs</p>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">¿Cuántas PCs deseas agregar?</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[1, 5, 10, 20].map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setCount(n)}
                  className={`py-2 rounded-lg font-bold border transition ${
                    count === n ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  +{n}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="500"
              required
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
              className="w-full text-sm font-bold border border-gray-300 rounded-xl p-2.5 touch-target focus:border-blue-600 focus:outline-none"
            />
            <p className="text-[11px] text-gray-500 mt-1">Las nuevas PCs ingresarán directamente a la cola de la Estación 1 con números de serie correlativos.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#0078d4] hover:bg-[#106ebe] text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50 touch-target"
            >
              {loading ? "Agregando..." : `Confirmar (+${count} PCs)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// MODAL LIMPIAR / REINICIAR LOTE
// =============================================
function ResetOrderModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}/reset`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al reiniciar");
      onSuccess(data.message || "Lote reiniciado exitosamente");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-amber-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            <h3 className="text-sm font-bold">Limpiar y Reiniciar Lote</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 text-xs">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl">
            <p className="font-bold flex items-center gap-1 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>¿Reiniciar la orden {order.order_id}?</span>
            </p>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Esta acción regresará todas las <strong>{order.total_units} PCs</strong> a la <strong>Estación 1</strong> con estado inicial (Pendiente / 0 pasos) y limpiará todos los registros de prueba e incidencias anteriores.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition touch-target"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleReset}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50 touch-target"
            >
              {loading ? "Reiniciando..." : "Sí, Limpiar Lote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MODAL ELIMINAR ORDEN
// =============================================
function DeleteOrderModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/orders/${order.order_id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al eliminar");
      onSuccess(data.message || "Orden eliminada exitosamente");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-rose-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            <h3 className="text-sm font-bold">Eliminar Orden de Producción</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 text-xs">
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-xl">
            <p className="font-bold flex items-center gap-1 mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>¿Eliminar orden {order.order_id}?</span>
            </p>
            <p className="text-[11px] leading-relaxed text-rose-800">
              Esta acción eliminará de forma permanente la orden, todas sus estaciones asignadas, las {order.total_units} PCs y el histórico de auditoría asociado.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition touch-target"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50 touch-target"
            >
              {loading ? "Eliminando..." : "Sí, Eliminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MODAL EDITAR ORDEN DE PRODUCCIÓN
// Permite editar modelo, P/N, unidades, estado, supervisor y asignación dual de técnicos por estación/paso
// =============================================
function EditOrderModal({ order, stations: initialStations = [], models = [], users = [], onClose, onSuccess, notify }) {
  const [modelName, setModelName] = useState(order?.model_name || "");
  const [partNumber, setPartNumber] = useState(order?.part_number || "");
  const [totalUnits, setTotalUnits] = useState(order?.total_units || 1);
  const [status, setStatus] = useState(order?.status || "IN_PROGRESS");
  const [supervisorId, setSupervisorId] = useState(order?.supervisor_id || "");
  const [supervisorName, setSupervisorName] = useState(order?.supervisor_name || "");
  const [loading, setLoading] = useState(false);
  const [visualPickerStation, setVisualPickerStation] = useState(null);
  const [modelSteps, setModelSteps] = useState([]);

  // Cargar checklist del modelo seleccionado
  const loadModelSteps = useCallback(async (model) => {
    if (!model) return;
    try {
      const res = await fetch(`${API_BASE}/models/${model}/checklist`);
      if (res.ok) {
        const data = await res.json();
        setModelSteps(data);
      }
    } catch (e) {
      console.error("Error cargando pasos del modelo:", e);
    }
  }, []);

  useEffect(() => {
    loadModelSteps(modelName);
  }, [modelName, loadModelSteps]);

  // Sincronizar nombre de supervisor al cambiar supervisorId
  const handleSupervisorChange = (newSupId) => {
    setSupervisorId(newSupId);
    if (!newSupId) {
      setSupervisorName("");
    } else {
      const u = users.find(x => x.id === newSupId);
      setSupervisorName(u ? u.name : "");
    }
  };

  // Lista de estaciones inicializada desde initialStations
  const [stationsList, setStationsList] = useState(() => {
    if (!initialStations || initialStations.length === 0) return [];
    return initialStations.map(st => {
      let stepNums = [];
      if (Array.isArray(st.step_numbers)) {
        stepNums = st.step_numbers;
      } else if (typeof st.step_numbers === "string" && st.step_numbers.trim()) {
        stepNums = st.step_numbers.split(/[,;\s]+/).map(x => parseInt(x, 10)).filter(n => !isNaN(n) && n > 0);
      } else if (st.start_step && st.end_step) {
        for (let i = st.start_step; i <= st.end_step; i++) stepNums.push(i);
      }
      return {
        station_number: st.station_number,
        station_name: st.station_name || `Estación ${st.station_number}`,
        user_id: st.user_id || "",
        user_name: st.user_name || "",
        secondary_user_id: st.secondary_user_id || "",
        secondary_user_name: st.secondary_user_name || "",
        is_cleaning_station: !!(st.is_cleaning_station || st.station_type === "CLEANING" || (st.station_name || "").toLowerCase().includes("limpieza")),
        station_type: st.station_type || (st.is_cleaning_station ? "CLEANING" : "ASSEMBLY"),
        step_numbers: stepNums,
        rawStepsInput: stepNums.length > 0 ? stepNums.join(", ") : ""
      };
    });
  });

  // Conteo de estaciones de limpieza
  const cleaningCount = useMemo(() => {
    return stationsList.filter(
      st => st.is_cleaning_station || st.station_type === "CLEANING" || (st.station_name || "").toLowerCase().includes("limpieza")
    ).length;
  }, [stationsList]);

  // Handlers para técnicos
  const handlePrimaryTechChange = (idx, newUserId) => {
    const u = users.find(x => x.id === newUserId);
    setStationsList(prev => prev.map((st, i) => {
      if (i !== idx) return st;
      return {
        ...st,
        user_id: newUserId,
        user_name: u ? u.name : ""
      };
    }));
  };

  const handleSecondaryTechChange = (idx, newUserId) => {
    const u = users.find(x => x.id === newUserId);
    setStationsList(prev => prev.map((st, i) => {
      if (i !== idx) return st;
      return {
        ...st,
        secondary_user_id: newUserId || "",
        secondary_user_name: u ? u.name : ""
      };
    }));
  };

  const handleToggleCleaning = (idx) => {
    setStationsList(prev => prev.map((st, i) => {
      if (i !== idx) return st;
      const nextClean = !st.is_cleaning_station;
      return {
        ...st,
        is_cleaning_station: nextClean,
        station_type: nextClean ? "CLEANING" : "ASSEMBLY"
      };
    }));
  };

  const handleStationNameChange = (idx, name) => {
    setStationsList(prev => prev.map((st, i) => {
      if (i !== idx) return st;
      return { ...st, station_name: name };
    }));
  };

  const handleStepsInputChange = (idx, rawVal) => {
    const parsed = parseStepNumbersInput(rawVal, modelSteps.length || 500);
    setStationsList(prev => prev.map((st, i) => {
      if (i !== idx) return st;
      return {
        ...st,
        rawStepsInput: rawVal,
        step_numbers: parsed
      };
    }));
  };

  const handleAutoDistribute = () => {
    const totalSteps = modelSteps.length || 52;
    const numStations = stationsList.length || 1;
    const baseCount = Math.floor(totalSteps / numStations);
    const remainder = totalSteps % numStations;
    let currentStart = 1;

    setStationsList(prev => prev.map((st, i) => {
      const extra = i + 1 <= remainder ? 1 : 0;
      const count = baseCount + extra;
      const currentEnd = currentStart + count - 1;
      const stSteps = [];
      for (let s = currentStart; s <= currentEnd; s++) {
        stSteps.push(s);
      }
      currentStart = currentEnd + 1;
      return {
        ...st,
        step_numbers: stSteps,
        rawStepsInput: stSteps.join(", ")
      };
    }));
    notify?.("Pasos redistribuidos equitativamente entre las estaciones", "info");
  };

  const handleAddStation = () => {
    const nextNum = stationsList.length + 1;
    const op = users[(nextNum - 1) % users.length] || { id: `OP-${100 + nextNum}`, name: `Operario ${nextNum}` };
    setStationsList(prev => [
      ...prev,
      {
        station_number: nextNum,
        station_name: `Estación ${nextNum}`,
        user_id: op.id,
        user_name: op.name,
        secondary_user_id: "",
        secondary_user_name: "",
        is_cleaning_station: false,
        station_type: "ASSEMBLY",
        step_numbers: [],
        rawStepsInput: ""
      }
    ]);
  };

  const handleRemoveStation = (idxToRemove) => {
    if (stationsList.length <= 2) {
      alert("Una orden de producción debe tener al menos 2 estaciones.");
      return;
    }
    const filtered = stationsList.filter((_, idx) => idx !== idxToRemove);
    const renumbered = filtered.map((st, idx) => ({
      ...st,
      station_number: idx + 1
    }));
    setStationsList(renumbered);
  };

  // Handlers para StepPickerModal
  const handleToggleStep = (targetStationIdx, stepNum) => {
    setStationsList(prev => prev.map((st, idx) => {
      const current = new Set(st.step_numbers || []);
      if (idx === targetStationIdx) {
        if (current.has(stepNum)) current.delete(stepNum);
        else current.add(stepNum);
      } else {
        current.delete(stepNum);
      }
      const updated = Array.from(current).sort((a, b) => a - b);
      return {
        ...st,
        step_numbers: updated,
        rawStepsInput: updated.join(", ")
      };
    }));
  };

  const handleAddStepRange = (targetStationIdx, from, to) => {
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    const toAdd = new Set();
    for (let i = min; i <= max; i++) toAdd.add(i);

    setStationsList(prev => prev.map((st, idx) => {
      const current = new Set(st.step_numbers || []);
      if (idx === targetStationIdx) {
        toAdd.forEach(n => current.add(n));
      } else {
        toAdd.forEach(n => current.delete(n));
      }
      const updated = Array.from(current).sort((a, b) => a - b);
      return {
        ...st,
        step_numbers: updated,
        rawStepsInput: updated.join(", ")
      };
    }));
  };

  const handleClearStationSteps = (targetStationIdx) => {
    setStationsList(prev => prev.map((st, idx) => {
      if (idx !== targetStationIdx) return st;
      return { ...st, step_numbers: [], rawStepsInput: "" };
    }));
  };

  const handleClaimAllFreeSteps = (targetStationIdx) => {
    const total = modelSteps.length || 52;
    const allAssigned = new Set();
    stationsList.forEach(st => {
      (st.step_numbers || []).forEach(n => allAssigned.add(n));
    });
    const free = [];
    for (let i = 1; i <= total; i++) {
      if (!allAssigned.has(i)) free.push(i);
    }
    if (free.length === 0) return;

    setStationsList(prev => prev.map((st, idx) => {
      if (idx !== targetStationIdx) return st;
      const current = new Set(st.step_numbers || []);
      free.forEach(n => current.add(n));
      const updated = Array.from(current).sort((a, b) => a - b);
      return { ...st, step_numbers: updated, rawStepsInput: updated.join(", ") };
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (cleaningCount < 2) {
      alert(`Regla de Calidad Obligatoria: La línea debe incluir al menos 2 estaciones designadas para Limpieza. Actualmente tienes ${cleaningCount}.`);
      return;
    }

    for (const st of stationsList) {
      if (!st.user_id) {
        alert(`La Estación ${st.station_number} (${st.station_name}) requiere un 1er Técnico (titular) asignado.`);
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        model_name: modelName,
        part_number: partNumber,
        total_units: parseInt(totalUnits, 10),
        status: status,
        supervisor_id: supervisorId || null,
        supervisor_name: supervisorName || null,
        stations: stationsList.map(st => ({
          station_number: st.station_number,
          station_name: st.station_name,
          user_id: st.user_id,
          user_name: st.user_name,
          secondary_user_id: st.secondary_user_id || null,
          secondary_user_name: st.secondary_user_name || null,
          step_numbers: st.step_numbers || [],
          is_cleaning_station: !!st.is_cleaning_station,
          station_type: st.is_cleaning_station ? "CLEANING" : (st.station_type || "ASSEMBLY")
        }))
      };

      const res = await fetch(`${API_BASE}/orders/${order.order_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error al actualizar la orden");
      }

      onSuccess(data.message || "Orden actualizada exitosamente");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-gray-200">
        
        {/* Cabecera del Modal */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shadow">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Editar Orden de Producción</h3>
                <span className="bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded text-xs font-mono font-bold">
                  {order.order_id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ajusta parámetros, supervisor de calidad y asignaciones de los 2 técnicos por estación/paso
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition touch-target flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario Principal */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          
          {/* Tarjeta: Parámetros del Lote */}
          <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Parámetros del Lote y Modelo</span>
              </h4>
              <Badge variant="info">Orden Activa</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Modelo de PC */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Modelo de PC</label>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2.5 bg-white focus:border-blue-600 focus:outline-none"
                >
                  {models.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.step_count || 52} pasos)
                    </option>
                  ))}
                </select>
              </div>

              {/* Número de Parte */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nº de Parte (P/N)</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="Ej: PN-PRO-01"
                  className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2.5 bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Total Unidades */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Cantidad de PCs</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(parseInt(e.target.value, 10) || 1)}
                  className="w-full text-xs font-bold border border-gray-300 rounded-xl p-2.5 bg-white focus:border-blue-600 focus:outline-none font-mono"
                />
              </div>

              {/* Estado de la Orden */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Estado de la Orden</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs font-bold border border-gray-300 rounded-xl p-2.5 bg-white focus:border-blue-600 focus:outline-none"
                >
                  <option value="IN_PROGRESS">🟡 En Proceso (IN_PROGRESS)</option>
                  <option value="PAUSED">⏸️ Pausada (PAUSED)</option>
                  <option value="COMPLETED">🟢 Finalizada (COMPLETED)</option>
                </select>
              </div>
            </div>

            {totalUnits < (order.total_units || 0) && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl flex items-center gap-2 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Atención:</strong> Disminuir la cantidad de unidades eliminará únicamente aquellas PCs excedentes que sigan en estado PENDING y sin avance.
                </span>
              </div>
            )}

            {/* Asignación de Supervisor de Calidad */}
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="font-bold text-purple-900 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>Supervisor de Calidad Asignado</span>
                </label>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  📸 Rol: Valida con Fotos de Cumplimiento
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <select
                  value={supervisorId}
                  onChange={(e) => handleSupervisorChange(e.target.value)}
                  className="w-full text-xs font-semibold border border-purple-300 rounded-xl p-2.5 bg-white focus:border-purple-600 focus:outline-none"
                >
                  <option value="">-- Sin supervisor asignado --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.role === "SUPERVISOR" ? "⭐ (Supervisor Calidad)" : u.role === "ADMIN" ? "👑 (Administrador)" : `(${u.role})`}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-purple-800 leading-tight">
                  El supervisor es el encargado de verificar el cumplimiento de los pasos y certificar la orden capturando fotos de evidencia directa.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta: Estaciones de Trabajo y Técnicos Duales */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-gray-200">
              <div>
                <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Estaciones de Trabajo y Técnicos ({stationsList.length})</span>
                </h4>
                <p className="text-[11px] text-gray-500">
                  Asigna hasta 2 técnicos por paso/estación (titular y co-operario de apoyo) y cumple la regla de limpieza.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {cleaningCount >= 2 ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{cleaningCount} Estaciones Limpieza (Válido)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>{cleaningCount}/2 Estaciones Limpieza (Faltan {2 - cleaningCount})</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleAutoDistribute}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-lg transition text-[11px] flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Distribuir Pasos</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddStation}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition text-[11px] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Estación</span>
                </button>
              </div>
            </div>

            {/* Listado de Estaciones */}
            <div className="space-y-3">
              {stationsList.map((st, idx) => (
                <div
                  key={st.station_number}
                  className={`rounded-2xl border p-4 transition space-y-3 ${
                    st.is_cleaning_station
                      ? "bg-emerald-50/40 border-emerald-200 shadow-sm"
                      : "bg-white border-gray-200 shadow-sm"
                  }`}
                >
                  {/* Fila 1: Nombre de Estación y Limpieza */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-gray-900 text-white font-mono flex-shrink-0">
                        Estación {st.station_number}
                      </span>
                      <input
                        type="text"
                        value={st.station_name}
                        onChange={(e) => handleStationNameChange(idx, e.target.value)}
                        placeholder="Nombre de estación (ej: Chasis y Montaje)..."
                        className="flex-1 text-xs font-semibold border border-gray-300 rounded-lg p-1.5 bg-white focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCleaning(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          st.is_cleaning_station
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                        }`}
                      >
                        <span>🧼 Estación Limpieza</span>
                        {st.is_cleaning_station && <Check className="w-3.5 h-3.5" />}
                      </button>

                      {stationsList.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStation(idx)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Eliminar estación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fila 2: Dos Técnicos Asignados */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* 1er Técnico (Titular) */}
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1 text-[11px]">
                        1er Técnico (Titular) <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={st.user_id}
                        onChange={(e) => handlePrimaryTechChange(idx, e.target.value)}
                        required
                        className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2 bg-white focus:border-blue-600 focus:outline-none"
                      >
                        <option value="">-- Seleccionar Técnico Titular --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2do Técnico (Co-operario / Apoyo) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-gray-700 text-[11px]">
                          2do Técnico (Co-operario / Apoyo)
                        </label>
                        {st.secondary_user_id && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                            👥 2 Técnicos Activos
                          </span>
                        )}
                      </div>
                      <select
                        value={st.secondary_user_id || ""}
                        onChange={(e) => handleSecondaryTechChange(idx, e.target.value)}
                        className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2 bg-white focus:border-blue-600 focus:outline-none"
                      >
                        <option value="">-- (Opcional) Sin 2do técnico --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id} disabled={u.id === st.user_id}>
                            {u.name} ({u.role}) {u.id === st.user_id ? "— (Ya es 1er técnico)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fila 3: Pasos Asignados */}
                  <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-200/80 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-[11px]">Pasos Asignados:</span>
                        <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          {st.step_numbers.length} pasos
                        </span>
                        <span className="text-gray-500 font-mono text-[11px]">
                          {formatStepNumbersRange(st.step_numbers)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setVisualPickerStation(idx)}
                          className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold rounded-lg text-[11px] transition flex items-center gap-1"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          <span>Selector Visual</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearStationSteps(idx)}
                          className="px-2 py-1 text-gray-400 hover:text-rose-600 rounded text-[11px] transition"
                          title="Vaciar pasos"
                        >
                          Vaciar
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={st.rawStepsInput}
                      onChange={(e) => handleStepsInputChange(idx, e.target.value)}
                      placeholder="Ej: 1-10, 15, 20-25"
                      className="w-full text-xs font-mono border border-gray-300 rounded-lg p-1.5 bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm p-2">
            <div>
              {cleaningCount < 2 ? (
                <p className="text-rose-600 font-bold text-xs flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>Requiere mínimo 2 estaciones de limpieza para poder guardar.</span>
                </p>
              ) : (
                <p className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Cumple con las 2 estaciones de limpieza obligatorias.</span>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition touch-target"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || cleaningCount < 2}
                className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 touch-target flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? "Guardando Cambios..." : "Guardar Cambios"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Modal Selector Visual de Pasos Reutilizable */}
        {visualPickerStation !== null && stationsList[visualPickerStation] && (
          <StepPickerModal
            isOpen={true}
            onClose={() => setVisualPickerStation(null)}
            stationIdx={visualPickerStation}
            station={stationsList[visualPickerStation]}
            modelSteps={modelSteps}
            allStations={stationsList}
            onToggleStep={handleToggleStep}
            onAddStepRange={handleAddStepRange}
            onClearStationSteps={handleClearStationSteps}
            onClaimAllFreeSteps={handleClaimAllFreeSteps}
          />
        )}
      </div>
    </div>
  );
}

// =============================================
// VISTA GESTIÓN DE TÉCNICOS
// =============================================
function TechniciansManagementView({ users, onRefreshUsers, notify }) {
  const [filterRole, setFilterRole] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalUser, setModalUser] = useState(null); // null = cerrado, { isNew: true } o { isNew: false, ...user }
  const [loading, setLoading] = useState(false);

  const filteredUsers = useMemo(() => {
    return (users || []).filter(u => {
      const matchRole = filterRole === "ALL" || u.role === filterRole;
      const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, filterRole, searchTerm]);

  const handleSaveUser = async (formData) => {
    try {
      setLoading(true);
      if (modalUser.isNew) {
        const res = await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: formData.id,
            name: formData.name,
            role: formData.role,
            avatar: formData.avatar
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al crear técnico");
        notify("Técnico registrado correctamente");
      } else {
        const res = await fetch(`${API_BASE}/users/${formData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            role: formData.role,
            avatar: formData.avatar
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al actualizar técnico");
        notify("Datos del técnico actualizados correctamente");
      }
      setModalUser(null);
      onRefreshUsers();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`¿Deseas eliminar o desactivar al técnico ${user.name} (${user.id})?`)) return;
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al eliminar");
      notify(data.message || "Técnico eliminado");
      onRefreshUsers();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-4 fade-in">
      {/* Header */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0078d4] flex items-center justify-center flex-shrink-0 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Personal Técnico y Operarios</h2>
              <p className="text-xs text-gray-500">Administra técnicos, cambia nombres y asigna roles de estación</p>
            </div>
          </div>

          <button
            onClick={() => setModalUser({ isNew: true, id: `OP-${Math.floor(100 + Math.random() * 900)}`, name: "", role: "OPERATOR", avatar: "" })}
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition touch-target"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Registrar Nuevo Técnico</span>
          </button>
        </div>
      </Card>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
        <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {[
            { id: "ALL", label: "Todos" },
            { id: "OPERATOR", label: "Operarios" },
            { id: "SUPERVISOR", label: "Supervisores" },
            { id: "ADMIN", label: "Admins" }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilterRole(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterRole === t.id ? "bg-[#0078d4] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Técnicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredUsers.map(user => {
          const isAdmin = user.role === "ADMIN";
          const isSupervisor = user.role === "SUPERVISOR";
          return (
            <Card key={user.id} className="p-3.5 hover:border-blue-300 transition shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center border shadow-sm ${
                    isAdmin
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : isSupervisor
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {user.avatar || user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs">{user.name}</h4>
                    <p className="font-mono text-[10px] text-gray-500 font-medium">{user.id}</p>
                  </div>
                </div>
                <Badge variant={isAdmin ? "warning" : isSupervisor ? "purple" : "info"}>
                  {isAdmin ? "👑 ADMIN" : isSupervisor ? "🛡️ SUPERVISOR" : "🔧 OPERARIO"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setModalUser({ isNew: false, ...user })}
                  className="flex-1 py-2 px-3 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 font-semibold rounded-lg text-xs border border-gray-200 flex items-center justify-center gap-1.5 transition touch-target"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar Nombre</span>
                </button>
                <button
                  onClick={() => handleDeleteUser(user)}
                  className="p-2 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg border border-gray-200 transition touch-target"
                  title="Eliminar técnico"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="p-8 text-center text-gray-500 text-xs">
          No se encontraron técnicos con el criterio de búsqueda.
        </Card>
      )}

      {/* Modal Crear / Editar Técnico */}
      {modalUser && (
        <TechnicianFormModal
          data={modalUser}
          loading={loading}
          onClose={() => setModalUser(null)}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}

// Formulario Modal para Técnico
function TechnicianFormModal({ data, loading, onClose, onSave }) {
  const [formData, setFormData] = useState({
    id: data.id || "",
    name: data.name || "",
    role: data.role || "OPERATOR",
    avatar: data.avatar || ""
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl">
        <div className="bg-[#0078d4] text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h3 className="text-sm font-bold">
              {data.isNew ? "Registrar Nuevo Técnico" : `Editar Técnico — ${formData.id}`}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Nombre Completo del Técnico / Operario</label>
            <input
              type="text"
              required
              placeholder="Ej: Carlos Mendoza Flores"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs font-medium border border-gray-300 rounded-xl p-2.5 touch-target focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">ID de Usuario</label>
              <input
                type="text"
                required
                disabled={!data.isNew}
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                className="w-full font-mono text-xs font-bold border border-gray-300 rounded-xl p-2.5 bg-gray-50 touch-target disabled:opacity-75"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Rol en Sistema</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2.5 bg-white touch-target focus:border-blue-600 focus:outline-none"
              >
                <option value="OPERATOR">Operario de Estación</option>
                <option value="SUPERVISOR">Supervisor de Planta / Calidad</option>
                <option value="ADMIN">Administrador QC</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Iniciales / Avatar (Opcional)</label>
            <input
              type="text"
              maxLength="3"
              placeholder="Ej: CM"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value.toUpperCase() })}
              className="w-full font-mono text-xs border border-gray-300 rounded-xl p-2.5 touch-target"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#0078d4] hover:bg-[#106ebe] text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50 touch-target"
            >
              {loading ? "Guardando..." : "Guardar Técnico"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
