import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Check,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Plus,
  Edit,
  Download,
  Upload,
  Loader2,
  Play,
  Coffee,
  Inbox,
  Shield,
  Cpu,
  RefreshCw,
  X,
  Columns,
  Grid,
  ShieldCheck,
  FileText,
  PlusCircle,
  CheckSquare,
  Image as ImageIcon,
  PlayCircle,
  ArrowRightCircle,
  Search
} from 'lucide-react';

const API_BASE = '/api';

const DEFAULT_USERS_FALLBACK = [
  { id: "ADM-01", name: "Ing. Carlos Mendoza (Admin QC)", role: "ADMIN", avatar: "CM" },
  { id: "OP-101", name: "Carlos Mendoza (Estación 1)", role: "OPERATOR", avatar: "CM" },
  { id: "OP-102", name: "Ana Quispe (Estación 2)", role: "OPERATOR", avatar: "AQ" },
  { id: "OP-103", name: "Roberto Diaz (Estación 3)", role: "OPERATOR", avatar: "RD" },
  { id: "OP-104", name: "Elena Ramos (Estación 4)", role: "OPERATOR", avatar: "ER" },
  { id: "OP-105", name: "Marco Solis (Estación 5)", role: "OPERATOR", avatar: "MS" },
];

// Badge component
const Badge = ({ children, variant = "neutral", className = "" }) => {
  const styles = {
    neutral: "bg-gray-100 text-gray-700 border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant] || styles.neutral} ${className}`}>
      {children}
    </span>
  );
};

