'use client';

import { useState, useEffect } from 'react';

export default function BloqueosPage() {
  const [bloqueos, setBloqueos] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation tabs or toggle
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [formPdvId, setFormPdvId] = useState('');
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split('T')[0]);
  const [formHoraInicio, setFormHoraInicio] = useState('08:00');
  const [formHoraFin, setFormHoraFin] = useState('12:00');
  const [formMotivoId, setFormMotivoId] = useState('');
  const [formObservacion, setFormObservacion] = useState('');
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [userRole, setUserRole] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('/api/bloqueos');
      if (!res.ok) throw new Error('Error al cargar bloqueos');
      const data = await res.json();
      setBloqueos(data.bloqueos);
      setMotivos(data.motivos);
      if (data.motivos.length > 0) {
        setFormMotivoId(String(data.motivos[0].id));
      }

      const resPdvs = await fetch('/api/pdv');
      if (resPdvs.ok) {
        const dataPdvs = await resPdvs.json();
        setPdvs(dataPdvs.pdvs);
        if (dataPdvs.pdvs.length > 0) {
          setFormPdvId(String(dataPdvs.pdvs[0].id));
        }
      }
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

  const handleCreateBloqueo = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitLoading(true);

    if (formHoraInicio >= formHoraFin) {
      setSubmitError('La hora de inicio debe ser anterior a la hora de fin.');
      setSubmitLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/bloqueos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdv_id: parseInt(formPdvId),
          fecha: formFecha,
          hora_inicio: formHoraInicio,
          hora_fin: formHoraFin,
          motivo_id: parseInt(formMotivoId),
          observacion: formObservacion,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear bloqueo');

      setSubmitSuccess('El horario operativo ha sido bloqueado y el estado del PDV ha cambiado a "Provisional/Bloqueado".');
      setFormObservacion('');
      setShowForm(false);
      
      // Reload lists
      loadData();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLiftBloqueo = async (bloqueoId) => {
    if (!confirm('¿Está seguro de levantar este bloqueo? El PDV regresará a estado operativo normal.')) {
      return;
    }

    try {
      const res = await fetch(`/api/bloqueos?id=${bloqueoId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Error al levantar bloqueo');
      
      alert(data.message || 'Bloqueo levantado correctamente');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const isCoordinatorOrAdmin = userRole === 1 || userRole === 2;

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Cargando bloqueos de horario...</p>
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
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="bloqueos-page-container">
      {error && <div className="card error-card"><div className="card-body">❌ {error}</div></div>}

      <div className="bloqueos-actions-row">
        <h2>Bloqueos Activos</h2>
        {isCoordinatorOrAdmin && !showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            🔒 Bloquear Horario PDV
          </button>
        )}
      </div>

      <div className="bloqueos-layout-grid">
        
        {/* Left Column: List of Active Blockades */}
        <div className="bloqueos-list-col">
          {bloqueos.length > 0 ? (
            <div className="bloqueos-grid-list">
              {bloqueos.map((b) => (
                <div key={b.id} className="card shadow-md bloqueo-item-card">
                  <div className="card-header bloqueo-card-header">
                    <div>
                      <span className="bloqueo-badge">🔒 Bloqueado</span>
                      <h3 className="bloqueo-pdv-title">{b.pdv_nombre}</h3>
                    </div>
                    {isCoordinatorOrAdmin && (
                      <button 
                        className="btn btn-secondary btn-danger btn-sm"
                        onClick={() => handleLiftBloqueo(b.id)}
                      >
                        Levantar Bloqueo 🔓
                      </button>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="bloqueo-details-grid">
                      <p><strong>Ciudad:</strong> {b.ciudad_nombre}</p>
                      <p><strong>Fecha:</strong> {b.fecha}</p>
                      <p><strong>Rango Horario:</strong> {b.hora_inicio} - {b.hora_fin}</p>
                      <p><strong>Motivo:</strong> {b.motivo_nombre}</p>
                      <p><strong>Registrado por:</strong> {b.usuario_nombre}</p>
                    </div>
                    {b.observacion && (
                      <div className="bloqueo-observation">
                        <strong>Observaciones:</strong>
                        <p>"{b.observacion}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center text-muted py-8 shadow-sm">
              <p>No hay bloqueos de horario activos en este momento.</p>
            </div>
          )}
        </div>

        {/* Right Column / Floating: Form to create a blockade */}
        {showForm && isCoordinatorOrAdmin && (
          <div className="bloqueos-form-col">
            <div className="card shadow-lg scheduling-card animate-fade-in">
              <div className="card-header">
                <h3>🔒 Registrar Bloqueo de Horario</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cerrar</button>
              </div>
              <div className="card-body">
                {submitSuccess && <div className="success-alert">{submitSuccess}</div>}
                {submitError && <div className="error-alert">{submitError}</div>}

                <form onSubmit={handleCreateBloqueo} className="blocking-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="form-pdv">Punto de Venta (PDV)</label>
                    <select
                      id="form-pdv"
                      className="form-select"
                      value={formPdvId}
                      onChange={(e) => setFormPdvId(e.target.value)}
                      required
                    >
                      {pdvs.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.ciudad_nombre})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="form-fecha">Fecha del Bloqueo</label>
                    <input
                      id="form-fecha"
                      type="date"
                      className="form-input"
                      value={formFecha}
                      onChange={(e) => setFormFecha(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-row-split">
                    <div className="form-group">
                      <label className="form-label" htmlFor="form-start">Hora Inicio</label>
                      <input
                        id="form-start"
                        type="time"
                        className="form-input"
                        value={formHoraInicio}
                        onChange={(e) => setFormHoraInicio(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="form-end">Hora Fin</label>
                      <input
                        id="form-end"
                        type="time"
                        className="form-input"
                        value={formHoraFin}
                        onChange={(e) => setFormHoraFin(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="form-motivo">Motivo del Bloqueo</label>
                    <select
                      id="form-motivo"
                      className="form-select"
                      value={formMotivoId}
                      onChange={(e) => setFormMotivoId(e.target.value)}
                      required
                    >
                      {motivos.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="form-observacion">Observaciones / Razón Detallada</label>
                    <textarea
                      id="form-observacion"
                      className="form-textarea"
                      placeholder="Indique detalladamente la razón de este bloqueo..."
                      value={formObservacion}
                      onChange={(e) => setFormObservacion(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block btn-lg"
                    disabled={submitLoading}
                  >
                    {submitLoading ? 'Bloqueando Horario...' : 'Confirmar Bloqueo'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .bloqueos-page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .bloqueos-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bloqueos-actions-row h2 {
          color: var(--color-primary-dark);
          font-family: 'Playfair Display', serif;
        }

        .bloqueos-layout-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-lg);
          align-items: start;
        }

        @media (min-width: 992px) {
          .bloqueos-layout-grid {
            grid-template-columns: ${showForm ? '1.1fr 0.9fr' : '1fr'};
          }
        }

        .bloqueos-grid-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .bloqueo-item-card {
          border: 1px solid var(--color-border-light);
        }

        .bloqueo-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-bg-secondary);
        }

        .bloqueo-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          color: #991B1B;
          background-color: var(--color-red-bg);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .bloqueo-pdv-title {
          font-size: 1.125rem;
          color: var(--color-primary-dark);
        }

        .bloqueo-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-xs);
          font-size: 0.8rem;
          margin-bottom: var(--spacing-sm);
        }

        @media (min-width: 600px) {
          .bloqueo-details-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .bloqueo-observation {
          font-size: 0.8rem;
          background-color: var(--color-bg-primary);
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--color-secondary);
        }

        .bloqueo-observation strong {
          color: var(--color-text-secondary);
          display: block;
          margin-bottom: 2px;
        }

        .bloqueo-observation p {
          font-style: italic;
          color: var(--color-text-primary);
        }

        .btn-danger {
          background-color: var(--color-red-bg);
          color: #991B1B;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .btn-danger:hover {
          background-color: var(--color-error);
          color: white;
        }

        /* Form Column styling */
        .blocking-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .form-row-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm);
        }

        .error-alert {
          background-color: var(--color-red-bg);
          color: #991B1B;
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          margin-bottom: var(--spacing-sm);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .success-alert {
          background-color: var(--color-green-bg);
          color: #166534;
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          margin-bottom: var(--spacing-sm);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .py-8 {
          padding-top: 3rem;
          padding-bottom: 3rem;
        }

        /* Mobile responsive overrides for bloqueos */
        @media (max-width: 767px) {
          .bloqueos-actions-row {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-sm);
          }

          .bloqueos-actions-row h2 {
            font-size: 1rem;
          }

          .bloqueos-layout-grid {
            grid-template-columns: 1fr !important;
          }

          .bloqueo-card-header {
            flex-wrap: wrap;
            gap: var(--spacing-sm);
          }

          .bloqueo-details-grid {
            grid-template-columns: 1fr;
          }

          .form-row-split {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
