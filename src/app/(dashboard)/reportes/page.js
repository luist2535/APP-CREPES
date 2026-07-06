'use client';

import { useState, useEffect, useCallback } from 'react';

const ESTADO_LABELS = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7' },
  en_progreso: { label: 'En Progreso', color: '#3b82f6', bg: '#dbeafe' },
  finalizada: { label: 'Finalizada', color: '#8b5cf6', bg: '#ede9fe' },
  cerrada: { label: 'Cerrada ✓', color: '#10b981', bg: '#d1fae5' },
  devuelta: { label: 'Devuelta', color: '#ef4444', bg: '#fee2e2' },
  completada: { label: 'Completada', color: '#6b7280', bg: '#f3f4f6' },
};

export default function ReportesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);

  // Filters
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [activeAreaTab, setActiveAreaTab] = useState('todos');
  const [exportLoading, setExportLoading] = useState(false);
  const [mappedArea, setMappedArea] = useState('');

  // Detalle Operación / Visita Modal
  const [selectedVisitaDetalle, setSelectedVisitaDetalle] = useState(null);
  const [evidenciasDetalle, setEvidenciasDetalle] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [detalleTab, setDetalleTab] = useState('general');

  const handleVerOperacion = async (visita) => {
    setSelectedVisitaDetalle(visita);
    setDetalleTab('general');
    setLoadingDetalle(true);
    setEvidenciasDetalle([]);
    try {
      const res = await fetch(`/api/visitas?visita_id=${visita.id}`);
      if (res.ok) {
        const data = await res.json();
        setEvidenciasDetalle(data.evidencias || []);
      }
    } catch (err) {
      console.error('Error al cargar evidencias:', err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleIrAVisita = (id) => {
    localStorage.setItem('target_visita_id', id);
    window.location.href = '/visitas';
  };

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filtroArea) params.set('area_id', filtroArea);
    if (filtroCategoria) params.set('categoria_id', filtroCategoria);
    if (filtroCiudad) params.set('ciudad_id', filtroCiudad);
    if (filtroEstado) params.set('estado', filtroEstado);
    if (filtroFechaDesde) params.set('fecha_desde', filtroFechaDesde);
    if (filtroFechaHasta) params.set('fecha_hasta', filtroFechaHasta);
    return params.toString();
  }, [filtroArea, filtroCategoria, filtroCiudad, filtroEstado, filtroFechaDesde, filtroFechaHasta]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const q = buildQuery();
      const res = await fetch(`/api/reportes${q ? '?' + q : ''}`);
      if (!res.ok) throw new Error('Error al cargar reportes');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        const role = parseInt(u.rol_id);
        setUserRole(role);
        
        // Define role to area mapping (Admin, Coordinador, Visualizador see all)
        const areaMap = {
          3: '2', // SST
          4: '3', // Mantenimiento
          5: '4', // Calidad
          6: '5', // VRH
          7: '6', // Formación
          9: '7', // Sistemas
        };
        const mapped = areaMap[role] || '';
        if (mapped) {
          setMappedArea(mapped);
          setFiltroArea(mapped);
          setActiveAreaTab(mapped);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportToExcel = async () => {
    if (!data?.visitas?.length) return;
    setExportLoading(true);
    try {
      const XLSX = await import('xlsx');
      const rows = filteredVisitas.map(v => ({
        'ID': v.id,
        'Fecha': v.fecha,
        'Hora Inicio': v.hora_inicio || '',
        'Hora Fin': v.hora_fin || '',
        'PDV': v.pdv_nombre,
        'Ciudad': v.ciudad_nombre,
        'Área': v.area_nombre,
        'Tipo de Visita': v.tipo_visita_nombre || '',
        'Categoría Padre': v.categoria_padre_nombre || v.categoria_nombre || '',
        'Categoría': v.categoria_nombre || '',
        'Responsable': v.responsable_nombre || '',
        'Creado por': v.creador_nombre,
        'Estado': ESTADO_LABELS[v.estado]?.label || v.estado,
        'Observaciones': v.observaciones || '',
        'Hallazgos': v.hallazgos || '',
        'Acciones Correctivas': v.acciones_correctivas || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reportes Visitas');

      // Add summary sheet
      if (data.resumenPorArea?.length) {
        const summaryRows = data.resumenPorArea.map(a => ({
          'Área': a.area_nombre,
          'Total Visitas': a.total,
          'Cerradas': a.cerradas,
          'Finalizadas': a.finalizadas,
          'Pendientes': a.pendientes,
          'En Progreso': a.en_progreso,
          'Devueltas': a.devueltas,
        }));
        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Área');
      }

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Reporte_Visitas_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Error al exportar a Excel: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const clearFilters = () => {
    setFiltroArea(mappedArea || '');
    setFiltroCategoria('');
    setFiltroCiudad('');
    setFiltroEstado('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setBusquedaTexto('');
    setActiveAreaTab(mappedArea || 'todos');
  };

  // Client-side text search
  const filteredVisitas = (data?.visitas || []).filter(v => {
    if (!busquedaTexto) return true;
    const q = busquedaTexto.toLowerCase();
    return (
      v.pdv_nombre?.toLowerCase().includes(q) ||
      v.area_nombre?.toLowerCase().includes(q) ||
      v.tipo_visita_nombre?.toLowerCase().includes(q) ||
      v.categoria_nombre?.toLowerCase().includes(q) ||
      v.responsable_nombre?.toLowerCase().includes(q) ||
      v.observaciones?.toLowerCase().includes(q) ||
      String(v.id).includes(q)
    );
  });

  const categoriasForArea = filtroArea
    ? (data?.categorias || []).filter(c => c.area_id === parseInt(filtroArea) && !c.padre_id)
    : [];

  return (
    <div className="rep-container">
      <div className="rep-header">
        <div>
          <h1 className="rep-title">📊 Reportes por Área</h1>
          <p className="rep-subtitle">Historial de visitas, tickets y actividades por área operativa</p>
        </div>
        <button
          className="btn-export"
          onClick={exportToExcel}
          disabled={exportLoading || !filteredVisitas.length}
          id="btn-exportar-excel"
        >
          {exportLoading ? '⏳ Exportando...' : '📥 Exportar Excel'}
        </button>
      </div>

      {/* ===== KPI Cards ===== */}
      {data && (
        <div className="kpi-grid">
          {data.resumenPorArea
            .filter(area => !mappedArea || String(area.area_id) === String(mappedArea))
            .map((area, idx) => {
              const total = area.total || 0;
            const completadas = (area.cerradas || 0) + (area.finalizadas || 0);
            const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
            return (
              <div
                key={idx}
                className={`kpi-area-card ${activeAreaTab === String(area.area_id) ? 'kpi-active' : ''}`}
                onClick={() => {
                  setActiveAreaTab(String(area.area_id));
                  setFiltroArea(String(area.area_id));
                }}
                id={`kpi-area-${area.area_id}`}
              >
                <div className="kpi-area-top">
                  <span className="kpi-area-dot" style={{ background: area.area_color || '#8B6914' }}></span>
                  <span className="kpi-area-name">{area.area_nombre}</span>
                </div>
                <div className="kpi-area-num">{total}</div>
                <div className="kpi-area-label">visitas totales</div>
                <div className="kpi-bar-bg">
                  <div className="kpi-bar-fill" style={{ width: `${pct}%`, background: area.area_color || '#8B6914' }}></div>
                </div>
                <div className="kpi-area-pct">{pct}% completadas</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Filters Panel ===== */}
      <div className="filters-panel">
        <div className="filters-row">
          <div className="filter-group">
            <label>🗂️ Área</label>
            <select
              value={filtroArea}
              onChange={e => { setFiltroArea(e.target.value); setFiltroCategoria(''); setActiveAreaTab(e.target.value || 'todos'); }}
              id="filtro-area"
              disabled={!!mappedArea}
            >
              {!mappedArea && <option value="">Todas las áreas</option>}
              {(data?.areas || [])
                .filter(a => !mappedArea || String(a.id) === String(mappedArea))
                .map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
            </select>
          </div>

          {categoriasForArea.length > 0 && (
            <div className="filter-group">
              <label>📋 Categoría</label>
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} id="filtro-categoria">
                <option value="">Todas las categorías</option>
                {categoriasForArea.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>🏙️ Ciudad</label>
            <select value={filtroCiudad} onChange={e => setFiltroCiudad(e.target.value)} id="filtro-ciudad">
              <option value="">Todas las ciudades</option>
              {(data?.ciudades || []).map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>🔖 Estado</label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} id="filtro-estado">
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>📅 Desde</label>
            <input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} id="filtro-fecha-desde" />
          </div>

          <div className="filter-group">
            <label>📅 Hasta</label>
            <input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} id="filtro-fecha-hasta" />
          </div>
        </div>

        <div className="filters-actions-row">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar por PDV, área, responsable, observaciones..."
              value={busquedaTexto}
              onChange={e => setBusquedaTexto(e.target.value)}
              className="search-input"
              id="busqueda-texto"
            />
          </div>
          <button className="btn-apply" onClick={fetchData} id="btn-aplicar-filtros">Aplicar Filtros</button>
          <button className="btn-clear" onClick={clearFilters} id="btn-limpiar-filtros">Limpiar</button>
        </div>
      </div>

      {/* ===== Results Table ===== */}
      {loading ? (
        <div className="loading-wrap"><div className="spinner"></div><p>Cargando reportes...</p></div>
      ) : error ? (
        <div className="error-wrap">⚠️ {error}</div>
      ) : (
        <>
          <div className="results-header">
            <span className="results-count">
              {filteredVisitas.length} {filteredVisitas.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="table-wrapper">
            <table className="rep-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>PDV / Ciudad</th>
                  <th>Área</th>
                  <th>Categoría</th>
                  <th>Tipo de Visita</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th>Horario</th>
                  <th>⚡ Operación</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-row">No hay registros con los filtros aplicados</td>
                  </tr>
                ) : (
                  filteredVisitas.map(v => {
                    const estado = ESTADO_LABELS[v.estado] || { label: v.estado, color: '#6b7280', bg: '#f3f4f6' };
                    return (
                      <tr key={v.id} className="rep-row">
                        <td className="cell-id">#{v.id}</td>
                        <td className="cell-fecha">{v.fecha}</td>
                        <td>
                          <div className="cell-pdv">{v.pdv_nombre}</div>
                          <div className="cell-ciudad">🏙️ {v.ciudad_nombre}</div>
                        </td>
                        <td>
                          <span className="area-badge" style={{ background: v.area_color + '22', color: v.area_color, borderColor: v.area_color + '55' }}>
                            {v.area_nombre}
                          </span>
                        </td>
                        <td className="cell-categoria">
                          {v.categoria_padre_nombre && (
                            <span className="cat-padre">{v.categoria_padre_nombre} ›</span>
                          )}
                          <span className="cat-nombre">{v.categoria_nombre || '—'}</span>
                        </td>
                        <td className="cell-tipo">{v.tipo_visita_nombre || '—'}</td>
                        <td className="cell-resp">{v.responsable_nombre || '—'}</td>
                        <td>
                          <span className="estado-badge" style={{ background: estado.bg, color: estado.color }}>
                            {estado.label}
                          </span>
                        </td>
                        <td className="cell-horario">
                          {v.hora_inicio && v.hora_fin ? `${v.hora_inicio} – ${v.hora_fin}` : v.hora_inicio || '—'}
                        </td>
                        <td className="cell-accion">
                          <button
                            className="btn-ver-operacion"
                            onClick={() => handleVerOperacion(v)}
                            title="Ver trazabilidad, checklist, evidencias y firmas de esta operación"
                          >
                            👁️ Ver Detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ===== Mobile Cards View (Para teléfonos / PWA) ===== */}
          <div className="rep-cards-mobile">
            {filteredVisitas.length === 0 ? (
              <div className="empty-card">No hay registros con los filtros aplicados</div>
            ) : (
              filteredVisitas.map(v => {
                const estado = ESTADO_LABELS[v.estado] || { label: v.estado, color: '#6b7280', bg: '#f3f4f6' };
                return (
                  <div key={v.id} className="mobile-card" style={{ borderLeftColor: v.area_color || 'var(--color-primary)' }}>
                    <div className="mobile-card-header">
                      <div className="mobile-card-title">
                        <span className="mobile-pdv">🏢 {v.pdv_nombre}</span>
                        <span className="mobile-ciudad">📍 {v.ciudad_nombre} • #{v.id}</span>
                      </div>
                      <span className="estado-badge" style={{ background: estado.bg, color: estado.color }}>
                        {estado.label}
                      </span>
                    </div>

                    <div className="mobile-card-grid">
                      <div className="mobile-metric">
                        <span className="m-label">🗂️ Área</span>
                        <span className="m-val area-badge-small" style={{ color: v.area_color, background: v.area_color + '18', borderColor: v.area_color + '44' }}>
                          {v.area_nombre}
                        </span>
                      </div>
                      <div className="mobile-metric">
                        <span className="m-label">📋 Visita / Cat.</span>
                        <span className="m-val">{v.categoria_nombre || v.tipo_visita_nombre || '—'}</span>
                      </div>
                      <div className="mobile-metric">
                        <span className="m-label">👤 Responsable</span>
                        <span className="m-val">{v.responsable_nombre || '—'}</span>
                      </div>
                      <div className="mobile-metric">
                        <span className="m-label">🕒 Horario / Fecha</span>
                        <span className="m-val">{v.fecha} {v.hora_inicio ? `(${v.hora_inicio})` : ''}</span>
                      </div>
                    </div>

                    <div className="mobile-card-footer">
                      <button
                        className="btn-ver-detalle-mobile"
                        onClick={() => handleVerOperacion(v)}
                      >
                        👁️ Ver Detalle Completo
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Category breakdown if available */}
          {data?.resumenPorCategoria?.length > 0 && (
            <div className="cat-breakdown">
              <h3 className="cat-breakdown-title">📋 Visitas por Categoría (Top 20)</h3>
              <div className="cat-list">
                {data.resumenPorCategoria.slice(0, 20).map((cat, idx) => {
                  const pct = cat.total > 0 ? Math.round((cat.completadas / cat.total) * 100) : 0;
                  return (
                    <div key={idx} className="cat-item">
                      <div className="cat-item-header">
                        <div className="cat-item-name">
                          {cat.padre_nombre && <span className="cat-item-padre">{cat.padre_nombre} › </span>}
                          <span>{cat.categoria_nombre}</span>
                        </div>
                        <div className="cat-item-stats">
                          <span className="cat-total">{cat.total}</span>
                          <span className="cat-sep">/</span>
                          <span className="cat-completadas">{cat.completadas} completadas</span>
                        </div>
                      </div>
                      <div className="cat-bar-bg">
                        <div className="cat-bar-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== Modal Detalle Operación / Visita ===== */}
      {selectedVisitaDetalle && (
        <div className="det-modal-overlay" onClick={() => setSelectedVisitaDetalle(null)}>
          <div className="det-modal-container" onClick={e => e.stopPropagation()}>
            <div className="det-modal-header">
              <div>
                <div className="det-header-title">
                  <span>📋 Operación / Visita #{selectedVisitaDetalle.id}</span>
                  <span className="estado-badge" style={{ 
                    background: ESTADO_LABELS[selectedVisitaDetalle.estado]?.bg || '#f3f4f6', 
                    color: ESTADO_LABELS[selectedVisitaDetalle.estado]?.color || '#6b7280',
                    marginLeft: '10px'
                  }}>
                    {ESTADO_LABELS[selectedVisitaDetalle.estado]?.label || selectedVisitaDetalle.estado}
                  </span>
                </div>
                <p className="det-header-sub">
                  🏢 {selectedVisitaDetalle.pdv_nombre} ({selectedVisitaDetalle.ciudad_nombre}) • 📅 {selectedVisitaDetalle.fecha}
                </p>
              </div>
              <button className="det-modal-close" onClick={() => setSelectedVisitaDetalle(null)}>×</button>
            </div>

            <div className="det-modal-tabs">
              <button 
                className={`det-tab-btn ${detalleTab === 'general' ? 'active' : ''}`}
                onClick={() => setDetalleTab('general')}
              >
                📌 Resumen & Checklist
              </button>
              <button 
                className={`det-tab-btn ${detalleTab === 'hallazgos' ? 'active' : ''}`}
                onClick={() => setDetalleTab('hallazgos')}
              >
                🛠️ Repuestos & Hallazgos
              </button>
              <button 
                className={`det-tab-btn ${detalleTab === 'evidencias' ? 'active' : ''}`}
                onClick={() => setDetalleTab('evidencias')}
              >
                🖼️ Evidencias ({evidenciasDetalle.length})
              </button>
              <button 
                className={`det-tab-btn ${detalleTab === 'firmas' ? 'active' : ''}`}
                onClick={() => setDetalleTab('firmas')}
              >
                ✍️ Firmas y Trazabilidad
              </button>
            </div>

            <div className="det-modal-body">
              {detalleTab === 'general' && (
                <div className="det-tab-content">
                  <div className="info-grid-2">
                    <div className="info-box">
                      <span className="info-label">🗂️ Área Operativa</span>
                      <span className="info-val" style={{ color: selectedVisitaDetalle.area_color || 'var(--color-primary)' }}>
                        {selectedVisitaDetalle.area_nombre}
                      </span>
                    </div>
                    <div className="info-box">
                      <span className="info-label">🎯 Tipo de Visita</span>
                      <span className="info-val">{selectedVisitaDetalle.tipo_visita_nombre || '—'}</span>
                    </div>
                    <div className="info-box">
                      <span className="info-label">📋 Categoría</span>
                      <span className="info-val">
                        {selectedVisitaDetalle.categoria_padre_nombre ? `${selectedVisitaDetalle.categoria_padre_nombre} › ` : ''}
                        {selectedVisitaDetalle.categoria_nombre || '—'}
                      </span>
                    </div>
                    <div className="info-box">
                      <span className="info-label">⏰ Horario Ejecución</span>
                      <span className="info-val">
                        {selectedVisitaDetalle.hora_inicio && selectedVisitaDetalle.hora_fin 
                          ? `${selectedVisitaDetalle.hora_inicio} – ${selectedVisitaDetalle.hora_fin}` 
                          : selectedVisitaDetalle.hora_inicio || '—'}
                      </span>
                    </div>
                    <div className="info-box">
                      <span className="info-label">👤 Responsable / Auxiliar</span>
                      <span className="info-val">{selectedVisitaDetalle.responsable_nombre || '—'}</span>
                    </div>
                    <div className="info-box">
                      <span className="info-label">✍️ Registrado por</span>
                      <span className="info-val">{selectedVisitaDetalle.creador_nombre || '—'}</span>
                    </div>
                  </div>

                  <h4 className="det-section-title">📝 Datos del Formulario / Checklist</h4>
                  {(() => {
                    let answers = {};
                    try {
                      answers = typeof selectedVisitaDetalle.datos_formulario === 'string'
                        ? JSON.parse(selectedVisitaDetalle.datos_formulario || '{}')
                        : (selectedVisitaDetalle.datos_formulario || {});
                    } catch (e) {}

                    const entries = Object.entries(answers).filter(([k, v]) => v !== '' && v !== null && !k.endsWith('__obs') && !k.endsWith('_obs'));
                    if (entries.length === 0) {
                      return <p className="det-empty">No hay respuestas de checklist o formulario registradas en esta operación.</p>;
                    }

                    return (
                      <div className="checklist-results-grid">
                        {entries.map(([key, val], idx) => {
                          const obsKey1 = `${key}__obs`;
                          const obsKey2 = `${key}_obs`;
                          const obs = answers[obsKey1] || answers[obsKey2] || '';
                          const isYes = String(val).toUpperCase() === 'SI' || val === true;
                          const isNo = String(val).toUpperCase() === 'NO' || val === false;
                          const isNa = String(val).toUpperCase() === 'NA' || String(val).toUpperCase() === 'N/A';
                          
                          return (
                            <div key={idx} className={`chk-item-card ${isYes ? 'chk-yes' : isNo ? 'chk-no' : isNa ? 'chk-na' : ''}`}>
                              <div className="chk-top">
                                <span className="chk-label">{key.replace(/__/g, ' - ')}</span>
                                <span className="chk-badge">
                                  {isYes ? 'SÍ ✓' : isNo ? 'NO ✕' : isNa ? 'N/A' : String(val)}
                                </span>
                              </div>
                              {obs && (
                                <div className="chk-obs">
                                  <strong>Observación:</strong> {obs}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {detalleTab === 'hallazgos' && (
                <div className="det-tab-content">
                  {selectedVisitaDetalle.equipo_id && (
                    <div className="equipo-box">
                      <h4 className="det-section-title" style={{ marginTop: 0 }}>⚙️ Equipo Intervenido</h4>
                      <p>
                        <strong>ID / Código:</strong> {selectedVisitaDetalle.equipo_id} <br />
                        {selectedVisitaDetalle.equipo_nombre && (
                          <>
                            <strong>Nombre:</strong> {selectedVisitaDetalle.equipo_nombre} <br />
                            <strong>Marca / Modelo:</strong> {selectedVisitaDetalle.equipo_marca || '—'} / {selectedVisitaDetalle.equipo_modelo || '—'}
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <h4 className="det-section-title">💬 Observaciones Generales</h4>
                  <div className="text-box-detail">
                    {selectedVisitaDetalle.observaciones || <span className="text-muted">Sin observaciones generales</span>}
                  </div>

                  <h4 className="det-section-title">🔍 Hallazgos / Diagnóstico</h4>
                  <div className="text-box-detail">
                    {selectedVisitaDetalle.hallazgos || <span className="text-muted">Sin hallazgos registrados</span>}
                  </div>

                  <h4 className="det-section-title">🛠️ Acciones Correctivas / Trabajo Realizado</h4>
                  <div className="text-box-detail">
                    {selectedVisitaDetalle.acciones_correctivas || <span className="text-muted">Sin acciones correctivas registradas</span>}
                  </div>

                  <h4 className="det-section-title">🔩 Repuestos / Materiales Utilizados</h4>
                  <div className="text-box-detail">
                    {selectedVisitaDetalle.repuestos || <span className="text-muted">Sin repuestos o materiales reportados</span>}
                  </div>
                </div>
              )}

              {detalleTab === 'evidencias' && (
                <div className="det-tab-content">
                  {loadingDetalle ? (
                    <div className="loading-wrap"><div className="spinner"></div><p>Cargando evidencias fotográficas...</p></div>
                  ) : evidenciasDetalle.length === 0 ? (
                    <p className="det-empty">No se adjuntaron evidencias fotográficas en esta operación.</p>
                  ) : (
                    <div className="evidencias-gallery">
                      {evidenciasDetalle.map((ev, idx) => (
                        <div key={idx} className="evidencia-card">
                          <div className="evidencia-img-wrap">
                            <a href={ev.ruta_archivo} target="_blank" rel="noopener noreferrer">
                              <img src={ev.ruta_archivo} alt={ev.nombre_archivo || 'Evidencia'} />
                            </a>
                          </div>
                          <div className="evidencia-info">
                            <span className="evidencia-tag">{ev.etiqueta?.toUpperCase() || 'FOTO'}</span>
                            <span className="evidencia-name">{ev.nombre_archivo || 'Archivo adjunto'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detalleTab === 'firmas' && (
                <div className="det-tab-content">
                  <div className="firmas-grid">
                    <div className="firma-box">
                      <h5>👨‍🔧 Firma Digital del Auxiliar / Técnico</h5>
                      {selectedVisitaDetalle.firma_auxiliar ? (
                        <div className="firma-img-wrap">
                          <img src={selectedVisitaDetalle.firma_auxiliar} alt="Firma Auxiliar" />
                        </div>
                      ) : (
                        <p className="det-empty">Sin firma de auxiliar</p>
                      )}
                    </div>

                    <div className="firma-box">
                      <h5>🏬 Funcionario del Punto de Venta (PDV)</h5>
                      <p className="solicitante-info">
                        <strong>Nombre:</strong> {selectedVisitaDetalle.solicitante_nombre || '—'} <br />
                      </p>
                      {selectedVisitaDetalle.firma_pdv ? (
                        <div className="firma-img-wrap">
                          <img src={selectedVisitaDetalle.firma_pdv} alt="Firma PDV" />
                        </div>
                      ) : (
                        <p className="det-empty">Sin firma de PDV</p>
                      )}
                    </div>

                    <div className="firma-box">
                      <h5>👔 Aprobación y Trazabilidad del Jefe</h5>
                      <p className="solicitante-info">
                        <strong>Comentarios:</strong> {selectedVisitaDetalle.comentarios_jefe || '—'} <br />
                      </p>
                      {selectedVisitaDetalle.firma_jefe ? (
                        <div className="firma-img-wrap">
                          <img src={selectedVisitaDetalle.firma_jefe} alt="Firma Jefe" />
                        </div>
                      ) : (
                        <p className="det-empty">Sin firma digital del jefe</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="det-modal-footer">
              <button 
                className="btn-ir-visita"
                onClick={() => handleIrAVisita(selectedVisitaDetalle.id)}
              >
                🔗 Ir a Gestión en Módulo Operativo
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-print"
                  onClick={() => window.print()}
                >
                  🖨️ Imprimir Ficha
                </button>
                <button 
                  className="btn-close-modal"
                  onClick={() => setSelectedVisitaDetalle(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .rep-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          padding-bottom: 40px;
        }

        /* ===== Header ===== */
        .rep-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .rep-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          margin: 0;
        }

        .rep-subtitle {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 4px 0 0;
        }

        .btn-export {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          border: none;
          border-radius: var(--radius-lg);
          padding: 10px 20px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-export:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16,185,129,0.35);
        }

        .btn-export:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ===== KPI Grid ===== */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-md);
        }

        @media (min-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1200px) {
          .kpi-grid { grid-template-columns: repeat(7, 1fr); }
        }

        .kpi-area-card {
          background: #fff;
          border: 2px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          padding: var(--spacing-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .kpi-area-card:hover, .kpi-area-card.kpi-active {
          border-color: var(--color-primary);
          box-shadow: 0 4px 16px rgba(107,58,42,0.12);
          transform: translateY(-2px);
        }

        .kpi-area-top {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .kpi-area-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .kpi-area-name {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.3px;
          line-height: 1.2;
        }

        .kpi-area-num {
          font-size: 2rem;
          font-weight: 800;
          color: var(--color-text-primary);
          line-height: 1;
        }

        .kpi-area-label {
          font-size: 0.68rem;
          color: var(--color-text-muted);
          margin-top: 2px;
          margin-bottom: 8px;
        }

        .kpi-bar-bg {
          height: 4px;
          background: var(--color-bg-secondary);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .kpi-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.6s ease;
        }

        .kpi-area-pct {
          font-size: 0.65rem;
          color: var(--color-text-muted);
        }

        /* ===== Filters Panel ===== */
        .filters-panel {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }

        .filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 160px;
          flex: 1;
        }

        .filter-group label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .filter-group select,
        .filter-group input {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 8px 10px;
          font-size: 0.82rem;
          color: var(--color-text-primary);
          background: var(--color-bg-secondary);
          transition: border-color 0.2s;
        }

        .filter-group select:focus,
        .filter-group input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .filters-actions-row {
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
          flex-wrap: wrap;
        }

        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 240px;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.85rem;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 8px 10px 8px 32px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          color: var(--color-text-primary);
          background: var(--color-bg-secondary);
          box-sizing: border-box;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .btn-apply {
          background: var(--color-primary);
          color: #fff;
          border: none;
          border-radius: var(--radius-md);
          padding: 9px 20px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-apply:hover { background: var(--color-primary-dark); }

        .btn-clear {
          background: transparent;
          color: var(--color-text-muted);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 9px 16px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-clear:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        /* ===== Results ===== */
        .loading-wrap, .error-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--color-text-muted);
          gap: 12px;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 4px solid var(--color-bg-secondary);
          border-top: 4px solid var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .results-count {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text-muted);
          background: var(--color-bg-secondary);
          padding: 4px 12px;
          border-radius: var(--radius-full);
        }

        /* ===== Table ===== */
        .table-wrapper {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          overflow: auto;
          box-shadow: var(--shadow-sm);
        }

        .rep-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }

        .rep-table thead tr {
          background: var(--color-bg-secondary);
          border-bottom: 2px solid var(--color-border-light);
        }

        .rep-table th {
          padding: 10px 14px;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .rep-row {
          border-bottom: 1px solid var(--color-border-light);
          transition: background 0.15s;
        }

        .rep-row:hover { background: #fdf8f3; }

        .rep-table td {
          padding: 10px 14px;
          vertical-align: middle;
          color: var(--color-text-primary);
        }

        .cell-id {
          font-weight: 700;
          color: var(--color-text-muted);
          font-size: 0.72rem;
        }

        .cell-fecha {
          white-space: nowrap;
          font-weight: 600;
        }

        .cell-pdv {
          font-weight: 700;
          color: var(--color-primary-dark);
        }

        .cell-ciudad {
          font-size: 0.72rem;
          color: var(--color-text-muted);
          margin-top: 2px;
        }

        .area-badge {
          display: inline-flex;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 700;
          border: 1px solid;
          white-space: nowrap;
        }

        .cell-categoria {
          font-size: 0.78rem;
          max-width: 200px;
        }

        .cat-padre {
          color: var(--color-text-muted);
          font-size: 0.72rem;
          display: block;
          margin-bottom: 1px;
        }

        .cat-nombre {
          color: var(--color-text-primary);
          font-weight: 600;
        }

        .cell-tipo {
          color: var(--color-text-secondary);
          font-size: 0.78rem;
          max-width: 160px;
        }

        .cell-resp {
          color: var(--color-text-secondary);
          font-size: 0.78rem;
          white-space: nowrap;
        }

        .estado-badge {
          display: inline-flex;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .cell-horario {
          white-space: nowrap;
          color: var(--color-text-muted);
          font-size: 0.75rem;
        }

        .empty-row {
          text-align: center;
          padding: 40px !important;
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }

        /* ===== Category Breakdown ===== */
        .cat-breakdown {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }

        .cat-breakdown-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          margin: 0 0 var(--spacing-lg);
        }

        .cat-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cat-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .cat-item-name {
          font-size: 0.8rem;
          color: var(--color-text-primary);
          flex: 1;
        }

        .cat-item-padre {
          color: var(--color-text-muted);
          font-size: 0.72rem;
        }

        .cat-item-stats {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          white-space: nowrap;
        }

        .cat-total {
          font-weight: 800;
          color: var(--color-primary-dark);
        }

        .cat-sep { color: var(--color-border); }

        .cat-completadas {
          color: #10b981;
          font-weight: 600;
        }

        .cat-bar-bg {
          height: 5px;
          background: var(--color-bg-secondary);
          border-radius: 3px;
          overflow: hidden;
        }

        .cat-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), #8B6914);
          border-radius: 3px;
          transition: width 0.6s ease;
        }

        /* ===== Botón Ver Operación ===== */
        .btn-ver-operacion {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          border: none;
          border-radius: var(--radius-md);
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(107,58,42,0.2);
        }

        .btn-ver-operacion:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(107,58,42,0.35);
          background: var(--color-primary-dark);
        }

        /* ===== Modal Detalle ===== */
        .det-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(44, 24, 16, 0.65);
          backdrop-filter: blur(6px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
        }

        .det-modal-container {
          background: #fff;
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-xl);
          animation: slideUpModal 0.25s ease-out;
          border: 1px solid var(--color-border-light);
        }

        @keyframes slideUpModal {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .det-modal-header {
          background: var(--color-bg-secondary);
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--color-border-light);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .det-header-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--color-primary-dark);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }

        .det-header-sub {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 4px 0 0;
        }

        .det-modal-close {
          background: none;
          border: none;
          font-size: 1.8rem;
          color: var(--color-text-muted);
          cursor: pointer;
          line-height: 1;
        }

        .det-modal-tabs {
          display: flex;
          background: #faf6f0;
          border-bottom: 1px solid var(--color-border-light);
          padding: 0 var(--spacing-lg);
          gap: 8px;
          overflow-x: auto;
        }

        .det-tab-btn {
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          padding: 12px 14px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .det-tab-btn:hover { color: var(--color-primary); }

        .det-tab-btn.active {
          color: var(--color-primary-dark);
          border-bottom-color: var(--color-primary);
        }

        .det-modal-body {
          padding: var(--spacing-lg);
          overflow-y: auto;
          flex: 1;
          background: var(--color-bg-primary);
        }

        .det-tab-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .info-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 600px) {
          .info-grid-2 { grid-template-columns: repeat(3, 1fr); }
        }

        .info-box {
          background: #fff;
          border: 1px solid var(--color-border-light);
          padding: 10px 12px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }

        .info-val {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .det-section-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--color-primary-dark);
          margin: 10px 0 6px;
          border-bottom: 2px solid var(--color-border-light);
          padding-bottom: 6px;
        }

        .checklist-results-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chk-item-card {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-left: 4px solid var(--color-border);
          padding: 10px 14px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .chk-yes { border-left-color: #10b981; background: #f0fdf4; }
        .chk-no { border-left-color: #ef4444; background: #fef2f2; }
        .chk-na { border-left-color: #6b7280; background: #f9fafb; }

        .chk-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .chk-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .chk-badge {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          background: #fff;
          border: 1px solid rgba(0,0,0,0.1);
        }

        .chk-obs {
          font-size: 0.78rem;
          color: var(--color-text-secondary);
          background: rgba(255,255,255,0.7);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
        }

        .text-box-detail {
          background: #fff;
          border: 1px solid var(--color-border-light);
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          color: var(--color-text-primary);
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .equipo-box {
          background: #fef7e0;
          border: 1px solid #fde08a;
          padding: 14px;
          border-radius: var(--radius-md);
          color: #854d0e;
        }

        .evidencias-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }

        .evidencia-card {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-xs);
        }

        .evidencia-img-wrap {
          height: 140px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .evidencia-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }

        .evidencia-img-wrap img:hover { transform: scale(1.05); }

        .evidencia-info {
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .evidencia-tag {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--color-primary);
        }

        .evidencia-name {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .firmas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .firma-box {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .firma-box h5 {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--color-primary-dark);
          margin: 0;
          border-bottom: 1px solid var(--color-border-light);
          padding-bottom: 6px;
        }

        .firma-img-wrap {
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed var(--color-border);
          background: #faf6f0;
          border-radius: var(--radius-sm);
          padding: 4px;
        }

        .firma-img-wrap img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
        }

        .solicitante-info {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .det-empty {
          color: var(--color-text-muted);
          font-style: italic;
          font-size: 0.85rem;
        }

        .det-modal-footer {
          background: var(--color-bg-secondary);
          padding: var(--spacing-md) var(--spacing-lg);
          border-top: 1px solid var(--color-border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .btn-ir-visita {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          padding: 9px 18px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-ir-visita:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59,130,246,0.35);
        }

        .btn-print {
          background: #fff;
          color: var(--color-primary-dark);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 8px 16px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-print:hover {
          background: #fdf8f3;
          border-color: var(--color-primary);
        }

        .btn-close-modal {
          background: #6b7280;
          color: white;
          border: none;
          border-radius: var(--radius-md);
          padding: 8px 18px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-close-modal:hover { background: #4b5563; }

        @media print {
          body * { visibility: hidden; }
          .det-modal-container, .det-modal-container * { visibility: visible; }
          .det-modal-overlay {
            position: absolute;
            left: 0;
            top: 0;
            background: none;
            padding: 0;
          }
          .det-modal-container {
            width: 100%;
            max-width: none;
            border: none;
            box-shadow: none;
          }
          .det-modal-footer, .det-modal-close, .det-modal-tabs { display: none !important; }
        }

        /* ===== Responsive Mobile Cards (PWA / Teléfono) ===== */
        .rep-cards-mobile {
          display: none;
          flex-direction: column;
          gap: 14px;
        }

        .empty-card {
          background: #fff;
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-lg);
          padding: 30px;
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }

        .mobile-card {
          background: #fff;
          border: 1px solid var(--color-border-light);
          border-left: 5px solid var(--color-primary);
          border-radius: var(--radius-lg);
          padding: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s;
        }

        .mobile-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }

        .mobile-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--color-border-light);
          padding-bottom: 10px;
          gap: 8px;
        }

        .mobile-card-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .mobile-pdv {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--color-primary-dark);
        }

        .mobile-ciudad {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 600;
        }

        .mobile-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          background: var(--color-bg-secondary);
          padding: 10px;
          border-radius: var(--radius-md);
        }

        .mobile-metric {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .m-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }

        .m-val {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .area-badge-small {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 800;
          border: 1px solid;
          width: fit-content;
        }

        .mobile-card-footer {
          display: flex;
          justify-content: stretch;
          padding-top: 4px;
        }

        .btn-ver-detalle-mobile {
          width: 100%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          border: none;
          border-radius: var(--radius-md);
          padding: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          box-shadow: 0 2px 6px rgba(107,58,42,0.2);
        }

        .btn-ver-detalle-mobile:active {
          transform: scale(0.98);
        }

        @media (max-width: 768px) {
          /* En teléfono ocultamos tabla y mostramos tarjetas */
          .table-wrapper { display: none !important; }
          .rep-cards-mobile { display: flex !important; }

          /* Hacemos que los KPI sean un carrusel horizontal deslizable */
          .kpi-grid {
            display: flex !important;
            overflow-x: auto;
            padding-bottom: 10px;
            scroll-snap-type: x mandatory;
            gap: 12px;
            -webkit-overflow-scrolling: touch;
          }

          .kpi-area-card {
            min-width: 140px;
            flex-shrink: 0;
            scroll-snap-align: start;
            padding: 12px;
          }

          .kpi-area-num { font-size: 1.6rem; }
          .kpi-area-name { font-size: 0.75rem; }

          /* Filtros en móvil más apilados y cómodos */
          .filters-row {
            flex-direction: column;
            gap: 10px;
          }

          .filter-group { min-width: 100%; }
          .filters-actions-row { flex-direction: column; align-items: stretch; }
          .btn-apply, .btn-clear { width: 100%; text-align: center; }
        }
      `}</style>
    </div>
  );
}
