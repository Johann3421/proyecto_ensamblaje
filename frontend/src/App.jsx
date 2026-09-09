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

  const loadOperatorWorkspace = (unitNumber = null, orderId = null) => {
    if (!currentUser?.id) return;
    const params = new URLSearchParams();
    if (unitNumber) params.append("unit_number", unitNumber);
    if (orderId) params.append("order_id", orderId);
    else if (selectedOrder) params.append("order_id", selectedOrder);

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

  const OPERATOR_TABS = [
    { id: "operator", label: "Mi Estación", shortLabel: "Trabajo", icon: CheckSquare },
  ];

  const tabs = currentUser.role === "ADMIN" ? ADMIN_TABS : OPERATOR_TABS;

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
                {currentUser.role === 'ADMIN' ? '👑' : '🔧'}
              </span>
              <span className="text-white font-medium text-xs max-w-[120px] sm:max-w-none truncate">
                {currentUser.name}
              </span>
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
            />
          )}
          {activeTab === "create-order" && (
            <CreateOrderView
              models={models}
              users={users.filter(u => u.role === "OPERATOR")}
              onSuccess={(orderId) => {
                notify("¡Orden y línea de producción creada exitosamente!");
                loadInitialData();
                setSelectedOrder(orderId);
                navigate("matrix");
              }}
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
              onSelectUnit={(unitNum) => loadOperatorWorkspace(unitNum, selectedOrder)}
              onSelectOrder={(ordId) => {
                setSelectedOrder(ordId);
                loadOperatorWorkspace(null, ordId);
              }}
              onRefresh={() => loadOperatorWorkspace(null, selectedOrder)}
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
      {selectedUnitDetail && matrixData && (
        <UnitDetailModal
          unit={selectedUnitDetail}
          order={matrixData.order}
          stations={matrixData.stations}
          issues={matrixData.issues || []}
          onPreviewPhoto={(photo) => setActivePhotoPreview(photo)}
          onClose={() => setSelectedUnitDetail(null)}
          onSuccess={(msg) => {
            notify(msg);
            setSelectedUnitDetail(null);
            loadMatrixData();
          }}
        />
      )}
    </div>
  );
}

