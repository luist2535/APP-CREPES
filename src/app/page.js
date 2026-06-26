'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('admin123'); // Default password for all seed accounts
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const router = useRouter();

  // Check if already logged in
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) {
          router.push('/dashboard');
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Credenciales incorrectas');
      }

      // Store basic info in localStorage for client-side availability
      localStorage.setItem('user', JSON.stringify(data.user));
      
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (testEmail) => {
    setEmail(testEmail);
    setPassword('admin123');
    // We can auto-submit next tick
    setTimeout(() => {
      const btn = document.getElementById('login-submit-btn');
      if (btn) btn.click();
    }, 100);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card card animate-fade-in">
        <div className="login-logo-container">
          <div className="login-logo" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="Crepes en Punto" 
                onError={() => setLogoError(true)} 
                style={{ width: '80px', height: '80px', objectFit: 'contain' }}
              />
            ) : (
              "🥞"
            )}
          </div>
          <h1 className="heading-display login-brand-title">Crepes en Punto</h1>
          <p className="login-brand-subtitle">Gestión y Control Operativo</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error-alert">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Correo Electrónico</label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              placeholder="ejemplo@crepesenpunto.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Contraseña</label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? 'Iniciando Sesión...' : 'Ingresar al Sistema'}
          </button>
        </form>

        <div className="login-divider">
          <span>Acceso Rápido de Prueba (Contraseña: admin123)</span>
        </div>

        <div className="quick-login-grid">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('admin@crepesenpunto.com')}
          >
            👑 Admin
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('carlos@crepesenpunto.com')}
          >
            🇨🇴 Coord. CTG
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('maria@crepesenpunto.com')}
          >
            🇨🇴 Coord. BAQ
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('ana@crepesenpunto.com')}
          >
            🚨 SST
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('luis@crepesenpunto.com')}
          >
            🔧 Mantenimiento
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('sandra@crepesenpunto.com')}
          >
            🧪 Calidad
          </button>
        </div>
      </div>

      <style jsx global>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
          padding: var(--spacing-md);
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          padding: var(--spacing-2xl) var(--spacing-xl);
          background: var(--color-bg-card);
          border: 1px solid var(--color-border-light);
          box-shadow: var(--shadow-xl);
          border-radius: var(--radius-2xl);
        }

        .login-logo-container {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .login-logo {
          font-size: 3rem;
          margin-bottom: var(--spacing-sm);
          display: inline-block;
          animation: bounce 2s infinite;
        }

        .login-brand-title {
          font-size: 2rem;
          color: var(--color-primary-dark);
          margin-bottom: 4px;
        }

        .login-brand-subtitle {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 500;
        }

        .login-form {
          margin-bottom: var(--spacing-lg);
        }

        .login-error-alert {
          background-color: var(--color-red-bg);
          color: #991B1B;
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: var(--spacing-md);
          border: 1px solid rgba(239, 68, 68, 0.2);
          animation: shake 0.4s;
        }

        .login-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: var(--spacing-lg) 0 var(--spacing-md) 0;
          color: var(--color-text-muted);
          font-size: 0.75rem;
          font-weight: 500;
        }

        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--color-border-light);
        }

        .login-divider:not(:empty)::before {
          margin-right: .5em;
        }

        .login-divider:not(:empty)::after {
          margin-left: .5em;
        }

        .quick-login-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-xs);
        }

        .quick-login-grid button {
          font-size: 0.7rem;
          padding: 6px 4px;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
