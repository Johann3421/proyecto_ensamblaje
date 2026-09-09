import React, { useState } from 'react';
import { X, Users } from 'lucide-react';

export default function TechnicianFormModal({ data, loading, onClose, onSave }) {
  const [formData, setFormData] = useState({
    id: data.id || "",
    name: data.name || "",
    role: data.role || "OPERATOR",
    avatar: data.avatar || ""
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl">
        <div className="bg-[#1B4332] text-white p-4 flex justify-between items-center">
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
              className="w-full text-xs font-medium border border-gray-300 rounded-xl p-2.5 touch-target focus:border-primary focus:outline-none"
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
                className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2.5 bg-white touch-target focus:border-primary focus:outline-none"
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
              className="flex-1 py-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50 touch-target"
            >
              {loading ? "Guardando..." : "Guardar Técnico"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

