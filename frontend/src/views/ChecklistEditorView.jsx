import React, { useState, useEffect, useCallback } from 'react';
import { Check, AlertTriangle, Plus, Edit, Download, Upload, Loader2, Shield, ShieldCheck, FileText, PlusCircle, Image as ImageIcon, Search, ChevronDown, ChevronUp, ClipboardList, Wrench, Trash2, RotateCcw, Trash, Sparkles, Layers } from 'lucide-react';
import { API_BASE } from '../utils/api';
import Badge from '../components/Badge';
import Card from '../components/Card';
import ImportChecklistModal from '../modals/ImportChecklistModal';
import CreateModelModal from '../modals/CreateModelModal';
import ChecklistStepModal from '../modals/ChecklistStepModal';
import { isStepCleaning } from '../utils/steps';

export default function ChecklistEditorView({ models, notify, onRefreshModels }) {
  const [selectedModel, setSelectedModel] = useState(models[0]?.name || "PROWORK");
  const [steps, setSteps] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCategory, setImportCategory] = useState("ALL"); // "ALL" | "ASSEMBLY" | "CLEANING"
  const [createModelModalOpen, setCreateModelModalOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);

  const openImportModal = (category = "ALL") => {
    setImportCategory(category);
    setImportModalOpen(true);
  };

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

  const [filterType, setFilterType] = useState("GROUPED"); // "GROUPED" | "ALL" | "ASSEMBLY" | "CLEANING"

  // Quick toggle cleaning endpoint
  const handleToggleStepCleaning = async (st) => {
    if (!st || !st.id) return;
    try {
      const res = await fetch(`${API_BASE}/models/${selectedModel}/checklist/${st.id}/toggle-cleaning`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al cambiar tipo de paso");
      notify?.(
        data.is_cleaning
          ? `Paso #${st.step_number} marcado como Limpieza QC`
          : `Paso #${st.step_number} marcado como Ensamblaje`,
        "success"
      );
      loadSteps();
      onRefreshModels?.();
    } catch (err) {
      notify?.("Error: " + err.message, "danger");
    }
  };

  // Auto-clasificar todos los pasos de limpieza del modelo
  const handleAutoClassifyCleaning = async () => {
    try {
      setProcessingAction("classify-cleaning");
      const res = await fetch(`${API_BASE}/models/${selectedModel}/classify-cleaning`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al auto-clasificar");
      notify?.(data.message || "Clasificación de limpieza completada", "success");
      loadSteps();
      onRefreshModels?.();
    } catch (err) {
      notify?.("Error: " + err.message, "danger");
    } finally {
      setProcessingAction(null);
    }
  };

  const isCleaning = (s) => isStepCleaning(s);
  const assemblySteps = steps.filter(s => !isCleaning(s));
  const cleaningSteps = steps.filter(s => isCleaning(s));

  const filterBySearch = (list) => list.filter(s =>
    (s.operation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.qc_criteria || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSteps = filterBySearch(steps);
  const filteredAssembly = filterBySearch(assemblySteps);
  const filteredCleaning = filterBySearch(cleaningSteps);

  const filteredStepsToRender =
    filterType === "ASSEMBLY" ? filteredAssembly :
    filterType === "CLEANING" ? filteredCleaning :
    filteredSteps;

  const renderStepCard = (st, idx, listContext = "default") => {
    const isClean = isCleaning(st);
    const isExpanded = expandedStep === st.step_number;

    return (
      <Card key={st.step_number || st.id || idx} className={`overflow-hidden transition border ${
        isClean ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200"
      }`}>
        <div
          onClick={() => setExpandedStep(isExpanded ? null : st.step_number)}
          className="w-full flex items-center gap-3 p-3 text-left touch-target cursor-pointer hover:bg-gray-50/80 transition"
        >
          <span className={`w-7 h-7 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs ${
            isClean ? "bg-emerald-600 ring-2 ring-emerald-400/30" : "bg-primary ring-2 ring-primary/20"
          }`}>
            {st.step_number}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold text-gray-900 truncate">{st.operation}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStepCleaning(st);
                }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition flex items-center gap-1 touch-target ${
                  isClean
                    ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200"
                }`}
                title="Clic para alternar entre Ensamblaje y Limpieza QC"
              >
                {isClean ? <Sparkles className="w-3 h-3 text-emerald-600" /> : <Wrench className="w-3 h-3 text-primary" />}
                <span>{isClean ? "🧼 Limpieza QC" : "⚙️ Ensamblaje"}</span>
              </button>
            </div>
            {st.qc_criteria && <p className="text-[10px] text-gray-500 truncate mt-0.5">{st.qc_criteria}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {st.media_url && <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 space-y-2.5 fade-in bg-white/80">
            <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 flex-wrap text-xs ${
              isClean ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-stone-50 border-stone-200 text-stone-900"
            }`}>
              <div className="flex items-center gap-1.5">
                {isClean ? <Sparkles className="w-4 h-4 text-emerald-600" /> : <Wrench className="w-4 h-4 text-primary" />}
                <span className="font-bold">
                  {isClean ? "Paso Exclusivo de Limpieza QC" : "Paso de Ensamblaje General"}
                </span>
                <span className="text-[10px] opacity-75">
                  ({isClean ? "Aislado de estaciones de ensamble" : "Asignable a puestos de armado"})
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleStepCleaning(st)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border shadow-2xs hover:bg-gray-50 transition"
              >
                {isClean ? "Cambiar a ⚙️ Ensamblaje" : "Mover a 🧼 Limpieza QC"}
              </button>
            </div>

            {st.description && <p className="text-xs text-gray-700 leading-relaxed">{st.description}</p>}
            {st.qc_criteria && (
              <div className="bg-stone-50 border border-stone-200 p-2 rounded-lg text-xs text-stone-900">
                <span className="font-semibold">Criterio QC: </span>{st.qc_criteria}
              </div>
            )}
            {st.media_url && (
              <img src={st.media_url} alt={st.operation} className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />
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
    );
  };

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
                className="text-xs font-bold border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-stone-800 touch-target focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
              <Badge variant="info">{steps.length} Pasos</Badge>

              {/* Botón Nuevo Modelo */}
              <button
                type="button"
                onClick={() => setCreateModelModalOpen(true)}
                className="text-xs bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition touch-target"
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Nuevo Paso Ensamblaje */}
            <button
              onClick={() => setEditingItem({
                model_name: selectedModel,
                step_number: steps.length + 1,
                operation: "",
                description: "",
                qc_criteria: "",
                media_url: "",
                is_cleaning: false
              })}
              className="text-xs bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition touch-target"
              title="Crear un paso normal para estaciones de ensamblaje"
            >
              <Plus className="w-4 h-4" />
              <span>+ Paso Ensamblaje</span>
            </button>

            {/* Botón Exclusivo Nuevo Paso Limpieza */}
            <button
              onClick={() => setEditingItem({
                model_name: selectedModel,
                step_number: steps.length + 1,
                operation: "Limpieza profunda de equipo",
                description: "Retiro de película protectora, limpieza con alcohol isopropílico y paño de microfibra.",
                qc_criteria: "Equipo 100% libre de huellas, residuos, adhesivos y polvo.",
                media_url: "",
                is_cleaning: true
              })}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition touch-target"
              title="Crear un paso exclusivo para estaciones de limpieza QC"
            >
              <Sparkles className="w-4 h-4" />
              <span>+ Paso Limpieza</span>
            </button>

            {/* Botón Auto-clasificar Limpieza */}
            <button
              onClick={handleAutoClassifyCleaning}
              disabled={processingAction === "classify-cleaning" || steps.length === 0}
              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition touch-target"
              title="Detectar automáticamente pasos de limpieza según palabras clave (microfibra, película, polvo, etc.)"
            >
              {processingAction === "classify-cleaning" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-600" />}
              <span>Auto-clasificar Limpieza</span>
            </button>

            {/* Botón Descargar Plantilla Excel */}
            <button
              onClick={() => {
                const targetCat = filterType === "CLEANING" ? "CLEANING" : filterType === "ASSEMBLY" ? "ASSEMBLY" : "ALL";
                window.open(`${API_BASE}/checklist/template?model_name=${selectedModel}&category=${targetCat}`, "_blank");
              }}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-2xs transition touch-target"
              title="Descargar plantilla Excel oficial con ejemplos e instrucciones para importar"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>
                {filterType === "CLEANING" ? "Plantilla Limpieza" : filterType === "ASSEMBLY" ? "Plantilla Ensamblaje" : "Plantilla para Importar"}
              </span>
            </button>

            {/* Botón Importar Pasos */}
            <button
              onClick={() => {
                const targetCat = filterType === "CLEANING" ? "CLEANING" : filterType === "ASSEMBLY" ? "ASSEMBLY" : "ALL";
                openImportModal(targetCat);
              }}
              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-2xs transition touch-target"
              title="Subir archivo Excel o CSV usando la plantilla para cargar pasos"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>
                {filterType === "CLEANING" ? "Importar Limpieza" : filterType === "ASSEMBLY" ? "Importar Ensamblaje" : "Importar Pasos"}
              </span>
            </button>

            {/* Exportar Excel */}
            <button
              onClick={() => {
                const targetCat = filterType === "CLEANING" ? "CLEANING" : filterType === "ASSEMBLY" ? "ASSEMBLY" : "ALL";
                window.open(`${API_BASE}/models/${selectedModel}/export-excel?category=${targetCat}`, "_blank");
              }}
              disabled={steps.length === 0}
              className={`text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-2xs transition touch-target ${
                steps.length === 0
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300"
              }`}
              title="Exportar pasos actuales a Excel con indicador de tipo de paso"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>
                {filterType === "CLEANING" ? "Exportar Limpieza" : filterType === "ASSEMBLY" ? "Exportar Ensamblaje" : "Exportar Excel"}
              </span>
            </button>
          </div>

          {/* Selector de modo de visualización / filtro de pasos */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-gray-100 pt-2.5">
            <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap mr-1">Separar Vista:</span>
            <button
              type="button"
              onClick={() => setFilterType("GROUPED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                filterType === "GROUPED"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title="Mostrar bloques separados: Bloque Ensamblaje y Bloque Limpieza"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🗂️ Vista Dividida por Bloques</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap ${
                filterType === "ALL"
                  ? "bg-gray-800 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>Todos</span>
              <span className="text-[10px] opacity-75">({steps.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType("ASSEMBLY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap ${
                filterType === "ASSEMBLY"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-stone-100 text-stone-800 hover:bg-stone-200"
              }`}
            >
              <span>⚙️ Ensamblaje</span>
              <span className="text-[10px] opacity-75">({assemblySteps.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType("CLEANING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap ${
                filterType === "CLEANING"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>🧼 Limpieza QC</span>
              <span className="text-[10px] opacity-75">({cleaningSteps.length})</span>
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
              ? "bg-stone-50 border-stone-300"
              : "bg-amber-50/50 border-amber-300"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className={`p-2 rounded-xl flex-shrink-0 ${
                diagnostics.is_healthy ? "bg-emerald-100 text-emerald-700" : diagnostics.total_steps === 0 ? "bg-stone-200 text-primary" : "bg-amber-100 text-amber-700"
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
                    <span className="text-[10px] font-bold text-stone-800 bg-stone-200 border border-stone-300 px-2 py-0.5 rounded-full">
                      Modelo sin pasos
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                      {diagnostics.recommendations.length} sugerencia(s)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {diagnostics.total_steps} pasos registrados ({assemblySteps.length} ensamblaje, {cleaningSteps.length} limpieza QC) · {diagnostics.has_cleaning ? "🧼 Limpieza cubierta" : "⚠️ Requiere pasos de limpieza"} · {diagnostics.has_bios ? "✓ BIOS verificado" : "Falta BIOS"}
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
                    className="px-3 py-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition touch-target"
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
                  className="px-3.5 py-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition touch-target"
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
          <div className="w-14 h-14 rounded-full bg-stone-100 text-primary flex items-center justify-center mx-auto mb-3">
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
              className="text-xs bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition touch-target"
            >
              {processingAction === "fill" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Cargar Pasos Estándar</span>
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
              onClick={() => setEditingItem({
                model_name: selectedModel,
                step_number: 1,
                operation: "",
                description: "",
                qc_criteria: "",
                media_url: "",
                is_cleaning: false
              })}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition touch-target"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Paso Manual</span>
            </button>
          </div>
        </Card>
      ) : filteredStepsToRender.length === 0 && filterType !== "GROUPED" ? (
        <Card className="p-6 text-center text-xs text-gray-500">
          No se encontraron pasos que coincidan con la búsqueda o filtro seleccionado.
        </Card>
      ) : filterType === "GROUPED" ? (
        <div className="space-y-6">
          {/* BLOQUE 1: PASOS NORMALES DE ENSAMBLAJE */}
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-stone-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-gray-900">
                      Pasos Normales de Ensamblaje
                    </h3>
                    <Badge variant="info">{filteredAssembly.length} pasos</Badge>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Pasos de armado físico, cableado y configuración asignados a las estaciones de trabajo de los técnicos.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setEditingItem({
                    model_name: selectedModel,
                    step_number: steps.length + 1,
                    operation: "",
                    description: "",
                    qc_criteria: "",
                    media_url: "",
                    is_cleaning: false
                  })}
                  className="text-xs bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Paso Ensamblaje</span>
                </button>
                <button
                  type="button"
                  onClick={() => openImportModal("ASSEMBLY")}
                  className="text-xs bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition"
                  title="Importar exclusivamente pasos de ensamblaje desde archivo Excel"
                >
                  <Upload className="w-3.5 h-3.5 text-stone-600" />
                  <span>Importar Ensamblaje</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`${API_BASE}/models/${selectedModel}/export-excel?category=ASSEMBLY`, "_blank")}
                  disabled={filteredAssembly.length === 0}
                  className={`text-xs border font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition ${
                    filteredAssembly.length === 0
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white hover:bg-stone-100 text-stone-800 border-stone-300"
                  }`}
                  title="Exportar pasos de ensamblaje a Excel"
                >
                  <Download className="w-3.5 h-3.5 text-stone-600" />
                  <span>Exportar</span>
                </button>
              </div>
            </div>

            {filteredAssembly.length === 0 ? (
              <Card className="p-6 text-center text-xs text-gray-500 border-dashed">
                No hay pasos normales de ensamblaje registrados para este filtro.
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredAssembly.map((st, idx) => renderStepCard(st, idx, "assembly"))}
              </div>
            )}
          </div>

          {/* BLOQUE 2: BLOQUE EXCLUSIVO DE PASOS DE LIMPIEZA */}
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>Bloque Exclusivo de Pasos de Limpieza (QC Obligatorio)</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        Exclusivo
                      </span>
                    </h3>
                    <Badge variant="success">{filteredCleaning.length} pasos de limpieza</Badge>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Pasos reservados exclusivamente para limpieza profunda, microfibra, soplado y desprotección. <strong>NO</strong> se mezclan en las estaciones de ensamblaje.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setEditingItem({
                    model_name: selectedModel,
                    step_number: steps.length + 1,
                    operation: "Limpieza profunda de equipo",
                    description: "Retiro de película protectora, limpieza con alcohol isopropílico y paño de microfibra.",
                    qc_criteria: "Equipo 100% libre de huellas, residuos, adhesivos y polvo.",
                    media_url: "",
                    is_cleaning: true
                  })}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nuevo Paso Limpieza</span>
                </button>
                <button
                  type="button"
                  onClick={() => openImportModal("CLEANING")}
                  className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition"
                  title="Importar pasos exclusivamente al bloque de Limpieza desde Excel"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar Limpieza</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`${API_BASE}/models/${selectedModel}/export-excel?category=CLEANING`, "_blank")}
                  disabled={filteredCleaning.length === 0}
                  className={`text-xs border font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition ${
                    filteredCleaning.length === 0
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-300"
                  }`}
                  title="Exportar pasos de limpieza a Excel"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Exportar</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`${API_BASE}/checklist/template?model_name=${selectedModel}&category=CLEANING`, "_blank")}
                  className="text-xs bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition"
                  title="Descargar plantilla Excel exclusiva para pasos de limpieza"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Plantilla</span>
                </button>
              </div>
            </div>

            {filteredCleaning.length === 0 ? (
              <Card className="p-6 text-center border-dashed border-emerald-200 bg-emerald-50/20">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-gray-800">Aún no hay pasos de limpieza en este modelo</p>
                <p className="text-[11px] text-gray-500 max-w-sm mx-auto mt-1 mb-3">
                  Puedes importar pasos de limpieza desde Excel, agregar un paso manual o detectar palabras clave.
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => openImportModal("CLEANING")}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>📥 Importar Pasos de Limpieza (Excel)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoClassifyCleaning}
                    disabled={processingAction === "classify-cleaning"}
                    className="text-xs bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition"
                  >
                    {processingAction === "classify-cleaning" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>Auto-detectar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(`${API_BASE}/checklist/template?model_name=${selectedModel}&category=CLEANING`, "_blank")}
                    className="text-xs bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-600" />
                    <span>Descargar Plantilla</span>
                  </button>
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredCleaning.map((st, idx) => renderStepCard(st, idx, "cleaning"))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filterType === "ASSEMBLY" && (
            <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                <span>Apartado de Ensamblaje ({filteredAssembly.length} pasos)</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => openImportModal("ASSEMBLY")}
                  className="px-2.5 py-1 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar Ensamblaje</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`${API_BASE}/models/${selectedModel}/export-excel?category=ASSEMBLY`, "_blank")}
                  disabled={filteredAssembly.length === 0}
                  className={`px-2.5 py-1 bg-white border border-stone-300 text-stone-800 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 transition ${
                    filteredAssembly.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-stone-200"
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-stone-700" />
                  <span>Exportar Ensamblaje</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`${API_BASE}/checklist/template?model_name=${selectedModel}&category=ASSEMBLY`, "_blank")}
                  className="px-2.5 py-1 bg-white border border-stone-300 text-stone-800 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 hover:bg-stone-200 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-stone-700" />
                  <span>Plantilla</span>
                </button>
                <button onClick={() => setFilterType("GROUPED")} className="text-[11px] text-primary hover:underline ml-1">
                  Ver bloques →
                </button>
              </div>
            </div>
          )}
          {filterType === "CLEANING" && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Apartado de Limpieza QC ({filteredCleaning.length} pasos)</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => openImportModal("CLEANING")}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar Limpieza</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`${API_BASE}/models/${selectedModel}/export-excel?category=CLEANING`, "_blank")}
                  disabled={filteredCleaning.length === 0}
                  className={`px-2.5 py-1 bg-white border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 transition ${
                    filteredCleaning.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-100"
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Exportar Limpieza</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`${API_BASE}/checklist/template?model_name=${selectedModel}&category=CLEANING`, "_blank")}
                  className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 hover:bg-emerald-100 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Plantilla</span>
                </button>
                <button onClick={() => setFilterType("GROUPED")} className="text-[11px] text-emerald-700 hover:underline ml-1">
                  Ver bloques →
                </button>
              </div>
            </div>
          )}
          {filteredStepsToRender.map((st, idx) => {
            const prevStep = idx > 0 ? filteredStepsToRender[idx - 1] : null;
            const hasGapBefore = filterType === "ALL" && prevStep && st.step_number > prevStep.step_number + 1;
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
                        className="px-2 py-1 bg-primary hover:bg-primary text-white rounded-lg text-[10px] font-bold shadow-2xs transition"
                        title="Rellenar los pasos estándar correspondientes"
                      >
                        ⚡ Rellenar
                      </button>
                    </div>
                  </div>
                )}
                {renderStepCard(st, idx)}
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
          category={importCategory}
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
                Modelo: <span className="font-bold text-primary">{selectedModel}</span> · <span className="font-semibold text-gray-700">{steps.length} pasos</span>
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
