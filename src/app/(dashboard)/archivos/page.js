'use client';

import { useState, useEffect } from 'react';

export default function RepositorioArchivosPage() {
  const [archivos, setArchivos] = useState([]);
  const [stats, setStats] = useState({ todos: 0, excel: 0, foto: 0, pdf: 0, documento: 0, otro: 0 });
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [categoria, setCategoria] = useState('general');
  const [referenciaId, setReferenciaId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Previsualizador modal
  const [previewFile, setPreviewFile] = useState(null);

  // Mobile: show more filters
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const fetchArchivos = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filtroTipo !== 'todos') queryParams.append('tipo', filtroTipo);
      if (filtroCategoria !== 'todos') queryParams.append('categoria', filtroCategoria);
      if (busqueda) queryParams.append('busqueda', busqueda);

      const res = await fetch(`/api/archivos?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setArchivos(data.archivos || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error al cargar archivos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivos();
  }, [filtroTipo, filtroCategoria]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchArchivos();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Por favor selecciona un archivo para subir.');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoria', categoria);
    if (referenciaId) formData.append('referencia_id', referenciaId);
    if (observaciones) formData.append('observaciones', observaciones);

    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`✅ Archivo guardado y organizado en: /archivos/${data.subcarpeta}/`);
        setFile(null);
        setObservaciones('');
        setReferenciaId('');
        fetchArchivos();
        setTimeout(() => {
          setShowModal(false);
          setSuccessMsg('');
        }, 1800);
      } else {
        setErrorMsg(data.error || 'Error al subir archivo');
      }
    } catch (err) {
      setErrorMsg('Error de conexión al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar el archivo "${nombre}"? Se borrará de la base de datos y de la carpeta del proyecto.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/archivos?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchArchivos();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar el archivo');
      }
    } catch (err) {
      alert('Error de red al intentar eliminar el archivo');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const getTipoInfo = (tipo, extension) => {
    switch (tipo) {
      case 'excel':
        return { icon: '📊', bg: '#E8F5E9', color: '#2E7D32', label: 'EXCEL', badgeBg: '#C8E6C9' };
      case 'foto':
        return { icon: '📷', bg: '#FFF3E0', color: '#E65100', label: 'FOTO', badgeBg: '#FFE0B2' };
      case 'pdf':
        return { icon: '📄', bg: '#FFEBEE', color: '#C62828', label: 'PDF', badgeBg: '#FFCDD2' };
      case 'documento':
        return { icon: '📁', bg: '#E3F2FD', color: '#1565C0', label: 'DOC', badgeBg: '#BBDEFB' };
      default:
        return { icon: '📎', bg: '#F5F5F5', color: '#616161', label: extension?.toUpperCase() || 'FILE', badgeBg: '#E0E0E0' };
    }
  };

  const getCategoriaLabel = (cat) => {
    const mapas = {
      'evidencia_visita': 'evidencia_mantenimiento',
      'reporte_excel': 'reporte_visitas',
      'manual_equipo': 'manual_equipo',
      'documento_pdv': 'documento_pdv',
      'general': 'general',
      'evidencia_mantenimiento': 'evidencia_mantenimiento',
      'reporte_pdf': 'reporte_pdf'
    };
    return mapas[cat] || cat;
  };

  const getCategoriaDisplayLabel = (cat) => {
    const mapas = {
      'evidencia_visita': '🔍 Evidencia Visita',
      'reporte_excel': '📊 Reporte Excel',
      'manual_equipo': '🛠️ Manual Equipo',
      'documento_pdv': '📍 Documento PDV',
      'general': '📂 General',
      'evidencia_mantenimiento': '🔧 Evidencia Mantenimiento',
      'reporte_pdf': '📄 Reporte PDF'
    };
    return mapas[cat] || cat;
  };

  const getUserInitials = (name) => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0]?.toUpperCase() || 'U';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Simulated percentage changes (decoration) based on stats
  const getPercentChange = (type) => {
    const map = { todos: { val: 12, up: true }, excel: { val: 8, up: true }, foto: { val: 15, up: true }, pdf: { val: 0, up: null }, documento: { val: 33, up: true } };
    return map[type] || { val: 0, up: null };
  };

  const isImageFile = (arch) => {
    if (arch.tipo_archivo === 'foto') return true;
    const ext = (arch.extension || '').toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext);
  };

  return (
    <div className="repo-page animate-fade-in">

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <div className="repo-hero">
        <div className="repo-hero-content">
          <h1 className="repo-hero-title">Repositorio Central de Archivos & Evidencias</h1>
          <p className="repo-hero-sub">
            Almacenamiento estructurado en carpetas del proyecto / <code>/public/archivos/</code> con trazabilidad y registro en base de datos SQLite.
          </p>
        </div>
        <button className="repo-btn-upload" onClick={() => setShowModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Subir Nuevo Archivo</span>
        </button>
      </div>

      {/* ═══════════════════ STATS CARDS ═══════════════════ */}
      <div className="repo-stats-row">
        {[
          { key: 'todos', label: 'Total de Archivos', icon: '🗂️', iconBg: '#F5F0E8', iconColor: '#5D4037' },
          { key: 'excel', label: 'Excel / Hojas', icon: '📊', iconBg: '#E8F5E9', iconColor: '#2E7D32' },
          { key: 'foto', label: 'Fotos / Evidencias', icon: '📷', iconBg: '#FFF3E0', iconColor: '#E65100' },
          { key: 'pdf', label: 'PDFs / Reportes', icon: '📄', iconBg: '#FFEBEE', iconColor: '#C62828' },
          { key: 'documento', label: 'Documentos', icon: '📁', iconBg: '#E3F2FD', iconColor: '#1565C0' },
        ].map(s => {
          const pct = getPercentChange(s.key);
          const isActive = filtroTipo === s.key;
          return (
            <div
              key={s.key}
              className={`repo-stat-card ${isActive ? 'active' : ''}`}
              onClick={() => setFiltroTipo(s.key === 'todos' ? 'todos' : s.key)}
            >
              <div className="repo-stat-icon" style={{ backgroundColor: s.iconBg }}>
                <span>{s.icon}</span>
              </div>
              <div className="repo-stat-body">
                <span className="repo-stat-label">{s.label}</span>
                <span className="repo-stat-number">{stats[s.key] || 0}</span>
                {pct.up !== null && (
                  <span className={`repo-stat-pct ${pct.up ? 'up' : 'down'}`}>
                    {pct.up ? '↑' : '↓'} {pct.val}%
                  </span>
                )}
                {pct.up === null && (
                  <span className="repo-stat-pct neutral">= {pct.val}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════ FILTERS + SEARCH ═══════════════════ */}
      <div className="repo-toolbar">
        <div className="repo-filters-row">
          <div className="repo-filter-pills">
            {[
              { key: 'todos', label: 'Todas las Categorías', icon: '📋' },
              { key: 'evidencia_visita', label: 'Evidencias de Auditoría', icon: '🔍' },
              { key: 'reporte_excel', label: 'Reportes Excel', icon: '📊' },
              { key: 'manual_equipo', label: 'Manuales y Fichas', icon: '📘' },
              { key: 'documento_pdv', label: 'Documentos PDF', icon: '📄' },
            ].map(f => (
              <button
                key={f.key}
                className={`repo-pill ${filtroCategoria === f.key ? 'active' : ''}`}
                onClick={() => setFiltroCategoria(f.key)}
              >
                <span className="pill-icon">{f.icon}</span>
                <span className="pill-label">{f.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="repo-search-box">
            <svg className="repo-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Buscar por nombre, usuario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="repo-search-input"
            />
            {busqueda && (
              <button type="button" className="repo-search-clear" onClick={() => { setBusqueda(''); fetchArchivos(); }}>✕</button>
            )}
            <button type="submit" className="repo-search-submit">Buscar</button>
          </form>
        </div>
      </div>

      {/* ═══════════════════ FILES GRID ═══════════════════ */}
      <div className="repo-files-section">
        {loading ? (
          <div className="repo-loading">
            <div className="spinner"></div>
            <p>Consultando base de datos y sistema de archivos...</p>
          </div>
        ) : archivos.length === 0 ? (
          <div className="repo-empty">
            <div className="repo-empty-icon">📂</div>
            <h3>No se encontraron archivos</h3>
            <p>No hay documentos o evidencias que coincidan con los filtros aplicados en este momento.</p>
            <button className="repo-btn-upload-empty" onClick={() => setShowModal(true)}>
              Subir el primer archivo
            </button>
          </div>
        ) : (
          <>
            {/* Desktop grid */}
            <div className="repo-grid-desktop">
              {archivos.map((arch) => {
                const tipoInfo = getTipoInfo(arch.tipo_archivo, arch.extension);
                const showRealImage = isImageFile(arch);
                return (
                  <div key={arch.id} className="repo-file-card">
                    {/* Thumbnail */}
                    <div className="rfc-thumb" style={{ backgroundColor: tipoInfo.bg }}>
                      {showRealImage ? (
                        <img
                          src={arch.ruta_archivo}
                          alt={arch.nombre_original}
                          className="rfc-thumb-img"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className="rfc-thumb-fallback" style={{ display: showRealImage ? 'none' : 'flex', color: tipoInfo.color }}>
                        <span className="rfc-thumb-emoji">{tipoInfo.icon}</span>
                      </div>
                      <span className="rfc-type-badge" style={{ backgroundColor: tipoInfo.badgeBg, color: tipoInfo.color }}>
                        {tipoInfo.label}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="rfc-body">
                      <h4 className="rfc-name" title={arch.nombre_original}>{arch.nombre_original}</h4>
                      <div className="rfc-meta-row">
                        <span className="rfc-cat-tag">{getCategoriaLabel(arch.categoria)}</span>
                        <span className="rfc-size">{formatSize(arch.tamano_bytes)}</span>
                      </div>
                      {arch.observaciones && (
                        <p className="rfc-desc">{arch.observaciones}</p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="rfc-footer">
                      <div className="rfc-user">
                        <div className="rfc-avatar">{getUserInitials(arch.usuario_nombre)}</div>
                        <div className="rfc-user-info">
                          <span className="rfc-user-name">{arch.usuario_nombre || 'Sistema'}</span>
                          <span className="rfc-user-date">{formatDate(arch.created_at)}</span>
                        </div>
                      </div>
                      <div className="rfc-actions">
                        <a
                          href={`${arch.ruta_archivo}${arch.ruta_archivo?.includes('?') ? '&' : '?'}download=1`}
                          download={arch.nombre_original}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rfc-act-btn"
                          title="Descargar"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </a>
                        {(arch.tipo_archivo === 'foto' || arch.tipo_archivo === 'pdf') && (
                          <button className="rfc-act-btn" onClick={() => setPreviewFile(arch)} title="Previsualizar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                        )}
                        <button className="rfc-act-btn rfc-act-delete" onClick={() => handleDelete(arch.id, arch.nombre_original)} title="Eliminar">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile list */}
            <div className="repo-list-mobile">
              {archivos.map((arch) => {
                const tipoInfo = getTipoInfo(arch.tipo_archivo, arch.extension);
                const showRealImage = isImageFile(arch);
                return (
                  <div key={arch.id} className="repo-mobile-item">
                    <div className="rmi-thumb" style={{ backgroundColor: tipoInfo.bg }}>
                      {showRealImage ? (
                        <img src={arch.ruta_archivo} alt="" className="rmi-thumb-img" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                      ) : null}
                      <div className="rmi-thumb-fallback" style={{ display: showRealImage ? 'none' : 'flex', color: tipoInfo.color }}>
                        <span>{tipoInfo.icon}</span>
                      </div>
                    </div>
                    <div className="rmi-info">
                      <h4 className="rmi-name">{arch.nombre_original}</h4>
                      <div className="rmi-meta">
                        <span className="rmi-cat">{getCategoriaLabel(arch.categoria)}</span>
                        <span className="rmi-size">{formatSize(arch.tamano_bytes)}</span>
                      </div>
                      <div className="rmi-user-row">
                        <div className="rmi-avatar">{getUserInitials(arch.usuario_nombre)}</div>
                        <span className="rmi-user-name">{arch.usuario_nombre || 'Sistema'}</span>
                        <span className="rmi-date">{formatDate(arch.created_at)}</span>
                      </div>
                    </div>
                    <span className="rmi-type-badge" style={{ backgroundColor: tipoInfo.badgeBg, color: tipoInfo.color }}>
                      {tipoInfo.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════ UPLOAD MODAL ═══════════════════ */}
      {showModal && (
        <div className="repo-modal-overlay" onClick={() => !uploading && setShowModal(false)}>
          <div className="repo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="repo-modal-header">
              <h3>➕ Subir Archivo al Repositorio</h3>
              <button className="repo-modal-close" onClick={() => !uploading && setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleUpload} className="repo-modal-body">
              <div className="repo-drop-zone">
                <input
                  type="file"
                  id="fileInput"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="repo-file-hidden"
                  disabled={uploading}
                />
                <label htmlFor="fileInput" className="repo-drop-label">
                  <span className="repo-drop-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </span>
                  <span className="repo-drop-title">
                    {file ? file.name : 'Haz clic para seleccionar un archivo'}
                  </span>
                  <span className="repo-drop-sub">
                    {file ? `Tamaño: ${formatSize(file.size)}` : 'Excel, Foto, PDF, Word — El sistema organizará automáticamente'}
                  </span>
                </label>
              </div>

              <div className="repo-form-group">
                <label>Categoría / Tipo de Registro:</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} disabled={uploading}>
                  <option value="general">📂 Documento General</option>
                  <option value="reporte_excel">📊 Reporte / Inventario Excel</option>
                  <option value="evidencia_visita">🔍 Evidencia / Auditoría</option>
                  <option value="manual_equipo">🛠️ Manual Técnico de Equipo</option>
                  <option value="documento_pdv">📍 Documento / Certificado PDV</option>
                </select>
              </div>

              <div className="repo-form-group">
                <label>Referencia (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: ID de Equipo (EQ-1001), Nombre de PDV..."
                  value={referenciaId}
                  onChange={(e) => setReferenciaId(e.target.value)}
                  disabled={uploading}
                />
              </div>

              <div className="repo-form-group">
                <label>Observaciones o Descripción:</label>
                <textarea
                  rows="3"
                  placeholder="Detalles sobre el contenido del documento..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  disabled={uploading}
                />
              </div>

              {errorMsg && <div className="repo-alert repo-alert-error">⚠️ {errorMsg}</div>}
              {successMsg && <div className="repo-alert repo-alert-success">{successMsg}</div>}

              <div className="repo-modal-actions">
                <button type="button" className="repo-btn-cancel" onClick={() => setShowModal(false)} disabled={uploading}>
                  Cancelar
                </button>
                <button type="submit" className="repo-btn-submit" disabled={uploading || !file}>
                  {uploading ? '⏳ Organizando...' : '💾 Guardar en Repositorio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════ PREVIEW MODAL ═══════════════════ */}
      {previewFile && (
        <div className="repo-modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="repo-modal repo-modal-preview" onClick={(e) => e.stopPropagation()}>
            <div className="repo-modal-header">
              <h3>👁️ {previewFile.nombre_original}</h3>
              <button className="repo-modal-close" onClick={() => setPreviewFile(null)}>✕</button>
            </div>
            <div className="repo-preview-body">
              {previewFile.tipo_archivo === 'foto' ? (
                <img src={previewFile.ruta_archivo} alt={previewFile.nombre_original} className="repo-preview-img" />
              ) : previewFile.tipo_archivo === 'pdf' ? (
                <iframe src={previewFile.ruta_archivo} className="repo-preview-iframe" title="Visor PDF" />
              ) : (
                <p>Este formato no soporta previsualización directa en el navegador.</p>
              )}
            </div>
            <div className="repo-preview-footer">
              <a href={`${previewFile.ruta_archivo}${previewFile.ruta_archivo?.includes('?') ? '&' : '?'}download=1`} download={previewFile.nombre_original} target="_blank" rel="noopener noreferrer" className="repo-btn-download-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Descargar Archivo Original
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ STYLES ═══════════════════ */}
      <style jsx>{`
        /* ── Page Container ── */
        .repo-page {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        /* ── Hero Header ── */
        .repo-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #FAF6F0 0%, #F5EDE3 50%, #EDE4D6 100%);
          padding: 28px 32px;
          border-radius: 16px;
          border: 1px solid #E8DFD3;
          gap: 20px;
          flex-wrap: wrap;
        }
        .repo-hero-title {
          font-family: 'Playfair Display', 'Georgia', serif;
          font-size: 1.65rem;
          font-weight: 800;
          color: #2C1810;
          margin: 0 0 6px 0;
          line-height: 1.2;
        }
        .repo-hero-sub {
          color: #6B5B52;
          font-size: 0.9rem;
          margin: 0;
          max-width: 600px;
          line-height: 1.5;
        }
        .repo-hero-sub code {
          background: rgba(139,105,20,0.12);
          color: #6B3A2A;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.82rem;
          font-family: 'SF Mono', 'Consolas', monospace;
        }
        .repo-btn-upload {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #5D4037;
          color: #fff;
          padding: 13px 26px;
          border-radius: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.95rem;
          box-shadow: 0 4px 14px rgba(93,64,55,0.25);
          white-space: nowrap;
        }
        .repo-btn-upload:hover {
          background: #3E2723;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(93,64,55,0.35);
        }

        /* ── Stats Row ── */
        .repo-stats-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
        }
        .repo-stat-card {
          background: #fff;
          border: 1.5px solid #E8E0D8;
          border-radius: 14px;
          padding: 18px 16px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .repo-stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: transparent;
          transition: background 0.2s;
        }
        .repo-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.08);
          border-color: #D4C5B5;
        }
        .repo-stat-card.active {
          border-color: #6B3A2A;
          background: #FDFBF9;
        }
        .repo-stat-card.active::before {
          background: linear-gradient(90deg, #6B3A2A, #8B5E3C);
        }
        .repo-stat-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
        }
        .repo-stat-body {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .repo-stat-label {
          font-size: 0.78rem;
          color: #8D7B6E;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 2px;
        }
        .repo-stat-number {
          font-size: 1.7rem;
          font-weight: 800;
          color: #2C1810;
          font-family: 'Outfit', 'Inter', sans-serif;
          line-height: 1.1;
        }
        .repo-stat-pct {
          font-size: 0.72rem;
          font-weight: 700;
          margin-top: 3px;
        }
        .repo-stat-pct.up { color: #2E7D32; }
        .repo-stat-pct.down { color: #C62828; }
        .repo-stat-pct.neutral { color: #8D7B6E; }

        /* ── Toolbar (Filters + Search) ── */
        .repo-toolbar {
          background: #fff;
          border: 1.5px solid #E8E0D8;
          border-radius: 14px;
          padding: 14px 18px;
        }
        .repo-filters-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .repo-filter-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
        }
        .repo-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 24px;
          border: 1.5px solid #E8E0D8;
          background: #FAFAF8;
          font-size: 0.82rem;
          font-weight: 600;
          color: #6B5B52;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .repo-pill:hover {
          background: #F5EDE3;
          border-color: #D4C5B5;
        }
        .repo-pill.active {
          background: #5D4037;
          color: #fff;
          border-color: #5D4037;
        }
        .repo-pill.active .pill-icon { filter: brightness(10); }
        .pill-icon { font-size: 0.9rem; }

        .repo-search-box {
          display: flex;
          align-items: center;
          border: 1.5px solid #E8E0D8;
          border-radius: 10px;
          overflow: hidden;
          background: #FAFAF8;
          min-width: 260px;
          transition: border-color 0.2s;
        }
        .repo-search-box:focus-within {
          border-color: #6B3A2A;
          box-shadow: 0 0 0 3px rgba(107,58,42,0.1);
        }
        .repo-search-icon {
          margin-left: 12px;
          color: #9E8E82;
          flex-shrink: 0;
        }
        .repo-search-input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 9px 10px;
          font-size: 0.88rem;
          outline: none;
          color: #2C1810;
          min-width: 0;
        }
        .repo-search-input::placeholder { color: #B5A599; }
        .repo-search-clear {
          background: none;
          border: none;
          color: #9E8E82;
          padding: 0 8px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .repo-search-submit {
          background: #6B3A2A;
          color: #fff;
          border: none;
          padding: 9px 16px;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .repo-search-submit:hover { background: #3E2723; }

        /* ── Files Section ── */
        .repo-files-section { min-height: 200px; }
        .repo-loading, .repo-empty {
          text-align: center;
          padding: 60px 20px;
          background: #fff;
          border-radius: 16px;
          border: 2px dashed #E8E0D8;
        }
        .repo-empty-icon { font-size: 3.5rem; margin-bottom: 12px; }
        .repo-empty h3 { color: #2C1810; margin: 0 0 6px; }
        .repo-empty p { color: #8D7B6E; font-size: 0.9rem; margin: 0 0 20px; }
        .repo-btn-upload-empty {
          background: #5D4037; color: #fff; border: none;
          padding: 11px 24px; border-radius: 10px;
          font-weight: 700; cursor: pointer;
        }

        /* ── Desktop Grid ── */
        .repo-grid-desktop {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .repo-list-mobile { display: none; }

        .repo-file-card {
          background: #fff;
          border: 1.5px solid #E8E0D8;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.25s ease;
        }
        .repo-file-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          border-color: #C8B9A9;
        }

        /* Thumbnail */
        .rfc-thumb {
          height: 160px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .rfc-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .rfc-thumb-fallback {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .rfc-thumb-emoji { font-size: 3rem; }
        .rfc-type-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 0.5px;
        }

        /* Card Body */
        .rfc-body {
          padding: 14px 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .rfc-name {
          font-size: 0.92rem;
          font-weight: 700;
          color: #2C1810;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-all;
          line-height: 1.35;
        }
        .rfc-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
        }
        .rfc-cat-tag {
          font-size: 0.72rem;
          font-weight: 600;
          color: #8D7B6E;
          background: #F5F0E8;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .rfc-size {
          font-size: 0.78rem;
          color: #9E8E82;
          font-weight: 600;
        }
        .rfc-desc {
          font-size: 0.8rem;
          color: #8D7B6E;
          margin: 0;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Card Footer */
        .rfc-footer {
          padding: 10px 16px 14px;
          border-top: 1px solid #F0EAE1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }
        .rfc-user {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .rfc-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6B3A2A, #8B5E3C);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.62rem;
          font-weight: 800;
          flex-shrink: 0;
        }
        .rfc-user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .rfc-user-name {
          font-size: 0.75rem;
          font-weight: 700;
          color: #3E2723;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rfc-user-date {
          font-size: 0.65rem;
          color: #9E8E82;
        }
        .rfc-actions {
          display: flex;
          gap: 5px;
        }
        .rfc-act-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #E8E0D8;
          background: #FAFAF8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: none;
          color: #6B5B52;
        }
        .rfc-act-btn:hover {
          background: #5D4037;
          color: #fff;
          border-color: #5D4037;
        }
        .rfc-act-btn:hover svg { stroke: #fff; }
        .rfc-act-delete:hover {
          background: #C62828;
          border-color: #C62828;
        }

        /* ── Mobile List ── */
        .repo-mobile-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fff;
          border: 1.5px solid #E8E0D8;
          border-radius: 12px;
          padding: 12px;
          transition: all 0.15s;
          position: relative;
        }
        .repo-mobile-item:not(:last-child) { margin-bottom: 10px; }
        .rmi-thumb {
          width: 56px;
          height: 56px;
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rmi-thumb-img { width: 100%; height: 100%; object-fit: cover; }
        .rmi-thumb-fallback {
          width: 100%; height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .rmi-info { flex: 1; min-width: 0; }
        .rmi-name {
          font-size: 0.82rem;
          font-weight: 700;
          color: #2C1810;
          margin: 0 0 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-right: 50px;
        }
        .rmi-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 4px;
        }
        .rmi-cat {
          font-size: 0.68rem;
          font-weight: 600;
          color: #8D7B6E;
        }
        .rmi-size {
          font-size: 0.68rem;
          color: #9E8E82;
        }
        .rmi-user-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rmi-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6B3A2A, #8B5E3C);
          color: #fff;
          font-size: 0.45rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rmi-user-name {
          font-size: 0.68rem;
          font-weight: 600;
          color: #3E2723;
        }
        .rmi-date {
          font-size: 0.62rem;
          color: #9E8E82;
        }
        .rmi-type-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 0.6rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.3px;
        }

        /* ── Modal ── */
        .repo-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
          backdrop-filter: blur(4px);
        }
        .repo-modal {
          background: #fff;
          width: 100%;
          max-width: 560px;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0,0,0,0.2);
          animation: repoSlideUp 0.25s ease-out;
        }
        @keyframes repoSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .repo-modal-preview {
          max-width: 900px;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
        }
        .repo-modal-header {
          background: linear-gradient(135deg, #3E2723, #5D4037);
          color: #fff;
          padding: 16px 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .repo-modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
        }
        .repo-modal-close {
          background: rgba(255,255,255,0.15);
          border: none;
          color: #fff;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.15s;
        }
        .repo-modal-close:hover { background: rgba(255,255,255,0.3); }
        .repo-modal-body {
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Drop zone */
        .repo-drop-zone {
          border: 2px dashed #D4C5B5;
          border-radius: 14px;
          background: #FDFBF9;
          transition: all 0.2s;
        }
        .repo-drop-zone:hover {
          border-color: #8B6914;
          background: #FAF6F0;
        }
        .repo-file-hidden { display: none; }
        .repo-drop-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 28px 20px;
          cursor: pointer;
          text-align: center;
        }
        .repo-drop-title {
          font-weight: 700;
          color: #2C1810;
          font-size: 0.95rem;
        }
        .repo-drop-sub {
          font-size: 0.8rem;
          color: #9E8E82;
        }

        /* Form groups */
        .repo-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .repo-form-group label {
          font-size: 0.85rem;
          font-weight: 700;
          color: #3E2723;
        }
        .repo-form-group select,
        .repo-form-group input,
        .repo-form-group textarea {
          padding: 10px 14px;
          border: 1.5px solid #E8E0D8;
          border-radius: 10px;
          font-size: 0.9rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
          background: #FDFBF9;
        }
        .repo-form-group select:focus,
        .repo-form-group input:focus,
        .repo-form-group textarea:focus {
          border-color: #6B3A2A;
          box-shadow: 0 0 0 3px rgba(107,58,42,0.08);
        }

        /* Alerts */
        .repo-alert {
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 600;
        }
        .repo-alert-error { background: #FFEBEE; color: #C62828; }
        .repo-alert-success { background: #E8F5E9; color: #2E7D32; }

        /* Modal actions */
        .repo-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 4px;
        }
        .repo-btn-cancel {
          padding: 10px 20px;
          border: 1.5px solid #E8E0D8;
          background: #FAFAF8;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          color: #6B5B52;
          transition: all 0.15s;
        }
        .repo-btn-cancel:hover { background: #F0EAE1; }
        .repo-btn-submit {
          padding: 10px 22px;
          background: #5D4037;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .repo-btn-submit:hover { background: #3E2723; }
        .repo-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Preview */
        .repo-preview-body {
          flex: 1;
          background: #1A1A1A;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 12px;
          min-height: 300px;
        }
        .repo-preview-img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .repo-preview-iframe { width: 100%; height: 100%; border: none; background: #fff; min-height: 400px; }
        .repo-preview-footer {
          padding: 14px 22px;
          background: #F5F0E8;
          display: flex;
          justify-content: center;
        }
        .repo-btn-download-lg {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #5D4037;
          color: #fff;
          padding: 10px 24px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.9rem;
          transition: all 0.15s;
        }
        .repo-btn-download-lg:hover { background: #3E2723; }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .repo-grid-desktop {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .repo-page { padding: 14px; gap: 14px; }

          .repo-hero {
            flex-direction: column;
            align-items: stretch;
            padding: 20px;
            text-align: center;
          }
          .repo-hero-title { font-size: 1.3rem; }
          .repo-hero-sub { max-width: 100%; font-size: 0.82rem; }
          .repo-btn-upload {
            width: 100%;
            justify-content: center;
            padding: 14px;
          }

          .repo-stats-row {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .repo-stat-card { padding: 14px 12px; gap: 10px; }
          .repo-stat-icon { width: 38px; height: 38px; font-size: 1.1rem; }
          .repo-stat-number { font-size: 1.4rem; }
          .repo-stat-label { font-size: 0.68rem; }

          .repo-toolbar { padding: 10px 12px; }
          .repo-filters-row { flex-direction: column; gap: 10px; }
          .repo-filter-pills {
            overflow-x: auto;
            flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 4px;
          }
          .repo-filter-pills::-webkit-scrollbar { display: none; }
          .repo-pill { padding: 7px 12px; font-size: 0.75rem; }
          .repo-search-box { min-width: 100%; }

          .repo-grid-desktop { display: none; }
          .repo-list-mobile { display: block; }

          .repo-modal { max-width: 100%; }
          .repo-modal-preview { max-height: 92vh; }
        }

        @media (max-width: 400px) {
          .repo-stats-row { grid-template-columns: 1fr 1fr; }
          .repo-stats-row > .repo-stat-card:last-child {
            grid-column: span 2;
          }
        }
      `}</style>
    </div>
  );
}
