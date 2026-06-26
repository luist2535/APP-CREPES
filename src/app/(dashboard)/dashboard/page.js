'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Error al cargar datos del dashboard');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Cargando datos del dashboard...</p>
        <style jsx>{`
          .loader-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            color: var(--color-primary-dark);
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

  if (error) {
    return (
      <div className="error-card card">
        <div className="card-body">
          <p className="error-text">❌ {error}</p>
          <button className="btn btn-primary" onClick={fetchDashboardData}>Reintentar</button>
        </div>
        <style jsx>{`
          .error-card {
            text-align: center;
            max-width: 500px;
            margin: 40px auto;
          }
          .error-text {
            color: var(--color-error);
            font-weight: 600;
            margin-bottom: var(--spacing-md);
          }
        `}</style>
      </div>
    );
  }

  // Count states based on color
  const countByColor = (color) => {
    if (!data || !data.pdvPorEstado) return 0;
    return data.pdvPorEstado
      .filter((e) => e.color === color)
      .reduce((sum, item) => sum + item.count, 0);
  };

  const greenCount = countByColor('green');
  const yellowCount = countByColor('yellow');
  const redCount = countByColor('red');

  return (
    <div className="dashboard-container">
      {/* KPIs Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-primary-dark)' }}>
            🏪
          </div>
          <div className="stat-card-value">{data.totalPdv}</div>
          <div className="stat-card-label">Total de PDVs</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: 'var(--color-green-bg)', color: '#166534' }}>
            🟢
          </div>
          <div className="stat-card-value">{greenCount}</div>
          <div className="stat-card-label">Operando Normal</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: 'var(--color-yellow-bg)', color: '#854D0E' }}>
            🟡
          </div>
          <div className="stat-card-value">{yellowCount}</div>
          <div className="stat-card-label">Alertas / Bloqueos</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: 'var(--color-red-bg)', color: '#991B1B' }}>
            🔴
          </div>
          <div className="stat-card-value">{redCount}</div>
          <div className="stat-card-label">Fuera de Servicio</div>
        </div>
      </div>

      {/* Row 2: Secondary KPIs */}
      <div className="secondary-kpis">
        <div className="kpi-banner">
          <span className="kpi-banner-icon">📋</span>
          <div className="kpi-banner-info">
            <h3>{data.visitasMes} Visitas</h3>
            <p>Registradas este mes</p>
          </div>
        </div>
        <div className="kpi-banner">
          <span className="kpi-banner-icon">🔒</span>
          <div className="kpi-banner-info">
            <h3>{data.bloqueosActivos} Bloqueos</h3>
            <p>Programados vigentes</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Data tables and recent activities */}
      <div className="dashboard-grid">
        
        {/* Left Side: Summary by City & Visits by Area */}
        <div className="dashboard-left-col">
          <div className="card shadow-md">
            <div className="card-header">
              <h3>📍 Estado de PDVs por Ciudad</h3>
            </div>
            <div className="card-body">
              <div className="city-table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Ciudad</th>
                      <th>Total</th>
                      <th>Activos (🟢)</th>
                      <th>Advertencia (🟡)</th>
                      <th>Críticos (🔴)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pdvPorCiudad && data.pdvPorCiudad.length > 0 ? (
                      data.pdvPorCiudad.map((row, idx) => (
                        <tr key={idx}>
                          <td className="font-semibold">{row.ciudad}</td>
                          <td>{row.total}</td>
                          <td><span className="pill green-pill">{row.activos}</span></td>
                          <td><span className="pill yellow-pill">{row.advertencia}</span></td>
                          <td><span className="pill red-pill">{row.criticos}</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">No hay registros</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card shadow-md">
            <div className="card-header">
              <h3>📊 Visitas por Área</h3>
            </div>
            <div className="card-body">
              <div className="area-visits-list">
                {data.visitasPorArea && data.visitasPorArea.length > 0 ? (
                  data.visitasPorArea.map((item, idx) => {
                    const maxVisits = Math.max(...data.visitasPorArea.map(v => v.count), 1);
                    const pct = (item.count / maxVisits) * 100;
                    return (
                      <div key={idx} className="progress-item">
                        <div className="progress-label">
                          <span className="font-semibold">{item.area}</span>
                          <span>{item.count} visitas</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted text-center py-4">Aún no se registran visitas en el sistema.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Recent State changes */}
        <div className="dashboard-right-col">
          <div className="card shadow-md recent-activity-card">
            <div className="card-header">
              <h3>🕒 Última Actividad (Trazabilidad)</h3>
              <button className="btn btn-secondary btn-sm" onClick={fetchDashboardData}>Sincronizar</button>
            </div>
            <div className="card-body">
              <div className="timeline">
                {data.ultimasActividades && data.ultimasActividades.length > 0 ? (
                  data.ultimasActividades.map((act) => (
                    <div key={act.id} className="timeline-item">
                      <div className="timeline-badge-container">
                        <span className={`timeline-badge ${act.estado_color}`}></span>
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-meta">
                          <span className="timeline-user">{act.usuario}</span>
                          <span className="timeline-time">{act.fecha} {act.hora}</span>
                        </div>
                        <p className="timeline-text">
                          Cambió <strong>{act.pdv_nombre}</strong> a estado <span className={`status-text ${act.estado_color}`}>{act.estado_nombre}</span>
                        </p>
                        {act.observacion && (
                          <div className="timeline-observation">
                            💬 "{act.observacion}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted text-center py-4">No hay cambios de estado registrados.</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .secondary-kpis {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: var(--spacing-md);
        }

        @media (min-width: 600px) {
          .secondary-kpis {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .kpi-banner {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md) var(--spacing-lg);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .kpi-banner-icon {
          font-size: 1.5rem;
          background-color: var(--color-bg-secondary);
          width: 45px;
          height: 45px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-banner-info h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          margin-bottom: 2px;
        }

        .kpi-banner-info p {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-lg);
        }

        @media (min-width: 992px) {
          .dashboard-grid {
            grid-template-columns: 1.2fr 0.8fr;
          }
        }

        .dashboard-left-col {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .font-semibold {
          font-weight: 600;
        }

        .text-center {
          text-align: center;
        }

        .text-muted {
          color: var(--color-text-muted);
        }

        .py-4 {
          padding-top: 1.5rem;
          padding-bottom: 1.5rem;
        }

        /* Dashboard Table styling */
        .city-table-container {
          overflow-x: auto;
        }

        .dashboard-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.875rem;
        }

        .dashboard-table th,
        .dashboard-table td {
          padding: var(--spacing-sm) var(--spacing-md);
          border-bottom: 1px solid var(--color-border-light);
        }

        .dashboard-table th {
          background-color: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          text-align: center;
          min-width: 28px;
        }

        .green-pill { background-color: var(--color-green-bg); color: #166534; }
        .yellow-pill { background-color: var(--color-yellow-bg); color: #854D0E; }
        .red-pill { background-color: var(--color-red-bg); color: #991B1B; }

        /* Progress bars styling */
        .area-visits-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .progress-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
        }

        .progress-bar-bg {
          height: 8px;
          background-color: var(--color-bg-secondary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background-color: var(--color-secondary-dark);
          border-radius: var(--radius-full);
          transition: width var(--transition-normal);
        }

        /* Timeline (Recent activities) */
        .recent-activity-card {
          max-height: 700px;
          display: flex;
          flex-direction: column;
        }

        .recent-activity-card .card-body {
          overflow-y: auto;
          flex: 1;
        }

        .timeline {
          position: relative;
          padding-left: var(--spacing-md);
          border-left: 2px solid var(--color-border-light);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .timeline-item {
          position: relative;
        }

        .timeline-badge-container {
          position: absolute;
          left: calc(-1 * var(--spacing-md) - 6px);
          top: 4px;
        }

        .timeline-badge {
          display: block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: var(--color-text-muted);
          border: 2px solid var(--color-bg-card);
        }

        .timeline-badge.green { background-color: var(--color-green); }
        .timeline-badge.yellow { background-color: var(--color-yellow); }
        .timeline-badge.red { background-color: var(--color-red); }

        .timeline-content {
          font-size: 0.8rem;
        }

        .timeline-meta {
          display: flex;
          justify-content: space-between;
          color: var(--color-text-muted);
          font-size: 0.7rem;
          margin-bottom: 2px;
        }

        .timeline-user {
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .timeline-text {
          color: var(--color-text-primary);
          line-height: 1.4;
        }

        .status-text.green { color: #166534; font-weight: 600; }
        .status-text.yellow { color: #854D0E; font-weight: 600; }
        .status-text.red { color: #991B1B; font-weight: 600; }

        .timeline-observation {
          margin-top: 4px;
          font-style: italic;
          background-color: var(--color-bg-primary);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          border-left: 2px solid var(--color-primary-light);
        }
      `}</style>
    </div>
  );
}
