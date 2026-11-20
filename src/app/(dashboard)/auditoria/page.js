'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ─── Action config ────────────────────────────────────────────
const ACTION_CONFIG = {
  'Login':         { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', icon: '🔑', label: 'LOGIN' },
  'Login Fallido': { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', icon: '🔒', label: 'ACCESO DENEGADO' },
  'Logout':        { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', icon: '🚪', label: 'LOGOUT' },
  'Crear':         { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', icon: '✨', label: 'CREAR' },
  'Editar':        { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', icon: '✏️', label: 'EDITAR' },
  'Eliminar':      { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', icon: '🗑️', label: 'ELIMINAR' },
  'Asignar':       { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE', icon: '👤', label: 'ASIGNAR' },
  'Aprobar':       { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', icon: '✅', label: 'APROBAR' },
  'Rechazar':      { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', icon: '❌', label: 'RECHAZAR' },
  'Subir Foto':    { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', icon: '📸', label: 'SUBIR FOTO' },
  'Exportar':      { bg: '#F8FAFC', text: '#334155', border: '#CBD5E1', icon: '📊', label: 'EXPORTAR' },
};

const getActionConfig = (accion) =>
  ACTION_CONFIG[accion] || { bg: '#F8FAFC', text: '#334155', border: '#CBD5E1', icon: '📌', label: accion?.toUpperCase() || 'ACCIÓN' };

// ─── Module color pills ───────────────────────────────────────
const MODULE_COLORS = {
  'Autenticación': { bg: '#EFF6FF', text: '#1D4ED8' },
  'Visitas':       { bg: '#ECFDF5', text: '#065F46' },
  'Equipos':       { bg: '#FFFBEB', text: '#92400E' },
  'Usuarios':      { bg: '#F5F3FF', text: '#5B21B6' },
  'Solicitudes':   { bg: '#FDF4FF', text: '#86198F' },
  'Archivos':      { bg: '#F1F5F9', text: '#334155' },
  'Reportes':      { bg: '#F0FDF4', text: '#14532D' },
  'Mantenimiento': { bg: '#FFF7ED', text: '#9A3412' },
};
const getModuleColor = (mod) => MODULE_COLORS[mod] || { bg: '#F1F5F9', text: '#475569' };

// ─── Avatar color from initials ───────────────────────────────
const AVATAR_COLORS = ['#6B3A2A', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#7C3AED', '#16A34A'];
const cleanName = (n) => (n ? String(n).replace(/\|/g, '').trim() : 'Sistema');
const getAvatarColor = (name) => {
  const code = cleanName(name).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
};
const getInitials = (name) => {
  const cleaned = cleanName(name);
  if (!cleaned) return 'S';
  const parts = cleaned.split(' ').filter(Boolean);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
};

export default function AuditoriaPage() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Live auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(5);
  const [lastSynced, setLastSynced] = useState(null);
  const [newLogsFlash, setNewLogsFlash] = useState(false);
  const lastTopIdRef = useRef(null);
  const lastCountRef = useRef(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterAccion, setFilterAccion] = useState('');
  const [filterModulo, setFilterModulo] = useState('');
  const [filterUsuario, setFilterUsuario] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [quickFilter, setQuickFilter] = useState('todos'); // 'todos' | 'hoy' | 'criticos' | 'mantenimiento' | 'auth'

  // UI state
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const fetchLogs = useCallback(async ({ silent = false, manual = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      else if (manual) setRefreshing(true);

      const res = await fetch(`/api/auditorias?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('Error al cargar la bitácora');
      const data = await res.json();
      const incoming = (data.logs || []).map(l => ({
        ...l,
        usuario: cleanName(l.usuario)
      }));

      const newTopId = incoming[0]?.id || null;
      const hasChanges =
        !silent ||
        manual ||
        newTopId !== lastTopIdRef.current ||
        incoming.length !== lastCountRef.current;

      if (incoming.length > 0 && lastTopIdRef.current && newTopId !== lastTopIdRef.current) {
        setNewLogsFlash(true);
        setTimeout(() => setNewLogsFlash(false), 1800);
      }

      lastTopIdRef.current = newTopId;
      lastCountRef.current = incoming.length;

      // Solo actualizamos el estado si realmente llegaron registros nuevos o es carga inicial/manual
      // Así evitamos cualquier re-render o parpadeo cada 5 segundos
      if (hasChanges) {
        setLogs(incoming);
        setLastSynced(new Date());
      }
      setError(null);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchLogs({ silent: false });
  }, [fetchLogs]);

  // Auto-recarga continua en segundo plano + al volver a la pestaña
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchLogs({ silent: true });
      }
    }, refreshIntervalSec * 1000);

    const onFocus = () => fetchLogs({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [autoRefresh, refreshIntervalSec, fetchLogs]);

  const openModal = (log) => { setSelectedLog(log); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setTimeout(() => setSelectedLog(null), 200); };

  // ─── Filter Logic ────────────────────────────────────────────
  const todayStr = new Date().toLocaleDateString('es-CO');
  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      log.usuario?.toLowerCase().includes(q) ||
      log.descripcion?.toLowerCase().includes(q) ||
      log.registro_afectado?.toLowerCase().includes(q) ||
      log.id?.toLowerCase().includes(q);
    const matchAccion = !filterAccion || log.accion === filterAccion;
    const matchModulo = !filterModulo || log.modulo === filterModulo;
    const matchUsuario = !filterUsuario || log.usuario === filterUsuario;

    let matchQuick = true;
    if (quickFilter === 'hoy') {
      matchQuick = new Date(log.fecha).toLocaleDateString('es-CO') === todayStr;
    } else if (quickFilter === 'criticos') {
      matchQuick = ['Eliminar', 'Rechazar', 'Login Fallido'].includes(log.accion);
    } else if (quickFilter === 'mantenimiento') {
      matchQuick = log.modulo === 'Mantenimiento';
    } else if (quickFilter === 'auth') {
      matchQuick = log.modulo === 'Autenticación';
    }

    let matchFecha = true;
    if (filterFechaInicio || filterFechaFin) {
      const d = new Date(log.fecha).getTime();
      const s = filterFechaInicio ? new Date(filterFechaInicio).getTime() : 0;
      const e = filterFechaFin ? new Date(filterFechaFin).getTime() + 86400000 : Infinity;
      matchFecha = d >= s && d <= e;
    }
    return matchSearch && matchAccion && matchModulo && matchUsuario && matchQuick && matchFecha;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / perPage));
  const paginatedLogs = filteredLogs.slice((page - 1) * perPage, page * perPage);

  const uniqueActions = [...new Set(logs.map(l => l.accion).filter(Boolean))];
  const uniqueModules = [...new Set(logs.map(l => l.modulo).filter(Boolean))];
  const uniqueUsers = [...new Set(logs.map(l => l.usuario).filter(Boolean))];

  // ─── KPI stats ───────────────────────────────────────────────
  const todayCount = logs.filter(l => new Date(l.fecha).toLocaleDateString('es-CO') === todayStr).length;
  const criticalCount = logs.filter(l => ['Eliminar', 'Rechazar', 'Login Fallido'].includes(l.accion)).length;
  const activeUsers = uniqueUsers.length;
  const lastDate = logs[0] ? new Date(logs[0].fecha) : new Date();

  const clearFilters = () => {
    setSearch(''); setFilterAccion(''); setFilterModulo('');
    setFilterUsuario(''); setFilterFechaInicio(''); setFilterFechaFin('');
    setQuickFilter('todos');
    setPage(1); setIsFilterOpen(false);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: dateStr || '—', time: '', relative: '' };
    const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    let relative = '';
    if (diffSec < 60) relative = 'Justo ahora';
    else if (diffSec < 3600) relative = `Hace ${Math.floor(diffSec / 60)} min`;
    else if (diffSec < 86400) relative = `Hace ${Math.floor(diffSec / 3600)} h`;
    return {
      date: d.toLocaleDateString('es-CO'),
      time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      relative
    };
  };

  // Exportar CSV compatible con Excel
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Fecha', 'Usuario', 'Rol', 'Modulo', 'Accion', 'Registro Afectado', 'Descripcion', 'IP', 'Dispositivo'];
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = filteredLogs.map(l => [
      l.id, l.fecha, l.usuario, l.rol, l.modulo, l.accion,
      l.registro_afectado || '', l.descripcion || '', l.ip || '', l.dispositivo || ''
    ].map(escapeCsv).join(';'));
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora_auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Navegar al módulo del registro afectado
  const handleNavigateToRecord = (log) => {
    if (!log) return;
    const reg = (log.registro_afectado || '').toUpperCase();
    closeModal();
    if (reg.startsWith('MT-') || reg.startsWith('ST-') || log.modulo === 'Mantenimiento') {
      router.push('/mantenimiento');
    } else if (reg.startsWith('FILE-') || log.modulo === 'Archivos') {
      router.push('/archivos');
    } else if (reg.startsWith('EQ-') || log.modulo === 'Equipos') {
      router.push('/equipos');
    } else if (reg.startsWith('USR-') || log.modulo === 'Usuarios') {
      router.push('/admin');
    } else if (log.modulo === 'Visitas') {
      router.push('/visitas');
    } else if (log.modulo === 'Solicitudes') {
      router.push('/solicitudes');
    }
  };

  return (
    <div className="audit-root">

      {/* ══ PAGE HEADER ══ */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="page-title">Bitácora de Auditoría</h1>
            <span className={`live-pill ${autoRefresh ? 'on' : 'off'} ${newLogsFlash ? 'flash' : ''}`}>
              <span className="live-dot" />
              {newLogsFlash ? '¡Nuevo evento!' : autoRefresh ? `EN VIVO (cada ${refreshIntervalSec}s)` : 'Pausado'}
            </span>
          </div>
          <p className="page-subtitle">
            Monitoreo en tiempo real de accesos, mantenimiento, archivos y eventos críticos del sistema.
            {lastSynced && (
              <span style={{ marginLeft: '8px', color: '#3D2314', fontWeight: 600 }}>
                · Última sincronización: {lastSynced.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        <div className="header-actions-bar">
          <div className="auto-control">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: '#2C1810' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#16A34A', cursor: 'pointer' }}
              />
              Auto-recarga
            </label>
            <select
              value={refreshIntervalSec}
              onChange={e => setRefreshIntervalSec(Number(e.target.value))}
              disabled={!autoRefresh}
              className="interval-select"
              title="Frecuencia de actualización"
            >
              <option value={3}>3 seg</option>
              <option value={5}>5 seg</option>
              <option value={10}>10 seg</option>
              <option value={30}>30 seg</option>
            </select>
          </div>

          <button
            className="btn-refresh"
            onClick={() => fetchLogs({ silent: true, manual: true })}
            disabled={refreshing}
            title="Actualizar ahora mismo"
          >
            <span className={refreshing ? 'spin-icon' : ''} style={{ display: 'inline-block' }}>🔄</span>
            <span>Actualizar</span>
          </button>

          <button className="btn-export" onClick={handleExportCSV} disabled={filteredLogs.length === 0}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* ══ KPI CARDS (Interactivos) ══ */}
      <div className="kpi-grid">
        <div className={`kpi-card ${quickFilter === 'todos' ? 'active' : ''}`} onClick={() => { setQuickFilter('todos'); setPage(1); }}>
          <div className="kpi-icon brown"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg></div>
          <div className="kpi-info">
            <p className="kpi-label">Total Registros</p>
            <p className="kpi-val">{logs.length.toLocaleString('es-CO')}</p>
            <p className="kpi-trend up">Clic para ver todos</p>
          </div>
        </div>
        <div className={`kpi-card ${quickFilter === 'hoy' ? 'active' : ''}`} onClick={() => { setQuickFilter('hoy'); setPage(1); }}>
          <div className="kpi-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div className="kpi-info">
            <p className="kpi-label">Eventos de Hoy</p>
            <p className="kpi-val">{todayCount}</p>
            <p className="kpi-trend gray">{todayStr}</p>
          </div>
        </div>
        <div className={`kpi-card ${quickFilter === 'criticos' ? 'active' : ''}`} onClick={() => { setQuickFilter('criticos'); setPage(1); }}>
          <div className="kpi-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div className="kpi-info">
            <p className="kpi-label">Acciones Críticas</p>
            <p className="kpi-val">{criticalCount}</p>
            <p className="kpi-trend danger">Eliminaciones / Fallos</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div className="kpi-info">
            <p className="kpi-label">Usuarios en Bitácora</p>
            <p className="kpi-val">{activeUsers}</p>
            <p className="kpi-trend up">Con actividad registrada</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon violet"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div className="kpi-info">
            <p className="kpi-label">Último Evento</p>
            <p className="kpi-val">{lastDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="kpi-trend gray">{logs[0]?.accion || '—'} · {logs[0]?.modulo || ''}</p>
          </div>
        </div>
      </div>

      {/* ══ SEARCH + FILTER BAR ══ */}
      <div className="search-card">
        <div className="search-row">
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Buscar por usuario, descripción, ticket (MT-1010) o ID de registro..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="quick-pills">
            {[
              { id: 'todos', label: '📋 Todos' },
              { id: 'hoy', label: '📅 Hoy' },
              { id: 'criticos', label: '⚠️ Críticos' },
              { id: 'mantenimiento', label: '🛠️ Mantenimiento' },
              { id: 'auth', label: '🔑 Accesos' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                className={`q-pill ${quickFilter === p.id ? 'active' : ''}`}
                onClick={() => { setQuickFilter(p.id); setPage(1); }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button className="btn-advanced" onClick={() => setIsFilterOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            Filtros
          </button>
        </div>

        <div className="filter-inline-row">
          <select value={filterAccion} onChange={e => { setFilterAccion(e.target.value); setPage(1); }}>
            <option value="">Todas las acciones</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterModulo} onChange={e => { setFilterModulo(e.target.value); setPage(1); }}>
            <option value="">Todos los módulos</option>
            {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterUsuario} onChange={e => { setFilterUsuario(e.target.value); setPage(1); }}>
            <option value="">Todos los usuarios</option>
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input type="date" value={filterFechaInicio} onChange={e => { setFilterFechaInicio(e.target.value); setPage(1); }} title="Fecha desde" />
          <input type="date" value={filterFechaFin} onChange={e => { setFilterFechaFin(e.target.value); setPage(1); }} title="Fecha hasta" />
          <button className="btn-clear-inline" onClick={clearFilters}>✕ Limpiar filtros</button>
        </div>
      </div>

      {/* ══ TABLE ══ */}
      <div className="table-card">
        {loading ? (
          <div className="state-box"><div className="spinner"></div><p>Cargando bitácora en tiempo real...</p></div>
        ) : error ? (
          <div className="state-box"><p style={{ color: '#B91C1C' }}>❌ {error}</p><button onClick={() => fetchLogs({ silent: false })} className="btn-retry">Reintentar</button></div>
        ) : filteredLogs.length === 0 ? (
          <div className="state-box"><span style={{ fontSize: '2.5rem' }}>📭</span><h3>Sin resultados</h3><p>No se encontraron registros con los filtros actuales.</p></div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>FECHA Y HORA</th>
                    <th>USUARIO / ROL</th>
                    <th>MÓDULO</th>
                    <th>ACCIÓN</th>
                    <th>REGISTRO</th>
                    <th>DESCRIPCIÓN</th>
                    <th>IP / DISPOSITIVO</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => {
                    const { date, time, relative } = formatDate(log.fecha);
                    const ac = getActionConfig(log.accion);
                    const mc = getModuleColor(log.modulo);
                    const avatarColor = getAvatarColor(log.usuario);
                    const initials = getInitials(log.usuario);
                    return (
                      <tr key={log.id} className="trow" onClick={() => openModal(log)}>
                        <td>
                          <div className="date-cell">
                            <span className="date-main">{date} · {time}</span>
                            {relative && <span className="date-rel">{relative}</span>}
                          </div>
                        </td>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar" style={{ background: avatarColor }}>{initials}</div>
                            <div>
                              <div className="user-name">{log.usuario}</div>
                              <div className="user-role">• {log.rol}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="module-pill" style={{ background: mc.bg, color: mc.text }}>{log.modulo}</span>
                        </td>
                        <td>
                          <span className="action-pill" style={{ background: ac.bg, color: ac.text, borderColor: ac.border }}>
                            <span>{ac.icon}</span> {ac.label}
                          </span>
                        </td>
                        <td>
                          <span className="record-badge">{log.registro_afectado || '—'}</span>
                        </td>
                        <td>
                          <span className="desc-text" title={log.descripcion}>{log.descripcion}</span>
                        </td>
                        <td>
                          {log.ip ? (
                            <div className="device-cell">
                              <span className="ip-text">{log.ip}</span>
                              <span className="device-text">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                                {log.dispositivo}
                              </span>
                            </div>
                          ) : <span style={{ color: '#9CA3AF' }}>—</span>}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="row-action-btn" onClick={() => openModal(log)} title="Ver detalle">👁️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination-bar">
              <span className="pag-info">
                Mostrando <strong>{(page - 1) * perPage + 1}</strong> a <strong>{Math.min(page * perPage, filteredLogs.length)}</strong> de <strong>{filteredLogs.length}</strong> registros
              </span>
              <div className="pag-controls">
                <button className="pag-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && page > 3) p = page - 2 + i;
                  if (p > totalPages) return null;
                  return <button key={p} className={`pag-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
                })}
                {totalPages > 5 && page < totalPages - 2 && <span className="pag-ellipsis">...</span>}
                {totalPages > 5 && page < totalPages - 2 && (
                  <button className={`pag-btn ${totalPages === page ? 'active' : ''}`} onClick={() => setPage(totalPages)}>{totalPages}</button>
                )}
                <button className="pag-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                <select
                  className="pag-per-page"
                  value={perPage}
                  onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                >
                  <option value={10}>10 por página</option>
                  <option value={15}>15 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══ ADVANCED FILTERS MODAL (mobile) ══ */}
      {isFilterOpen && (
        <div className="modal-overlay" onClick={() => setIsFilterOpen(false)}>
          <div className="filter-modal" onClick={e => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h3>Filtros avanzados</h3>
              <button className="btn-close-sm" onClick={() => setIsFilterOpen(false)}>✕</button>
            </div>
            <div className="filter-modal-body">
              <div className="fm-group">
                <label>Usuario</label>
                <select value={filterUsuario} onChange={e => setFilterUsuario(e.target.value)}>
                  <option value="">Todos los usuarios</option>
                  {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="fm-group">
                <label>Módulo</label>
                <select value={filterModulo} onChange={e => setFilterModulo(e.target.value)}>
                  <option value="">Todos los módulos</option>
                  {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="fm-group">
                <label>Tipo de acción</label>
                <select value={filterAccion} onChange={e => setFilterAccion(e.target.value)}>
                  <option value="">Todas las acciones</option>
                  {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="fm-group">
                <label>Rango de fechas</label>
                <div className="date-range-row">
                  <input type="date" value={filterFechaInicio} onChange={e => setFilterFechaInicio(e.target.value)} />
                  <span>—</span>
                  <input type="date" value={filterFechaFin} onChange={e => setFilterFechaFin(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="filter-modal-footer">
              <button className="btn-limpiar" onClick={clearFilters}>Limpiar</button>
              <button className="btn-aplicar" onClick={() => { setPage(1); setIsFilterOpen(false); }}>Aplicar filtros</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DETAIL MODAL ══ */}
      {isModalOpen && selectedLog && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="detail-modal animate-scale" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <div className="detail-header-left">
                <div className="detail-action-icon">{getActionConfig(selectedLog.accion).icon}</div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D4A847', letterSpacing: '0.6px' }}>{selectedLog.id}</div>
                  <h2>{selectedLog.descripcion}</h2>
                  <span className="action-pill sm" style={{ background: getActionConfig(selectedLog.accion).bg, color: getActionConfig(selectedLog.accion).text, borderColor: getActionConfig(selectedLog.accion).border }}>
                    {getActionConfig(selectedLog.accion).label}
                  </span>
                </div>
              </div>
              <button className="btn-close-sm" onClick={closeModal}>✕</button>
            </div>
            <div className="detail-body">
              {[
                { icon: '🕐', label: 'Fecha y hora', value: `${formatDate(selectedLog.fecha).date} · ${formatDate(selectedLog.fecha).time}` },
                { icon: '👤', label: 'Usuario', value: selectedLog.usuario },
                { icon: '🏷️', label: 'Rol', value: selectedLog.rol },
                { icon: '📦', label: 'Módulo', value: selectedLog.modulo },
                { icon: '⚡', label: 'Acción', value: selectedLog.accion },
                { icon: '🔗', label: 'Registro afectado', value: selectedLog.registro_afectado || '—' },
                { icon: '📝', label: 'Descripción', value: selectedLog.descripcion },
                { icon: '🌐', label: 'IP / Dispositivo', value: selectedLog.ip ? `${selectedLog.ip} (${selectedLog.dispositivo || 'Navegador'})` : 'No disponible' },
              ].map((row, i) => (
                <div key={i} className="detail-row">
                  <div className="detail-row-label"><span>{row.icon}</span> {row.label}</div>
                  <div className="detail-row-value" style={{ whiteSpace: 'pre-line' }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div className="detail-footer">
              <button className="btn-ver-registro" onClick={() => handleNavigateToRecord(selectedLog)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Ir al módulo ({selectedLog.modulo || 'Relacionado'}) →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MOBILE CARD LIST ══ */}
      <div className="mobile-list">
        {loading ? <div className="state-box"><div className="spinner"></div></div> :
         filteredLogs.slice(0, 30).map(log => {
          const ac = getActionConfig(log.accion);
          const mc = getModuleColor(log.modulo);
          const { time, relative } = formatDate(log.fecha);
          return (
            <div key={log.id} className="mobile-card" onClick={() => openModal(log)}>
              <div className="mc-icon" style={{ background: ac.bg, color: ac.text }}>{ac.icon}</div>
              <div className="mc-body">
                <div className="mc-top">
                  <span className="mc-title">{log.descripcion?.substring(0, 48)}</span>
                  <span className="mc-time">{relative || time}</span>
                </div>
                <div className="mc-mid">
                  <span className="mc-user">{log.usuario}</span>
                  <span className="role-badge" style={{ background: mc.bg, color: mc.text }}>{log.modulo}</span>
                </div>
                <div className="mc-bot">
                  <span className="mc-device">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
                    {log.dispositivo || 'Web'}
                  </span>
                  {log.registro_afectado && (
                    <span className="record-badge sm" style={{ background: ac.bg, color: ac.text }}>{log.registro_afectado}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ STYLES ══ */}
      <style jsx>{`
        .audit-root {
          padding: 20px 24px 40px;
          min-height: 100vh;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* ── Page Header ── */
        .page-header {
          display: flex; justify-content: space-between; align-items: center;
          gap: 16px; flex-wrap: wrap;
          background: linear-gradient(135deg, #FAF6F0 0%, #F3EAE0 100%);
          border: 1px solid #E5D8CC; border-radius: 16px;
          padding: 20px 24px; margin-bottom: 20px;
        }
        .page-title {
          font-size: 1.55rem; font-weight: 800; color: #2C1810; margin: 0;
          letter-spacing: -0.4px;
        }
        .page-subtitle { font-size: 0.84rem; color: #6B5B52; margin: 4px 0 0; }

        .live-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 11px; border-radius: 999px; font-size: 0.72rem; font-weight: 800;
          letter-spacing: 0.3px; transition: all 0.25s ease;
        }
        .live-pill.on { background: #DCFCE7; color: #166534; border: 1px solid #86EFAC; }
        .live-pill.off { background: #F1F5F9; color: #64748B; border: 1px solid #CBD5E1; }
        .live-pill.flash { background: #FEF3C7; color: #92400E; border-color: #F59E0B; transform: scale(1.05); }
        .live-dot {
          width: 8px; height: 8px; border-radius: 50%; background: currentColor;
          animation: pulseDot 1.6s infinite;
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        .header-actions-bar {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .auto-control {
          display: flex; align-items: center; gap: 8px;
          background: #FFFFFF; border: 1px solid #E5D8CC; border-radius: 10px;
          padding: 7px 12px;
        }
        .interval-select {
          border: 1px solid #E5D8CC; border-radius: 6px; padding: 3px 8px;
          font-size: 0.76rem; font-weight: 700; color: #3D2314; background: #FAF6F0;
          outline: none; cursor: pointer;
        }
        .btn-refresh {
          display: inline-flex; align-items: center; gap: 6px;
          background: #FFFFFF; color: #2C1810; border: 1px solid #D1C7BD;
          border-radius: 10px; padding: 9px 14px; font-size: 0.82rem; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-refresh:hover { background: #F5EDE4; border-color: #3D2314; }
        .spin-icon { animation: spin 0.8s linear infinite; }

        .btn-export {
          display: inline-flex; align-items: center; gap: 8px;
          background: #3D2314; color: #fff; border: none; border-radius: 10px;
          padding: 10px 18px; font-size: 0.84rem; font-weight: 700; cursor: pointer;
          transition: background 0.2s; white-space: nowrap;
          box-shadow: 0 4px 12px rgba(61,35,20,0.2);
        }
        .btn-export:hover:not(:disabled) { background: #2C1810; }
        .btn-export:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── KPI Grid ── */
        .kpi-grid {
          display: grid; grid-template-columns: repeat(5, 1fr);
          gap: 14px; margin-bottom: 18px;
        }
        .kpi-card {
          background: #fff; border-radius: 14px; border: 1px solid #E5D8CC;
          padding: 16px 18px; display: flex; align-items: center; gap: 14px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03); cursor: pointer;
          transition: all 0.18s ease;
        }
        .kpi-card:hover { transform: translateY(-2px); border-color: #6B3A2A; }
        .kpi-card.active { border: 2px solid #3D2314; background: #FAF6F0; }
        .kpi-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .kpi-icon.brown  { background: #F5EDE4; color: #3D2314; }
        .kpi-icon.green  { background: #DCFCE7; color: #059669; }
        .kpi-icon.orange { background: #FEF3C7; color: #D97706; }
        .kpi-icon.blue   { background: #DBEAFE; color: #2563EB; }
        .kpi-icon.violet { background: #F3E8FF; color: #7C3AED; }
        .kpi-label { font-size: 0.68rem; font-weight: 700; color: #6B5B52; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px; }
        .kpi-val { font-size: 1.55rem; font-weight: 800; color: #2C1810; margin: 0 0 3px; line-height: 1; }
        .kpi-trend { font-size: 0.72rem; font-weight: 600; margin: 0; }
        .kpi-trend.up { color: #059669; }
        .kpi-trend.danger { color: #B91C1C; }
        .kpi-trend.gray { color: #64748B; }

        /* ── Search card ── */
        .search-card {
          background: #fff; border-radius: 14px; border: 1px solid #E5D8CC;
          padding: 16px 18px; margin-bottom: 18px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.03);
          display: flex; flex-direction: column; gap: 12px;
        }
        .search-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .search-box { flex: 1; min-width: 240px; position: relative; }
        .search-box svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94A3B8; }
        .search-box input {
          width: 100%; padding: 10px 14px 10px 40px;
          border: 1px solid #E5D8CC; border-radius: 10px;
          font-size: 0.88rem; color: #2C1810; outline: none;
          background: #FAF6F0; transition: all 0.2s;
        }
        .search-box input:focus { border-color: #3D2314; background: #fff; }

        .quick-pills { display: flex; gap: 6px; flex-wrap: wrap; }
        .q-pill {
          background: #FAF6F0; color: #4A2518; border: 1px solid #E5D8CC;
          border-radius: 999px; padding: 7px 13px; font-size: 0.76rem; font-weight: 700;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .q-pill:hover { border-color: #3D2314; }
        .q-pill.active { background: #3D2314; color: #FFFFFF; border-color: #3D2314; }

        .btn-advanced {
          display: flex; align-items: center; gap: 6px;
          border: 1px solid #E5D8CC; background: #fff; color: #2C1810;
          border-radius: 10px; padding: 9px 14px;
          font-size: 0.82rem; font-weight: 700; cursor: pointer; white-space: nowrap;
        }

        .filter-inline-row {
          display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
        }
        .filter-inline-row select,
        .filter-inline-row input[type="date"] {
          padding: 8px 12px; border: 1px solid #E5D8CC; border-radius: 9px;
          font-size: 0.82rem; color: #2C1810; background: #fff; outline: none;
          min-width: 145px;
        }
        .btn-clear-inline {
          background: #FEF2F2; border: 1px solid #FECACA; border-radius: 9px;
          padding: 8px 14px; font-size: 0.8rem; font-weight: 700; color: #B91C1C; cursor: pointer;
          margin-left: auto;
        }

        /* ── Table Card ── */
        .table-card {
          background: #fff; border-radius: 14px; border: 1px solid #E5D8CC;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03); overflow: hidden;
        }
        .table-wrap { overflow-x: auto; }
        .audit-table { width: 100%; border-collapse: collapse; }
        .audit-table th {
          background: #FAF6F0; padding: 13px 16px;
          font-size: 0.72rem; font-weight: 800; color: #2C1810;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 2px solid #E5D8CC; white-space: nowrap; text-align: left;
        }
        .audit-table td { padding: 13px 16px; border-bottom: 1px solid #F5ECE5; vertical-align: middle; }
        .trow { cursor: pointer; transition: background 0.12s; }
        .trow:hover { background: #FAF6F0; }
        .trow:last-child td { border-bottom: none; }

        .date-cell { display: flex; flex-direction: column; gap: 2px; white-space: nowrap; }
        .date-main { font-size: 0.82rem; font-weight: 700; color: #0F172A; }
        .date-rel { font-size: 0.72rem; font-weight: 700; color: #16A34A; }

        .user-cell { display: flex; align-items: center; gap: 10px; }
        .user-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 0.75rem; font-weight: 800; flex-shrink: 0;
        }
        .user-name { font-size: 0.86rem; font-weight: 700; color: #0F172A; }
        .user-role { font-size: 0.72rem; color: #64748B; }

        .module-pill {
          display: inline-block; padding: 4px 10px; border-radius: 6px;
          font-size: 0.75rem; font-weight: 700; white-space: nowrap;
        }
        .action-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 6px; border: 1px solid;
          font-size: 0.72rem; font-weight: 800; white-space: nowrap; letter-spacing: 0.4px;
        }
        .action-pill.sm { font-size: 0.7rem; padding: 3px 8px; }

        .record-badge {
          font-family: monospace; font-size: 0.8rem; font-weight: 800;
          background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A;
          padding: 3px 9px; border-radius: 6px; white-space: nowrap;
        }
        .record-badge.sm { font-size: 0.7rem; padding: 2px 6px; }

        .desc-text {
          font-size: 0.84rem; color: #1E293B; font-weight: 500;
          max-width: 320px; display: block;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .device-cell { display: flex; flex-direction: column; gap: 2px; }
        .ip-text { font-size: 0.8rem; font-weight: 700; color: #334155; font-family: monospace; }
        .device-text { font-size: 0.72rem; color: #64748B; display: flex; align-items: center; gap: 4px; }

        .row-action-btn {
          background: #FAF6F0; border: 1px solid #E5D8CC; font-size: 0.9rem;
          cursor: pointer; padding: 5px 9px; border-radius: 8px;
        }
        .row-action-btn:hover { background: #3D2314; color: #fff; }

        /* ── Pagination ── */
        .pagination-bar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 18px; border-top: 1px solid #F1F5F9; flex-wrap: wrap; gap: 10px;
        }
        .pag-info { font-size: 0.82rem; color: #64748B; }
        .pag-controls { display: flex; align-items: center; gap: 6px; }
        .pag-btn {
          width: 32px; height: 32px; border: 1px solid #E5D8CC; background: #fff;
          border-radius: 8px; font-size: 0.82rem; font-weight: 700; color: #2C1810;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .pag-btn.active { background: #3D2314; border-color: #3D2314; color: #fff; }
        .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pag-ellipsis { color: #94A3B8; padding: 0 4px; }
        .pag-per-page {
          padding: 6px 10px; border: 1px solid #E5D8CC; border-radius: 8px;
          font-size: 0.78rem; color: #2C1810; background: #fff; cursor: pointer; margin-left: 8px;
        }

        /* ── Modals ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.55); backdrop-filter: blur(4px);
          z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .filter-modal, .detail-modal {
          background: #fff; border-radius: 18px; width: 100%; max-width: 540px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.28); overflow: hidden;
          display: flex; flex-direction: column; max-height: 90vh;
        }
        .filter-modal-header {
          padding: 18px 24px; border-bottom: 1px solid #F1F5F9;
          display: flex; justify-content: space-between; align-items: center;
        }
        .filter-modal-header h3 { font-size: 1.05rem; font-weight: 800; color: #2C1810; margin: 0; }
        .filter-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
        .fm-group { display: flex; flex-direction: column; gap: 6px; }
        .fm-group label { font-size: 0.78rem; font-weight: 700; color: #64748B; }
        .fm-group select, .fm-group input {
          padding: 10px 14px; border: 1px solid #E5D8CC; border-radius: 8px;
          font-size: 0.9rem; color: #0F172A; outline: none;
        }
        .date-range-row { display: flex; gap: 10px; align-items: center; }
        .filter-modal-footer {
          padding: 16px 24px; border-top: 1px solid #F1F5F9;
          display: flex; gap: 12px; justify-content: flex-end;
        }
        .btn-limpiar {
          background: #F1F5F9; border: 1px solid #CBD5E1; color: #334155;
          border-radius: 8px; padding: 10px 18px; font-size: 0.85rem; font-weight: 700; cursor: pointer;
        }
        .btn-aplicar {
          background: #3D2314; color: #fff; border: none;
          border-radius: 8px; padding: 10px 22px; font-size: 0.85rem; font-weight: 700; cursor: pointer;
        }

        .detail-header {
          padding: 20px 24px; background: linear-gradient(135deg, #23120B 0%, #4A2518 100%);
          color: #fff; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
        }
        .detail-header-left { display: flex; gap: 14px; align-items: flex-start; }
        .detail-action-icon { font-size: 2rem; line-height: 1; }
        .detail-header-left h2 { font-size: 1rem; font-weight: 700; color: #FFFFFF; margin: 2px 0 8px; }
        .detail-body { overflow-y: auto; }
        .detail-row {
          display: flex; padding: 13px 24px; border-bottom: 1px solid #F1F5F9;
          align-items: flex-start; gap: 16px;
        }
        .detail-row-label {
          min-width: 155px; font-size: 0.8rem; color: #64748B;
          font-weight: 700; display: flex; align-items: center; gap: 8px;
        }
        .detail-row-value { font-size: 0.88rem; color: #0F172A; font-weight: 600; line-height: 1.5; }
        .detail-footer { padding: 14px 24px; border-top: 1px solid #F1F5F9; background: #F8FAFC; }
        .btn-ver-registro {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          border: none; background: #3D2314; color: #FFFFFF;
          border-radius: 10px; padding: 11px; font-size: 0.86rem; font-weight: 700; cursor: pointer;
        }
        .btn-close-sm {
          background: rgba(255,255,255,0.14); border: none; font-size: 1rem; color: #fff;
          cursor: pointer; width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── States ── */
        .state-box {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 24px; text-align: center; gap: 12px;
        }
        .spinner {
          width: 36px; height: 36px; border: 3px solid #E5D8CC;
          border-top: 3px solid #3D2314; border-radius: 50%; animation: spin 0.9s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .btn-retry {
          background: #3D2314; color: #fff; border: none; padding: 9px 18px;
          border-radius: 8px; font-weight: 700; cursor: pointer;
        }

        /* ── Mobile ── */
        .mobile-list { display: none; flex-direction: column; }
        .mobile-card {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 16px; border-bottom: 1px solid #F1F5F9; cursor: pointer; background: #fff;
        }
        .mc-icon {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; flex-shrink: 0;
        }
        .mc-body { flex: 1; min-width: 0; }
        .mc-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
        .mc-title { font-size: 0.9rem; font-weight: 700; color: #0F172A; }
        .mc-time { font-size: 0.74rem; color: #16A34A; font-weight: 700; flex-shrink: 0; margin-left: 8px; }
        .mc-mid { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .mc-user { font-size: 0.82rem; color: #475569; font-weight: 600; }
        .role-badge { padding: 2px 8px; border-radius: 5px; font-size: 0.68rem; font-weight: 700; }
        .mc-bot { display: flex; align-items: center; justify-content: space-between; }
        .mc-device { font-size: 0.72rem; color: #94A3B8; display: flex; align-items: center; gap: 5px; }

        @media (max-width: 1100px) {
          .kpi-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .audit-root { padding: 12px; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .filter-inline-row { display: none; }
          .table-card { display: none; }
          .mobile-list { display: flex; border-radius: 14px; overflow: hidden; border: 1px solid #E5D8CC; }
        }
      `}</style>
    </div>
  );
}
