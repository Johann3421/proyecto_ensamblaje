import React, { useState, useEffect, useRef } from 'react';
import { Shield, Mail, Lock, User, Eye, EyeOff, ArrowRight, Cpu, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';

const API_BASE = '/api';

// ============================================
// FLOATING PARTICLES BACKGROUND
// ============================================
const ParticlesCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.1;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96, 165, 250, ${this.opacity})`;
        ctx.fill();
      }
    }

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push(new Particle());
    }

    // Draw connections
    const drawLines = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(96, 165, 250, ${0.08 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      drawLines();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};

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
      {/* Gradient background */}
      <div className="login-bg" />
      
      {/* Animated particles */}
      <ParticlesCanvas />
      
      {/* Floating orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

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
                      {u.role === 'ADMIN' ? '👑 ' : '🔧 '}{u.name} ({u.id})
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
              <div className="mt-2 pt-3 border-t border-white/10">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Acceso Rápido por Estación:</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {/* Admin */}
                  {(() => {
                    const u = availableUsers.find(x => x.role === 'ADMIN' || x.id === 'ADM-01');
                    const uEmail = u?.email || 'admin@sekaitech.com.pe';
                    const uName = u?.name || 'Admin QC';
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(uEmail);
                          setPassword('admin123');
                        }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-900/30 hover:bg-blue-800/50 border border-blue-500/20 text-left text-xs text-blue-200 transition"
                      >
                        <span>👑</span>
                        <div className="truncate">
                          <div className="font-bold text-white text-[11px] truncate">{uName}</div>
                          <div className="text-[9px] text-blue-300 truncate">{uEmail}</div>
                        </div>
                      </button>
                    );
                  })()}

                  {/* Estaciones 1 a 5 */}
                  {[1, 2, 3, 4, 5].map((stNum) => {
                    const opId = `OP-10${stNum}`;
                    const u = availableUsers.find(x => x.id === opId);
                    const uEmail = u?.email || `estacion${stNum}@sekaitech.com.pe`;
                    const uName = u?.name || `Estación ${stNum}`;
                    return (
                      <button
                        key={opId}
                        type="button"
                        onClick={() => {
                          setEmail(uEmail);
                          setPassword('kenya123');
                        }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left text-xs text-slate-200 transition"
                      >
                        <span>🔧</span>
                        <div className="truncate">
                          <div className="font-bold text-white text-[11px] truncate">E{stNum}: {uName}</div>
                          <div className="text-[9px] text-slate-400 truncate">{uEmail}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* Apoyo / Suplente */}
                {(() => {
                  const u = availableUsers.find(x => x.id === 'OP-106');
                  const uEmail = u?.email || 'apoyo@sekaitech.com.pe';
                  const uName = u?.name || 'Jorge Valdivia (Suplente/Apoyo)';
                  return (
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(uEmail);
                          setPassword('kenya123');
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs text-amber-200 transition"
                      >
                        <span>⚡</span>
                        <span className="font-semibold text-[11px] truncate">{uName}</span>
                        <span className="text-[10px] text-amber-300 opacity-70 truncate">{uEmail}</span>
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
