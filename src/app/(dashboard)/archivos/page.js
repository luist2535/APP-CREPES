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

  const getTipoIcon = (tipo, extension) => {
    switch (tipo) {
      case 'excel':
        return { icon: '📊', bg: '#e6f4ea', color: '#137333', label: 'Excel' };
      case 'foto':
        return { icon: '🖼️', bg: '#fef7e0', color: '#b06000', label: 'Foto/Imagen' };
      case 'pdf':
        return { icon: '📄', bg: '#fce8e6', color: '#c5221f', label: 'PDF' };
      case 'documento':
        return { icon: '📁', bg: '#e8f0fe', color: '#1a73e8', label: 'Documento' };
      default:
        return { icon: '📎', bg: '#f1f3f4', color: '#5f6368', label: extension?.toUpperCase() || 'Archivo' };
    }
  };

  const getCategoriaLabel = (cat) => {
    const mapas = {
      'evidencia_visita': '🔍 Evidencia Visita',
      'reporte_excel': '📊 Reporte Excel',
      'manual_equipo': '🛠️ Manual Equipo',
      'documento_pdv': '📍 Documento PDV',
      'general': '📂 General'
    };
    return mapas[cat] || cat;
  };

  return (
    <div className="repositorio-container animate-fade-in">
      {/* Banner Superior */}
      <div className="repo-header">
        <div className="repo-title-box">
          <h2>📂 Repositorio Central de Archivos & Evidencias</h2>
          <p>
            Almacenamiento estructurado en carpetas del proyecto (<code>/public/archivos/</code>) con trazabilidad y registro en base de datos SQLite.
          </p>
        </div>
        <button className="btn-upload-new" onClick={() => setShowModal(true)}>
          <span>➕</span>
          <span>Subir Nuevo Archivo</span>
        </button>
      </div>

      {/* Tarjetas de Estadísticas por Tipo de Archivo */}
      <div className="stats-grid">
        <div 
          className={`stat-card ${filtroTipo === 'todos' ? 'active' : ''}`}
          onClick={() => setFiltroTipo('todos')}
        >
          <div className="stat-icon" style={{ backgroundColor: '#f1f3f4', color: '#202124' }}>🗂️</div>
          <div className="stat-info">
            <span className="stat-label">Todos los Archivos</span>
            <span className="stat-value">{stats.todos || 0}</span>
          </div>
        </div>

        <div 
          className={`stat-card ${filtroTipo === 'excel' ? 'active' : ''}`}
          onClick={() => setFiltroTipo('excel')}
        >
          <div className="stat-icon" style={{ backgroundColor: '#e6f4ea', color: '#137333' }}>📊</div>
          <div className="stat-info">
            <span className="stat-label">Excel / Hojas</span>
            <span className="stat-value">{stats.excel || 0}</span>
          </div>
        </div>

        <div 
          className={`stat-card ${filtroTipo === 'foto' ? 'active' : ''}`}
          onClick={() => setFiltroTipo('foto')}
        >
          <div className="stat-icon" style={{ backgroundColor: '#fef7e0', color: '#b06000' }}>🖼️</div>
          <div className="stat-info">
            <span className="stat-label">Fotos / Evidencias</span>
            <span className="stat-value">{stats.foto || 0}</span>
          </div>
        </div>

        <div 
          className={`stat-card ${filtroTipo === 'pdf' ? 'active' : ''}`}
          onClick={() => setFiltroTipo('pdf')}
        >
          <div className="stat-icon" style={{ backgroundColor: '#fce8e6', color: '#c5221f' }}>📄</div>
          <div className="stat-info">
            <span className="stat-label">PDFs / Reportes</span>
            <span className="stat-value">{stats.pdf || 0}</span>
          </div>
        </div>

        <div 
          className={`stat-card ${filtroTipo === 'documento' ? 'active' : ''}`}
          onClick={() => setFiltroTipo('documento')}
        >
          <div className="stat-icon" style={{ backgroundColor: '#e8f0fe', color: '#1a73e8' }}>📁</div>
          <div className="stat-info">
            <span className="stat-label">Documentos</span>
            <span className="stat-value">{stats.documento || 0}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="toolbar-section">
        <div className="tabs-filter">
          <button 
            className={`tab-btn ${filtroCategoria === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroCategoria('todos')}
          >
            Todas las Categorías
          </button>
          <button 
            className={`tab-btn ${filtroCategoria === 'evidencia_visita' ? 'active' : ''}`}
            onClick={() => setFiltroCategoria('evidencia_visita')}
          >
            🔍 Evidencias de Auditoría
          </button>
          <button 
            className={`tab-btn ${filtroCategoria === 'reporte_excel' ? 'active' : ''}`}
            onClick={() => setFiltroCategoria('reporte_excel')}
          >
            📊 Reportes Excel
          </button>
          <button 
            className={`tab-btn ${filtroCategoria === 'manual_equipo' ? 'active' : ''}`}
            onClick={() => setFiltroCategoria('manual_equipo')}
          >
            🛠️ Manuales y Fichas
          </button>
          <button 
            className={`tab-btn ${filtroCategoria === 'documento_pdv' ? 'active' : ''}`}
            onClick={() => setFiltroCategoria('documento_pdv')}
          >
            📍 Documentos PDV
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="search-form">
          <input 
            type="text" 
            placeholder="Buscar por nombre, usuario u observación..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">🔍 Buscar</button>
          {busqueda && (
            <button type="button" className="clear-btn" onClick={() => { setBusqueda(''); fetchArchivos(); }}>✖</button>
          )}
        </form>
      </div>

      {/* Listado de Archivos en Grilla / Tabla Moderna */}
      <div className="archivos-section">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Consultando base de datos y sistema de archivos...</p>
          </div>
        ) : archivos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No se encontraron archivos</h3>
            <p>No hay documentos o evidencias que coincidan con los filtros aplicados en este momento.</p>
            <button className="btn-upload-empty" onClick={() => setShowModal(true)}>
              Subir el primer archivo
            </button>
          </div>
        ) : (
          <div className="archivos-grid">
            {archivos.map((arch) => {
              const tipoInfo = getTipoIcon(arch.tipo_archivo, arch.extension);
              return (
                <div key={arch.id} className="archivo-card">
                  <div className="card-header-icon" style={{ backgroundColor: tipoInfo.bg, color: tipoInfo.color }}>
                    <span className="icon-emoji">{tipoInfo.icon}</span>
                    <span className="tipo-badge" style={{ color: tipoInfo.color }}>{tipoInfo.label}</span>
                  </div>

                  <div className="card-body">
                    <h4 className="archivo-nombre" title={arch.nombre_original}>
                      {arch.nombre_original}
                    </h4>
                    
                    <div className="archivo-meta">
                      <span className="cat-badge">{getCategoriaLabel(arch.categoria)}</span>
                      <span className="size-badge">{formatSize(arch.tamano_bytes)}</span>
                    </div>

                    {arch.referencia_id && (
                      <div className="referencia-tag">
                        📌 Ref: <strong>{arch.referencia_id}</strong>
                      </div>
                    )}

                    {arch.observaciones && (
                      <p className="archivo-obs">{arch.observaciones}</p>
                    )}

                    <div className="archivo-footer">
                      <div className="user-info">
                        <span className="user-icon">👤</span>
                        <div>
                          <div className="user-name">{arch.usuario_nombre || 'Sistema'}</div>
                          <div className="date-str">
                            {new Date(arch.created_at).toLocaleDateString('es-ES', { 
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="actions-group">
                        {arch.tipo_archivo === 'foto' || arch.tipo_archivo === 'pdf' ? (
                          <button 
                            className="btn-action btn-preview" 
                            onClick={() => setPreviewFile(arch)}
                            title="Previsualizar"
                          >
                            👁️
                          </button>
                        ) : null}
                        
                        <a 
                          href={arch.ruta_archivo} 
                          download={arch.nombre_original}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-action btn-download"
                          title="Descargar archivo"
                        >
                          ⬇️
                        </a>

                        <button 
                          className="btn-action btn-delete" 
                          onClick={() => handleDelete(arch.id, arch.nombre_original)}
                          title="Eliminar archivo"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Subida */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Subir Archivo al Repositorio</h3>
              <button className="modal-close" onClick={() => !uploading && setShowModal(false)}>✖</button>
            </div>

            <form onSubmit={handleUpload} className="upload-form">
              <div className="file-drop-area">
                <input 
                  type="file" 
                  id="fileInput"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="file-input-hidden"
                  disabled={uploading}
                />
                <label htmlFor="fileInput" className="file-drop-label">
                  <span className="drop-icon">📁</span>
                  <span className="drop-title">
                    {file ? file.name : 'Haz clic para seleccionar un archivo (Excel, Foto, PDF, Word)'}
                  </span>
                  <span className="drop-subtitle">
                    {file ? `Tamaño: ${formatSize(file.size)}` : 'El sistema creará o asignará la subcarpeta automáticamente según la extensión'}
                  </span>
                </label>
              </div>

              <div className="form-group">
                <label>Categoría / Tipo de Registro:</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} disabled={uploading}>
                  <option value="general">📂 Documento General</option>
                  <option value="reporte_excel">📊 Reporte / Inventario Excel</option>
                  <option value="evidencia_visita">🔍 Evidencia / Auditoría</option>
                  <option value="manual_equipo">🛠️ Manual Técnico de Equipo</option>
                  <option value="documento_pdv">📍 Documento / Certificado PDV</option>
                </select>
              </div>

              <div className="form-group">
                <label>Referencia (Opcional):</label>
                <input 
                  type="text" 
                  placeholder="Ej: ID de Equipo (EQ-1001), Nombre de PDV o ID de Auditoría" 
                  value={referenciaId}
                  onChange={(e) => setReferenciaId(e.target.value)}
                  disabled={uploading}
                />
              </div>

              <div className="form-group">
                <label>Observaciones o Descripción:</label>
                <textarea 
                  rows="3" 
                  placeholder="Detalles sobre el contenido del documento, mes, justificación..." 
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  disabled={uploading}
                />
              </div>

              {errorMsg && <div className="alert-msg alert-error">{errorMsg}</div>}
              {successMsg && <div className="alert-msg alert-success">{successMsg}</div>}

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowModal(false)}
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-submit" disabled={uploading || !file}>
                  {uploading ? 'Organizando y Guardando...' : 'Guardar en Repositorio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Previsualización */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="modal-preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👁️ Previsualizando: {previewFile.nombre_original}</h3>
              <button className="modal-close" onClick={() => setPreviewFile(null)}>✖</button>
            </div>
            <div className="preview-body">
              {previewFile.tipo_archivo === 'foto' ? (
                <img src={previewFile.ruta_archivo} alt={previewFile.nombre_original} className="preview-img" />
              ) : previewFile.tipo_archivo === 'pdf' ? (
                <iframe src={previewFile.ruta_archivo} className="preview-iframe" title="Visor PDF" />
              ) : (
                <p>Este formato no soporta previsualización directa en el navegador.</p>
              )}
            </div>
            <div className="preview-footer">
              <a href={previewFile.ruta_archivo} download={previewFile.nombre_original} target="_blank" rel="noopener noreferrer" className="btn-download-large">
                ⬇️ Descargar Archivo Original
              </a>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .repositorio-container {
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .repo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-primary) 100%);
          padding: var(--spacing-lg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .repo-title-box h2 {
          font-family: 'Playfair Display', serif;
          color: var(--color-primary-dark);
          margin-bottom: 6px;
          font-size: 1.8rem;
        }

        .repo-title-box p {
          color: var(--color-text-secondary);
          font-size: 0.95rem;
          max-width: 700px;
        }

        .repo-title-box code {
          background-color: rgba(139, 105, 20, 0.1);
          color: var(--color-primary);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .btn-upload-new {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: var(--color-primary);
          color: var(--color-text-on-dark);
          padding: 12px 24px;
          border-radius: var(--radius-md);
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-md);
          font-size: 1rem;
        }

        .btn-upload-new:hover {
          background-color: var(--color-primary-dark);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-md);
        }

        .stat-card {
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-sm);
        }

        .stat-card:hover {
          transform: translateY(-3px);
          border-color: var(--color-primary);
          box-shadow: var(--shadow-md);
        }

        .stat-card.active {
          border: 2px solid var(--color-primary);
          background-color: rgba(139, 105, 20, 0.04);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .stat-value {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          font-family: 'Playfair Display', serif;
        }

        /* Toolbar Section */
        .toolbar-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--spacing-md);
          flex-wrap: wrap;
          background: var(--color-bg-primary);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }

        .tabs-filter {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tab-btn {
          background: var(--color-bg-secondary);
          border: 1px solid transparent;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: rgba(139, 105, 20, 0.1);
          color: var(--color-primary);
        }

        .tab-btn.active {
          background: var(--color-primary);
          color: var(--color-text-on-dark);
        }

        .search-form {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          max-width: 400px;
        }

        .search-input {
          flex: 1;
          padding: 8px 14px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          outline: none;
        }

        .search-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(139, 105, 20, 0.2);
        }

        .search-btn {
          background: var(--color-secondary);
          color: var(--color-text-on-dark);
          border: none;
          padding: 8px 14px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .search-btn:hover {
          background: var(--color-secondary-dark);
        }

        .clear-btn {
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          font-size: 1.1rem;
          cursor: pointer;
        }

        /* Archivos Grid */
        .archivos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: var(--spacing-lg);
        }

        .archivo-card {
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
        }

        .archivo-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--color-secondary);
        }

        .card-header-icon {
          height: 110px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .icon-emoji {
          font-size: 3rem;
        }

        .tipo-badge {
          position: absolute;
          bottom: 8px;
          right: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.9);
          padding: 2px 8px;
          border-radius: 12px;
          box-shadow: var(--shadow-sm);
        }

        .card-body {
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .archivo-nombre {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          word-break: break-all;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .archivo-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .cat-badge {
          background: var(--color-bg-secondary);
          color: var(--color-primary-dark);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .size-badge {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .referencia-tag {
          font-size: 0.82rem;
          color: var(--color-secondary-dark);
          background: rgba(200, 150, 62, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }

        .archivo-obs {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          margin: 0;
          font-style: italic;
          line-height: 1.3;
        }

        .archivo-footer {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .user-icon {
          font-size: 1.2rem;
        }

        .user-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--color-primary-dark);
        }

        .date-str {
          font-size: 0.72rem;
          color: var(--color-text-secondary);
        }

        .actions-group {
          display: flex;
          gap: 6px;
        }

        .btn-action {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-decoration: none;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .btn-action:hover {
          background: var(--color-primary);
          color: #fff;
          border-color: var(--color-primary);
          transform: scale(1.05);
        }

        .btn-delete:hover {
          background: #c5221f;
          border-color: #c5221f;
        }

        /* Loading & Empty States */
        .loading-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: var(--color-bg-primary);
          border-radius: var(--radius-lg);
          border: 1px dashed var(--color-border);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 15px;
        }

        .btn-upload-empty {
          margin-top: 15px;
          background: var(--color-primary);
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
        }

        /* Modals */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(3px);
        }

        .modal-content {
          background: var(--color-bg-primary);
          width: 100%;
          max-width: 550px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .modal-preview-content {
          background: var(--color-bg-primary);
          width: 100%;
          max-width: 900px;
          height: 85vh;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .modal-header {
          background: var(--color-primary-dark);
          color: var(--color-text-on-dark);
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.2rem;
          font-family: 'Playfair Display', serif;
        }

        .modal-close {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
        }

        .upload-form {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .file-drop-area {
          border: 2px dashed var(--color-secondary);
          border-radius: var(--radius-md);
          padding: 25px;
          text-align: center;
          background: rgba(139, 105, 20, 0.03);
          cursor: pointer;
          transition: background 0.2s;
        }

        .file-drop-area:hover {
          background: rgba(139, 105, 20, 0.08);
        }

        .file-input-hidden {
          display: none;
        }

        .file-drop-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .drop-icon {
          font-size: 2.5rem;
        }

        .drop-title {
          font-weight: 700;
          color: var(--color-primary-dark);
          font-size: 1rem;
        }

        .drop-subtitle {
          font-size: 0.82rem;
          color: var(--color-text-secondary);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--color-primary-dark);
        }

        .form-group select, .form-group input, .form-group textarea {
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          font-family: inherit;
          outline: none;
        }

        .form-group select:focus, .form-group input:focus, .form-group textarea:focus {
          border-color: var(--color-primary);
        }

        .alert-msg {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 600;
        }

        .alert-error {
          background: #fce8e6;
          color: #c5221f;
        }

        .alert-success {
          background: #e6f4ea;
          color: #137333;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }

        .btn-cancel {
          padding: 10px 18px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
        }

        .btn-submit {
          padding: 10px 22px;
          background: var(--color-primary);
          color: #fff;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Preview body */
        .preview-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #333;
          overflow: hidden;
          padding: 10px;
        }

        .preview-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: #fff;
        }

        .preview-footer {
          padding: 14px 20px;
          background: var(--color-bg-secondary);
          display: flex;
          justify-content: center;
        }

        .btn-download-large {
          background: var(--color-primary);
          color: #fff;
          padding: 10px 24px;
          border-radius: var(--radius-md);
          text-decoration: none;
          font-weight: 600;
          box-shadow: var(--shadow-sm);
        }

        @media (max-width: 768px) {
          .repo-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .btn-upload-new {
            width: 100%;
            justify-content: center;
          }
          .toolbar-section {
            flex-direction: column;
            align-items: stretch;
          }
          .search-form {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
