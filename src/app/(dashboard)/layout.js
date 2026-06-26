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
    
    switch (path) {
      case '/dashboard':
        return true; // All roles can see dashboard
      case '/territorial':
        return [2, 8].includes(rol); // Coordinator, Visualizador
      case '/calendario':
        return [2, 8].includes(rol); // Coordinator, Visualizador
      case '/visitas':
        return [2, 3, 4, 5, 6, 7].includes(rol); // Coordinator and supervisors
      case '/bloqueos':
        return [2].includes(rol); // Coordinator
      case '/equipos':
        return [2, 3, 4, 5, 6, 7].includes(rol); // Coordinator and supervisors can scan
      case '/admin':
        return rol === 1; // Admin only
      default:
        return false;
    }
  };

  const navItems = [
    { name: '📊 Dashboard', path: '/dashboard' },
    { name: '📍 Gestión Territorial', path: '/territorial' },
    { name: '📅 Calendario', path: '/calendario' },
    { name: '📋 Modo Visita', path: '/visitas' },
    { name: '📷 Escanear Equipo', path: '/equipos' },
    { name: '🔒 Bloqueos Horario', path: '/bloqueos' },
    { name: '⚙️ Administración', path: '/admin' },
  ].filter(item => hasAccess(item.path));

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Resumen Operativo';
    if (pathname === '/territorial') return 'Estado Territorial de PDV';
    if (pathname === '/calendario') return 'Calendario de Visitas';
    if (pathname === '/visitas') return 'Modo Visita Inteligente';
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

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Módulos</div>
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`sidebar-link ${pathname === item.path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.name}
            </Link>
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
      `}</style>
    </div>
  );
}
