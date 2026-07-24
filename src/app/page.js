'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const router = useRouter();

  // Verificar si el usuario ya inició sesión
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

      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-background">
      {/* Importación de tipografías elegantes de Google Fonts para el diseño Glassmorphism */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Outfit:wght@300;400;500;600&display=swap');
      `}} />

      <div className="glass-card animate-fade-in">
        {/* Encabezado / Logo */}
        <div className="login-header">
          <div className="official-brand-logo" style={{ marginBottom: '16px' }}>
            <img 
              src="/images/logo-crepes-round-brown.png" 
              alt="Crepes & Waffles" 
              style={{ height: '125px', width: 'auto', filter: 'drop-shadow(0 6px 16px rgba(44, 21, 11, 0.35))', objectFit: 'contain' }} 
            />
          </div>
          <h1 className="brand-title">Crepes en Punto</h1>
          <p className="brand-subtitle">GESTIÓN Y CONTROL OPERATIVO</p>
          <div className="subtitle-divider">
            <span className="dot"></span>
          </div>
        </div>

        {/* Formulario de Ingreso */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-alert animate-shake">⚠️ {error}</div>}

          <div className="input-group">
            <div className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <input
              type="email"
              className="glass-input"
              placeholder="ejemplo@crepesenpunto.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <div className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              className="glass-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
              title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Iniciando Sesión...' : 'Ingresar al Sistema'}
          </button>
        </form>

      </div>

      <style jsx global>{`
        .login-background {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          /* Fondo: carga la foto del restaurante Cartagena (fondo-login.jpg) con una capa sutil de contraste para que resalte mucho más clara y luminosa */
          background: linear-gradient(135deg, rgba(30, 15, 8, 0.22) 0%, rgba(15, 8, 4, 0.35) 100%),
                      url('/images/fondo-login.jpg') no-repeat center center / cover;
          background-color: #1a0f0a;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .glass-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255, 243, 226, 0.74);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1.5px solid rgba(255, 255, 255, 0.8);
          border-radius: 28px;
          padding: 38px 34px;
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.75), 
                      0 0 45px rgba(0, 0, 0, 0.35);
          color: #2C150B;
        }

        .login-header {
          text-align: center;
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-badge {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.45);
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
          overflow: hidden;
        }

        .logo-badge img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 6px;
        }

        .fallback-icon {
          font-size: 2.2rem;
        }

        .brand-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem;
          font-weight: 700;
          color: #2C150B;
          margin: 0 0 6px 0;
          letter-spacing: 0.5px;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
        }

        .brand-subtitle {
          font-size: 0.78rem;
          color: rgba(58, 30, 18, 0.88);
          letter-spacing: 2.2px;
          font-weight: 600;
          margin: 0;
        }

        .subtitle-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 180px;
          margin-top: 12px;
          position: relative;
        }

        .subtitle-divider::before,
        .subtitle-divider::after {
          content: '';
          flex: 1;
          height: 1.5px;
          background: rgba(58, 30, 18, 0.3);
        }

        .subtitle-divider .dot {
          width: 6px;
          height: 6px;
          background: #3A1E12;
          border-radius: 50%;
          margin: 0 10px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 26px;
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: rgba(58, 30, 18, 0.75);
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .password-toggle {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: rgba(58, 30, 18, 0.75);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: #2C150B;
        }

        .glass-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.65);
          border: 1.5px solid rgba(58, 30, 18, 0.3);
          border-radius: 14px;
          padding: 14px 44px 14px 44px;
          color: #2C150B;
          font-size: 0.95rem;
          font-weight: 500;
          font-family: 'Outfit', sans-serif;
          outline: none;
          transition: all 0.25s ease;
        }

        .glass-input::placeholder {
          color: rgba(58, 30, 18, 0.55);
        }

        .glass-input:focus {
          background: #FFFFFF;
          border-color: #3A1E12;
          box-shadow: 0 0 16px rgba(58, 30, 18, 0.2);
        }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #4A2616 0%, #2C150B 100%);
          border: 1.5px solid rgba(255, 243, 226, 0.65);
          color: #FFF3E2;
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          padding: 15px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 8px 20px rgba(44, 21, 11, 0.45);
          margin-top: 4px;
        }

        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #5C311D 0%, #381B0E 100%);
          transform: translateY(-1px);
          box-shadow: 0 10px 25px rgba(44, 21, 11, 0.6);
          border-color: #FFFFFF;
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .quick-access-section {
          border-top: 1px solid rgba(58, 30, 18, 0.22);
          padding-top: 20px;
        }

        .quick-access-label {
          font-size: 0.76rem;
          color: rgba(58, 30, 18, 0.88);
          text-align: center;
          margin: 0 0 14px 0;
          font-weight: 600;
        }

        .quick-buttons-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .quick-btn {
          background: rgba(255, 255, 255, 0.65);
          border: 1.5px solid rgba(58, 30, 18, 0.25);
          color: #2C150B;
          border-radius: 10px;
          padding: 10px 6px;
          font-size: 0.78rem;
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .quick-btn:hover {
          background: #3A1E12;
          color: #FFF3E2;
          border-color: #3A1E12;
          transform: translateY(-1px);
        }

        .error-alert {
          background: rgba(220, 38, 38, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #FFFFFF;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.85rem;
          text-align: center;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
