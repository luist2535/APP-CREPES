'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
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
          // Fetch notifications
          fetch('/api/notifications')
            .then(r => r.json())
            .then(nData => setNotifications(nData.notifications || []))
            .catch(console.error);
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
    
    const moduleMap = {
      '/dashboard': 'dashboard',
      '/territorial': 'territorial',
      '/calendario': 'calendario',
      '/visitas': 'visitas',
      '/bloqueos': 'bloqueos',
      '/equipos': 'equipos',
      '/solicitudes': 'solicitudes',
      '/reportes': 'reportes',
      '/archivos': 'archivos',
      '/admin': 'admin',
      '/mantenimiento': 'mantenimiento',
      '/auditoria': 'auditoria'
    };
    const modKey = moduleMap[path];
    if (modKey && user.permisos_adicionales && user.permisos_adicionales[modKey] !== undefined) {
      return Boolean(user.permisos_adicionales[modKey].permitido);
    }
    
    // Roles list groupings
    const jefesYCoordinador = [2, 3, 4, 5, 6, 7, 9];
    const auxiliares = [10, 11, 12, 13, 14, 15, 16];
    const todosOperacionales = [...jefesYCoordinador, ...auxiliares];

    switch (path) {
      case '/dashboard':
        return true;
      case '/territorial':
        return [2, 8].includes(rol);
      case '/calendario':
        return [2, 8, 17, ...todosOperacionales].includes(rol);
      case '/visitas':
        return [2, 17, ...todosOperacionales].includes(rol);
      case '/bloqueos':
        return [2].includes(rol);
      case '/equipos':
        return [2, 4, 9, 12, 16].includes(rol);
      case '/solicitudes':
        return [1, 2, 4, 9, 12, 16, 17].includes(rol);
      case '/reportes':
        return [1, 2, 3, 4, 5, 6, 7, 8, 9].includes(rol);
      case '/archivos':
        return true;
      case '/admin':
        return rol === 1;
      case '/mantenimiento':
        // Admin, Jefe Mantenimiento (4), Aux Mantenimiento (12), Jefe Sistemas (9), Aux Sistemas (16), Coordinador (2), Calidad roles
        return [1, 2, 3, 4, 5, 6, 9, 12, 16].includes(rol);
      case '/auditoria':
        // Módulo de auditoría (logs), accesible únicamente para Administradores
        return rol === 1;
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
        },
        {
          name: 'Inventario / Escáner',
          path: '/equipos',
          accessPath: '/equipos',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )
        },
        {
          name: 'Repositorio Archivos',
          path: '/archivos',
          accessPath: '/archivos',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          )
        },
        {
          name: 'Mantenimiento MT/ST',
          path: '/mantenimiento',
          accessPath: '/mantenimiento',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
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
        },

        {
          name: 'Modificar Ítems / Checklists',
          path: '/visitas?tab=templates',
          accessPath: '/visitas',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
          path: '/admin?tab=roles',
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
        },
        {
          name: 'Bitácora Sistema',
          path: '/auditoria',
          accessPath: '/auditoria',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'REPORTES',
      items: [
        {
          name: 'Reportes por Área',
          path: '/reportes',
          accessPath: '/reportes',
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
    if (pathname === '/archivos') return 'Repositorio Central de Archivos';
    if (pathname === '/admin') return 'Panel de Administración';
    if (pathname === '/mantenimiento') return 'Módulo de Mantenimiento';
    if (pathname === '/auditoria') return 'Validación de Auditorías';
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
                src="/logo_crepes_waffles.svg" 
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
                    onClick={() => {
                      setSidebarOpen(false);
                      if (item.path.includes('?tab=')) {
                        window.location.href = item.path;
                      }
                    }}
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
          
          {/* Desktop Title & Date */}
          <div className="header-title desktop-only-header">
            <h1>{getPageTitle()}</h1>
            <p className="header-date">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Mobile Logo & Brand (Redesign to match mockup) */}
          <div className="header-brand-mobile-custom">
            <span className="brand-custom-text">CREPES & WAFFLES <span style={{fontSize: '0.6em', verticalAlign: 'top'}}>®</span></span>
          </div>

          <div className="header-actions">
            {pathname !== '/dashboard' && (
              <div className="header-logo-container desktop-only-header" style={{ marginRight: '15px', display: 'flex', alignItems: 'center' }}>
                <img src="/logo_crepes_waffles.svg" alt="Crepes & Waffles" style={{ height: '26px', width: 'auto', objectFit: 'contain' }} />
              </div>
            )}
            {/* Notification Bell */}
            <div className="desktop-only-header" style={{ position: 'relative' }}>
              <div 
                style={{ cursor: 'pointer', position: 'relative' }} 
                onClick={() => { setNotifMenuOpen(prev => !prev); setProfileMenuOpen(false); }}
                title="Notificaciones"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6B5B52' }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#EF4444', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '0.55rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {notifications.length}
                  </span>
                )}
              </div>

              {/* Notifications Dropdown */}
              {notifMenuOpen && (
                <>
                  <div onClick={() => setNotifMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 15px)', right: '-10px',
                    background: '#fff', borderRadius: '12px', border: '1px solid #E8DDD4',
                    boxShadow: '0 8px 24px rgba(107,58,42,0.14)', minWidth: '280px',
                    zIndex: 9999, overflow: 'hidden', animation: 'dropDown 0.15s ease'
                  }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0EAE1', background: '#FDFAF7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2C1810' }}>Notificaciones</div>
                      <div style={{ fontSize: '0.65rem', color: '#6B3A2A', fontWeight: 600, cursor: 'pointer' }} onClick={() => setNotifications([])}>Marcar leídas</div>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                      
                      {notifications.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.75rem' }}>No tienes notificaciones nuevas.</div>
                      ) : (
                        notifications.map((notif, idx) => {
                          const isWarning = notif.estado_color === 'yellow' || notif.estado_color === 'orange';
                          const isCritical = notif.estado_color === 'red';
                          const bgColor = isCritical ? '#EF4444' : isWarning ? '#EAB308' : '#22C55E';
                          
                          const timeString = new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          
                          return (
                            <div key={idx} className="notif-item" style={{ padding: '12px 16px', borderBottom: '1px solid #F9F7F5', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: bgColor, marginTop: '6px', flexShrink: 0 }}></div>
                              <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2C1810', marginBottom: '2px' }}>
                                  Cambio de estado: {notif.ciudad_nombre}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#6B5B52' }}>
                                  El PDV <strong>{notif.pdv_nombre}</strong> pasó a estado <span style={{color: bgColor, fontWeight: 700}}>{notif.estado_nombre}</span>. (Por {notif.usuario})
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: '4px' }}>Hoy a las {timeString}</div>
                              </div>
                            </div>
                          );
                        })
                      )}

                    </div>
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #F0EAE1', textAlign: 'center', background: '#F8F6F2' }}>
                      <Link href="#" style={{ fontSize: '0.75rem', color: '#6B3A2A', fontWeight: 600, textDecoration: 'none' }}>Ver todas las notificaciones</Link>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Admin Profile with dropdown */}
            <div style={{ position: 'relative' }} className="desktop-only-header">
              <div
                className="header-admin-profile"
                onClick={() => { setProfileMenuOpen(prev => !prev); setNotifMenuOpen(false); }}
                title="Opciones de cuenta"
              >
                <div className="header-admin-avatar">
                  {user.nombre.substring(0, 2).toUpperCase()}
                </div>
                <div className="header-admin-info">
                  <span className="header-admin-name">{user.nombre}</span>
                  <span className="header-admin-email">{user.email || user.correo || 'admin@crepes.com'}</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: '#9CA3AF', flexShrink: 0, transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Dropdown menu */}
              {profileMenuOpen && (
                <>
                  {/* backdrop */}
                  <div onClick={() => setProfileMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    background: '#fff', borderRadius: '12px', border: '1px solid #E8DDD4',
                    boxShadow: '0 8px 24px rgba(107,58,42,0.14)', minWidth: '200px',
                    zIndex: 9999, overflow: 'hidden', animation: 'dropDown 0.15s ease'
                  }}>
                    {/* User info header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0EAE1', background: '#FDFAF7' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2C1810' }}>{user.nombre}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '2px' }}>{user.rol_nombre || 'Administrador'}</div>
                    </div>
                    {/* Options */}
                    <div style={{ padding: '6px' }}>
                      <button
                        onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 12px', border: 'none', background: 'transparent',
                          borderRadius: '8px', cursor: 'pointer', color: '#DC2626',
                          fontSize: '0.82rem', fontWeight: 600, textAlign: 'left',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Right Icons (Bell + Profile) */}
            <div className="mobile-only-right-actions" style={{ display: 'none', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => { setNotifMenuOpen(prev => !prev); setProfileMenuOpen(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.55rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #3D2314' }}>
                    {notifications.length}
                  </span>
                )}

                {/* Mobile Dropdown Menu for Notifications */}
                {notifMenuOpen && (
                  <>
                    <div onClick={(e) => { e.stopPropagation(); setNotifMenuOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 9998, cursor: 'default' }} />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 15px)', right: '-60px',
                      background: '#fff', borderRadius: '12px', border: '1px solid #E8DDD4',
                      boxShadow: '0 8px 24px rgba(107,58,42,0.2)', width: '280px',
                      zIndex: 9999, overflow: 'hidden', animation: 'dropDown 0.15s ease', cursor: 'default'
                    }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0EAE1', background: '#FDFAF7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2C1810' }}>Notificaciones</div>
                        <div style={{ fontSize: '0.65rem', color: '#6B3A2A', fontWeight: 600, cursor: 'pointer' }} onClick={() => setNotifications([])}>Marcar leídas</div>
                      </div>
                      <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {notifications.length === 0 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.75rem' }}>No tienes notificaciones nuevas.</div>
                        ) : (
                          notifications.map((notif, idx) => {
                            const isWarning = notif.estado_color === 'yellow' || notif.estado_color === 'orange';
                            const isCritical = notif.estado_color === 'red';
                            const bgColor = isCritical ? '#EF4444' : isWarning ? '#EAB308' : '#22C55E';
                            const timeString = new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={idx} className="notif-item" style={{ padding: '12px 16px', borderBottom: '1px solid #F9F7F5', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: bgColor, marginTop: '6px', flexShrink: 0 }}></div>
                                <div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2C1810', marginBottom: '2px' }}>Cambio de estado: {notif.ciudad_nombre}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#6B5B52' }}>El PDV <strong>{notif.pdv_nombre}</strong> pasó a <span style={{color: bgColor, fontWeight: 700}}>{notif.estado_nombre}</span>.</div>
                                  <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: '4px' }}>Hoy a las {timeString}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div style={{ padding: '10px 16px', borderTop: '1px solid #F0EAE1', textAlign: 'center', background: '#F8F6F2' }}>
                        <Link href="#" style={{ fontSize: '0.75rem', color: '#6B3A2A', fontWeight: 600, textDecoration: 'none' }}>Ver todas las notificaciones</Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }} onClick={() => { setProfileMenuOpen(prev => !prev); setNotifMenuOpen(false); }}>
                <div 
                  className="header-admin-avatar-mobile"
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F5EBE1', color: '#3D2314', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}
                >
                  {user?.nombre?.substring(0, 2).toUpperCase() || 'AD'}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>

                {/* Mobile Dropdown Menu */}
                {profileMenuOpen && (
                  <>
                    <div onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 9998, cursor: 'default' }} />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 15px)', right: 0,
                      background: '#fff', borderRadius: '12px', border: '1px solid #E8DDD4',
                      boxShadow: '0 8px 24px rgba(107,58,42,0.14)', minWidth: '180px',
                      zIndex: 9999, overflow: 'hidden', animation: 'dropDown 0.15s ease', cursor: 'default'
                    }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0EAE1', background: '#FDFAF7' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2C1810' }}>{user?.nombre || 'Administrador'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '2px' }}>{user?.rol_nombre || 'Administrador'}</div>
                      </div>
                      <div style={{ padding: '6px' }}>
                        <button
                          onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', border: 'none', background: 'transparent',
                            borderRadius: '8px', cursor: 'pointer', color: '#DC2626',
                            fontSize: '0.82rem', fontWeight: 600, textAlign: 'left'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                          </svg>
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="page-container animate-fade-in">
          {children}
        </main>

        {/* Bottom Navigation Bar for Mobile */}
        <div className="bottom-nav custom-bottom-nav">
          <Link href="/dashboard" className={`bottom-nav-item ${pathname === '/dashboard' ? 'active-custom' : ''}`}>
            <span className="bottom-nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </span>
            <span className="bottom-nav-label">Inicio</span>
          </Link>

          <Link href="/territorial" className={`bottom-nav-item ${pathname === '/territorial' ? 'active-custom' : ''}`}>
            <span className="bottom-nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <span className="bottom-nav-label">Operación</span>
          </Link>

          <div className="bottom-nav-fab-wrapper">
            <button className="bottom-nav-fab" aria-label="Nueva Visita" onClick={() => router.push('/visitas')} title="Nueva Visita">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <Link href="/reportes" className={`bottom-nav-item ${pathname === '/reportes' ? 'active-custom' : ''}`}>
            <span className="bottom-nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            <span className="bottom-nav-label">Reportes</span>
          </Link>

          <button onClick={() => setSidebarOpen(true)} className={`bottom-nav-item button-reset`}>
            <span className="bottom-nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </span>
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
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
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

        .header-admin-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border-light);
          background: var(--color-bg-primary);
          cursor: pointer;
          transition: background 0.15s;
        }
        .header-admin-profile:hover {
          background: var(--color-bg-secondary);
        }
        .header-admin-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6B3A2A, #8B5E3C);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .header-admin-info {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        .header-admin-name {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .header-admin-email {
          font-size: 0.65rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }

        .header-date {
          text-transform: capitalize;
        }

        /* Adjust global padding and layout spacing */
        .app-layout {
          min-height: 100vh;
        }

        /* Header Brand Mobile styling */
        .header-brand-mobile {
          display: none;
          align-items: center;
          gap: var(--spacing-sm);
          flex: 1;
          justify-content: center;
        }

        .header-logo-mobile {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          padding: 2px;
        }

        .header-text-mobile {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          text-align: left;
        }

        .brand-line-1 {
          font-size: 0.85rem;
          color: var(--color-primary-dark);
        }

        .brand-line-2 {
          font-size: 0.65rem;
          color: var(--color-secondary-dark);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .notif-item { transition: background 0.15s ease; }
        .notif-item:hover { background: #F3EFEA; }

        /* Mobile: custom header redesign */
        @media (max-width: 767px) {
          .desktop-only-header {
            display: none !important;
          }
          .header {
            background-color: #3D2314 !important; /* Dark brown background */
            padding: 0 16px !important;
            justify-content: space-between;
            box-shadow: none !important;
            border-bottom: none !important;
          }
          .header-menu-btn {
            color: #FFFFFF !important;
          }
          .header-brand-mobile-custom {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
          }
          .brand-custom-text {
            color: #FFFFFF;
            font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
            font-weight: 800;
            font-size: 1.1rem;
            letter-spacing: 0.5px;
          }
          .mobile-only-right-actions {
            display: flex !important;
          }

          /* Bottom Nav overrides for redesign */
          .custom-bottom-nav {
            background-color: #FFFFFF !important;
            border-top: none !important;
            box-shadow: 0 -4px 20px rgba(61, 35, 20, 0.08) !important;
            height: 70px !important;
            display: flex;
            justify-content: space-around;
            align-items: center;
            padding: 0 10px;
          }
          .custom-bottom-nav .bottom-nav-item {
            color: #9CA3AF !important;
            flex: 1;
          }
          .custom-bottom-nav .bottom-nav-item.active-custom {
            color: #6B3A2A !important; /* Brown color */
          }
          .custom-bottom-nav .bottom-nav-label {
            font-size: 0.65rem !important;
            font-weight: 600 !important;
            margin-top: 4px;
          }
          .bottom-nav-fab-wrapper {
            position: relative;
            flex: 0 0 auto;
            width: 64px;
            display: flex;
            justify-content: center;
          }
          .bottom-nav-fab {
            position: absolute;
            bottom: -15px; /* Adjust to float above nav */
            background-color: #6B3A2A;
            border: none;
            width: 54px;
            height: 54px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 16px rgba(107, 58, 42, 0.35);
            cursor: pointer;
            z-index: 100;
            transition: transform 0.2s;
          }
          .bottom-nav-fab:active {
            transform: scale(0.95);
          }
        }


      `}</style>
    </div>
  );
}
