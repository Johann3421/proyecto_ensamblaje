import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Mail, Lock, User, Eye, EyeOff, ArrowRight, Cpu, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';

import { API_BASE } from './utils/api';



// ============================================
// LOGIN PAGE COMPONENT
// ============================================
export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 100);
    // Load available users for register mode
    fetch(`${API_BASE}/users`)
      .then(r => r.ok ? r.json() : [])
      .then(users => setAvailableUsers(users))
      .catch(() => {});
  }, []);

  const switchMode = (newMode) => {
    setAnimateIn(false);
    setError('');
    setSuccess('');
    setTimeout(() => {
      setMode(newMode);
      setEmail('');
      setPassword('');
      setUserId('');
      setTimeout(() => setAnimateIn(true), 50);
    }, 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al iniciar sesión');
        
        // Save token and notify parent
        localStorage.setItem('qc_token', data.access_token);
        localStorage.setItem('qc_user', JSON.stringify(data.user));
        setSuccess('¡Bienvenido de vuelta!');
        setTimeout(() => onLogin(data.access_token, data.user), 600);
      } else {
        // Register
        if (!userId) { setError('Selecciona tu identificador de técnico'); setLoading(false); return; }
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, email: email.trim().toLowerCase(), password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al registrarse');

        localStorage.setItem('qc_token', data.access_token);
        localStorage.setItem('qc_user', JSON.stringify(data.user));
        setSuccess('¡Registro exitoso!');
        setTimeout(() => onLogin(data.access_token, data.user), 600);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Users without credentials (available for registration)
  const unregisteredUsers = availableUsers.filter(u => !u.email);

  return (
    <div className="login-page-root">

      {/* Main content */}
      <div className={`login-container ${animateIn ? 'animate-in' : ''}`}>
        {/* Glass card */}
        <div className="login-card">
          {/* Header / Branding */}
          <div className="login-header">
            <div className="login-logo-container">
              <div className="login-logo-glow" />
              <div className="login-logo">
                <Cpu className="login-logo-icon" />
              </div>
            </div>
            <div className="login-brand">
              <span className="login-brand-badge">KENYA</span>
              <h1 className="login-title">Control de Calidad</h1>
              <p className="login-subtitle">
                {mode === 'login' 
                  ? 'Ingresa a tu estación de trabajo' 
                  : 'Registra tus credenciales de acceso'}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              <Shield size={14} />
              Iniciar Sesión
            </button>
            <button
              className={`login-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              <Sparkles size={14} />
              Registrarse
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Register: User selector */}
            {mode === 'register' && (
              <div className="login-field">
                <label className="login-label">
                  <User size={13} />
                  Técnico asignado
                </label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="login-select"
                  required
                >
                  <option value="">— Selecciona tu identificador —</option>
                  {unregisteredUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      [{u.role}] {u.name} ({u.id})
                    </option>
                  ))}
                </select>
                {unregisteredUsers.length === 0 && availableUsers.length > 0 && (
                  <p className="login-hint-warning">
                    Todos los técnicos ya tienen credenciales. Contacta al administrador.
                  </p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="login-field">
              <label className="login-label">
                <Mail size={13} />
                Correo electrónico
              </label>
              <div className="login-input-wrapper">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="login-input"
                  required
                  autoComplete="email"
                />
                <Mail className="login-input-icon" size={16} />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label">
                <Lock size={13} />
                Contraseña
              </label>
              <div className="login-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="login-input"
                  required
                  minLength={4}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-password-toggle"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error / Success messages */}
            {error && (
              <div className="login-message login-message-error">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            {success && (
              <div className="login-message login-message-success">
                <CheckCircle size={14} />
                {success}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="login-spinner" />
                  {mode === 'login' ? 'Ingresando...' : 'Registrando...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            {/* Quick Access Account Selector */}
            {mode === 'login' && (
              <div className="mt-2 pt-3 border-t border-stone-200">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Acceso Rápido por Rol:</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {/* Admin */}
                  {(() => {
                    const u = availableUsers.find(x => x.role === 'ADMIN' || x.id === 'ADM-01');
                    const uEmail = u?.email || 'admin@sekaitech.com.pe';
                    const uName = u?.name || 'Ing. Carlos Mendoza';
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(uEmail);
                          setPassword('admin123');
                        }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-left text-xs transition"
                      >
                        <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <div className="truncate">
                          <div className="font-bold text-stone-900 text-[11px] truncate">{uName}</div>
                          <div className="text-[9px] text-stone-500 truncate">Admin · {uEmail}</div>
                        </div>
                      </button>
                    );
                  })()}

                  {/* Supervisor */}
                  {(() => {
                    const u = availableUsers.find(x => x.role === 'SUPERVISOR' || x.id === 'SUP-01');
                    const uEmail = u?.email || 'supervisor@sekaitech.com.pe';
                    const uName = u?.name || 'Jhoan Supervisor';
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(uEmail);
                          setPassword('supervisor123');
                        }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-left text-xs transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                        <div className="truncate">
                          <div className="font-bold text-stone-900 text-[11px] truncate">{uName}</div>
                          <div className="text-[9px] text-stone-500 truncate">Supervisor · {uEmail}</div>
                        </div>
                      </button>
                    );
                  })()}

                  {/* Operarios 1 a 5 */}
                  {[1, 2, 3, 4, 5].map((stNum) => {
                    const opId = `OP-10${stNum}`;
                    const u = availableUsers.find(x => x.id === opId);
                    const uEmail = u?.email || `estacion${stNum}@sekaitech.com.pe`;
                    const uName = u?.name || `Operario ${stNum}`;
                    return (
                      <button
                        key={opId}
                        type="button"
                        onClick={() => {
                          setEmail(uEmail);
                          setPassword('kenya123');
                        }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left text-xs transition"
                      >
                        <User className="w-3.5 h-3.5 text-stone-600 flex-shrink-0" />
                        <div className="truncate">
                          <div className="font-bold text-stone-900 text-[11px] truncate">{uName}</div>
                          <div className="text-[9px] text-stone-500 truncate">{opId} · {uEmail}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* Apoyo / Suplente */}
                {(() => {
                  const u = availableUsers.find(x => x.id === 'OP-106');
                  const uEmail = u?.email || 'apoyo@sekaitech.com.pe';
                  const uName = u?.name || 'Jorge Valdivia';
                  return (
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(uEmail);
                          setPassword('kenya123');
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs text-stone-700 transition"
                      >
                        <User className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                        <span className="font-semibold text-[11px] truncate text-stone-900">{uName}</span>
                        <span className="text-[10px] text-stone-500 truncate">(Apoyo) · {uEmail}</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="login-footer">
            <p>
              {mode === 'login' ? (
                <>
                  ¿Primera vez o cambio de contraseña? {' '}
                  <button onClick={() => switchMode('register')} className="login-link">
                    Registrar / Vincular
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta? {' '}
                  <button onClick={() => switchMode('login')} className="login-link">
                    Inicia sesión
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Version badge */}
        <div className="login-version">
          <span>QC KENYA</span> · v2.0 · Pipeline de Calidad Industrial
        </div>
      </div>
    </div>
  );
}
