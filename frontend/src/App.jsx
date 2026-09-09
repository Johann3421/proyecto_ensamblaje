import React, { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import { API_BASE } from './utils/api';
import Badge from './components/Badge';
import Card from './components/Card';

// Views
import PipelineMatrixView from './views/PipelineMatrixView';
import CreateOrderView from './views/CreateOrderView';
import ChecklistEditorView from './views/ChecklistEditorView';
import OperatorWorkspaceView from './views/OperatorWorkspaceView';
import AuditLogsView from './views/AuditLogsView';
import TechniciansManagementView from './views/TechniciansManagementView';

// Modals
import PhotoPreviewModal from './modals/PhotoPreviewModal';
import MediaViewerModal from './modals/MediaViewerModal';
import IssueReportModal from './modals/IssueReportModal';
import EmergencyReassignModal from './modals/EmergencyReassignModal';
import UnitDetailModal from './modals/UnitDetailModal';
import AddUnitsModal from './modals/AddUnitsModal';
import ResetOrderModal from './modals/ResetOrderModal';
import DeleteOrderModal from './modals/DeleteOrderModal';
import EditOrderModal from './modals/EditOrderModal';

// Icons
import {
  CheckCircle, AlertTriangle, Grid, PlusCircle, FileText,
  ShieldCheck, CheckSquare, Users, X, Menu, LogOut
} from 'lucide-react';

export default function App() {
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({ id: '', name: '', role: '', avatar: '' });

  // App State
  const [activeTab, setActiveTab] = useState('matrix');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [models, setModels] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [matrixData, setMatrixData] = useState(null);
  const [notification, setNotification] = useState(null);
  const [operatorWorkspace, setOperatorWorkspace] = useState(null);
  const [operatorStationFilter, setOperatorStationFilter] = useState(null);

  // Modal State
  const [activeMediaModal, setActiveMediaModal] = useState(null);
  const [activeIssueModal, setActiveIssueModal] = useState(null);
  const [activePhotoPreview, setActivePhotoPreview] = useState(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [selectedUnitDetail, setSelectedUnitDetail] = useState(null);
  const [addUnitsModalOpen, setAddUnitsModalOpen] = useState(false);
  const [resetOrderModalOpen, setResetOrderModalOpen] = useState(false);
  const [deleteOrderModalOpen, setDeleteOrderModalOpen] = useState(false);
  const [editOrderModalOpen, setEditOrderModalOpen] = useState(false);

  // Auth: Check saved token
  useEffect(() => {
    const savedToken = localStorage.getItem('qc_token');
    const savedUser = localStorage.getItem('qc_user');
    if (savedToken && savedUser) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
        .then(r => { if (r.ok) return r.json(); throw new Error('Token expired'); })
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

  const notify = (message, type = 'success') => {
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
      console.warn('API load error:', err);
    }
  };

  const loadMatrixData = () => {
    if (selectedOrder) {
      fetch(`${API_BASE}/orders/${selectedOrder}/matrix`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setMatrixData(data); })
        .catch(err => console.error('Error matriz:', err));
    }
  };

  const loadOperatorWorkspace = (unitNumber = null, orderId = null, stationNumber = null) => {
    if (!currentUser?.id) return;
    const params = new URLSearchParams();
    if (unitNumber) params.append('unit_number', unitNumber);
    if (orderId) params.append('order_id', orderId);
    else if (selectedOrder) params.append('order_id', selectedOrder);
    const targetStation = stationNumber !== null ? stationNumber : operatorStationFilter;
    if (targetStation) params.append('station_number', targetStation);
    const qs = params.toString() ? `?${params.toString()}` : '';
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
      .catch(err => console.error('Error workspace operario:', err));
  };

  useEffect(() => { if (isAuthenticated) loadInitialData(); }, [isAuthenticated]);
  useEffect(() => { loadMatrixData(); }, [selectedOrder]);
  useEffect(() => {
    if (activeTab === 'operator' || currentUser.role === 'OPERATOR') {
      loadOperatorWorkspace(null, selectedOrder);
    }
  }, [activeTab, currentUser, selectedOrder]);

  const navigate = (tab) => { setActiveTab(tab); setMobileMenuOpen(false); };

  const isSupportUser = currentUser?.id === 'OP-106' || (currentUser?.email || '').includes('apoyo');

  const ADMIN_TABS = [
    { id: 'matrix', label: 'Pipeline', shortLabel: 'Pipeline', icon: Grid },
    { id: 'create-order', label: 'Nueva Orden', shortLabel: 'Orden', icon: PlusCircle },
    { id: 'technicians', label: 'Técnicos', shortLabel: 'Técnicos', icon: Users },
    { id: 'checklists', label: 'Checklists', shortLabel: 'Checks', icon: FileText },
    { id: 'audit', label: 'Auditoría', shortLabel: 'Auditor', icon: ShieldCheck },
  ];
  const SUPERVISOR_TABS = [
    { id: 'matrix', label: 'Pipeline', shortLabel: 'Pipeline', icon: Grid },
    { id: 'operator', label: 'Supervisión & V°B°', shortLabel: 'Supervisión', icon: ShieldCheck },
    { id: 'checklists', label: 'Checklists', shortLabel: 'Checks', icon: FileText },
    { id: 'audit', label: 'Auditoría', shortLabel: 'Auditor', icon: ShieldCheck },
  ];
  const OPERATOR_TABS = [
    { id: 'operator', label: isSupportUser ? 'Puesto de Apoyo' : 'Mi Estación', shortLabel: isSupportUser ? 'Apoyo' : 'Trabajo', icon: CheckSquare },
  ];

  const tabs = currentUser.role === 'ADMIN' ? ADMIN_TABS
    : currentUser.role === 'SUPERVISOR' ? SUPERVISOR_TABS
    : OPERATOR_TABS;

  // Loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" style={{ borderWidth: '3px' }} />
          <p className="text-stone-500 text-sm mt-3">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Login
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const roleLabel = currentUser.role === 'ADMIN' ? 'Admin' : currentUser.role === 'SUPERVISOR' ? 'Supervisor' : 'Operario';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-stone-50">
      {/* HEADER */}
      <header className="bg-primary text-white shadow-md flex-shrink-0 z-40">
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-black text-base tracking-wider">KENYA</span>
            <div className="hidden sm:block h-5 w-px bg-white/30"></div>
            <span className="hidden sm:flex text-sm font-medium text-white/80 items-center gap-2">
              Control de Calidad
              <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded font-mono">v2.0</span>
            </span>
          </div>

          {/* Nav Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === tab.id ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/70'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg text-xs">
              <span className="text-white/60 text-[10px] font-medium">{roleLabel}</span>
              <span className="text-white font-medium max-w-[100px] sm:max-w-none truncate">{currentUser.name}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
              {currentUser.avatar || (currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'U')}
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white/20 transition text-white/60 hover:text-white" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
            <button className="md:hidden p-1.5 rounded-lg hover:bg-white/20 transition" onClick={() => setMobileMenuOpen(prev => !prev)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-primary-light border-t border-white/10 px-3 py-2 space-y-1 fade-in z-50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition touch-target ${
                  activeTab === tab.id ? 'bg-white/15 text-white font-semibold' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* NOTIFICATION */}
      {notification && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 fade-in w-[calc(100%-2rem)] max-w-md ${
          notification.type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-700'
            : 'bg-red-600 text-white border-red-700'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{notification.message}</span>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {activeTab === 'matrix' && (
            <PipelineMatrixView
              matrixData={matrixData} orders={orders} selectedOrder={selectedOrder}
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
          {activeTab === 'create-order' && (
            <CreateOrderView
              models={models} users={users}
              onSuccess={(orderId) => { notify('¡Orden creada!'); loadInitialData(); setSelectedOrder(orderId); navigate('matrix'); }}
              onRefreshModels={loadInitialData} notify={notify}
            />
          )}
          {activeTab === 'technicians' && (
            <TechniciansManagementView
              users={users}
              onRefreshUsers={() => { loadInitialData(); loadMatrixData(); loadOperatorWorkspace(); }}
              notify={notify}
            />
          )}
          {activeTab === 'checklists' && (
            <ChecklistEditorView models={models} notify={notify} onRefreshModels={loadInitialData} />
          )}
          {activeTab === 'audit' && (
            <AuditLogsView selectedOrder={selectedOrder} orders={orders} onPreviewPhoto={(p) => setActivePhotoPreview(p)} />
          )}
          {activeTab === 'operator' && (
            <OperatorWorkspaceView
              workspace={operatorWorkspace} currentUser={currentUser}
              onOpenMedia={(item) => setActiveMediaModal(item)}
              onOpenIssue={(unit, step) => setActiveIssueModal({ unit, step })}
              onPreviewPhoto={(p) => setActivePhotoPreview(p)}
              onSelectUnit={(unitNum) => loadOperatorWorkspace(unitNum, selectedOrder, operatorStationFilter)}
              onSelectOrder={(ordId) => { setSelectedOrder(ordId); loadOperatorWorkspace(null, ordId, operatorStationFilter); }}
              onSelectStation={(stNum) => { setOperatorStationFilter(stNum); loadOperatorWorkspace(null, selectedOrder, stNum); }}
              onRefresh={() => loadOperatorWorkspace(null, selectedOrder, operatorStationFilter)}
              notify={notify}
            />
          )}
        </div>
      </main>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 safe-bottom z-40 flex shadow-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 touch-target transition-colors relative ${
              activeTab === tab.id ? 'text-primary' : 'text-stone-400'
            }`}
          >
            {activeTab === tab.id && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">{tab.shortLabel}</span>
          </button>
        ))}
      </nav>

      {/* MODALS */}
      {activeMediaModal && <MediaViewerModal item={activeMediaModal} onClose={() => setActiveMediaModal(null)} />}
      {activePhotoPreview && <PhotoPreviewModal photo={activePhotoPreview} onClose={() => setActivePhotoPreview(null)} />}
      {activeIssueModal && (
        <IssueReportModal
          data={activeIssueModal} currentUser={currentUser}
          orderId={operatorWorkspace?.order?.order_id}
          stationNumber={operatorWorkspace?.assignment?.station_number}
          onClose={() => setActiveIssueModal(null)}
          onSuccess={() => { notify('Incidencia registrada', 'danger'); setActiveIssueModal(null); loadOperatorWorkspace(); }}
        />
      )}
      {emergencyModalOpen && matrixData && (
        <EmergencyReassignModal
          order={matrixData.order} stations={matrixData.stations}
          operators={users.filter(u => u.role === 'OPERATOR')}
          onClose={() => setEmergencyModalOpen(false)}
          onSuccess={(msg) => { notify(msg); setEmergencyModalOpen(false); loadInitialData(); }}
        />
      )}
      {addUnitsModalOpen && matrixData && (
        <AddUnitsModal order={matrixData.order} onClose={() => setAddUnitsModalOpen(false)}
          onSuccess={(msg) => { notify(msg); setAddUnitsModalOpen(false); loadMatrixData(); }}
        />
      )}
      {resetOrderModalOpen && matrixData && (
        <ResetOrderModal order={matrixData.order} onClose={() => setResetOrderModalOpen(false)}
          onSuccess={(msg) => { notify(msg); setResetOrderModalOpen(false); loadMatrixData(); }}
        />
      )}
      {deleteOrderModalOpen && matrixData && (
        <DeleteOrderModal order={matrixData.order} onClose={() => setDeleteOrderModalOpen(false)}
          onSuccess={(msg) => { notify(msg); setDeleteOrderModalOpen(false); loadInitialData(); }}
        />
      )}
      {editOrderModalOpen && matrixData && (
        <EditOrderModal
          order={matrixData.order} stations={matrixData.stations} models={models} users={users}
          onClose={() => setEditOrderModalOpen(false)}
          onSuccess={(msg) => { notify(msg || 'Orden actualizada'); setEditOrderModalOpen(false); loadInitialData(); loadMatrixData(); }}
          notify={notify}
        />
      )}
      {selectedUnitDetail && matrixData && (
        <UnitDetailModal
          unit={selectedUnitDetail} order={matrixData.order} stations={matrixData.stations}
          issues={matrixData.issues || []} currentUser={currentUser}
          onPreviewPhoto={(p) => setActivePhotoPreview(p)}
          onClose={() => setSelectedUnitDetail(null)}
          onSuccess={(msg) => { notify(msg); setSelectedUnitDetail(null); loadMatrixData(); }}
          notify={notify}
        />
      )}
    </div>
  );
}