// Card component
const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState({ id: "ADM-01", name: "Ing. Carlos Mendoza", role: "ADMIN" });
  const [activeTab, setActiveTab] = useState("matrix");
  const [users, setUsers] = useState(DEFAULT_USERS_FALLBACK);
  const [models, setModels] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(false);
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
      setLoading(true);
      const [resUsers, resModels, resOrders] = await Promise.all([
        fetch(`${API_BASE}/users`).then(r => r.ok ? r.json() : DEFAULT_USERS_FALLBACK).catch(() => DEFAULT_USERS_FALLBACK),
        fetch(`${API_BASE}/models`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/orders`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      if (Array.isArray(resUsers) && resUsers.length > 0) setUsers(resUsers);
      if (Array.isArray(resModels)) setModels(resModels);
      if (Array.isArray(resOrders)) {
        setOrders(resOrders);
        if (resOrders.length > 0 && !selectedOrder) {
          setSelectedOrder(resOrders[0].order_id);
        }
      }
    } catch (err) {
      console.warn("API loading note:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      fetch(`${API_BASE}/orders/${selectedOrder}/matrix`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setMatrixData(data); })
        .catch(err => console.error("Error matriz:", err));
    }
  }, [selectedOrder]);

  const loadOperatorWorkspace = () => {
    fetch(`${API_BASE}/operator/${currentUser.id}/station`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setOperatorWorkspace(data); })
      .catch(err => console.error("Error workspace operario:", err));
  };

  useEffect(() => {
    if (activeTab === "operator" || currentUser.role === "OPERATOR") {
      loadOperatorWorkspace();
    }
  }, [activeTab, currentUser]);

  const handleUserChange = (userId) => {
    const u = users.find(x => x.id === userId);
    if (u) {
      setCurrentUser(u);
      if (u.role === "OPERATOR") {
        setActiveTab("operator");
      } else {
        setActiveTab("matrix");
      }
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* NAVBAR SUPERIOR */}
      <header className="bg-[#0078d4] text-white shadow-md flex-shrink-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1.5 rounded flex items-center justify-center text-[#0078d4] font-black text-sm tracking-wider">
              KENYA
            </div>
            <div className="h-5 w-px bg-blue-300/40"></div>
            <h1 className="font-semibold text-base tracking-wide flex items-center gap-2">
              <span>Control de Calidad</span>
              <span className="text-xs bg-blue-900/40 px-2 py-0.5 rounded text-blue-100 font-mono">
                PIPELINE V2.0
              </span>
            </h1>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {currentUser.role === "ADMIN" ? (
              <>
                <button
                  onClick={() => setActiveTab("matrix")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                    activeTab === "matrix" ? "bg-white/20 text-white font-semibold" : "hover:bg-white/10 text-blue-100"
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span>Monitoreo Pipeline</span>
                </button>
                <button
                  onClick={() => setActiveTab("create-order")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                    activeTab === "create-order" ? "bg-white/20 text-white font-semibold" : "hover:bg-white/10 text-blue-100"
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Nueva Orden (Lote)</span>
                </button>
                <button
                  onClick={() => setActiveTab("checklists")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                    activeTab === "checklists" ? "bg-white/20 text-white font-semibold" : "hover:bg-white/10 text-blue-100"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Modelos & Checklists</span>
                </button>
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                    activeTab === "audit" ? "bg-white/20 text-white font-semibold" : "hover:bg-white/10 text-blue-100"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Auditoría Forense</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab("operator")}
                className="px-3 py-1.5 bg-white/20 rounded-md text-xs font-semibold text-white flex items-center gap-1.5"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Mi Estación de Trabajo</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2 bg-blue-900/40 px-3 py-1 rounded-lg border border-blue-400/30 text-xs">
              <span className="text-blue-200 hidden sm:inline">Sesión:</span>
              <select
                value={currentUser.id}
                onChange={(e) => handleUserChange(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
              >
                {Array.isArray(users) && users.map(u => (
                  <option key={u.id} value={u.id} className="text-gray-900 bg-white">
                    {u.role === "ADMIN" ? "👑 Admin: " : "🔧 Op: "}{u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-8 h-8 rounded-full bg-white text-[#0078d4] font-bold text-xs flex items-center justify-center shadow">
              {currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Notificación Flotante */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 fade-in ${
          notification.type === "success" 
            ? "bg-emerald-600 text-white border-emerald-700" 
            : "bg-rose-600 text-white border-rose-700"
        }`}>
          {notification.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f3f2f1]">
        <div className="max-w-7xl mx-auto space-y-6">
          {activeTab === "matrix" && (
            <PipelineMatrixView
              matrixData={matrixData}
              orders={orders}
              selectedOrder={selectedOrder}
              setSelectedOrder={setSelectedOrder}
              onOpenEmergency={() => setEmergencyModalOpen(true)}
              onSelectUnit={(unit) => setSelectedUnitDetail(unit)}
              onRefresh={() => loadInitialData()}
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
                setActiveTab("matrix");
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

      {/* MODALES */}
      {activeMediaModal && (
        <MediaViewerModal item={activeMediaModal} onClose={() => setActiveMediaModal(null)} />
      )}

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

// 1. MATRIZ DE PIPELINE
function PipelineMatrixView({ matrixData, orders, selectedOrder, setSelectedOrder, onOpenEmergency, onSelectUnit, onRefresh }) {
  if (!matrixData || !matrixData.order) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
        <p className="text-gray-600 font-medium">Cargando matriz de producción en tiempo real...</p>
      </Card>
    );
  }

  const { order, stations = [], units = [], logs_count = 0, issues = [] } = matrixData;
  const total = units.length;
  const passed = units.filter(u => u.overall_status === "PASSED").length;
  const failed = units.filter(u => u.overall_status === "FAILED").length;
  const inProgress = units.filter(u => u.overall_status === "IN_PROGRESS").length;
  const pending = total - passed - failed - inProgress;
  const completionPercentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0078d4] flex items-center justify-center font-bold">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{order.order_id}</h2>
              <Badge variant="info">Modelo: {order.model_name}</Badge>
              <Badge variant="neutral">Parte: {order.part_number}</Badge>
            </div>
            <p className="text-xs text-gray-500">Lote de {order.total_units} PCs divididas en {order.total_stations} Estaciones de Control</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedOrder || ""}
            onChange={(e) => setSelectedOrder(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50 font-medium text-gray-700"
          >
            {orders.map(o => (
              <option key={o.order_id} value={o.order_id}>
                {o.order_id} ({o.model_name} - {o.total_units} PCs)
              </option>
            ))}
          </select>

          <button
            onClick={onOpenEmergency}
            className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition"
          >
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Reasignación de Emergencia</span>
          </button>

          <button
            onClick={onRefresh}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded font-medium flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 border-l-4 border-l-blue-600">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Lote</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-gray-900">{total}</span>
            <span className="text-xs text-blue-600 font-medium">{order.model_name}</span>
          </div>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-emerald-600">
          <p className="text-xs font-semibold text-emerald-700 uppercase">Terminadas OK</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-emerald-600">{passed}</span>
            <span className="text-xs text-emerald-700 font-semibold">{completionPercentage}%</span>
          </div>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-amber-700 uppercase">En Proceso</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-amber-600">{inProgress}</span>
            <span className="text-xs text-amber-700">En estaciones</span>
          </div>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-rose-600">
          <p className="text-xs font-semibold text-rose-700 uppercase">Con Falla / Alerta</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-rose-600">{failed}</span>
            <span className="text-xs text-rose-700 font-medium">{issues.length} tickets</span>
          </div>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-gray-400">
          <p className="text-xs font-semibold text-gray-500 uppercase">En Espera (Cola)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-gray-700">{pending}</span>
            <span className="text-xs text-gray-500">Por iniciar</span>
          </div>
        </Card>
      </div>

      <Card className="p-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 mb-4 gap-2">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Columns className="w-4 h-4 text-blue-600" />
              <span>Matriz de Trazabilidad en Cadena (Pipeline Matrix)</span>
            </h3>
            <p className="text-xs text-gray-500">Visualice la posición exacta de cada una de las {total} PCs a lo largo de las estaciones</p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-gray-600">Completada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-gray-600">En Revisión</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="text-gray-600">Falla</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-300"></span>
              <span className="text-gray-600">En Cola</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <th className="py-2.5 px-3 font-bold w-24">N° Unidad</th>
                <th className="py-2.5 px-3 font-bold w-36">N° Serie</th>
                {stations.map(st => (
                  <th key={st.station_number} className="py-2.5 px-3 font-bold border-l border-gray-200">
                    <div className="text-gray-900 font-semibold">{st.station_name || `Estación ${st.station_number}`}</div>
                    <div className="text-[10px] text-gray-500 font-normal">
                      {st.user_name} (Pasos {st.start_step}-{st.end_step})
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-3 font-bold border-l border-gray-200 text-center w-28">Estado Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {units.map((unit) => {
                const isUnitFinished = unit.overall_status === "PASSED";
                const isUnitFailed = unit.overall_status === "FAILED";

                return (
                  <tr
                    key={unit.unit_number}
                    onClick={() => onSelectUnit(unit)}
                    className="hover:bg-blue-50/50 cursor-pointer transition"
                  >
                    <td className="py-2 px-3 font-semibold text-gray-900">
                      PC #{unit.unit_number.toString().padStart(2, '0')}
                    </td>
                    <td className="py-2 px-3 font-mono text-gray-600 text-[11px]">
                      {unit.serial_number || `KEN-2026-${unit.unit_number.toString().padStart(3, '0')}`}
                    </td>

                    {stations.map(st => {
                      let cellState = "queue";
                      if (isUnitFailed && unit.current_station === st.station_number) {
                        cellState = "failed";
                      } else if (unit.current_station > st.station_number) {
                        cellState = "passed";
                      } else if (unit.current_station === st.station_number && !isUnitFinished) {
                        cellState = "active";
                      }

                      return (
                        <td key={st.station_number} className="py-2 px-3 border-l border-gray-200">
                          {cellState === "passed" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>OK</span>
                            </span>
                          )}
                          {cellState === "active" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded pulse-glow">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                              <span>En Turno</span>
                            </span>
                          )}
                          {cellState === "failed" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                              <X className="w-3 h-3 text-rose-600" />
                              <span>Falla</span>
                            </span>
                          )}
                          {cellState === "queue" && (
                            <span className="text-[11px] text-gray-400 font-mono">•••</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2 px-3 border-l border-gray-200 text-center">
                      {isUnitFinished && <Badge variant="success">EMPACADO</Badge>}
                      {isUnitFailed && <Badge variant="danger">BLOQUEADO</Badge>}
                      {!isUnitFinished && !isUnitFailed && (
                        <Badge variant="warning">Estación {unit.current_station}</Badge>
                      )}
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

// 2. CREADOR DE ORDEN
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
      .catch(err => console.error("Error pasos:", err));
  }, [modelName]);

  useEffect(() => {
    const initial = [];
    for (let i = 0; i < stationCount; i++) {
      const op = users[i % users.length] || { id: `OP-${101 + i}`, name: `Operario ${i + 1}` };
      initial.push({
        station_number: i + 1,
        user_id: op.id,
        user_name: op.name,
        station_name: getStationDefaultName(i + 1)
      });
    }
    setSelectedOperators(initial);
  }, [stationCount, users]);

  function getStationDefaultName(idx) {
    const names = [
      "Chasis, Montaje y Placas",
      "Protecciones, Discos y GPU",
      "BIOS, SO Windows y Pruebas",
      "Personalización, Software y Serie",
      "Stickers, Limpieza y Embalaje"
    ];
    return names[idx - 1] || `Estación ${idx} de Ensamblaje`;
  }

  const partitionPreview = useMemo(() => {
    const totalSteps = modelSteps.length || 52;
    const baseCount = Math.floor(totalSteps / stationCount);
    const remainder = totalSteps % stationCount;

    const partitions = [];
    let currentStart = 1;

    for (let i = 1; i <= stationCount; i++) {
      const extra = i <= remainder ? 1 : 0;
      const count = baseCount + extra;
      const currentEnd = currentStart + count - 1;
      partitions.push({
        station: i,
        startStep: currentStart,
        endStep: currentEnd,
        stepCount: count,
        percentage: Math.round((count / totalSteps) * 100)
      });
      currentStart = currentEnd + 1;
    }
    return partitions;
  }, [modelSteps, stationCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        order_id: orderId,
        model_name: modelName,
        part_number: partNumber,
        total_units: parseInt(totalUnits, 10),
        stations: selectedOperators,
        created_by: "Ing. Carlos Mendoza (Admin QC)"
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al crear la orden");
      }

      onSuccess(orderId);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-blue-600" />
          <span>Lanzar Nueva Orden de Producción y Control de Calidad</span>
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Configure los parámetros del lote y la división equitativa de pasos entre las estaciones de la línea continua.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">1. Parámetros del Lote</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Modelo de Computadora</label>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white font-medium"
                >
                  {models.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">N° de Orden</label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  required
                  className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">N° de Parte</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  required
                  className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad de PCs</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(e.target.value)}
                  required
                  className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white font-bold text-blue-700"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">2. Asignación de Operarios por Estación</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-medium">N° de Estaciones:</span>
                <select
                  value={stationCount}
                  onChange={(e) => setStationCount(parseInt(e.target.value, 10))}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white font-bold text-blue-600"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} Estaciones</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {selectedOperators.map((st, idx) => {
                const partition = partitionPreview[idx] || {};
                return (
                  <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded border border-gray-200">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {st.station_number}
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      <div>
                        <span className="block text-[10px] text-gray-500 font-semibold">Nombre de Estación</span>
                        <input
                          type="text"
                          value={st.station_name}
                          onChange={(e) => {
                            const copy = [...selectedOperators];
                            copy[idx].station_name = e.target.value;
                            setSelectedOperators(copy);
                          }}
                          className="w-full text-xs border border-gray-300 rounded p-1.5 font-medium"
                        />
                      </div>

                      <div>
                        <span className="block text-[10px] text-gray-500 font-semibold">Técnico / Operario Asignado</span>
                        <select
                          value={st.user_id}
                          onChange={(e) => {
                            const copy = [...selectedOperators];
                            const selectedUser = users.find(u => u.id === e.target.value);
                            copy[idx].user_id = e.target.value;
                            copy[idx].user_name = selectedUser ? selectedUser.name : e.target.value;
                            setSelectedOperators(copy);
                          }}
                          className="w-full text-xs border border-gray-300 rounded p-1.5 font-medium bg-white"
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 bg-blue-50 px-3 py-1.5 rounded border border-blue-200">
                      <span className="text-[10px] text-blue-700 font-semibold block">Pasos Asignados</span>
                      <span className="text-xs font-bold text-blue-900">
                        {partition.startStep} al {partition.endStep} ({partition.stepCount} pasos)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-blue-900">Distribución de Carga del Checklist ({modelSteps.length} Pasos Totales)</span>
              <span className="text-blue-700 font-semibold">Equilibrio Óptimo Sin Cuellos de Botella</span>
            </div>
            <div className="flex h-6 rounded-lg overflow-hidden border border-blue-300 shadow-inner">
              {partitionPreview.map((p, i) => {
                const colors = ["bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-purple-600", "bg-cyan-600", "bg-rose-600", "bg-indigo-600", "bg-teal-600"];
                return (
                  <div
                    key={i}
                    style={{ width: `${p.percentage}%` }}
                    className={`${colors[i % colors.length]} text-white text-[10px] font-bold flex items-center justify-center transition-all`}
                    title={`Estación ${p.station}: ${p.stepCount} pasos (${p.startStep}-${p.endStep})`}
                  >
                    E{p.station}: {p.stepCount}p
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold text-xs px-6 py-2.5 rounded-lg shadow transition flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando Orden...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Cadena de Producción</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 3. EDITOR DE CHECKLISTS
function ChecklistEditorView({ models, notify, onRefreshModels }) {
  const [selectedModel, setSelectedModel] = useState(models[0]?.name || "PROWORK");
  const [steps, setSteps] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSteps = () => {
    setLoading(true);
    fetch(`${API_BASE}/models/${selectedModel}/checklist`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setSteps(data); })
      .catch(err => console.error("Error pasos:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSteps();
  }, [selectedModel]);

  const handleExportExcel = () => {
    window.open(`${API_BASE}/models/${selectedModel}/export-excel`, "_blank");
    notify("Descargando archivo Excel oficial...");
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      notify("Procesando e importando archivo Excel...", "info");
      const res = await fetch(`${API_BASE}/models/${selectedModel}/import-excel`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Error al procesar el archivo Excel");
      const data = await res.json();
      notify(data.message);
      loadSteps();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const filteredSteps = steps.filter(s =>
    (s.operation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.qc_criteria || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-gray-700">Modelo Seleccionado:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-xs font-bold border border-gray-300 rounded px-3 py-1.5 bg-gray-50 text-blue-800"
            >
              {models.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
            <Badge variant="info">{steps.length} Pasos Activos</Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setEditingItem({ model_name: selectedModel, step_number: steps.length + 1, operation: "", description: "", qc_criteria: "", media_url: "" })}
              className="text-xs bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Paso</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow transition"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <label className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <span>Importar Excel</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
            </label>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por operación, descripción o criterio de calidad..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs focus:outline-none"
        />
      </div>

      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <th className="py-2.5 px-3 font-bold w-12 text-center">N°</th>
              <th className="py-2.5 px-3 font-bold w-1/4">Operación</th>
              <th className="py-2.5 px-3 font-bold w-1/3">Criterio de Control de Calidad</th>
              <th className="py-2.5 px-3 font-bold text-center w-28">Multimedia</th>
              <th className="py-2.5 px-3 font-bold text-right w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSteps.map((st) => (
              <tr key={st.step_number} className="hover:bg-gray-50 transition">
                <td className="py-2.5 px-3 font-bold text-center text-blue-700 bg-gray-50/50">
                  {st.step_number}
                </td>
                <td className="py-2.5 px-3 font-semibold text-gray-900">
                  {st.operation}
                  {st.description && <p className="text-[11px] text-gray-500 font-normal mt-0.5">{st.description}</p>}
                </td>
                <td className="py-2.5 px-3 text-gray-700">{st.qc_criteria}</td>
                <td className="py-2.5 px-3 text-center">
                  {st.media_url ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">
                      <ImageIcon className="w-3 h-3" />
                      <span>{st.media_type === "gif" ? "GIF Animado" : "Foto HD"}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400 text-[10px]">Sin multimedia</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => setEditingItem(st)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Editar paso"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

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
            notify("Paso y multimedia guardados correctamente");
            setEditingItem(null);
            loadSteps();
          }}
        />
      )}
    </div>
  );
}

// 4. ESPACIO DE TRABAJO DEL OPERARIO
function OperatorWorkspaceView({ workspace, currentUser, onOpenMedia, onOpenIssue, onRefresh, notify }) {
  if (!workspace || !workspace.active) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <Coffee className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-900">Sin Tareas Asignadas en este Momento</h3>
        <p className="text-xs text-gray-500 mt-1">El administrador aún no ha lanzado un lote o no estás asignado a una estación activa.</p>
        <button onClick={onRefresh} className="mt-4 text-xs bg-blue-600 text-white px-4 py-2 rounded font-semibold">
          Comprobar Nuevamente
        </button>
      </Card>
    );
  }

  const { assignment, order, station_steps = [], active_unit, completed_step_numbers = [], queue_units = [], completed_units = [] } = workspace;
  const [completedSteps, setCompletedSteps] = useState(completed_step_numbers || []);
  const [submittingStep, setSubmittingStep] = useState(null);
  const [finishingUnit, setFinishingUnit] = useState(false);

  useEffect(() => {
    setCompletedSteps(completed_step_numbers || []);
  }, [completed_step_numbers]);

  const totalStationSteps = station_steps.length;
  const currentStationApprovedCount = completedSteps.length;
  const isStationComplete = totalStationSteps > 0 && currentStationApprovedCount >= totalStationSteps;

  const handleToggleStep = async (step) => {
    if (completedSteps.includes(step.step_number)) return;

    try {
      setSubmittingStep(step.step_number);
      const payload = {
        order_id: order.order_id,
        unit_number: active_unit.unit_number,
        step_number: step.step_number,
        station_number: assignment.station_number,
        user_id: currentUser.id,
        user_name: currentUser.name,
        status: "PASS",
        notes: "Aprobado por operario en línea"
      };

      const res = await fetch(`${API_BASE}/operator/submit-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Error registrando el paso");

      setCompletedSteps(prev => [...prev, step.step_number]);
      notify(`Paso #${step.step_number} verificado y auditado`);

      if (currentStationApprovedCount + 1 >= totalStationSteps && confetti) {
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
          station_number: assignment.station_number,
          user_name: currentUser.name
        })
      });

      if (!res.ok) throw new Error("Error al despachar la unidad");
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
    <div className="max-w-4xl mx-auto space-y-6 fade-in pb-12">
      <div className="bg-white p-4 rounded-lg border-l-4 border-l-[#0078d4] border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white bg-[#0078d4] px-2 py-0.5 rounded">
              Estación #{assignment.station_number}
            </span>
            <h2 className="text-base font-bold text-gray-900">{assignment.station_name || `Línea ${assignment.station_number}`}</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Orden: <span className="font-semibold text-gray-700">{order.order_id}</span> ({order.model_name}) | Operario: <span className="font-semibold text-gray-700">{currentUser.name}</span>
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-gray-500 block">Rango de Responsabilidad</span>
          <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
            Pasos {assignment.start_step} al {assignment.end_step} ({totalStationSteps} pasos)
          </span>
        </div>
      </div>

      {active_unit ? (
        <Card className="p-5 border-2 border-blue-400 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                EN TRABAJO ACTIVO
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-1 flex items-center gap-2">
                <span>🖥️ Computadora #{active_unit.unit_number.toString().padStart(2, '0')}</span>
                <span className="text-xs font-mono font-normal text-gray-500">
                  (Serie: {active_unit.serial_number || `KEN-2026-${active_unit.unit_number}`})
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenIssue(active_unit, station_steps[0])}
                className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Reportar Falla</span>
              </button>
            </div>
          </div>

          <div className="py-4 space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-gray-700">Progreso en tu Estación</span>
              <span className="text-blue-700">{currentStationApprovedCount} de {totalStationSteps} Pasos Completados</span>
            </div>
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(currentStationApprovedCount / totalStationSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {station_steps.map((st) => {
              const isDone = completedSteps.includes(st.step_number);

              return (
                <div
                  key={st.step_number}
                  className={`p-4 rounded-lg border transition-all ${
                    isDone
                      ? "bg-emerald-50/70 border-emerald-300"
                      : "bg-white border-gray-300 hover:border-blue-400 shadow-sm"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                          isDone ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"
                        }`}>
                          {st.step_number}
                        </span>
                        <h4 className={`text-sm font-bold ${isDone ? "text-emerald-900" : "text-gray-900"}`}>
                          {st.operation}
                        </h4>
                      </div>

                      {st.description && (
                        <p className="text-xs text-gray-600 pl-8">{st.description}</p>
                      )}

                      <div className="pl-8 pt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          🔍 Criterio: {st.qc_criteria}
                        </span>

                        {st.media_url && (
                          <button
                            onClick={() => onOpenMedia(st)}
                            className="text-xs text-blue-700 hover:text-blue-900 bg-blue-100/70 hover:bg-blue-100 px-2.5 py-1 rounded font-semibold flex items-center gap-1 transition"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Ver Guía (GIF/Foto)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 pt-2 sm:pt-0">
                      {isDone ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100 px-4 py-2.5 rounded-lg font-bold text-xs">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <span>VALIDADO OK</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleStep(st)}
                          disabled={submittingStep === st.step_number}
                          className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center gap-2 transition"
                        >
                          {submittingStep === st.step_number ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Marcar Conforme</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            {isStationComplete ? (
              <button
                onClick={handleFinishStation}
                disabled={finishingUnit}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl shadow-lg flex items-center justify-center gap-3 transition pulse-glow"
              >
                {finishingUnit ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Despachando PC...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightCircle className="w-6 h-6" />
                    <span>
                      FINALIZAR MI PARTE Y ENVIAR PC #{active_unit.unit_number} A SIGUIENTE ESTACIÓN
                    </span>
                  </>
                )}
              </button>
            ) : (
              <div className="bg-gray-100 p-3 rounded-lg text-center text-xs text-gray-500 font-medium">
                Complete todos los {totalStationSteps} pasos asignados arriba para habilitar el envío continuo a la siguiente estación.
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-700">No hay computadoras pendientes en tu estación</h3>
          <p className="text-xs text-gray-500">Tan pronto la estación anterior finalice una PC, aparecerá automáticamente aquí.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span>Cola de Entrada ({queue_units.length} PCs en espera)</span>
          </h4>
          {queue_units.length > 0 ? (
            <div className="space-y-2">
              {queue_units.map(u => (
                <div key={u.unit_number} className="flex justify-between items-center p-2.5 bg-gray-50 rounded border border-gray-200 text-xs">
                  <span className="font-semibold text-gray-900">PC #{u.unit_number.toString().padStart(2, '0')}</span>
                  <span className="text-gray-500 font-mono">{u.serial_number}</span>
                  <Badge variant="neutral">En cola</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No hay más PCs en espera inmediata.</p>
          )}
        </Card>

        <Card className="p-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Despachadas en tu Turno ({completed_units.length})</span>
          </h4>
          {completed_units.length > 0 ? (
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {completed_units.map(u => (
                <div key={u.unit_number} className="flex justify-between items-center p-2.5 bg-emerald-50/50 rounded border border-emerald-200 text-xs">
                  <span className="font-semibold text-emerald-900">PC #{u.unit_number.toString().padStart(2, '0')}</span>
                  <span className="text-emerald-700 font-mono text-[11px]">{u.serial_number}</span>
                  <Badge variant="success">Enviada a E{u.current_station}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Aún no has despachado PCs en este lote.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

// 5. AUDITORÍA FORENSE
function AuditLogsView({ selectedOrder, orders }) {
  const [logs, setLogs] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState(selectedOrder || orders[0]?.order_id);
  const [filterUser, setFilterUser] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeOrderId) {
      setLoading(true);
      fetch(`${API_BASE}/orders/${activeOrderId}/logs`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (Array.isArray(data)) setLogs(data); })
        .catch(err => console.error("Error logs:", err))
        .finally(() => setLoading(false));
    }
  }, [activeOrderId]);

  const filteredLogs = logs.filter(l =>
    !filterUser || (l.user_name || "").toLowerCase().includes(filterUser.toLowerCase()) || (l.user_id || "").toLowerCase().includes(filterUser.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Registro de Auditoría e Integridad Forense</span>
            </h3>
            <p className="text-xs text-gray-500">Trazabilidad inmutable de cada 'check' realizado con fecha, hora exacta y operador responsable.</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={activeOrderId || ""}
              onChange={(e) => setActiveOrderId(e.target.value)}
              className="text-xs border border-gray-300 rounded px-3 py-1.5 bg-gray-50 font-semibold"
            >
              {orders.map(o => (
                <option key={o.order_id} value={o.order_id}>{o.order_id}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Filtrar por técnico..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="text-xs border border-gray-300 rounded px-3 py-1.5"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
              <th className="py-2.5 px-3 font-bold w-16">Log ID</th>
              <th className="py-2.5 px-3 font-bold w-36">Fecha y Hora Exacta</th>
              <th className="py-2.5 px-3 font-bold w-20">Unidad</th>
              <th className="py-2.5 px-3 font-bold w-20">Paso #</th>
              <th className="py-2.5 px-3 font-bold w-24">Estación</th>
              <th className="py-2.5 px-3 font-bold">Auditor / Operador</th>
              <th className="py-2.5 px-3 font-bold text-center w-24">Estado</th>
              <th className="py-2.5 px-3 font-bold">Observación / Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLogs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50 transition">
                <td className="py-2 px-3 font-mono text-gray-500 font-semibold">#{l.id}</td>
                <td className="py-2 px-3 font-mono text-gray-600 text-[11px]">
                  {new Date(l.timestamp).toLocaleString("es-PE")}
                </td>
                <td className="py-2 px-3 font-bold text-gray-900">PC #{l.unit_number.toString().padStart(2, '0')}</td>
                <td className="py-2 px-3 font-bold text-blue-700">Paso {l.step_number}</td>
                <td className="py-2 px-3 text-gray-700">Estación {l.station_number}</td>
                <td className="py-2 px-3 font-semibold text-gray-900">
                  {l.user_name} <span className="text-gray-400 font-normal text-[10px]">({l.user_id})</span>
                </td>
                <td className="py-2 px-3 text-center">
                  {l.status === "PASS" && <Badge variant="success">PASS</Badge>}
                  {l.status === "FAIL" && <Badge variant="danger">FAIL</Badge>}
                  {l.status === "REASSIGNED" && <Badge variant="warning">REASIGNADO</Badge>}
                </td>
                <td className="py-2 px-3 text-gray-600 italic text-[11px]">{l.notes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// MODAL VISOR MULTIMEDIA
function MediaViewerModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 fade-in">
      <div className="bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl">
        <div className="bg-[#0078d4] text-white p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Guía de Control de Calidad</span>
            <h3 className="text-sm font-bold">Paso #{item.step_number}: {item.operation}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center min-h-[260px]">
            {item.media_url ? (
              <img
                src={item.media_url}
                alt={item.operation}
                className="max-h-[380px] w-auto object-contain rounded"
              />
            ) : (
              <div className="text-gray-400 text-center p-8">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No hay imagen o GIF asignado para este paso</p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="text-xs font-bold text-blue-900 uppercase">Criterio Específico de Aceptación:</h4>
            <p className="text-xs text-blue-800 mt-1 font-medium">{item.qc_criteria}</p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold text-xs rounded-lg shadow transition"
          >
            Entendido, Regresar al Checklist
          </button>
        </div>
      </div>
    </div>
  );
}

// MODAL REPORTE DE FALLAS
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
          description: description,
          severity: severity
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
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 fade-in">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="bg-rose-600 text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Reportar Falla en PC #{unit.unit_number}</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Título de la Falla</label>
            <input
              type="text"
              required
              placeholder="Ej: Rayón en tapa frontal / BIOS no detecta GPU"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded p-2 focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Severidad</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded p-2 font-bold"
            >
              <option value="LOW">Baja (Detalle cosmético subsanable)</option>
              <option value="MEDIUM">Media (Requiere ajuste menor)</option>
              <option value="HIGH">Alta (Reemplazo de componente)</option>
              <option value="CRITICAL">Crítica (Bloqueo total de PC)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción Detallada</label>
            <textarea
              rows="3"
              required
              placeholder="Detalle exactamente lo observado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded p-2"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded shadow transition"
            >
              Bloquear PC y Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// MODAL REASIGNACIÓN DE EMERGENCIA
function EmergencyReassignModal({ order, stations, operators, onClose, onSuccess }) {
  const [stationNumber, setStationNumber] = useState(stations[0]?.station_number || 1);
  const [newUserId, setNewUserId] = useState(operators[0]?.id || "");
  const [reason, setReason] = useState("Ausencia / Retraso de Operario en Línea");
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
          reason: reason
        })
      });

      if (!res.ok) throw new Error("Error al reasignar estación");
      const data = await res.json();
      onSuccess(data.message);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 fade-in">
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="bg-amber-600 text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>Reasignación de Emergencia de Estación</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-gray-600">
            Transfiera la carga activa de una estación a otro técnico conservando intacto el historial de trazabilidad previo en la base de datos.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Estación a Transferir</label>
            <select
              value={stationNumber}
              onChange={(e) => setStationNumber(parseInt(e.target.value, 10))}
              className="w-full text-xs border border-gray-300 rounded p-2 font-medium"
            >
              {stations.map(st => (
                <option key={st.station_number} value={st.station_number}>
                  Estación {st.station_number}: {st.station_name} (Actual: {st.user_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nuevo Técnico Responsable</label>
            <select
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded p-2 font-bold text-blue-700"
            >
              {operators.map(op => (
                <option key={op.id} value={op.id}>{op.name} ({op.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo de Reasignación</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded p-2"
            />
          </div>

          <div className="bg-amber-50 p-3 rounded border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <p className="font-bold">✓ Política de Integridad:</p>
            <p>El sistema mantendrá el registro inmutable del operador anterior hasta la última PC auditada y registrará al nuevo técnico desde este momento.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded shadow transition"
            >
              Confirmar y Reasignar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// MODAL EDICIÓN PASO CHECKLIST
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
      const res = await fetch(`${API_BASE}/upload-media`, {
        method: "POST",
        body: fd
      });
      if (!res.ok) throw new Error("Error al subir multimedia");
      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        media_url: data.url,
        media_type: data.type
      }));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 fade-in">
      <div className="bg-white rounded-xl max-w-xl w-full overflow-hidden shadow-2xl">
        <div className="bg-[#0078d4] text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold">
            {formData.id ? `Editar Paso #${formData.step_number}` : "Nuevo Paso de Control"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">N° de Paso</label>
              <input
                type="number"
                required
                value={formData.step_number}
                onChange={(e) => setFormData({ ...formData, step_number: parseInt(e.target.value, 10) })}
                className="w-full text-xs border border-gray-300 rounded p-2 font-bold"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Operación / Título</label>
              <input
                type="text"
                required
                value={formData.operation}
                onChange={(e) => setFormData({ ...formData, operation: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción Detallada</label>
            <textarea
              rows="2"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs border border-gray-300 rounded p-2"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Criterio de Control de Calidad</label>
            <textarea
              rows="2"
              required
              value={formData.qc_criteria}
              onChange={(e) => setFormData({ ...formData, qc_criteria: e.target.value })}
              className="w-full text-xs border border-gray-300 rounded p-2"
            ></textarea>
          </div>

          <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
            <label className="block text-xs font-bold text-gray-700">Recurso Multimedia Instructivo (GIF o Imagen HD)</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="URL o ruta de imagen/GIF..."
                value={formData.media_url || ""}
                onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded p-2 bg-white"
              />
              <label className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded cursor-pointer hover:bg-blue-100 flex-shrink-0">
                <span>{uploading ? "Subiendo..." : "Subir Archivo"}</span>
                <input type="file" accept="image/*,.gif" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {formData.media_url && (
              <div className="mt-2 text-center bg-gray-900 rounded p-2">
                <img src={formData.media_url} alt="Preview" className="max-h-32 mx-auto rounded" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-[#0078d4] hover:bg-[#106ebe] text-white rounded shadow transition"
            >
              Guardar Paso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// MODAL DETALLE PC
function UnitDetailModal({ unit, order, stations, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 fade-in">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="bg-[#0078d4] text-white p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold">Ficha de Trazabilidad: PC #{unit.unit_number}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
            <div>
              <span className="text-[10px] text-gray-500 font-semibold">N° Serie:</span>
              <p className="font-mono font-bold text-gray-900">{unit.serial_number}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-semibold">Orden:</span>
              <p className="font-bold text-blue-700">{order.order_id}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-semibold">Estado Actual:</span>
              <p className="font-bold">{unit.overall_status}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-semibold">Estación Actual:</span>
              <p className="font-bold text-emerald-700">
                {unit.current_station > stations.length ? "EMPACADO (OK)" : `Estación ${unit.current_station}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded text-xs"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}