// =============================================
// 1. MATRIZ DE PIPELINE
// =============================================
function PipelineMatrixView({ matrixData, orders, selectedOrder, setSelectedOrder, onOpenEmergency, onSelectUnit, onRefresh, onOpenAddUnits, onOpenResetOrder, onOpenDeleteOrder }) {
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
              </div>
              <p className="text-xs text-gray-500 truncate">{order.total_units} PCs · {order.total_stations} Estaciones</p>
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
// 2. CREADOR DE ORDEN
// =============================================
function CreateOrderView({ models, users, onSuccess }) {
  const [modelName, setModelName] = useState(models[0]?.name || "PROWORK");
  const [orderId, setOrderId] = useState(`ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [partNumber, setPartNumber] = useState("90MB0YZ0-M0EAY0");
  const [totalUnits, setTotalUnits] = useState(50);
  const [stationCount, setStationCount] = useState(5);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [modelSteps, setModelSteps] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/models/${modelName}/checklist`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setModelSteps(data); })
      .catch(() => {});
  }, [modelName]);

  useEffect(() => {
    const defaultNames = [
      "Chasis, Montaje y Placas",
      "Protecciones, Discos y GPU",
      "BIOS, SO Windows y Pruebas",
      "Personalización, Software y Serie",
      "Stickers, Limpieza y Embalaje"
    ];
    const initial = Array.from({ length: stationCount }, (_, i) => {
      const op = users[i % users.length] || { id: `OP-${101 + i}`, name: `Operario ${i + 1}` };
      return {
        station_number: i + 1,
        user_id: op.id,
        user_name: op.name,
        station_name: defaultNames[i] || `Estación ${i + 1}`
      };
    });
    setSelectedOperators(initial);
  }, [stationCount, users]);

  const partitionPreview = useMemo(() => {
    const totalSteps = modelSteps.length || 52;
    const baseCount = Math.floor(totalSteps / stationCount);
    const remainder = totalSteps % stationCount;
    let currentStart = 1;
    return Array.from({ length: stationCount }, (_, i) => {
      const extra = i + 1 <= remainder ? 1 : 0;
      const count = baseCount + extra;
      const currentEnd = currentStart + count - 1;
      const p = { station: i + 1, startStep: currentStart, endStep: currentEnd, stepCount: count, percentage: Math.round((count / totalSteps) * 100) };
      currentStart = currentEnd + 1;
      return p;
    });
  }, [modelSteps, stationCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          model_name: modelName,
          part_number: partNumber,
          total_units: parseInt(totalUnits, 10),
          stations: selectedOperators,
          created_by: "Admin QC"
        })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Error"); }
      onSuccess(orderId);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 fade-in">
      <Card className="p-4">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-blue-600" />
          <span>Nueva Orden de Producción</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Parámetros */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Parámetros del Lote</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Modelo</label>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white font-medium touch-target"
                >
                  {models.map(m => (
                    <option key={m.name} value={m.name}>{m.name} ({m.step_count} pasos)</option>
                  ))}
                </select>
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
            </div>
          </div>

          {/* Estaciones */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Estaciones</h3>
              <select
                value={stationCount}
                onChange={(e) => setStationCount(parseInt(e.target.value, 10))}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white font-bold text-blue-600 touch-target"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n} estaciones</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {selectedOperators.map((st, idx) => {
                const partition = partitionPreview[idx] || {};
                return (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
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
                          className="w-full text-xs border border-gray-300 rounded-lg p-2 touch-target"
                        />
                      </div>
                      {partition.stepCount && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 flex-shrink-0">
                          {partition.stepCount}p
                        </span>
                      )}
                    </div>
                    <select
                      value={st.user_id}
                      onChange={(e) => {
                        const copy = [...selectedOperators];
                        const u = users.find(u => u.id === e.target.value);
                        copy[idx].user_id = e.target.value;
                        copy[idx].user_name = u ? u.name : e.target.value;
                        setSelectedOperators(copy);
                      }}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white touch-target"
                    >
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Barra distribución */}
            <div className="flex h-5 rounded-lg overflow-hidden border border-blue-200 shadow-inner">
              {partitionPreview.map((p, i) => {
                const colors = ["bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-purple-600", "bg-cyan-600", "bg-rose-600", "bg-indigo-600", "bg-teal-600"];
                return (
                  <div key={i} style={{ width: `${p.percentage}%` }} className={`${colors[i % colors.length]} text-white text-[9px] font-bold flex items-center justify-center`}>
                    E{p.station}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#0078d4] hover:bg-[#106ebe] text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition touch-target"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
            <span>{submitting ? "Creando..." : "Iniciar Línea de Producción"}</span>
          </button>
        </form>
      </Card>
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

  const loadSteps = () => {
    fetch(`${API_BASE}/models/${selectedModel}/checklist`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setSteps(data); })
      .catch(() => {});
  };

  useEffect(() => { loadSteps(); }, [selectedModel]);

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

      {/* Lista de pasos o Estado Vacío */}
      {steps.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-2">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Checklist vacío para {selectedModel}</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
            Este modelo actualmente no tiene pasos registrados. Puedes descargar la <strong>Plantilla Oficial</strong> para crearlos en Excel y subirlos en un clic, o agregarlos manualmente uno por uno.
          </p>
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
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
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition touch-target"
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
          {filteredSteps.map((st) => (
            <Card key={st.step_number} className="overflow-hidden">
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
          ))}
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
    </div>
  );
}

// =============================================
// 4. ESPACIO DE TRABAJO DEL OPERARIO (CON SELECCIÓN LIBRE, DERIVACIÓN Y FOTO-VERIFICACIÓN)
// =============================================
function OperatorWorkspaceView({ workspace, currentUser, onOpenMedia, onOpenIssue, onPreviewPhoto, onSelectUnit, onSelectOrder, onRefresh, notify }) {
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

  const { assignment, order, available_orders = [], station_steps = [], transferred_out_steps = [], pending_prior_steps = [], all_stations = [], active_unit, units_in_station = [], completed_step_numbers = [], completed_step_logs = [], queue_units = [], completed_units = [] } = workspace;
  const [completedSteps, setCompletedSteps] = useState(completed_step_numbers || []);
  const [stepLogsMap, setStepLogsMap] = useState({});
  const [submittingStep, setSubmittingStep] = useState(null);
  const [finishingUnit, setFinishingUnit] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [reassignStepModalData, setReassignStepModalData] = useState(null);
  const [photoStepModal, setPhotoStepModal] = useState(null);
  const [requirePhotoVerification, setRequirePhotoVerification] = useState(true);

  useEffect(() => {
    setCompletedSteps(completed_step_numbers || []);
    const map = {};
    (completed_step_logs || []).forEach(l => {
      map[l.step_number] = l;
    });
    setStepLogsMap(map);
  }, [completed_step_numbers, completed_step_logs, active_unit?.unit_number]);

  const totalStationSteps = station_steps.length;
  const isStationComplete = totalStationSteps > 0 && completedSteps.length >= totalStationSteps;

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

  const handleFinishStation = async () => {
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
              <span className="text-xs font-bold text-white bg-[#0078d4] px-2 py-0.5 rounded shadow-xs">
                E{assignment.station_number}
              </span>
              <h2 className="text-sm font-bold text-gray-900 truncate">{assignment.station_name}</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Orden: <strong className="text-blue-700 font-mono">{order.order_id}</strong> · Modelo: <strong>{order.model_name}</strong> ({order.total_units} PCs)
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 block">
              P{assignment.start_step}–{assignment.end_step}
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
                  onClick={() => onOpenIssue(active_unit, station_steps[0])}
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

          {/* PASOS HEREDADOS DE OTRAS ESTACIONES (SI EXISTEN) */}
          {pending_prior_steps && pending_prior_steps.length > 0 && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pasos Pendientes Heredados ({pending_prior_steps.length})</span>
                </span>
                <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                  Derivados
                </span>
              </div>
              <p className="text-[10px] text-amber-800 leading-tight">
                Esta PC llegó con procesos previos pendientes. Toca para completarlos:
              </p>
              <div className="space-y-1.5 pt-1">
                {pending_prior_steps.map((st) => {
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

          {/* Lista de pasos principales de la estación */}
          <div className="p-3 space-y-3">
            {station_steps.map((st) => {
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
                              className="mt-2.5 inline-flex items-center gap-2 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1.5 rounded-xl cursor-pointer transition group shadow-xs"
                            >
                              <img 
                                src={stepLog.photo_url} 
                                alt="Foto evidencia" 
                                className="w-8 h-8 object-cover rounded-lg border border-emerald-400 group-hover:scale-105 transition"
                              />
                              <div className="text-left">
                                <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Foto de Evidencia Guardada</span>
                                </span>
                                <span className="text-[9px] text-emerald-700 block">🔍 Toca para ampliar foto</span>
                              </div>
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
                          {/* Botón de Cámara Directo */}
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
// MODAL DETALLE PC (CON REPORTE DE FALLAS Y EVIDENCIA FOTOGRÁFICA DE PASOS)
// =============================================
function UnitDetailModal({ unit, order, stations, issues = [], onPreviewPhoto, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
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

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={loading}
                  onClick={handleResetUnit}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 touch-target"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reiniciar a E1</span>
                </button>
                <button
                  disabled={loading}
                  onClick={handleDeleteUnit}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 touch-target"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Eliminar PC</span>
                </button>
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
          currentUser={{ name: "Supervisor / Admin" }}
          onClose={() => setTransferModalOpen(false)}
          onSuccess={(msg) => {
            setTransferModalOpen(false);
            onSuccess(msg);
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
          return (
            <Card key={user.id} className="p-3.5 hover:border-blue-300 transition shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center border shadow-sm ${
                    isAdmin ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {user.avatar || user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs">{user.name}</h4>
                    <p className="font-mono text-[10px] text-gray-500 font-medium">{user.id}</p>
                  </div>
                </div>
                <Badge variant={isAdmin ? "warning" : "info"}>
                  {isAdmin ? "ADMIN" : "OPERARIO"}
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
