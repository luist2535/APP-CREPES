'use client';

import { useState, useEffect } from 'react';

export default function TerritorialPage() {
  const [pdvs, setPdvs] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [estados, setEstados] = useState([]);
  const [selectedCiudad, setSelectedCiudad] = useState('all');
  const [selectedEstado, setSelectedEstado] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [activePdv, setActivePdv] = useState(null);
  const [newEstadoId, setNewEstadoId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [pdvHistory, setPdvHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [userRole, setUserRole] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pdv');
      if (!res.ok) throw new Error('Error al cargar datos territoriales');
      const data = await res.json();
      setPdvs(data.pdvs);
      setCiudades(data.ciudades);
      setEstados(data.estados);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUserRole(parseInt(u.rol_id));
      } catch (e) {}
    }
  }, []);

  const fetchPdvHistory = async (pdvId) => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/historial?pdv_id=${pdvId}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setPdvHistory(data.historial);
      }
    } catch (err) {
      console.error('Error fetching pdv history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenPdvModal = (pdv) => {
    setActivePdv(pdv);
    setNewEstadoId(pdv.estado_id);
    setObservacion('');
    setUpdateError('');
    fetchPdvHistory(pdv.id);
  };

  const handleCloseModal = () => {
    setActivePdv(null);
    setPdvHistory([]);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!observacion.trim()) {
      setUpdateError('La observación es obligatoria para registrar el cambio de estado.');
      return;
    }

    try {
      setUpdating(true);
      setUpdateError('');
      const res = await fetch('/api/pdv', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdv_id: activePdv.id,
          estado_id: parseInt(newEstadoId),
          observacion: observacion,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el estado');

      // Update local state list
      setPdvs(prev => prev.map(p => p.id === activePdv.id ? data.pdv : p));
      
      // Close modal
      handleCloseModal();
      
      // Reload overview slightly
      loadData();
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Filter PDVs
  const filteredPdvs = pdvs.filter((pdv) => {
    const matchesCiudad = selectedCiudad === 'all' || pdv.ciudad_id === parseInt(selectedCiudad);
    const matchesEstado = selectedEstado === 'all' || pdv.estado_id === parseInt(selectedEstado);
    return matchesCiudad && matchesEstado;
  });

  const canEditState = userRole === 1 || userRole === 2; // Admin or Coordinator

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Cargando puntos de venta...</p>
        <style jsx>{`
          .loader-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--color-bg-secondary);
            border-top: 4px solid var(--color-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="territorial-container">
      {/* Filter Section */}
      <div className="card filters-card">
        <div className="card-body">
          <div className="filter-group-container">
            <div className="filter-subgroup">
              <span className="filter-title-label">Ciudad:</span>
              <div className="filter-bar">
                <button 
                  className={`filter-chip ${selectedCiudad === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCiudad('all')}
                >
                  Todas ({pdvs.length})
                </button>
                {ciudades.map(c => {
                  const count = pdvs.filter(p => p.ciudad_id === c.id).length;
                  return (
                    <button 
                      key={c.id} 
                      className={`filter-chip ${selectedCiudad === String(c.id) ? 'active' : ''}`}
                      onClick={() => setSelectedCiudad(String(c.id))}
                    >
                      {c.nombre} <span className="filter-chip-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="filter-subgroup">
              <span className="filter-title-label">Estado Operativo:</span>
              <div className="filter-bar">
                <button 
                  className={`filter-chip ${selectedEstado === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedEstado('all')}
                >
                  Todos
                </button>
                {estados.map(e => {
                  const count = pdvs.filter(p => p.estado_id === e.id).length;
                  return (
                    <button 
                      key={e.id} 
                      className={`filter-chip ${selectedEstado === String(e.id) ? 'active' : ''}`}
                      onClick={() => setSelectedEstado(String(e.id))}
                    >
                      {e.icono} {e.nombre} <span className="filter-chip-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of PDVs */}
      {filteredPdvs.length > 0 ? (
        <div className="pdv-grid">
          {filteredPdvs.map((pdv) => (
            <div 
              key={pdv.id} 
              className="pdv-card"
              onClick={() => handleOpenPdvModal(pdv)}
            >
              <div className="pdv-card-header">
                <div className="pdv-card-name">{pdv.nombre}</div>
                <div className={`pdv-card-status ${pdv.estado_color}`}>
                  <span className="pdv-card-status-dot"></span>
                  {pdv.estado_nombre}
                </div>
              </div>
              <div className="pdv-card-details">
                <p className="pdv-detail-line">📍 {pdv.ciudad_nombre} • {pdv.direccion}</p>
                <p className="pdv-detail-line">🕒 Horario: {pdv.hora_apertura} - {pdv.hora_cierre}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card no-pdv-card">
          <div className="card-body">
            <p>No se encontraron puntos de venta con los filtros seleccionados.</p>
          </div>
        </div>
      )}

      {/* Detail & Update Modal */}
      {activePdv && (
        <div className="modal-backdrop">
          <div className="modal-content card animate-fade-in">
            <div className="card-header">
              <h3>{activePdv.nombre}</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <div className="card-body modal-scrollable-body">
              
              {/* PDV Meta */}
              <div className="modal-pdv-meta">
                <p><strong>Ciudad:</strong> {activePdv.ciudad_nombre}</p>
                <p><strong>Dirección:</strong> {activePdv.direccion}</p>
                <p><strong>Horario de Atención:</strong> {activePdv.hora_apertura} a {activePdv.hora_cierre}</p>
                <p>
                  <strong>Estado Actual: </strong>
                  <span className={`status-text ${activePdv.estado_color}`}>
                    {activePdv.estado_icono} {activePdv.estado_nombre}
                  </span>
                </p>
              </div>

              {/* Status Update Form (Coordinator/Admin only) */}
              {canEditState ? (
                <form onSubmit={handleUpdateStatus} className="status-update-form">
                  <h4>🔄 Actualizar Estado Operativo</h4>
                  {updateError && <div className="error-alert">{updateError}</div>}
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="estado-select">Nuevo Estado</label>
                    <select
                      id="estado-select"
                      className="form-select"
                      value={newEstadoId}
                      onChange={(e) => setNewEstadoId(e.target.value)}
                    >
                      {estados.map(e => (
                        <option key={e.id} value={e.id}>{e.icono} {e.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="observacion-textarea">Motivo / Observación (Requerido)</label>
                    <textarea
                      id="observacion-textarea"
                      className="form-textarea"
                      placeholder="Indique detalladamente la razón de este cambio de estado..."
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={updating}
                  >
                    {updating ? 'Guardando...' : 'Guardar Cambio de Estado'}
                  </button>
                </form>
              ) : (
                <div className="info-alert">
                  ℹ️ Solo el Administrador o el Coordinador de Operaciones pueden cambiar el estado de este punto de venta.
                </div>
              )}

              {/* Activity Log */}
              <div className="modal-history-section">
                <h4>🕒 Historial de Estados Recientes</h4>
                {historyLoading ? (
                  <p className="text-muted">Cargando historial...</p>
                ) : pdvHistory.length > 0 ? (
                  <div className="modal-history-list">
                    {pdvHistory.map((hist) => (
                      <div key={hist.id} className="history-item">
                        <div className="history-meta">
                          <span className="history-user">{hist.usuario_nombre}</span>
                          <span className="history-date">{hist.fecha} {hist.hora}</span>
                        </div>
                        <p className="history-text">
                          Estado: <span className={`status-text ${hist.color_anterior || 'muted'}`}>{hist.estado_anterior || 'Inicial'}</span> ➔ <span className={`status-text ${hist.color_nuevo}`}>{hist.estado_nuevo}</span>
                        </p>
                        {hist.observacion && (
                          <div className="history-reason">
                            💬 "{hist.observacion}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center py-2">No se registra historial previo para este PDV.</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .territorial-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .filters-card {
          border-radius: var(--radius-lg);
        }

        .filter-group-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .filter-subgroup {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-title-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pdv-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-md);
        }

        @media (min-width: 600px) {
          .pdv-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 992px) {
          .pdv-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .pdv-card-details {
          margin-top: var(--spacing-sm);
        }

        .pdv-detail-line {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin-bottom: 2px;
        }

        .no-pdv-card {
          text-align: center;
          color: var(--color-text-muted);
          padding: var(--spacing-xl) 0;
        }

        /* Modal styling */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
        }

        .modal-content {
          width: 100%;
          max-width: 580px;
          max-height: 90vh;
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
        }

        .modal-scrollable-body {
          overflow-y: auto;
          max-height: calc(90vh - 80px);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.75rem;
          cursor: pointer;
          color: var(--color-text-muted);
          transition: color var(--transition-fast);
        }

        .modal-close-btn:hover {
          color: var(--color-primary);
        }

        .modal-pdv-meta {
          background-color: var(--color-bg-secondary);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .status-text {
          font-weight: 700;
        }
        .status-text.green { color: #166534; }
        .status-text.yellow { color: #854D0E; }
        .status-text.red { color: #991B1B; }

        .status-update-form {
          border: 1.5px solid var(--color-border-light);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .status-update-form h4 {
          color: var(--color-primary-dark);
          margin-bottom: var(--spacing-xs);
          font-size: 0.95rem;
          font-weight: 700;
        }

        .error-alert {
          background-color: var(--color-red-bg);
          color: #991B1B;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .info-alert {
          background-color: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          border-left: 3px solid var(--color-primary);
        }

        .modal-history-section h4 {
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-sm);
          font-size: 0.95rem;
          font-weight: 700;
        }

        .modal-history-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .history-item {
          border-bottom: 1px solid var(--color-border-light);
          padding-bottom: var(--spacing-sm);
          font-size: 0.8rem;
        }

        .history-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .history-meta {
          display: flex;
          justify-content: space-between;
          color: var(--color-text-muted);
          font-size: 0.7rem;
          margin-bottom: 2px;
        }

        .history-user {
          font-weight: 600;
        }

        .history-reason {
          margin-top: 4px;
          font-style: italic;
          background-color: var(--color-bg-primary);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
