import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'oscar.rodrigo.chavez@gmail.com';
const BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL ?? '')
  : (import.meta.env.VITE_API_URL ?? 'http://localhost:3002');

// ─── Helpers ─────────────────────────────────────────────────

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
}

function diasRestantes(fechaVenc: string): number {
  return Math.ceil((new Date(fechaVenc).getTime() - Date.now()) / 86_400_000);
}

// ─── Colores de estado ───────────────────────────────────────

const ESTADO_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  prueba:     { bg: '#EFF6FF', text: '#1D4ED8', label: 'Prueba' },
  activa:     { bg: '#ECFDF5', text: '#1D9E75', label: 'Activa' },
  gracia:     { bg: '#FFFBEB', text: '#B45309', label: 'Gracia' },
  suspendida: { bg: '#FEF2F2', text: '#DC2626', label: 'Suspendida' },
  cancelada:  { bg: '#F3F4F6', text: '#6B7280', label: 'Cancelada' },
};

function EstadoBadge({ estado }: { estado: string }) {
  const c = ESTADO_COLOR[estado] ?? ESTADO_COLOR.suspendida;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

// ─── Tipos de datos ──────────────────────────────────────────

interface UsuarioAdmin {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  creado_en: string;
  suscripcion: {
    id: string;
    estado: string;
    plan: string;
    precio_pagado: number;
    fecha_vencimiento: string;
    fecha_ultimo_pago: string | null;
    tokens_consumidos_mes: number;
    tokens_limite_mes: number;
    notas_admin: string | null;
  } | null;
  tokens_mes: { total: number; generaciones: number; costoUSD: number };
}

interface TokenData {
  por_dia: Record<string, { tokens: number; generaciones: number; costoUSD: number }>;
  top5_usuarios: { userId: string; tokens: number; generaciones: number; costoUSD: number }[];
  total_mes: { tokens: number; generaciones: number; costoUSD: number };
  proyeccion: { tokens: number; costoUSD: number };
}

// Tasa aproximada para mostrar costos en MXN
const USD_TO_MXN = 17;

// ─── Modal Registrar Pago ─────────────────────────────────────

interface RegistrarPagoModalProps {
  usuario: UsuarioAdmin;
  onClose: () => void;
  onSuccess: () => void;
}

function RegistrarPagoModal({ usuario, onClose, onSuccess }: RegistrarPagoModalProps) {
  const PLANES = [
    { value: 'mensual',     label: 'Mensual',     precio: 79,  dias: 30 },
    { value: 'trimestral',  label: 'Trimestral',  precio: 199, dias: 90 },
    { value: 'anual',       label: 'Anual',       precio: 699, dias: 365 },
  ];

  const [plan,         setPlan]         = useState<'mensual' | 'trimestral' | 'anual'>('mensual');
  const [monto,        setMonto]        = useState('79');
  const [metodo,       setMetodo]       = useState<'efectivo' | 'transferencia' | 'otro'>('transferencia');
  const [referencia,   setReferencia]   = useState('');
  const [fechaPago,    setFechaPago]    = useState(new Date().toISOString().split('T')[0]);
  const [notas,        setNotas]        = useState('');
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState('');

  const handlePlanChange = (p: typeof plan) => {
    setPlan(p);
    setMonto(String(PLANES.find((x) => x.value === p)?.precio ?? 79));
  };

  const handleConfirmar = async () => {
    if (!usuario.suscripcion) {
      setError('El usuario no tiene suscripción registrada.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await adminFetch('/api/admin/pago', {
        method: 'POST',
        body: JSON.stringify({
          user_id:        usuario.id,
          suscripcion_id: usuario.suscripcion.id,
          monto:          Number(monto),
          plan,
          metodo_pago:    metodo,
          referencia:     referencia || undefined,
          fecha_pago:     new Date(fechaPago + 'T12:00').toISOString(),
          notas:          notas || undefined,
        }),
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? 'Error al registrar pago.');
    } finally {
      setGuardando(false);
    }
  };

  const nuevaFecha = new Date();
  nuevaFecha.setDate(nuevaFecha.getDate() + (PLANES.find((p2) => p2.value === plan)?.dias ?? 30));

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed z-50 bg-white rounded-2xl shadow-2xl
        bottom-0 left-0 right-0 sm:inset-auto sm:top-1/2 sm:left-1/2
        sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md"
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800">💳 Registrar Pago</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {usuario.nombre ?? usuario.email}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2">×</button>
          </div>

          {/* Plan */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Plan</p>
            <div className="flex gap-2">
              {PLANES.map(({ value, label, precio }) => (
                <button
                  key={value}
                  onClick={() => handlePlanChange(value as typeof plan)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-colors ${
                    plan === value ? 'text-white border-transparent' : 'text-gray-600 border-gray-100'
                  }`}
                  style={plan === value ? { backgroundColor: '#1D9E75', borderColor: '#1D9E75' } : {}}
                >
                  {label}<br />
                  <span className={plan === value ? 'opacity-80' : 'text-gray-400'}>${precio}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Monto + Método */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Monto (MXN)</label>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Método</label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as typeof metodo)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="transferencia">Transferencia SPEI</option>
                <option value="efectivo">Efectivo</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          {/* Referencia + Fecha */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Referencia</label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha de pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones del pago..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Resumen */}
          <div className="px-3 py-2 rounded-xl mb-4 text-xs" style={{ backgroundColor: '#F0FAF5', color: '#085041' }}>
            Suscripción activa hasta:{' '}
            <strong>{nuevaFecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
          </div>

          {error && (
            <p className="text-xs text-red-500 mb-3">{error}</p>
          )}

          <button
            onClick={handleConfirmar}
            disabled={guardando}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
            style={{ backgroundColor: '#1D9E75' }}
          >
            {guardando ? 'Guardando...' : '✅ Confirmar pago'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Barra de tokens ─────────────────────────────────────────

function TokenBar({ usado, limite }: { usado: number; limite: number }) {
  const pct = limite > 0 ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#1D9E75';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-0.5">
        <span>{(usado / 1000).toFixed(0)}k</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Mini gráfico de barras ───────────────────────────────────

function BarChart({ data }: { data: Record<string, { tokens: number }> }) {
  const entries = Object.entries(data).slice(-14); // últimos 14 días
  const max = Math.max(...entries.map(([, v]) => v.tokens), 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {entries.map(([fecha, v]) => {
        const pct = (v.tokens / max) * 100;
        const dia = new Date(fecha + 'T12:00').getDate();
        return (
          <div key={fecha} className="flex-1 flex flex-col items-center gap-1" title={`${fecha}: ${v.tokens.toLocaleString()} tokens`}>
            <div
              className="w-full rounded-t-sm transition-all"
              style={{ height: `${Math.max(2, pct * 0.56)}px`, backgroundColor: '#1D9E75', opacity: 0.7 }}
            />
            <span className="text-[9px] text-gray-300">{dia}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────

export default function Admin() {
  const { user, loading: authLoading } = useAuth();

  const [usuarios,   setUsuarios]   = useState<UsuarioAdmin[]>([]);
  const [tokenData,  setTokenData]  = useState<TokenData | null>(null);
  const [cargando,   setCargando]   = useState(true);
  const [filtro,     setFiltro]     = useState<string>('todos');
  const [busqueda,   setBusqueda]   = useState('');
  const [ordenPor,   setOrdenPor]   = useState<'vencimiento' | 'tokens' | 'registro'>('vencimiento');
  const [modalPago,  setModalPago]  = useState<UsuarioAdmin | null>(null);
  const [toast,      setToast]      = useState('');
  const [tabActivo,  setTabActivo]  = useState<'usuarios' | 'tokens'>('usuarios');
  const [porVencer,  setPorVencer]  = useState<{ nombre: string; email: string; plan: string; fecha_vencimiento: string }[]>([]);
  const [showPorVencer, setShowPorVencer] = useState(false);
  const [resettingTokens, setResettingTokens] = useState(false);

  // Redirigir si no es admin
  if (!authLoading && user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/hoy" replace />;
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [{ usuarios: u }, tokens] = await Promise.all([
        adminFetch<{ usuarios: UsuarioAdmin[] }>('/api/admin/usuarios'),
        adminFetch<TokenData>('/api/admin/tokens'),
      ]);
      setUsuarios(u);
      setTokenData(tokens);
    } catch (e) {
      showToast('Error cargando datos: ' + (e as Error).message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.email === ADMIN_EMAIL) cargar();
  }, [authLoading, user, cargar]);

  // ─── Métricas generales ────────────────────────────────────
  const totalUsuarios    = usuarios.length;
  const activos          = usuarios.filter((u) => u.suscripcion?.estado === 'activa').length;
  const enPrueba         = usuarios.filter((u) => u.suscripcion?.estado === 'prueba').length;
  const suspendidos      = usuarios.filter((u) => u.suscripcion?.estado === 'suspendida').length;
  const porVencerCount   = usuarios.filter((u) => {
    const s = u.suscripcion;
    if (!s || !['activa', 'prueba'].includes(s.estado)) return false;
    return diasRestantes(s.fecha_vencimiento) <= 7;
  }).length;

  const ingresosMes = usuarios.reduce((acc, u) => {
    if (u.suscripcion?.estado === 'activa' && u.suscripcion.fecha_ultimo_pago) {
      const fechaPago = new Date(u.suscripcion.fecha_ultimo_pago);
      const ahora = new Date();
      if (fechaPago.getMonth() === ahora.getMonth() && fechaPago.getFullYear() === ahora.getFullYear()) {
        acc += Number(u.suscripcion.precio_pagado ?? 0);
      }
    }
    return acc;
  }, 0);

  const totalTokensMes = tokenData?.total_mes.tokens ?? 0;

  // ─── Filtrado y ordenamiento ───────────────────────────────
  const usuariosFiltrados = usuarios
    .filter((u) => {
      if (filtro !== 'todos' && u.suscripcion?.estado !== filtro) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          u.email?.toLowerCase().includes(q) ||
          u.nombre?.toLowerCase().includes(q) ||
          u.apellido?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (ordenPor === 'vencimiento') {
        const fa = a.suscripcion?.fecha_vencimiento ?? '';
        const fb = b.suscripcion?.fecha_vencimiento ?? '';
        return fa.localeCompare(fb);
      }
      if (ordenPor === 'tokens') {
        return (b.tokens_mes?.total ?? 0) - (a.tokens_mes?.total ?? 0);
      }
      return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime();
    });

  // ─── Acciones ─────────────────────────────────────────────
  const cambiarEstado = async (id: string, estado: string) => {
    try {
      await adminFetch(`/api/admin/suscripcion/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
      showToast(`Estado actualizado a "${estado}"`);
      cargar();
    } catch (e) {
      showToast('Error: ' + (e as Error).message);
    }
  };

  const handleResetTokens = async () => {
    if (!confirm('¿Seguro? Esto resetea tokens_consumidos_mes = 0 para todos los usuarios. Aplícalo al inicio de cada mes.')) return;
    setResettingTokens(true);
    try {
      await adminFetch('/api/admin/resetear-tokens', { method: 'POST' });
      showToast('✅ Tokens del mes reseteados correctamente');
      cargar();
    } catch (e) {
      showToast('Error: ' + (e as Error).message);
    } finally {
      setResettingTokens(false);
    }
  };

  const handleVerPorVencer = async () => {
    try {
      const { usuarios: lista } = await adminFetch<{ usuarios: typeof porVencer }>('/api/admin/por-vencer');
      setPorVencer(lista);
      setShowPorVencer(true);
    } catch (e) {
      showToast('Error: ' + (e as Error).message);
    }
  };

  // ─── Render ────────────────────────────────────────────────
  if (authLoading || cargando) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#F8FDFB' }}>
        <p className="text-gray-400 text-sm">Cargando panel de administración…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: '#F8FDFB' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">⚙️ Administración</h1>
          <p className="text-xs text-gray-400 mt-0.5">NutriBarrio · Panel de control</p>
        </div>
        <button
          onClick={cargar}
          className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ── SECCIÓN 1: Métricas generales ─────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Usuarios totales', value: totalUsuarios,                    icon: '👥', color: '#1D9E75' },
            { label: 'Activos (pagaron)', value: activos,                         icon: '✅', color: '#1D9E75' },
            { label: 'Por vencer (7d)',   value: porVencerCount,                  icon: '⚠️', color: '#F59E0B' },
            { label: 'Ingresos del mes',  value: `$${ingresosMes.toFixed(0)} MXN`,icon: '💰', color: '#1D9E75' },
            { label: 'En prueba',        value: enPrueba,                         icon: '🔑', color: '#3B82F6' },
            { label: 'Suspendidos',      value: suspendidos,                      icon: '🔒', color: '#EF4444' },
            { label: 'Tokens del mes',   value: `${(totalTokensMes / 1000).toFixed(1)}k`, icon: '🤖', color: '#7C3AED' },
            { label: 'Costo est. mes',   value: `$${((tokenData?.total_mes.costoUSD ?? 0) * USD_TO_MXN).toFixed(0)} MXN`, icon: '💸', color: '#6B7280' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{icon}</span>
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs: Usuarios / Tokens ────────────────────────── */}
        <div className="flex gap-2">
          {(['usuarios', 'tokens'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTabActivo(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                tabActivo === tab ? 'text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
              style={tabActivo === tab ? { backgroundColor: '#1D9E75' } : {}}
            >
              {tab === 'usuarios' ? '👥 Usuarios' : '🤖 Tokens'}
            </button>
          ))}
        </div>

        {/* ── SECCIÓN 2: Tabla de usuarios ──────────────────── */}
        {tabActivo === 'usuarios' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Filtros */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o email…"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <div className="flex gap-2 flex-wrap">
                {['todos', 'prueba', 'activa', 'gracia', 'suspendida'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${
                      filtro === f ? 'text-white' : 'bg-gray-50 text-gray-500'
                    }`}
                    style={filtro === f ? { backgroundColor: '#1D9E75' } : {}}
                  >
                    {f}
                  </button>
                ))}
                <select
                  value={ordenPor}
                  onChange={(e) => setOrdenPor(e.target.value as typeof ordenPor)}
                  className="px-2 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-500 focus:outline-none"
                >
                  <option value="vencimiento">↕ Vencimiento</option>
                  <option value="tokens">↕ Tokens</option>
                  <option value="registro">↕ Registro</option>
                </select>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 640 }}>
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    {['Usuario', 'Estado', 'Plan', 'Vence', 'Tokens mes', 'Último pago', 'Acciones'].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                        Sin resultados para "{busqueda}"
                      </td>
                    </tr>
                  ) : usuariosFiltrados.map((u) => {
                    const s = u.suscripcion;
                    const dias = s ? diasRestantes(s.fecha_vencimiento) : null;
                    const urgente = dias !== null && dias <= 3 && dias >= 0;
                    return (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        {/* Usuario */}
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">
                            {u.nombre ? `${u.nombre} ${u.apellido ?? ''}`.trim() : '—'}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-[140px]">{u.email}</p>
                        </td>
                        {/* Estado */}
                        <td className="px-4 py-3">
                          <EstadoBadge estado={s?.estado ?? 'suspendida'} />
                        </td>
                        {/* Plan */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 capitalize">{s?.plan ?? '—'}</span>
                        </td>
                        {/* Vence */}
                        <td className="px-4 py-3">
                          <p className={`text-xs font-medium ${urgente ? 'text-red-500' : 'text-gray-600'}`}>
                            {s ? formatFecha(s.fecha_vencimiento) : '—'}
                          </p>
                          {dias !== null && (
                            <p className={`text-xs ${urgente ? 'text-red-400' : 'text-gray-400'}`}>
                              {dias >= 0 ? `${dias}d restantes` : `${Math.abs(dias)}d vencida`}
                            </p>
                          )}
                        </td>
                        {/* Tokens mes */}
                        <td className="px-4 py-3 min-w-[100px]">
                          {s ? (
                            <TokenBar
                              usado={s.tokens_consumidos_mes}
                              limite={s.tokens_limite_mes}
                            />
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        {/* Último pago */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500">
                            {formatFecha(s?.fecha_ultimo_pago)}
                          </span>
                        </td>
                        {/* Acciones */}
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            {s?.estado !== 'activa' && s?.estado !== 'prueba' && (
                              <button
                                onClick={() => s && cambiarEstado(s.id, 'activa')}
                                className="px-2 py-1 rounded-lg text-xs font-medium text-white"
                                style={{ backgroundColor: '#1D9E75' }}
                                title="Activar"
                              >
                                ✅
                              </button>
                            )}
                            {s?.estado === 'activa' && (
                              <button
                                onClick={() => s && cambiarEstado(s.id, 'suspendida')}
                                className="px-2 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-600"
                                title="Suspender"
                              >
                                ⏸️
                              </button>
                            )}
                            <button
                              onClick={() => setModalPago(u)}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-600"
                              title="Registrar pago"
                            >
                              💳
                            </button>
                            {s?.notas_admin !== undefined && (
                              <button
                                onClick={async () => {
                                  const nota = prompt('Notas para este usuario:', s?.notas_admin ?? '');
                                  if (nota !== null && s) {
                                    await adminFetch(`/api/admin/suscripcion/${s.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ notas_admin: nota }),
                                    });
                                    showToast('Nota guardada');
                                    cargar();
                                  }
                                }}
                                className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600"
                                title="Notas"
                              >
                                📝
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              {usuariosFiltrados.length} de {usuarios.length} usuarios
            </div>
          </div>
        )}

        {/* ── SECCIÓN 4: Tokens ─────────────────────────────── */}
        {tabActivo === 'tokens' && tokenData && (
          <div className="space-y-4">
            {/* Resumen del mes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Tokens usados',     value: `${(tokenData.total_mes.tokens / 1000).toFixed(1)}k` },
                { label: 'Generaciones',      value: tokenData.total_mes.generaciones },
                { label: 'Costo real (USD)',   value: `$${tokenData.total_mes.costoUSD.toFixed(2)}` },
                { label: 'Costo real (MXN)',   value: `$${(tokenData.total_mes.costoUSD * USD_TO_MXN).toFixed(0)}` },
                { label: 'Proyección tokens',  value: `${(tokenData.proyeccion.tokens / 1000).toFixed(1)}k` },
                { label: 'Proyección MXN',     value: `$${(tokenData.proyeccion.costoUSD * USD_TO_MXN).toFixed(0)}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="text-lg font-bold" style={{ color: '#1D9E75' }}>{value}</p>
                </div>
              ))}

              {/* Alerta proyección > $500 MXN */}
              {tokenData.proyeccion.costoUSD * USD_TO_MXN > 500 && (
                <div className="col-span-2 sm:col-span-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
                  ⚠️ Proyección de costo supera $500 MXN. Considera revisar el uso de tokens este mes.
                </div>
              )}
            </div>

            {/* Gráfica últimos 14 días */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tokens por día (últimos 14 días)</h3>
              <BarChart data={tokenData.por_dia} />
            </div>

            {/* Top 5 usuarios */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 usuarios por consumo este mes</h3>
              {tokenData.top5_usuarios.length === 0 ? (
                <p className="text-xs text-gray-400">Sin datos este mes.</p>
              ) : (
                <div className="space-y-3">
                  {tokenData.top5_usuarios.map((t, i) => {
                    const u = usuarios.find((x) => x.id === t.userId);
                    const nombre = u?.nombre ?? u?.email ?? t.userId.slice(0, 8);
                    const maxTokens = tokenData.top5_usuarios[0]?.tokens ?? 1;
                    return (
                      <div key={t.userId} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-300 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{nombre}</p>
                          <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(t.tokens / maxTokens) * 100}%`, backgroundColor: '#1D9E75' }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-gray-600">{(t.tokens / 1000).toFixed(1)}k</p>
                          <p className="text-xs text-gray-400">${(t.costoUSD * USD_TO_MXN).toFixed(0)} MXN</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SECCIÓN 5: Acciones rápidas ───────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">⚡ Acciones rápidas</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleVerPorVencer}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              📧 Usuarios por vencer (≤7 días)
            </button>
            <button
              onClick={handleResetTokens}
              disabled={resettingTokens}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              🔄 Resetear tokens del mes
            </button>
          </div>
        </div>
      </div>

      {/* Modal registrar pago */}
      {modalPago && (
        <RegistrarPagoModal
          usuario={modalPago}
          onClose={() => setModalPago(null)}
          onSuccess={() => {
            const f = modalPago.suscripcion;
            const plan = (document.querySelector('select[name=plan]') as HTMLSelectElement | null)?.value ?? '';
            const dias = { mensual: 30, trimestral: 90, anual: 365 }[plan] ?? 30;
            const vence = new Date();
            vence.setDate(vence.getDate() + dias);
            showToast(`✅ Pago registrado. Suscripción activa hasta ${formatFecha(vence.toISOString())}`);
            void f;
            cargar();
          }}
        />
      )}

      {/* Modal usuarios por vencer */}
      {showPorVencer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowPorVencer(false)} />
          <div className="fixed z-50 bg-white rounded-2xl shadow-2xl p-5
            bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto
            sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">📧 Usuarios por vencer</h2>
              <button onClick={() => setShowPorVencer(false)} className="text-gray-400 text-xl leading-none">×</button>
            </div>
            {porVencer.length === 0 ? (
              <p className="text-sm text-gray-400">No hay usuarios por vencer en los próximos 3 días.</p>
            ) : (
              <div className="space-y-3">
                {porVencer.map((u) => (
                  <div key={u.email} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{u.nombre}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {u.plan} · Vence {formatFecha(u.fecha_vencimiento)}
                      </p>
                    </div>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hola ${u.nombre}, te recuerdo que tu suscripción NutriBarrio vence pronto. ¿Te gustaría renovar? 🥗`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs px-2 py-1 rounded-lg text-white"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      WhatsApp
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50
            px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg"
          style={{ backgroundColor: '#1D9E75' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
