import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Check, CheckCircle, AlertTriangle, AlertCircle, Plus, Edit, Download,
  Upload, Loader2, Play, Coffee, Inbox, Shield, Cpu, RefreshCw, X,
  Columns, Grid, ShieldCheck, FileText, PlusCircle, CheckSquare,
  Image as ImageIcon, PlayCircle, ArrowRightCircle, Search, Menu,
  ChevronDown, ChevronUp, LayoutDashboard, ClipboardList, Settings,
  Wrench, Eye
} from 'lucide-react';

const API_BASE = '/api';

const DEFAULT_USERS_FALLBACK = [
  { id: "ADM-01", name: "Ing. Carlos Mendoza (Admin QC)", role: "ADMIN", avatar: "CM" },
  { id: "OP-101", name: "Carlos Mendoza (Estación 1)", role: "OPERATOR", avatar: "CM" },
  { id: "OP-102", name: "Ana Quispe (Estación 2)", role: "OPERATOR", avatar: "AQ" },
  { id: "OP-103", name: "Roberto Diaz (Estación 3)", role: "OPERATOR", avatar: "RD" },
  { id: "OP-104", name: "Elena Ramos (Estación 4)", role: "OPERATOR", avatar: "ER" },
  { id: "OP-105", name: "Marco Solis (Estación 5)", role: "OPERATOR", avatar: "MS" },
  { id: "OP-106", name: "Jorge Valdivia (Suplente/Apoyo)", role: "OPERATOR", avatar: "JV" },
];

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
// APP PRINCIPAL
// =============================================
export default function App() {
  const [currentUser, setCurrentUser] = useState({ id: "ADM-01", name: "Ing. Carlos Mendoza", role: "ADMIN", avatar: "CM" });
  const [activeTab, setActiveTab] = useState("matrix");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [users, setUsers] = useState(DEFAULT_USERS_FALLBACK);
  const [models, setModels] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState("ORD-2026-0892");
  const [matrixData, setMatrixData] = useState(null);
  const [notification, setNotification] = useState(null);
  const [operatorWorkspace, setOperatorWorkspace] = useState(null);
  const [activeMediaModal, setActiveMediaModal] = useState(null);
  const [activeIssueModal, setActiveIssueModal] = useState(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [selectedUnitDetail, setSelectedUnitDetail] = useState(null);

  const notify = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadInitialData = async () => {
    try {
      const [resUsers, resModels, resOrders] = await Promise.all([
        fetch(`${API_BASE}/users`).then(r => r.ok ? r.json() : DEFAULT_USERS_FALLBACK).catch(() => DEFAULT_USERS_FALLBACK),
        fetch(`${API_BASE}/models`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/orders`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      if (Array.isArray(resUsers) && resUsers.length > 0) setUsers(resUsers);
      if (Array.isArray(resModels)) setModels(resModels);
      if (Array.isArray(resOrders) && resOrders.length > 0) {
        setOrders(resOrders);
        setSelectedOrder(resOrders[0].order_id);
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

  const loadOperatorWorkspace = () => {
    fetch(`${API_BASE}/operator/${currentUser.id}/station`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setOperatorWorkspace(data); })
      .catch(err => console.error("Error workspace operario:", err));
  };

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { loadMatrixData(); }, [selectedOrder]);
  useEffect(() => {
    if (activeTab === "operator" || currentUser.role === "OPERATOR") {
      loadOperatorWorkspace();
    }
  }, [activeTab, currentUser]);

  const handleUserChange = (userId) => {
    const u = users.find(x => x.id === userId);
    if (u) {
      setCurrentUser(u);
      setMobileMenuOpen(false);
      setActiveTab(u.role === "OPERATOR" ? "operator" : "matrix");
    }
  };

  const navigate = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const ADMIN_TABS = [
    { id: "matrix", label: "Pipeline", shortLabel: "Pipeline", icon: Grid },
    { id: "create-order", label: "Nueva Orden", shortLabel: "Orden", icon: PlusCircle },
    { id: "checklists", label: "Checklists", shortLabel: "Checks", icon: FileText },
    { id: "audit", label: "Auditoría", shortLabel: "Auditor", icon: ShieldCheck },
  ];

  const OPERATOR_TABS = [
    { id: "operator", label: "Mi Estación", shortLabel: "Trabajo", icon: CheckSquare },
  ];

  const tabs = currentUser.role === "ADMIN" ? ADMIN_TABS : OPERATOR_TABS;

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
            {/* Selector de usuario */}
            <div className="flex items-center gap-1.5 bg-blue-900/40 px-2 py-1 rounded-lg border border-blue-400/30 text-xs">
              <span className="hidden sm:inline text-blue-200">Sesión:</span>
              <select
                value={currentUser.id}
                onChange={(e) => handleUserChange(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs max-w-[110px] sm:max-w-none"
              >
                {Array.isArray(users) && users.map(u => (
                  <option key={u.id} value={u.id} className="text-gray-900 bg-white">
                    {u.role === "ADMIN" ? "👑 " : "🔧 "}{u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-white text-[#0078d4] font-bold text-xs flex items-center justify-center shadow flex-shrink-0">
              {currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()}
            </div>

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
          {activeTab === "checklists" && (
            <ChecklistEditorView
              models={models}
              notify={notify}
              onRefreshModels={loadInitialData}
            />
          )}
          {activeTab === "audit" && (
            <AuditLogsView selectedOrder={selectedOrder} orders={orders} />
          )}
          {activeTab === "operator" && (
            <OperatorWorkspaceView
              workspace={operatorWorkspace}
              currentUser={currentUser}
              onOpenMedia={(item) => setActiveMediaModal(item)}
              onOpenIssue={(unit, step) => setActiveIssueModal({ unit, step })}
              onRefresh={loadOperatorWorkspace}
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
      {activeIssueModal && (
        <IssueReportModal
          data={activeIssueModal}
          currentUser={currentUser}
          orderId={operatorWorkspace?.order?.order_id}
          stationNumber={operatorWorkspace?.assignment?.station_number}
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
      {selectedUnitDetail && matrixData && (
        <UnitDetailModal
          unit={selectedUnitDetail}
          order={matrixData.order}
          stations={matrixData.stations}
          onClose={() => setSelectedUnitDetail(null)}
        />
      )}
    </div>
  );
}

// =============================================
// 1. MATRIZ DE PIPELINE
// =============================================
function PipelineMatrixView({ matrixData, orders, selectedOrder, setSelectedOrder, onOpenEmergency, onSelectUnit, onRefresh }) {
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
              onClick={onOpenEmergency}
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition touch-target"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Reasignación </span>Emergencia
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

  const loadSteps = () => {
    fetch(`${API_BASE}/models/${selectedModel}/checklist`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setSteps(data); })
      .catch(() => {});
  };

  useEffect(() => { loadSteps(); }, [selectedModel]);

  const filteredSteps = steps.filter(s =>
    (s.operation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.qc_criteria || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 fade-in">
      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-xs font-bold border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-blue-800 touch-target"
            >
              {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
            <Badge variant="info">{steps.length} Pasos</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEditingItem({ model_name: selectedModel, step_number: steps.length + 1, operation: "", description: "", qc_criteria: "", media_url: "" })}
              className="text-xs bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition touch-target"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Paso</span>
            </button>
            <button
              onClick={() => window.open(`${API_BASE}/models/${selectedModel}/export-excel`, "_blank")}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition touch-target"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <label className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition touch-target">
              <Upload className="w-4 h-4" />
              <span>Importar</span>
              <input type="file" accept=".xlsx,.xls" onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch(`${API_BASE}/models/${selectedModel}/import-excel`, { method: "POST", body: fd });
                if (res.ok) { notify("Importación exitosa"); loadSteps(); }
              }} className="hidden" />
            </label>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar paso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Lista de pasos como acordeón en mobile */}
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
                <button
                  onClick={() => setEditingItem(st)}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition touch-target"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar Paso</span>
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {editingItem && (
        <ChecklistStepModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (saved) => {
            await fetch(`${API_BASE}/models/${selectedModel}/checklist`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(saved)
            });
            notify("Paso guardado correctamente");
            setEditingItem(null);
            loadSteps();
          }}
        />
      )}
    </div>
  );
}

// =============================================
// 4. ESPACIO DE TRABAJO DEL OPERARIO
// =============================================
function OperatorWorkspaceView({ workspace, currentUser, onOpenMedia, onOpenIssue, onRefresh, notify }) {
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

  const { assignment, order, station_steps = [], active_unit, completed_step_numbers = [], queue_units = [], completed_units = [] } = workspace;
  const [completedSteps, setCompletedSteps] = useState(completed_step_numbers || []);
  const [submittingStep, setSubmittingStep] = useState(null);
  const [finishingUnit, setFinishingUnit] = useState(false);

  useEffect(() => { setCompletedSteps(completed_step_numbers || []); }, [completed_step_numbers]);

  const totalStationSteps = station_steps.length;
  const isStationComplete = totalStationSteps > 0 && completedSteps.length >= totalStationSteps;

  const handleToggleStep = async (step) => {
    if (completedSteps.includes(step.step_number)) return;
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
    <div className="max-w-xl mx-auto space-y-4 fade-in pb-4">
      {/* Header estación */}
      <Card className="p-3 border-l-4 border-l-[#0078d4]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-[#0078d4] px-2 py-0.5 rounded">
                E{assignment.station_number}
              </span>
              <h2 className="text-sm font-bold text-gray-900 truncate">{assignment.station_name}</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Orden: <span className="font-semibold">{order.order_id}</span> · <span className="font-semibold">{order.model_name}</span>
            </p>
          </div>
          <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 flex-shrink-0 whitespace-nowrap">
            P{assignment.start_step}–{assignment.end_step}
          </span>
        </div>
      </Card>

      {active_unit ? (
        <Card className="overflow-hidden border-2 border-blue-400">
          {/* Header PC activa */}
          <div className="bg-gradient-to-r from-[#0078d4] to-[#106ebe] text-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Trabajando en</span>
                <h3 className="text-lg font-black">🖥️ PC #{active_unit.unit_number.toString().padStart(2, '0')}</h3>
                <p className="text-xs text-blue-200 font-mono">{active_unit.serial_number}</p>
              </div>
              <button
                onClick={() => onOpenIssue(active_unit, station_steps[0])}
                className="flex flex-col items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl transition touch-target"
              >
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <span className="text-[10px] font-bold text-white">Falla</span>
              </button>
            </div>

            {/* Progreso */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-200">Progreso Estación</span>
                <span className="font-bold">{completedSteps.length}/{totalStationSteps}</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(completedSteps.length / totalStationSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Lista de pasos */}
          <div className="p-3 space-y-2.5">
            {station_steps.map((st) => {
              const isDone = completedSteps.includes(st.step_number);
              return (
                <div
                  key={st.step_number}
                  className={`rounded-xl border p-3 transition-all ${isDone ? "bg-emerald-50 border-emerald-300" : "bg-white border-gray-300"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${isDone ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                      {st.step_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${isDone ? "text-emerald-900" : "text-gray-900"}`}>{st.operation}</p>
                      {st.description && <p className="text-[10px] text-gray-500 mt-0.5">{st.description}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-100 font-medium">
                          🔍 {st.qc_criteria}
                        </span>
                        {st.media_url && (
                          <button
                            onClick={() => onOpenMedia(st)}
                            className="text-[10px] text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded font-semibold flex items-center gap-1 touch-target"
                          >
                            <PlayCircle className="w-3 h-3" />
                            <span>Ver Guía</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón de aprobación — touch 48px */}
                  <div className="mt-2.5">
                    {isDone ? (
                      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100 px-4 py-2 rounded-xl font-bold text-xs w-full justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>VALIDADO ✓</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleStep(st)}
                        disabled={submittingStep === st.step_number}
                        className="w-full min-h-[52px] px-4 py-3 bg-[#0078d4] hover:bg-[#106ebe] active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow flex items-center justify-center gap-2 transition touch-target"
                      >
                        {submittingStep === st.step_number ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-5 h-5" />
                            <span>Marcar Conforme</span>
                          </>
                        )}
                      </button>
                    )}
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
                Completa los {totalStationSteps} pasos para habilitar el envío.
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-700">Sin PCs en tu estación</h3>
          <p className="text-xs text-gray-400 mt-1">Esperando la estación anterior...</p>
        </Card>
      )}

      {/* Cola y completadas */}
      {queue_units.length > 0 && (
        <Card className="p-3">
          <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span>Cola: {queue_units.length} PCs esperando</span>
          </h4>
          <div className="space-y-1.5">
            {queue_units.slice(0, 5).map(u => (
              <div key={u.unit_number} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border text-xs">
                <span className="font-bold">PC #{u.unit_number.toString().padStart(2, '0')}</span>
                <span className="text-gray-400 font-mono text-[10px]">{u.serial_number}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================
// 5. AUDITORÍA FORENSE
// =============================================
function AuditLogsView({ selectedOrder, orders }) {
  const [logs, setLogs] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState(selectedOrder || "ORD-2026-0892");
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
// MODAL REPORTE DE FALLAS
// =============================================
function IssueReportModal({ data, currentUser, orderId, stationNumber, onClose, onSuccess }) {
  const { unit, step } = data;
  const [issueTitle, setIssueTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("CRITICAL");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
          severity
        })
      });
      if (!res.ok) throw new Error("Error registrando incidencia");
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl">
        <div className="bg-rose-600 text-white p-4 flex justify-between items-center">
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
              className="w-full text-xs border border-gray-300 rounded-xl p-3 touch-target focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Severidad</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-3 font-bold touch-target"
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
              rows="3"
              required
              placeholder="Detalle exactamente lo observado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-3 touch-target focus:outline-none"
            ></textarea>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-3 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow transition touch-target">
              {submitting ? "Registrando..." : "Bloquear PC"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
// MODAL EDICIÓN PASO CHECKLIST
// =============================================
function ChecklistStepModal({ item, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...item });
  const [uploading, setUploading] = useState(false);

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
            <label className="block w-full py-2.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-xl cursor-pointer hover:bg-blue-100 text-center touch-target">
              {uploading ? "Subiendo..." : "📁 Subir Archivo"}
              <input type="file" accept="image/*,.gif" onChange={handleFileUpload} className="hidden" />
            </label>
            {formData.media_url && (
              <img src={formData.media_url} alt="Preview" className="w-full max-h-32 object-cover rounded-xl" />
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition touch-target">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-3 text-xs font-bold bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-xl shadow transition touch-target">
              Guardar Paso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// MODAL DETALLE PC
// =============================================
function UnitDetailModal({ unit, order, stations, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm overflow-hidden shadow-2xl">
        <div className="bg-[#0078d4] text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold">PC #{unit.unit_number} — Ficha</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded touch-target flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-2.5 rounded-xl">
              <span className="text-[10px] text-gray-500 font-semibold block">N° Serie</span>
              <p className="font-mono font-bold text-gray-900 text-[11px] break-all">{unit.serial_number}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl">
              <span className="text-[10px] text-gray-500 font-semibold block">Orden</span>
              <p className="font-bold text-blue-700">{order.order_id}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl">
              <span className="text-[10px] text-gray-500 font-semibold block">Estado</span>
              <p className="font-bold">{unit.overall_status}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-xl">
              <span className="text-[10px] text-gray-500 font-semibold block">Estación</span>
              <p className="font-bold text-emerald-700">
                {unit.current_station > stations.length ? "EMPACADO ✓" : `Estación ${unit.current_station}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-xs transition touch-target"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
