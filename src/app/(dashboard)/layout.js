'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/');
          return;
        }
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('Auth verification error:', err);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="layout-loader">
        <div className="spinner"></div>
        <p>Verificando credenciales...</p>
        <style jsx>{`
          .layout-loader {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: var(--color-bg-primary);
            color: var(--color-primary-dark);
            gap: 15px;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid var(--color-bg-secondary);
            border-top: 5px solid var(--color-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  // Role permissions mapping for sidebar
  const hasAccess = (path) => {
    const rol = parseInt(user.rol_id);
    if (rol === 1) return true; // Admin has access to all
    
    // Roles list groupings
    const jefesYCoordinador = [2, 3, 4, 5, 6, 7, 9];
    const auxiliares = [10, 11, 12, 13, 14, 15, 16];
    const todosOperacionales = [...jefesYCoordinador, ...auxiliares];

    switch (path) {
      case '/dashboard':
        return true; // All roles can see dashboard
      case '/territorial':
        return [2, 8].includes(rol); // Coordinator, Visualizador
      case '/calendario':
        return [2, 8, 17, ...todosOperacionales].includes(rol); // Coordinator, Visualizador, PDV, and operational staff
      case '/visitas':
        return [2, 17, ...todosOperacionales].includes(rol); // Coordinator, PDV, Supervisors, and Auxiliares
      case '/bloqueos':
        return [2].includes(rol); // Coordinator
      case '/equipos':
        return [4, 9, 12, 16].includes(rol); // Only Maintenance and Systems roles can scan
      case '/solicitudes':
        return [1, 2, 4, 9, 12, 16, 17].includes(rol); // Admin, Coordinator, Mantenimiento, Sistemas, and PDVs
      case '/admin':
        return rol === 1; // Admin only
      default:
        return false;
    }
  };

  const sections = [
    {
      title: null,
      items: [
        {
          name: 'Inicio',
          path: '/dashboard',
          accessPath: '/dashboard',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'OPERACIÓN',
      items: [
        {
          name: 'Gestión Territorial',
          path: '/territorial',
          accessPath: '/territorial',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          )
        },
        {
          name: 'Calendario',
          path: '/calendario',
          accessPath: '/calendario',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )
        },
        {
          name: 'Modo Visita',
          path: '/visitas',
          accessPath: '/visitas',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )
        },
        {
          name: 'Solicitudes Soporte',
          path: '/solicitudes',
          accessPath: '/solicitudes',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'OPERACIONES',
      items: [
        {
          name: 'Mantenimiento',
          path: '/equipos',
          accessPath: '/equipos',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          )
        },
        {
          name: 'Sistemas',
          path: '/solicitudes',
          accessPath: '/solicitudes',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          )
        },
        {
          name: 'Calidad',
          path: '/visitas',
          accessPath: '/visitas',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 11 11 13 15 9" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'ADMINISTRACIÓN',
      items: [
        {
          name: 'Bloqueos Horario',
          path: '/bloqueos',
          accessPath: '/bloqueos',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )
        },
        {
          name: 'Usuarios',
          path: '/admin?tab=usuarios',
          accessPath: '/admin',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          )
        },
        {
          name: 'Roles y Permisos',
          path: '/admin?tab=areas',
          accessPath: '/admin',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="3" />
              <circle cx="6" cy="19" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="6" y1="16" x2="10.5" y2="7.5" />
              <line x1="18" y1="16" x2="13.5" y2="7.5" />
            </svg>
          )
        },
        {
          name: 'Configuración',
          path: '/admin?tab=correo',
          accessPath: '/admin',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'REPORTES',
      items: [
        {
          name: 'Reportes',
          path: '/territorial',
          accessPath: '/territorial',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          )
        }
      ]
    }
  ];

  // Filter sections by access permissions
  const filteredSections = sections.map(section => {
    const visibleItems = section.items.filter(item => hasAccess(item.accessPath));
    return { ...section, items: visibleItems };
  }).filter(section => section.items.length > 0);

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Resumen Operativo';
    if (pathname === '/territorial') return 'Estado Territorial de PDV';
    if (pathname === '/calendario') return 'Calendario de Visitas';
    if (pathname === '/visitas') return 'Modo Visita Inteligente';
    if (pathname === '/solicitudes') return 'Solicitudes de Soporte Técnico';
    if (pathname === '/equipos') return 'Equipos & Escaneo QR';
    if (pathname === '/bloqueos') return 'Gestión de Bloqueos de Horario';
    if (pathname === '/admin') return 'Panel de Administración';
    return 'Crepes en Punto';
  };

  return (
    <div className="app-layout">
      {/* Sidebar Overlay for Mobile */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="Logo" 
                onError={() => setLogoError(true)} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              "🥞"
            )}
          </div>
          <div className="sidebar-brand">
            <h2>Crepes en Punto</h2>
            <p>Panel Operativo</p>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredSections.map((section, sIdx) => (
            <div key={sIdx} className="sidebar-section" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {section.title && (
                <div className="sidebar-section-title" style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--color-secondary)', letterSpacing: '1px', paddingLeft: 'var(--spacing-md)' }}>
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.path.split('?')[0];
                return (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-md)', color: isActive ? 'var(--color-text-on-dark)' : 'rgba(255,255,255,0.7)', transition: 'all 0.2s' }}
                  >
                    <span className="sidebar-link-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', color: 'currentColor' }}>
                      {item.icon}
                    </span>
                    <span className="sidebar-link-text">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user.nombre.substring(0, 2).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={user.nombre}>{user.nombre}</div>
              <div className="sidebar-user-role">{user.rol_nombre}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="header">
          <button 
            className="header-menu-btn" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          
          <div className="header-title">
            <h1>{getPageTitle()}</h1>
            <p className="header-date">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="header-actions">
            {user.ciudad_nombre && (
              <span className="header-city-badge">
                📍 {user.ciudad_nombre}
              </span>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Salir 🚪
            </button>
          </div>
        </header>

        <main className="page-container animate-fade-in">
          {children}
        </main>

        {/* Bottom Navigation Bar for Mobile */}
        <div className="bottom-nav">
          <Link href="/dashboard" className={`bottom-nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
            <span className="bottom-nav-icon">🏠</span>
            <span className="bottom-nav-label">Inicio</span>
          </Link>
          <Link href="/visitas" className={`bottom-nav-item ${pathname === '/visitas' ? 'active' : ''}`}>
            <span className="bottom-nav-icon">📋</span>
            <span className="bottom-nav-label">Operación</span>
          </Link>
          <Link href="/solicitudes" className={`bottom-nav-item ${pathname === '/solicitudes' ? 'active' : ''}`}>
            <span className="bottom-nav-icon">📨</span>
            <span className="bottom-nav-label">Solicitudes</span>
          </Link>
          <Link href="/territorial" className={`bottom-nav-item ${pathname === '/territorial' ? 'active' : ''}`}>
            <span className="bottom-nav-icon">📊</span>
            <span className="bottom-nav-label">Reportes</span>
          </Link>
          <button onClick={() => setSidebarOpen(true)} className="bottom-nav-item button-reset">
            <span className="bottom-nav-icon">•••</span>
            <span className="bottom-nav-label">Más</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        /* Animation Utility */
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header-city-badge {
          background-color: var(--color-bg-secondary);
          color: var(--color-primary-dark);
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid var(--color-border);
        }

        .header-date {
          text-transform: capitalize;
        }

        /* Adjust global padding and layout spacing */
        .app-layout {
          min-height: 100vh;
        }

        /* Mobile: hide date and city badge, compact header */
        @media (max-width: 640px) {
          .header-date {
            display: none;
          }
          .header-city-badge {
            display: none;
          }
          .header-actions {
            gap: 4px;
          }
          .header-actions .btn {
            padding: 6px 10px;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
