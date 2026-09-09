import React, { useState, useMemo } from 'react';
import { Plus, Edit, Search, Users, UserPlus, Trash2, Trash } from 'lucide-react';
import { API_BASE } from '../utils/api';
import Badge from '../components/Badge';
import Card from '../components/Card';
import TechnicianFormModal from '../modals/TechnicianFormModal';

export default function TechniciansManagementView({ users, onRefreshUsers, notify }) {
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
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Personal Técnico y Operarios</h2>
              <p className="text-xs text-stone-500">Administra técnicos, cambia nombres y asigna roles de estación</p>
            </div>
          </div>

          <button
            onClick={() => setModalUser({ isNew: true, id: `OP-${Math.floor(100 + Math.random() * 900)}`, name: "", role: "OPERATOR", avatar: "" })}
            className="bg-primary hover:bg-primary-light text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition touch-target"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Registrar Nuevo Técnico</span>
          </button>
        </div>
      </Card>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary shadow-sm"
          />
        </div>
        <div className="flex gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-sm">
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
                filterRole === t.id ? "bg-primary text-white shadow-sm" : "text-stone-600 hover:bg-stone-100"
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
            <Card key={user.id} className="p-3.5 hover:border-stone-400 transition shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center border shadow-sm ${
                    isAdmin
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : isSupervisor
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-stone-100 text-stone-700 border-stone-200"
                  }`}>
                    {user.avatar || user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-xs">{user.name}</h4>
                    <p className="font-mono text-[10px] text-stone-500 font-medium">{user.id}</p>
                  </div>
                </div>
                <Badge variant={isAdmin ? "warning" : isSupervisor ? "success" : "neutral"}>
                  {isAdmin ? "ADMIN" : isSupervisor ? "SUPERVISOR" : "OPERARIO"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <button
                  onClick={() => setModalUser({ isNew: false, ...user })}
                  className="flex-1 py-2 px-3 bg-stone-50 hover:bg-stone-100 hover:text-stone-900 text-stone-700 font-semibold rounded-lg text-xs border border-stone-200 flex items-center justify-center gap-1.5 transition touch-target"
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
