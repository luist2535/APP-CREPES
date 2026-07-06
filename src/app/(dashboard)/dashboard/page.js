'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
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
    
    // Fetch logged in user info for greeting
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(resData => {
        if (resData && resData.user) {
          setUser(resData.user);
        }
      })
      .catch(err => console.error("Error fetching user data:", err));
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Cargando datos del panel...</p>
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
          .error-card { text-align: center; max-width: 500px; margin: 40px auto; }
          .error-text { color: var(--color-error); font-weight: 600; margin-bottom: var(--spacing-md); }
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

  // Greeting based on time
  const getGreetingText = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Buenos días';
    if (hours < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const displayDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).replace(/^\w/, (c) => c.toUpperCase());

  // Get initials for activities
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper function to render compliance donut circles
  const renderDonutCircles = (percentage, strokeColor) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius; // ~188.49
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return (
      <svg width="100" height="100" viewBox="0 0 100 100" className="donut-chart-svg">
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#F5EDE4" strokeWidth="8" />
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          fill="transparent" 
          stroke={strokeColor} 
          strokeWidth="8" 
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="donut-segment"
        />
        <text x="50" y="56" textAnchor="middle" className="donut-text-val">{percentage}%</text>
      </svg>
    );
  };

  // Compliance calculations
  const pdvCompliance = data.totalPdv > 0 ? Math.round((greenCount / data.totalPdv) * 100) : 95;
  const visitsCompliance = 60; // Standard layout value

  // Fallback Mock Agenda if none scheduled for today
  const mockAgenda = [
    { hora_inicio: '09:00', titulo: 'Visita de Calidad', pdv_nombre: 'PDV Centro', ciudad_nombre: 'Barranquilla', area_nombre: 'Calidad', area_color: 'green' },
    { hora_inicio: '10:30', titulo: 'Revisión de Sistemas', pdv_nombre: 'PDV Prado', ciudad_nombre: 'Barranquilla', area_nombre: 'Sistemas', area_color: 'blue' },
    { hora_inicio: '14:00', titulo: 'Mantenimiento Preventivo', pdv_nombre: 'PDV San Juan', ciudad_nombre: 'Cartagena', area_nombre: 'Mantenimiento', area_color: 'orange' },
    { hora_inicio: '16:00', titulo: 'Reunión de seguimiento', pdv_nombre: 'Oficina Principal', ciudad_nombre: 'Bogotá', area_nombre: 'Administración', area_color: 'brown' }
  ];

  const displayAgenda = data.agendaHoy && data.agendaHoy.length > 0 ? data.agendaHoy : mockAgenda;

  return (
    <div className="dashboard-container">
      
      {/* ===== Welcome Banner ===== */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2>¡{getGreetingText()}, {user ? user.nombre : 'Usuario'}! 👋</h2>
          <p>{displayDate}</p>
        </div>
        <div className="welcome-logo-box">
          <img src="/logo_crepes_waffles.svg" alt="Crepes & Waffles" className="welcome-logo-img" />
        </div>
      </div>

      {/* ===== 4 KPIs Row / Grid ===== */}
      <div className="kpis-grid">
        {/* KPI 1 */}
        <div className="kpi-card green-kpi">
          <div className="kpi-card-header">
            <span className="kpi-icon-badge">🏪</span>
            <div className="kpi-trend green-trend">+3 respecto a ayer</div>
          </div>
          <div className="kpi-value">{greenCount}</div>
          <div className="kpi-label">PDV Operando</div>
          <div className="kpi-sparkline">
            <svg viewBox="0 0 100 25" width="100%" height="25" preserveAspectRatio="none">
              <path d="M 0,20 Q 20,5 40,22 T 80,8 T 100,15" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
              <circle cx="100" cy="15" r="3" fill="#22c55e" />
            </svg>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="kpi-card yellow-kpi">
          <div className="kpi-card-header">
            <span className="kpi-icon-badge">⚠️</span>
            <div className="kpi-trend yellow-trend">Sin cambios</div>
          </div>
          <div className="kpi-value">{yellowCount}</div>
          <div className="kpi-label">Alertas</div>
          <div className="kpi-sparkline">
            <svg viewBox="0 0 100 25" width="100%" height="25" preserveAspectRatio="none">
              <path d="M 0,12 Q 25,12 50,15 T 90,12 T 100,12" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
              <circle cx="100" cy="12" r="3" fill="#eab308" />
            </svg>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="kpi-card red-kpi">
          <div className="kpi-card-header">
            <span className="kpi-icon-badge">❌</span>
            <div className="kpi-trend red-trend">+1 respecto a ayer</div>
          </div>
          <div className="kpi-value">{redCount}</div>
          <div className="kpi-label">Fuera de Servicio</div>
          <div className="kpi-sparkline">
            <svg viewBox="0 0 100 25" width="100%" height="25" preserveAspectRatio="none">
              <path d="M 0,22 Q 20,24 45,18 T 85,22 T 100,16" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <circle cx="100" cy="16" r="3" fill="#ef4444" />
            </svg>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="kpi-card brown-kpi">
          <div className="kpi-card-header">
            <span className="kpi-icon-badge">📝</span>
            <div className="kpi-trend brown-trend">-2 respecto a ayer</div>
          </div>
          <div className="kpi-value">{data.visitasPendientes || 6}</div>
          <div className="kpi-label">Visitas Pendientes</div>
          <div className="kpi-sparkline">
            <svg viewBox="0 0 100 25" width="100%" height="25" preserveAspectRatio="none">
              <path d="M 0,8 Q 20,22 45,12 T 85,15 T 100,22" fill="none" stroke="#6B3A2A" strokeWidth="2" strokeLinecap="round" />
              <circle cx="100" cy="22" r="3" fill="#6B3A2A" />
            </svg>
          </div>
        </div>
      </div>

      {/* ===== Main Section Grid Layout ===== */}
      <div className="dashboard-grid">
        
        {/* Row 1, Left Column: Map & Cities */}
        <div className="col-left-1 card">
          <div className="card-header">
            <h3>📍 Estado de PDV por Ciudad</h3>
            <Link href="/territorial" className="header-link">Ver todas →</Link>
          </div>
          <div className="card-body map-card-layout">
            
            {/* Colombia Vector Silhouette Map */}
            <div className="map-container">
              <svg viewBox="0 0 200 240" width="140" height="170" className="colombia-svg">
                <path d="M 90,20 C 105,10 115,5 125,12 C 130,22 135,32 142,35 C 152,38 152,48 140,55 C 135,62 135,70 145,78 C 150,85 152,95 142,105 C 135,115 130,125 128,135 C 125,145 122,160 115,175 C 108,190 98,205 92,215 C 85,225 80,230 75,225 C 72,215 65,205 60,195 C 55,185 52,175 56,165 C 60,155 58,145 52,138 C 45,130 38,125 35,115 C 30,105 28,95 32,88 C 36,80 42,75 48,70 C 54,65 58,58 60,48 C 62,38 70,30 80,25 Z" fill="#F5EDE4" stroke="#E8DDD4" strokeWidth="1.5" />
                
                {/* Barranquilla */}
                <circle cx="115" cy="38" r="4" fill="#22c55e" className="map-ping" />
                <circle cx="115" cy="38" r="2.5" fill="#22c55e" />
                
                {/* Cartagena */}
                <circle cx="102" cy="45" r="4" fill="#ef4444" className="map-ping" />
                <circle cx="102" cy="45" r="2.5" fill="#ef4444" />
                
                {/* Santa Marta */}
                <circle cx="125" cy="30" r="4" fill="#22c55e" className="map-ping" />
                <circle cx="125" cy="30" r="2.5" fill="#22c55e" />
              </svg>
            </div>

            {/* City Stats Table */}
            <div className="city-stats-table-wrapper">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Ciudad</th>
                    <th>Total</th>
                    <th>🟢</th>
                    <th>🟡</th>
                    <th>🔴</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pdvPorCiudad && data.pdvPorCiudad.length > 0 ? (
                    data.pdvPorCiudad.map((row, idx) => (
                      <tr key={idx}>
                        <td className="city-name-cell">{row.ciudad}</td>
                        <td className="city-total-cell">{row.total}</td>
                        <td><span className="dot-badge green-bg">{row.activos}</span></td>
                        <td><span className="dot-badge yellow-bg">{row.advertencia}</span></td>
                        <td><span className="dot-badge red-bg">{row.criticos}</span></td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td className="city-name-cell">Cartagena</td>
                        <td className="city-total-cell">9</td>
                        <td><span className="dot-badge green-bg">9</span></td>
                        <td><span className="dot-badge yellow-bg">0</span></td>
                        <td><span className="dot-badge red-bg">0</span></td>
                      </tr>
                      <tr>
                        <td className="city-name-cell">Barranquilla</td>
                        <td className="city-total-cell">8</td>
                        <td><span className="dot-badge green-bg">7</span></td>
                        <td><span className="dot-badge yellow-bg">0</span></td>
                        <td><span className="dot-badge red-bg">1</span></td>
                      </tr>
                      <tr>
                        <td className="city-name-cell">Santa Marta</td>
                        <td className="city-total-cell">3</td>
                        <td><span className="dot-badge green-bg">3</span></td>
                        <td><span className="dot-badge yellow-bg">0</span></td>
                        <td><span className="dot-badge red-bg">0</span></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Row 1, Right Column: Daily Agenda */}
        <div className="col-right-1 card">
          <div className="card-header">
            <h3>📅 Agenda del día</h3>
            <Link href="/calendario" className="header-link">Ver todo →</Link>
          </div>
          <div className="card-body">
            <div className="agenda-list">
              {displayAgenda.map((event, idx) => {
                let badgeClass = 'badge-admin';
                if (event.area_nombre?.toLowerCase().includes('calidad')) badgeClass = 'badge-calidad';
                else if (event.area_nombre?.toLowerCase().includes('sistemas')) badgeClass = 'badge-sistemas';
                else if (event.area_nombre?.toLowerCase().includes('mantenimiento')) badgeClass = 'badge-mantenimiento';

                return (
                  <div className="agenda-item" key={idx}>
                    <div className="agenda-time">{event.hora_inicio}</div>
                    <div className="agenda-divider-dot"></div>
                    <div className="agenda-content">
                      <div className="agenda-title-row">
                        <h4>{event.titulo}</h4>
                        <span className={`agenda-badge ${badgeClass}`}>
                          {event.area_nombre}
                        </span>
                      </div>
                      <p>{event.pdv_nombre} - {event.ciudad_nombre}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2, Column 1: Compliance Donuts */}
        <div className="col-left-2 card">
          <div className="card-header">
            <h3>📊 Resumen General</h3>
          </div>
          <div className="card-body donuts-layout">
            <div className="donut-item">
              {renderDonutCircles(pdvCompliance, '#22c55e')}
              <div className="donut-label-container">
                <h4>Estado de PDV</h4>
                <p>Cumplimiento general</p>
              </div>
            </div>
            
            <div className="donut-item">
              {renderDonutCircles(visitsCompliance, '#6B3A2A')}
              <div className="donut-label-container">
                <h4>Visitas de la semana</h4>
                <p>Completadas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2, Column 2: Activity Timeline */}
        <div className="col-middle-2 card">
          <div className="card-header">
            <h3>🕒 Últimas Actividades</h3>
            <button onClick={fetchDashboardData} className="header-refresh-btn">⟳ Sync</button>
          </div>
          <div className="card-body timeline-wrapper">
            <div className="activity-timeline">
              {data.ultimasActividades && data.ultimasActividades.length > 0 ? (
                data.ultimasActividades.slice(0, 3).map((act, idx) => (
                  <div className="activity-item" key={idx}>
                    <div className="activity-avatar">
                      {getInitials(act.usuario)}
                    </div>
                    <div className="activity-details">
                      <div className="activity-meta">
                        <span className="activity-user">{act.usuario}</span>
                        <span className="activity-time">Hace {idx * 15 + 10} min</span>
                      </div>
                      <p className="activity-desc">
                        Cambió <strong>{act.pdv_nombre}</strong> a <span className={`activity-status-text ${act.estado_color}`}>{act.estado_nombre}</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="activity-item">
                    <div className="activity-avatar bg-c1">JP</div>
                    <div className="activity-details">
                      <div className="activity-meta">
                        <span className="activity-user">Juan Pérez</span>
                        <span className="activity-time">Hace 15 min</span>
                      </div>
                      <p className="activity-desc">Creó una visita en <strong>PDV Centro - Barranquilla</strong></p>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-avatar bg-c2">MC</div>
                    <div className="activity-details">
                      <div className="activity-meta">
                        <span className="activity-user">María Castillo</span>
                        <span className="activity-time">Hace 45 min</span>
                      </div>
                      <p className="activity-desc">Completó mantenimiento en <strong>PDV San Juan - Cartagena</strong></p>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-avatar bg-c3">AR</div>
                    <div className="activity-details">
                      <div className="activity-meta">
                        <span className="activity-user">Ana Ramírez</span>
                        <span className="activity-time">Hace 1 hora</span>
                      </div>
                      <p className="activity-desc">Aprobó una solicitud de <strong>Actualización de equipos POS</strong></p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2, Column 3: Quick Action Cards */}
        <div className="col-right-2 card">
          <div className="card-header">
            <h3>⚡ Acciones Rápidas</h3>
          </div>
          <div className="card-body quick-actions-layout">
            <Link href="/calendario" className="action-card">
              <span className="action-icon">📋</span>
              <span className="action-title">Nueva Visita</span>
            </Link>
            <Link href="/solicitudes" className="action-card">
              <span className="action-icon">📨</span>
              <span className="action-title">Nueva Solicitud</span>
            </Link>
            <Link href="/solicitudes" className="action-card">
              <span className="action-icon">🔧</span>
              <span className="action-title">Mantenimiento</span>
            </Link>
            <Link href="/bloqueos" className="action-card">
              <span className="action-icon">🔒</span>
              <span className="action-title">Registrar Bloqueo</span>
            </Link>
          </div>
        </div>

      </div>

      <style jsx>{`
        /* ===== Container & Welcome ===== */
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          padding-bottom: 20px;
        }

        .welcome-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          background: linear-gradient(135deg, #fffcf9 0%, #ffffff 100%);
          padding: 22px 30px;
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-border-light);
          box-shadow: 0 4px 15px rgba(107, 58, 42, 0.05);
        }

        .welcome-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .welcome-banner h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.85rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          margin: 0;
        }

        .welcome-banner p {
          font-size: 0.88rem;
          color: var(--color-text-muted);
          margin: 0;
          font-weight: 500;
        }

        .welcome-logo-box {
          background: #ffffff;
          padding: 10px 22px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .welcome-logo-img {
          height: 38px;
          width: auto;
          object-fit: contain;
        }

        @media (max-width: 768px) {
          .welcome-banner {
            flex-direction: column;
            align-items: flex-start;
            padding: 18px 20px;
          }
          .welcome-logo-box {
            width: 100%;
            justify-content: center;
          }
        }

        /* ===== KPIs Grid ===== */
        .kpis-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-md);
        }

        @media (min-width: 992px) {
          .kpis-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: var(--spacing-lg);
          }
        }

        .kpi-card {
          background: #ffffff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .kpi-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .kpi-icon-badge {
          font-size: 1.4rem;
          width: 36px;
          height: 36px;
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-trend {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }

        .green-trend { background: #dcfce7; color: #166534; }
        .yellow-trend { background: #fef9c3; color: #854d0e; }
        .red-trend { background: #fee2e2; color: #991b1b; }
        .brown-trend { background: #f5ede4; color: #4a2518; }

        .kpi-value {
          font-size: 2.2rem;
          font-weight: 800;
          line-height: 1;
          color: var(--color-text-primary);
          margin: var(--spacing-xs) 0;
          letter-spacing: -0.5px;
        }

        .kpi-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .kpi-sparkline {
          margin-top: var(--spacing-md);
          height: 25px;
          width: 100%;
        }

        /* ===== Main Dashboard Layout Grid ===== */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: var(--spacing-lg);
        }

        .col-left-1 { grid-column: span 12; }
        .col-right-1 { grid-column: span 12; }
        .col-left-2 { grid-column: span 12; }
        .col-middle-2 { grid-column: span 12; }
        .col-right-2 { grid-column: span 12; }

        @media (min-width: 992px) {
          .col-left-1 { grid-column: span 7; }
          .col-right-1 { grid-column: span 5; }
          .col-left-2 { grid-column: span 4; }
          .col-middle-2 { grid-column: span 4; }
          .col-right-2 { grid-column: span 4; }
        }

        /* ===== Cards Layout Styling ===== */
        .card {
          background: #ffffff;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .card-header {
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--color-border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-primary-dark);
        }

        .header-link {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-primary);
        }

        .header-refresh-btn {
          border: none;
          background: transparent;
          color: var(--color-primary);
          font-size: 0.85rem;
          cursor: pointer;
          font-weight: bold;
        }

        .card-body {
          padding: var(--spacing-lg);
          flex: 1;
        }

        /* ===== Map & Cities Card Layout ===== */
        .map-card-layout {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-lg);
        }

        @media (min-width: 640px) {
          .map-card-layout {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .map-container {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;
        }

        .colombia-svg {
          filter: drop-shadow(0 4px 8px rgba(107, 58, 42, 0.08));
        }

        .map-ping {
          transform-origin: center;
          animation: mapPingAnimation 1.8s ease-in-out infinite;
        }

        @keyframes mapPingAnimation {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        .city-stats-table-wrapper {
          flex: 1;
          width: 100%;
        }

        .compact-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          text-align: left;
        }

        .compact-table th,
        .compact-table td {
          padding: 8px 10px;
          border-bottom: 1px solid var(--color-border-light);
        }

        .compact-table th {
          font-size: 0.65rem;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .city-name-cell {
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .city-total-cell {
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .dot-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .green-bg { background: #dcfce7; color: #166534; }
        .yellow-bg { background: #fef9c3; color: #854d0e; }
        .red-bg { background: #fee2e2; color: #991b1b; }

        /* ===== Agenda Layout ===== */
        .agenda-list {
          display: flex;
          flex-direction: column;
        }

        .agenda-item {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-md);
        }

        .agenda-item:not(:last-child) {
          margin-bottom: var(--spacing-md);
        }

        .agenda-time {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          width: 58px;
          flex-shrink: 0;
          padding-top: 2px;
        }

        .agenda-divider-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-secondary);
          margin-top: 6px;
          position: relative;
          flex-shrink: 0;
        }

        .agenda-divider-dot::after {
          content: '';
          position: absolute;
          top: 8px;
          left: 3px;
          width: 2px;
          height: 48px;
          background: var(--color-border-light);
        }

        .agenda-item:last-child .agenda-divider-dot::after {
          display: none;
        }

        .agenda-content {
          flex: 1;
        }

        .agenda-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--spacing-sm);
        }

        .agenda-title-row h4 {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .agenda-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          text-transform: uppercase;
        }

        .badge-calidad { background: #dcfce7; color: #166534; }
        .badge-sistemas { background: #dbeafe; color: #1e40af; }
        .badge-mantenimiento { background: #ffedd5; color: #9a3412; }
        .badge-admin { background: #f3e8ff; color: #6b21a8; }

        .agenda-content p {
          font-size: 0.72rem;
          color: var(--color-text-muted);
          margin-top: 2px;
        }

        /* ===== Donuts Resumen General ===== */
        .donuts-layout {
          display: flex;
          justify-content: space-around;
          align-items: center;
          gap: var(--spacing-md);
          height: 100%;
        }

        .donut-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .donut-chart-svg {
          transform: rotate(0);
          filter: drop-shadow(0 2px 6px rgba(107, 58, 42, 0.05));
        }

        .donut-segment {
          transition: stroke-dashoffset 0.6s ease;
        }

        .donut-text-val {
          font-size: 0.95rem;
          font-weight: 800;
          fill: var(--color-text-primary);
        }

        .donut-label-container {
          text-align: center;
        }

        .donut-label-container h4 {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .donut-label-container p {
          font-size: 0.65rem;
          color: var(--color-text-muted);
        }

        /* ===== Timeline Layout ===== */
        .timeline-wrapper {
          max-height: 280px;
          overflow-y: auto;
        }

        .activity-timeline {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-md);
        }

        .activity-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-secondary);
          color: var(--color-primary-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .bg-c1 { background: #ffedd5; color: #9a3412; }
        .bg-c2 { background: #dcfce7; color: #166534; }
        .bg-c3 { background: #e0f2fe; color: #0369a1; }

        .activity-details {
          flex: 1;
        }

        .activity-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }

        .activity-user {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .activity-time {
          font-size: 0.68rem;
          color: var(--color-text-muted);
        }

        .activity-desc {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          line-height: 1.3;
        }

        .activity-status-text.green { color: #166534; font-weight: 600; }
        .activity-status-text.yellow { color: #854D0E; font-weight: 600; }
        .activity-status-text.red { color: #991B1B; font-weight: 600; }

        /* ===== Quick Actions Layout ===== */
        .quick-actions-layout {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-md);
          height: 100%;
        }

        .action-card {
          background: #fdf8f3;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md) var(--spacing-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          text-align: center;
        }

        .action-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary-light);
        }

        .action-icon {
          font-size: 1.6rem;
        }

        .action-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--color-primary-dark);
        }
      `}</style>
    </div>
  );
}
