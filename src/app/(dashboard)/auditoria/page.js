'use client';

import { useState, useEffect } from 'react';

// ─── Action config ────────────────────────────────────────────
const ACTION_CONFIG = {
  'Login':        { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', icon: '🔑', label: 'LOGIN' },
  'Login Fallido':{ bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', icon: '🔒', label: 'ACCESO DENEGADO' },
  'Logout':       { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', icon: '🚪', label: 'LOGOUT' },
  'Crear':        { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', icon: '✨', label: 'CREAR' },
  'Editar':       { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', icon: '✏️', label: 'EDITAR' },
  'Eliminar':     { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', icon: '🗑️', label: 'ELIMINAR' },
  'Asignar':      { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE', icon: '👤', label: 'ASIGNAR' },
  'Aprobar':      { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', icon: '✅', label: 'APROBAR' },
  'Rechazar':     { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', icon: '❌', label: 'RECHAZAR' },
  'Subir Foto':   { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', icon: '📸', label: 'SUBIR FOTO' },
  'Exportar':     { bg: '#F8FAFC', text: '#334155', border: '#CBD5E1', icon: '📊', label: 'EXPORTAR' },
};

const getActionConfig = (accion) => ACTION_CONFIG[accion] || { bg: '#F8FAFC', text: '#334155', border: '#CBD5E1', icon: '📌', label: accion?.toUpperCase() || 'ACCIÓN' };

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
const AVATAR_COLORS = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#9333EA','#16A34A'];
const getAvatarColor = (name) => {
  const code = (name || 'S').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
};
const getInitials = (name) => {
  if (!name) return 'S';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterAccion, setFilterAccion] = useState('');
  const [filterModulo, setFilterModulo] = useState('');
  const [filterUsuario, setFilterUsuario] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // UI state
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auditorias');
      if (!res.ok) throw new Error('Error al cargar la bitácora');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (log) => { setSelectedLog(log); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setTimeout(() => setSelectedLog(null), 200); };

  // ─── Filter Logic ────────────────────────────────────────────
  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch = !q || log.usuario?.toLowerCase().includes(q) || log.descripcion?.toLowerCase().includes(q) || log.registro_afectado?.toLowerCase().includes(q);
    const matchAccion = !filterAccion || log.accion === filterAccion;
    const matchModulo = !filterModulo || log.modulo === filterModulo;
    const matchUsuario = !filterUsuario || log.usuario === filterUsuario;
    let matchFecha = true;
    if (filterFechaInicio || filterFechaFin) {
      const d = new Date(log.fecha).getTime();
      const s = filterFechaInicio ? new Date(filterFechaInicio).getTime() : 0;
      const e = filterFechaFin ? new Date(filterFechaFin).getTime() + 86400000 : Infinity;
      matchFecha = d >= s && d <= e;
    }
    return matchSearch && matchAccion && matchModulo && matchUsuario && matchFecha;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PER_PAGE));
  const paginatedLogs = filteredLogs.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const uniqueActions = [...new Set(logs.map(l => l.accion))];
  const uniqueModules = [...new Set(logs.map(l => l.modulo))];
  const uniqueUsers = [...new Set(logs.map(l => l.usuario))];

  // ─── KPI stats ───────────────────────────────────────────────
  const today = new Date().toLocaleDateString('es-CO');
  const todayCount = logs.filter(l => new Date(l.fecha).toLocaleDateString('es-CO') === today).length;
  const criticalCount = logs.filter(l => ['Eliminar', 'Rechazar', 'Login Fallido'].includes(l.accion)).length;
  const activeUsers = [...new Set(logs.map(l => l.usuario))].length;
  const lastDate = logs[0] ? new Date(logs[0].fecha) : new Date();

  const clearFilters = () => {
    setSearch(''); setFilterAccion(''); setFilterModulo('');
    setFilterUsuario(''); setFilterFechaInicio(''); setFilterFechaFin('');
    setPage(1); setIsFilterOpen(false);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return { date: d.toLocaleDateString('es-CO'), time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) };
  };

  return (
    <div className="audit-root">

      {/* ══ PAGE HEADER ══ */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bitácora de Auditoría</h1>
          <p className="page-subtitle">Registro centralizado de actividades críticas y eventos del sistema.</p>
        </div>
        <button className="btn-export">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar
        </button>
      </div>

      {/* ══ KPI CARDS ══ */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg></div>
          <div className="kpi-info">
            <p className="kpi-label">Total Registros</p>
            <p className="kpi-val">{logs.length.toLocaleString('es-CO')}</p>
            <p className="kpi-trend up">+12% vs. ayer</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div className="kpi-info">
            <p className="kpi-label">Usuarios Activos</p>
            <p className="kpi-val">{activeUsers}</p>
            <p className="kpi-trend up">+5 hoy</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div className="kpi-info">
            <p className="kpi-label">Acciones Críticas</p>
            <p className="kpi-val">{criticalCount}</p>
            <p className="kpi-trend up">+8% vs. ayer</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div className="kpi-info">
            <p className="kpi-label">Hoy</p>
            <p className="kpi-val">{todayCount}</p>
            <p className="kpi-trend gray">Registros</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon violet"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div className="kpi-info">
            <p className="kpi-label">Última Actualización</p>
            <p className="kpi-val">{lastDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="kpi-trend gray">{lastDate.toLocaleDateString('es-CO')}</p>
          </div>
        </div>
      </div>

      {/* ══ SEARCH + FILTER BAR ══ */}
      <div className="search-card">
        <div className="search-row">
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Buscar por usuario, descripción o ID de registro..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button className="btn-advanced" onClick={() => setIsFilterOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            Filtros avanzados
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
          <input type="date" value={filterFechaInicio} onChange={e => { setFilterFechaInicio(e.target.value); setPage(1); }} placeholder="Fecha desde" />
          <input type="date" value={filterFechaFin} onChange={e => { setFilterFechaFin(e.target.value); setPage(1); }} placeholder="Fecha hasta" />
          <button className="btn-search-inline" onClick={() => setPage(1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Buscar
          </button>
          <button className="btn-clear-inline" onClick={clearFilters}>Limpiar</button>
        </div>
      </div>

      {/* ══ TABLE ══ */}
      <div className="table-card">
        {loading ? (
          <div className="state-box"><div className="spinner"></div><p>Cargando registros...</p></div>
        ) : error ? (
          <div className="state-box"><p style={{color:'#B91C1C'}}>❌ {error}</p><button onClick={fetchLogs} className="btn-retry">Reintentar</button></div>
        ) : filteredLogs.length === 0 ? (
          <div className="state-box"><span style={{fontSize:'2.5rem'}}>📭</span><h3>Sin resultados</h3><p>No se encontraron registros.</p></div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>FECHA Y HORA <span className="sort-ico">↕</span></th>
                    <th>USUARIO / ROL</th>
                    <th>MÓDULO</th>
                    <th>ACCIÓN</th>
                    <th>REGISTRO AFECTADO</th>
                    <th>DESCRIPCIÓN</th>
                    <th>IP / DISPOSITIVO</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => {
                    const { date, time } = formatDate(log.fecha);
                    const ac = getActionConfig(log.accion);
                    const mc = getModuleColor(log.modulo);
                    const avatarColor = getAvatarColor(log.usuario);
                    const initials = getInitials(log.usuario);
                    return (
                      <tr key={log.id} className="trow" onClick={() => openModal(log)}>
                        <td>
                          <div className="date-cell">
                            <span className="date-main">{date}</span>
                            <span className="date-time">{time}</span>
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
                          <span className="desc-text">{log.descripcion}</span>
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
                          ) : <span style={{color:'#9CA3AF'}}>—</span>}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="row-action-btn" onClick={() => openModal(log)}>⋮</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination-bar">
              <span className="pag-info">Mostrando {(page-1)*PER_PAGE+1} a {Math.min(page*PER_PAGE, filteredLogs.length)} de {filteredLogs.length} registros</span>
              <div className="pag-controls">
                <button className="pag-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
                {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && page > 3) p = page - 2 + i;
                  if (p > totalPages) return null;
                  return <button key={p} className={`pag-btn ${p===page?'active':''}`} onClick={() => setPage(p)}>{p}</button>;
                })}
                {totalPages > 5 && <span className="pag-ellipsis">...</span>}
                {totalPages > 5 && <button className={`pag-btn ${totalPages===page?'active':''}`} onClick={() => setPage(totalPages)}>{totalPages}</button>}
                <button className="pag-btn" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>›</button>
                <select className="pag-per-page" defaultValue="10" onChange={e => { setPage(1); }}>
                  <option value="10">10 por página</option>
                  <option value="25">25 por página</option>
                  <option value="50">50 por página</option>
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
                { icon: '🕐', label: 'Fecha y hora', value: `${formatDate(selectedLog.fecha).date} - ${formatDate(selectedLog.fecha).time}` },
                { icon: '👤', label: 'Usuario', value: selectedLog.usuario },
                { icon: '🏷️', label: 'Rol', value: selectedLog.rol },
                { icon: '📦', label: 'Módulo', value: selectedLog.modulo },
                { icon: '⚡', label: 'Acción', value: selectedLog.accion },
                { icon: '🔗', label: 'Registro afectado', value: selectedLog.registro_afectado || '—' },
                { icon: '📝', label: 'Descripción', value: selectedLog.descripcion },
                { icon: '🌐', label: 'IP / Dispositivo', value: selectedLog.ip ? `${selectedLog.ip}\n${selectedLog.dispositivo || ''}` : 'No disponible' },
              ].map((row, i) => (
                <div key={i} className="detail-row">
                  <div className="detail-row-label"><span>{row.icon}</span> {row.label}</div>
                  <div className="detail-row-value" style={{ whiteSpace: 'pre-line' }}>{row.value}</div>
                </div>
              ))}
            </div>
            <div className="detail-footer">
              <button className="btn-ver-registro">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Ver registro relacionado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MOBILE CARD LIST ══ */}
      <div className="mobile-list">
        {loading ? <div className="state-box"><div className="spinner"></div></div> :
         filteredLogs.slice(0, 20).map(log => {
          const ac = getActionConfig(log.accion);
          const mc = getModuleColor(log.modulo);
          const { time } = formatDate(log.fecha);
          return (
            <div key={log.id} className="mobile-card" onClick={() => openModal(log)}>
              <div className="mc-icon" style={{ background: ac.bg, color: ac.text }}>{ac.icon}</div>
              <div className="mc-body">
                <div className="mc-top">
                  <span className="mc-title">{log.accion === 'Login' ? 'Inicio de sesión' : log.accion === 'Logout' ? 'Cierre de sesión' : log.descripcion?.substring(0, 30)}</span>
                  <span className="mc-time">{time}</span>
                </div>
                <div className="mc-mid">
                  <span className="mc-user">{log.usuario}</span>
                  <span className="role-badge" style={{ background: mc.bg, color: mc.text }}>{log.rol}</span>
                </div>
                <div className="mc-bot">
                  <span className="mc-device">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
                    {log.dispositivo || 'Automático'}
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
        /* ── Root ── */
        .audit-root {
          padding: 28px 28px 40px;
          background: #F8FAFC;
          min-height: 100vh;
          font-family: 'Inter', 'Outfit', system-ui, sans-serif;
        }

        /* ── Page Header ── */
        .page-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.9rem; font-weight: 800; color: #0F172A; margin: 0 0 4px;
          letter-spacing: -0.5px;
        }
        .page-subtitle { font-size: 0.88rem; color: #64748B; margin: 0; }
        .btn-export {
          display: flex; align-items: center; gap: 8px;
          background: #7C3AED; color: #fff; border: none; border-radius: 8px;
          padding: 10px 18px; font-size: 0.88rem; font-weight: 700; cursor: pointer;
          transition: background 0.2s; white-space: nowrap;
        }
        .btn-export:hover { background: #6D28D9; }

        /* ── KPI Grid ── */
        .kpi-grid {
          display: grid; grid-template-columns: repeat(5, 1fr);
          gap: 16px; margin-bottom: 24px;
        }
        .kpi-card {
          background: #fff; border-radius: 12px; border: 1px solid #E2E8F0;
          padding: 18px 20px; display: flex; align-items: center; gap: 16px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
        .kpi-icon {
          width: 44px; height: 44px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .kpi-icon.purple { background: #EDE9FE; color: #7C3AED; }
        .kpi-icon.green  { background: #DCFCE7; color: #059669; }
        .kpi-icon.orange { background: #FEF3C7; color: #D97706; }
        .kpi-icon.blue   { background: #DBEAFE; color: #2563EB; }
        .kpi-icon.violet { background: #F3E8FF; color: #9333EA; }
        .kpi-label { font-size: 0.7rem; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px; }
        .kpi-val { font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0 0 4px; line-height: 1; }
        .kpi-trend { font-size: 0.72rem; font-weight: 600; margin: 0; }
        .kpi-trend.up { color: #059669; }
        .kpi-trend.gray { color: #94A3B8; }

        /* ── Search card ── */
        .search-card {
          background: #fff; border-radius: 12px; border: 1px solid #E2E8F0;
          padding: 18px; margin-bottom: 20px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
          display: flex; flex-direction: column; gap: 14px;
        }
        .search-row { display: flex; gap: 12px; align-items: center; }
        .search-box {
          flex: 1; position: relative;
        }
        .search-box svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94A3B8; }
        .search-box input {
          width: 100%; padding: 11px 14px 11px 42px;
          border: 1px solid #E2E8F0; border-radius: 8px;
          font-size: 0.9rem; color: #0F172A; outline: none;
          background: #F8FAFC;
          transition: border-color 0.2s;
        }
        .search-box input:focus { border-color: #7C3AED; background: #fff; }
        .btn-advanced {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid #E2E8F0; background: #fff; color: #475569;
          border-radius: 8px; padding: 10px 16px;
          font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap;
          transition: all 0.2s;
        }
        .btn-advanced:hover { border-color: #7C3AED; color: #7C3AED; }

        .filter-inline-row {
          display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
        }
        .filter-inline-row select,
        .filter-inline-row input[type="date"] {
          padding: 9px 12px; border: 1px solid #E2E8F0; border-radius: 8px;
          font-size: 0.83rem; color: #334155; background: #F8FAFC; outline: none;
          min-width: 150px;
        }
        .btn-search-inline {
          display: flex; align-items: center; gap: 6px;
          background: #7C3AED; color: #fff; border: none; border-radius: 8px;
          padding: 10px 18px; font-size: 0.85rem; font-weight: 700; cursor: pointer;
          transition: background 0.2s;
        }
        .btn-search-inline:hover { background: #6D28D9; }
        .btn-clear-inline {
          background: none; border: 1px solid #E2E8F0; border-radius: 8px;
          padding: 9px 14px; font-size: 0.83rem; color: #64748B; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-clear-inline:hover { border-color: #94A3B8; color: #334155; }

        /* ── Table Card ── */
        .table-card {
          background: #fff; border-radius: 12px; border: 1px solid #E2E8F0;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04); overflow: hidden;
        }
        .table-wrap { overflow-x: auto; }
        .audit-table { width: 100%; border-collapse: collapse; }
        .audit-table th {
          background: #F8FAFC; padding: 13px 18px;
          font-size: 0.7rem; font-weight: 700; color: #64748B;
          text-transform: uppercase; letter-spacing: 0.6px;
          border-bottom: 1px solid #E2E8F0; white-space: nowrap; text-align: left;
        }
        .sort-ico { font-size: 0.8em; opacity: 0.5; }
        .audit-table td { padding: 14px 18px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
        .trow { cursor: pointer; transition: background 0.12s; }
        .trow:hover { background: #FAFAFA; }
        .trow:last-child td { border-bottom: none; }

        .date-cell { display: flex; flex-direction: column; gap: 2px; }
        .date-main { font-size: 0.85rem; font-weight: 600; color: #0F172A; }
        .date-time { font-size: 0.75rem; color: #64748B; }

        .user-cell { display: flex; align-items: center; gap: 10px; }
        .user-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 0.75rem; font-weight: 800; flex-shrink: 0;
        }
        .user-name { font-size: 0.88rem; font-weight: 700; color: #0F172A; }
        .user-role { font-size: 0.72rem; color: #64748B; }

        .module-pill {
          display: inline-block; padding: 4px 10px; border-radius: 6px;
          font-size: 0.75rem; font-weight: 600; white-space: nowrap;
        }
        .action-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 6px; border: 1px solid;
          font-size: 0.72rem; font-weight: 800; white-space: nowrap; letter-spacing: 0.4px;
        }
        .action-pill.sm { font-size: 0.7rem; padding: 3px 8px; }

        .record-badge {
          font-family: monospace; font-size: 0.8rem; font-weight: 700;
          background: #F1F5F9; color: #475569; padding: 3px 8px; border-radius: 5px;
          white-space: nowrap;
        }
        .record-badge.sm { font-size: 0.7rem; padding: 2px 6px; }

        .desc-text {
          font-size: 0.83rem; color: #475569; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; max-width: 220px; display: block;
        }

        .device-cell { display: flex; flex-direction: column; gap: 2px; }
        .ip-text { font-size: 0.82rem; font-weight: 600; color: #334155; font-family: monospace; }
        .device-text { font-size: 0.72rem; color: #94A3B8; display: flex; align-items: center; gap: 4px; }

        .row-action-btn {
          background: none; border: none; font-size: 1.2rem; color: #94A3B8;
          cursor: pointer; padding: 4px 8px; border-radius: 6px;
          transition: background 0.15s;
        }
        .row-action-btn:hover { background: #F1F5F9; color: #475569; }

        /* ── Pagination ── */
        .pagination-bar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 18px; border-top: 1px solid #F1F5F9;
        }
        .pag-info { font-size: 0.8rem; color: #64748B; }
        .pag-controls { display: flex; align-items: center; gap: 6px; }
        .pag-btn {
          width: 32px; height: 32px; border: 1px solid #E2E8F0; background: #fff;
          border-radius: 6px; font-size: 0.82rem; font-weight: 600; color: #475569;
          cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center;
        }
        .pag-btn:hover:not(:disabled) { border-color: #7C3AED; color: #7C3AED; }
        .pag-btn.active { background: #7C3AED; border-color: #7C3AED; color: #fff; }
        .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pag-ellipsis { color: #94A3B8; padding: 0 4px; }
        .pag-per-page {
          padding: 6px 10px; border: 1px solid #E2E8F0; border-radius: 6px;
          font-size: 0.78rem; color: #334155; background: #fff; cursor: pointer; margin-left: 8px;
        }

        /* ── Filter Modal (mobile) ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.45); backdrop-filter: blur(3px);
          z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .filter-modal {
          background: #fff; border-radius: 16px; width: 100%; max-width: 480px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15); display: flex; flex-direction: column;
          animation: scaleIn 0.2s ease;
        }
        .filter-modal-header {
          padding: 20px 24px; border-bottom: 1px solid #F1F5F9;
          display: flex; justify-content: space-between; align-items: center;
        }
        .filter-modal-header h3 { font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0; }
        .filter-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; }
        .fm-group { display: flex; flex-direction: column; gap: 7px; }
        .fm-group label { font-size: 0.78rem; font-weight: 700; color: #64748B; }
        .fm-group select, .fm-group input {
          padding: 11px 14px; border: 1px solid #E2E8F0; border-radius: 8px;
          font-size: 0.9rem; color: #0F172A; outline: none;
        }
        .fm-group select:focus, .fm-group input:focus { border-color: #7C3AED; }
        .date-range-row { display: flex; gap: 10px; align-items: center; }
        .date-range-row span { color: #94A3B8; }
        .filter-modal-footer {
          padding: 16px 24px; border-top: 1px solid #F1F5F9;
          display: flex; gap: 12px; justify-content: flex-end;
        }
        .btn-limpiar {
          background: none; border: 1px solid #E2E8F0; color: #64748B;
          border-radius: 8px; padding: 11px 20px; font-size: 0.88rem; font-weight: 600; cursor: pointer;
        }
        .btn-aplicar {
          background: #7C3AED; color: #fff; border: none;
          border-radius: 8px; padding: 11px 24px; font-size: 0.88rem; font-weight: 700; cursor: pointer;
        }

        /* ── Detail Modal ── */
        .detail-modal {
          background: #fff; border-radius: 16px; width: 100%; max-width: 540px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15); overflow: hidden;
          display: flex; flex-direction: column; max-height: 90vh;
        }
        .animate-scale { animation: scaleIn 0.22s cubic-bezier(0.16,1,0.3,1); }
        @keyframes scaleIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .detail-header {
          padding: 22px 24px; border-bottom: 1px solid #F1F5F9; background: #FAFAFA;
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
        }
        .detail-header-left { display: flex; gap: 14px; align-items: flex-start; }
        .detail-action-icon { font-size: 2rem; line-height: 1; }
        .detail-header-left h2 { font-size: 1rem; font-weight: 700; color: #0F172A; margin: 0 0 6px; }
        .detail-body { overflow-y: auto; }
        .detail-row {
          display: flex; padding: 14px 24px; border-bottom: 1px solid #F8FAFC;
          align-items: flex-start; gap: 16px;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-row-label {
          min-width: 160px; font-size: 0.8rem; color: #64748B;
          font-weight: 600; display: flex; align-items: center; gap: 8px; padding-top: 1px;
        }
        .detail-row-value { font-size: 0.88rem; color: #0F172A; font-weight: 500; line-height: 1.5; }
        .detail-footer { padding: 16px 24px; border-top: 1px solid #F1F5F9; }
        .btn-ver-registro {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          border: 1px solid #E2E8F0; background: #fff; color: #475569;
          border-radius: 8px; padding: 11px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
        }
        .btn-ver-registro:hover { border-color: #7C3AED; color: #7C3AED; }

        .btn-close-sm {
          background: none; border: none; font-size: 1rem; color: #94A3B8;
          cursor: pointer; width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: background 0.15s;
        }
        .btn-close-sm:hover { background: #F1F5F9; color: #334155; }

        /* ── States ── */
        .state-box {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 24px; text-align: center; gap: 12px;
        }
        .state-box h3 { font-size: 1.1rem; color: #0F172A; margin: 0; }
        .state-box p { color: #64748B; margin: 0; font-size: 0.9rem; }
        .spinner {
          width: 38px; height: 38px; border: 3px solid #E2E8F0;
          border-top: 3px solid #7C3AED; border-radius: 50%; animation: spin 0.9s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .btn-retry {
          background: #7C3AED; color: #fff; border: none; padding: 9px 18px;
          border-radius: 8px; font-weight: 600; cursor: pointer;
        }

        /* ── Mobile ── */
        .mobile-list { display: none; flex-direction: column; gap: 0; }
        .mobile-card {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 16px; border-bottom: 1px solid #F1F5F9; cursor: pointer;
          background: #fff; transition: background 0.12s;
        }
        .mobile-card:hover { background: #FAFAFA; }
        .mc-icon {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; flex-shrink: 0;
        }
        .mc-body { flex: 1; min-width: 0; }
        .mc-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
        .mc-title { font-size: 0.9rem; font-weight: 700; color: #0F172A; }
        .mc-time { font-size: 0.75rem; color: #94A3B8; flex-shrink: 0; margin-left: 8px; }
        .mc-mid { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .mc-user { font-size: 0.82rem; color: #475569; font-weight: 500; }
        .role-badge { padding: 2px 8px; border-radius: 5px; font-size: 0.68rem; font-weight: 700; }
        .mc-bot { display: flex; align-items: center; justify-content: space-between; }
        .mc-device { font-size: 0.72rem; color: #94A3B8; display: flex; align-items: center; gap: 5px; }

        /* ── Responsive ── */
        @media (max-width: 1200px) {
          .kpi-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 900px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .filter-inline-row select, .filter-inline-row input { min-width: 120px; }
        }
        @media (max-width: 768px) {
          .audit-root { padding: 0; background: #F8FAFC; }
          .page-header { display: none; }
          .kpi-grid { display: none; }
          .search-card {
            margin: 0; border-radius: 0; border: none;
            border-bottom: 1px solid #E2E8F0; padding: 14px 16px;
          }
          .filter-inline-row { display: none; }
          .table-card { display: none; }
          .mobile-list { display: flex; }
        }
      `}</style>
    </div>
  );
}
