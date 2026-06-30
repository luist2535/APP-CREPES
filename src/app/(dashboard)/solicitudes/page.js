'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SolicitudesPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [formAreaId, setFormAreaId] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formUrgencia, setFormUrgencia] = useState('revisar');

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const resSolicitudes = await fetch('/api/solicitudes');
      if (!resSolicitudes.ok) throw new Error('Error al cargar solicitudes');
      const dataSolicitudes = await resSolicitudes.json();
      setSolicitudes(dataSolicitudes.solicitudes);

      // Load areas to populate options (Sistemas & Mantenimiento)
      const resVisitas = await fetch('/api/visitas');
      if (resVisitas.ok) {
        const dataVisitas = await resVisitas.json();
        setAreas(dataVisitas.areas || []);
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
        setCurrentUser(u);
        setUserRole(parseInt(u.rol_id));
      } catch (e) {}
    }
  }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitLoading(true);

    if (!formAreaId || !formTitulo || !formDescripcion || !formUrgencia) {
      setSubmitError('Todos los campos son obligatorios.');
      setSubmitLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area_id: parseInt(formAreaId),
          titulo: formTitulo,
          descripcion: formDescripcion,
          urgencia: formUrgencia,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud');

      setSubmitSuccess(data.message || 'Solicitud de soporte enviada con éxito.');
      setFormTitulo('');
      setFormDescripcion('');
      setFormUrgencia('revisar');
      setShowModal(false);
      loadData();
      
      setTimeout(() => setSubmitSuccess(''), 2000);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleScheduleRedirect = (solicitud) => {
    // Redirect to calendar, pre-filling options to assign
    router.push(
      `/calendario?pdv_id=${solicitud.pdv_id}&area_id=${solicitud.area_id}&titulo=${encodeURIComponent(
        `Solicitud: ${solicitud.titulo}`
      )}&descripcion=${encodeURIComponent(solicitud.descripcion)}&show_form=true&solicitud_id=${solicitud.id}`
    );
  };

  const handleRejectRequest = async (solicitudId) => {
    if (!confirm('¿Está seguro de que desea rechazar esta solicitud?')) return;
    
    try {
      // In a real application, you can set the state of request to 'rechazada'
      // We will perform a PUT call to reject it
      const res = await fetch('/api/solicitudes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: solicitudId, action: 'rechazar' })
      });
      if (res.ok) {
        alert('Solicitud rechazada.');
        loadData();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Cargando requerimientos de soporte...</p>
        <style jsx>{`
          .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; }
          .spinner { width: 40px; height: 40px; border: 4px solid var(--color-bg-secondary); border-top: 4px solid var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Filter systems & maintenance areas
  const technicalAreas = areas.filter(a => a.id === 3 || a.id === 7);

  return (
    <div className="solicitudes-page-container">
      
      <div className="header-actions-row">
        <div>
          <h3>📨 Requerimientos de Soporte Técnico</h3>
          <p className="text-muted">Espacio para solicitar soporte en Sistemas o Mantenimiento Físico para los Puntos de Venta.</p>
        </div>
        {userRole === 17 && (
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setFormAreaId(technicalAreas[0]?.id || ''); }}>
            ➕ Nueva Solicitud
          </button>
        )}
      </div>

      {submitSuccess && <div className="success-alert">{submitSuccess}</div>}

      <div className="card shadow-md">
        <div className="card-header">
          <h4>📋 Listado de Solicitudes</h4>
        </div>
        <div className="card-body px-0 py-0">
          {solicitudes.length > 0 ? (
            <div className="table-responsive">
              <table className="solicitudes-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Punto de Venta</th>
                    <th>Área</th>
                    <th>Requerimiento / Asunto</th>
                    <th>Detalle</th>
                    <th>Urgencia</th>
                    <th>Estado</th>
                    {(userRole === 1 || userRole === 2 || userRole === 4 || userRole === 9) && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((s) => (
                    <tr key={s.id}>
                      <td>{s.fecha_solicitud.split(' ')[0]}</td>
                      <td className="font-semibold">{s.pdv_nombre}</td>
                      <td>
                        <span className="area-color-tag" style={{ borderLeftColor: s.area_id === 7 ? '#4B0082' : '#8B6914' }}>
                          {s.area_nombre}
                        </span>
                      </td>
                      <td className="font-semibold">{s.titulo}</td>
                      <td>{s.descripcion}</td>
                      <td>
                        <span className={`urgency-badge ${s.urgencia}`}>
                          {s.urgencia === 'urgente' ? '🚨 URGENTE' : '📋 REVISAR'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${s.estado}`}>
                          {s.estado === 'pendiente' && '⏳ Pendiente'}
                          {s.estado === 'programada' && '📅 Programada'}
                          {s.estado === 'rechazada' && '❌ Rechazada'}
                        </span>
                      </td>
                      {(userRole === 1 || userRole === 2 || userRole === 4 || userRole === 9) && (
                        <td>
                          {s.estado === 'pendiente' ? (
                            <div className="action-buttons-group">
                              <button 
                                className="btn btn-success btn-sm"
                                onClick={() => handleScheduleRedirect(s)}
                              >
                                Programar Visita 📅
                              </button>
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRejectRequest(s.id)}
                              >
                                Rechazar ❌
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted italic text-xs">Resuelta</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card text-center text-muted py-8 shadow-sm">
              <p>No se registran requerimientos de soporte pendientes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal for PDVs */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content card shadow-md animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>📝 Nuevo Requerimiento de Soporte</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="card-body modal-scrollable-body">
              
              {submitError && <div className="error-alert">{submitError}</div>}

              <form onSubmit={handleCreateRequest} className="request-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="request-area">1. Área Responsable</label>
                  <select
                    id="request-area"
                    className="form-select"
                    value={formAreaId}
                    onChange={(e) => setFormAreaId(e.target.value)}
                    required
                  >
                    {technicalAreas.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="request-title">2. Asunto / Falla</label>
                  <input
                    id="request-title"
                    type="text"
                    className="form-input"
                    placeholder="Ej: Impresora de pedidos no enciende"
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="request-desc">3. Descripción Detallada del Problema</label>
                  <textarea
                    id="request-desc"
                    className="form-textarea"
                    placeholder="Describa qué sucede, marcas de equipos si aplica y desde cuándo ocurre..."
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="request-urgencia">4. Prioridad / Urgencia</label>
                  <select
                    id="request-urgencia"
                    className="form-select"
                    value={formUrgencia}
                    onChange={(e) => setFormUrgencia(e.target.value)}
                    required
                  >
                    <option value="revisar">📋 Rutina (Para revisar pronto)</option>
                    <option value="urgente">🚨 URGENTE (Impide operación)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={submitLoading}>
                  {submitLoading ? 'Enviando requerimiento...' : 'Enviar Solicitud de Soporte'}
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .solicitudes-page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .header-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .solicitudes-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }

        .solicitudes-table th, .solicitudes-table td {
          padding: 12px var(--spacing-md);
          border-bottom: 1px solid var(--color-border-light);
        }

        .solicitudes-table th {
          background-color: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .table-responsive { overflow-x: auto; }
        .px-0 { padding-left: 0 !important; padding-right: 0 !important; }
        .py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
        .font-semibold { font-weight: 600; }
        .italic { font-style: italic; }
        .text-xs { font-size: 0.75rem; }

        .area-color-tag {
          border-left: 4px solid #6B3A2A;
          padding-left: 8px;
          font-weight: 600;
        }

        .urgency-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 700;
        }

        .urgency-badge.urgente { background-color: #FEE2E2; color: #991B1B; }
        .urgency-badge.revisar { background-color: #FEF3C7; color: #D97706; }

        .status-pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 600;
        }

        .status-pill.pendiente { background-color: #DBEAFE; color: #1E40AF; }
        .status-pill.programada { background-color: #D1FAE5; color: #065F46; }
        .status-pill.rechazada { background-color: #FEE2E2; color: #991B1B; }

        .action-buttons-group {
          display: flex;
          gap: 6px;
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
          max-width: 500px;
          max-height: 90vh;
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
        }

        .modal-scrollable-body {
          overflow-y: auto;
          max-height: calc(90vh - 80px);
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
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
          color: var(--color-error);
        }

        .request-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
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

        /* Mobile responsive overrides for solicitudes */
        @media (max-width: 767px) {
          .header-actions-row {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-sm);
          }

          .solicitudes-table {
            font-size: 0.72rem;
            min-width: 550px;
          }

          .solicitudes-table th,
          .solicitudes-table td {
            padding: 8px;
          }

          .table-responsive {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .action-buttons-group {
            flex-direction: column;
            gap: 4px;
          }

          .modal-content {
            max-width: 100% !important;
            margin: 0 var(--spacing-xs);
          }

          .modal-scrollable-body {
            max-height: calc(95vh - 60px);
          }
        }
      `}</style>
    </div>
  );
}
