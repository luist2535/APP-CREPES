'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EquiposPage() {
  const router = useRouter();
  
  const [qrInput, setQrInput] = useState('');
  const [scannerLoaded, setScannerLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  
  // Search results
  const [equipo, setEquipo] = useState(null);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Dynamically load the CDN html5-qrcode scanner library
  useEffect(() => {
    // Check if script is already present
    if (window.Html5QrcodeScanner) {
      setScannerLoaded(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode';
    script.async = true;
    script.onload = () => {
      setScannerLoaded(true);
      console.log('📷 Html5Qrcode library loaded successfully.');
    };
    script.onerror = () => {
      console.error('Failed to load Html5Qrcode from CDN.');
    };
    document.body.appendChild(script);

    return () => {
      // Clean up script on unmount
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerInstance) {
        scannerInstance.clear().catch(e => console.error('Error clearing scanner:', e));
      }
    };
  }, [scannerInstance]);

  const handleSearchEquipment = async (code) => {
    if (!code || !code.trim()) return;
    
    setSearchLoading(true);
    setSearchError('');
    setEquipo(null);
    setMantenimientos([]);

    try {
      const res = await fetch(`/api/equipos?id=${code.trim().toUpperCase()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Equipo no encontrado');
      }

      setEquipo(data.equipo);
      setMantenimientos(data.mantenimientos);
      setQrInput(code.trim().toUpperCase());
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const startCameraScan = () => {
    if (!scannerLoaded) {
      alert('La cámara no está lista aún. Por favor espera un momento.');
      return;
    }
    
    setIsScanning(true);
    setSearchError('');

    // Wait a tick for the container #reader to be rendered in the DOM
    setTimeout(() => {
      try {
        const scanner = new window.Html5QrcodeScanner("reader", { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        }, false);
        
        scanner.render(
          (decodedText) => {
            // On Success
            handleSearchEquipment(decodedText);
            scanner.clear().catch(e => console.error(e));
            setIsScanning(false);
            setScannerInstance(null);
          },
          (errorMessage) => {
            // On Error (silent, logging causes noise)
          }
        );
        setScannerInstance(scanner);
      } catch (e) {
        console.error('Error starting scanner:', e);
        setSearchError('No se pudo acceder a la cámara. Revisa los permisos.');
        setIsScanning(false);
      }
    }, 100);
  };

  const stopCameraScan = () => {
    if (scannerInstance) {
      scannerInstance.clear().catch(e => console.error(e));
      setScannerInstance(null);
    }
    setIsScanning(false);
  };

  const handleCreateMaintenance = () => {
    if (!equipo) return;
    // Redirect to visits module pre-selecting Maintenance area (id=3), preventivo (id=3), and the correct PDV
    router.push(`/visitas?pdv_id=${equipo.pdv_id}&area_id=3&tipo_visita_id=3`);
  };

  // Helper to parse JSON specs
  const renderTechnicalSpecs = (specsJson) => {
    try {
      const specs = JSON.parse(specsJson || '{}');
      const keys = Object.keys(specs);
      if (keys.length === 0) return <p className="text-muted">Sin especificaciones técnicas cargadas.</p>;
      
      return (
        <table className="specs-table">
          <tbody>
            {keys.map((k) => (
              <tr key={k}>
                <td className="spec-key">{k}</td>
                <td className="spec-val">{specs[k]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } catch (e) {
      return <p className="text-muted">Error al leer datos técnicos.</p>;
    }
  };

  // Maintenance alert states
  const getNextMaintenanceBadge = (dateStr) => {
    if (!dateStr) return null;
    const nextDate = new Date(dateStr);
    const today = new Date();
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="maint-alert overdue">🚨 Mantenimiento Vencido ({Math.abs(diffDays)} días)</span>;
    } else if (diffDays <= 15) {
      return <span className="maint-alert warning">⚠️ Mantenimiento Próximo ({diffDays} días)</span>;
    } else {
      return <span className="maint-alert normal">🟢 Al Día</span>;
    }
  };

  return (
    <div className="scanner-page-container">
      
      <div className="scanner-layout-grid">
        
        {/* Left Column: QR Scan Actions */}
        <div className="scanner-control-col">
          <div className="card shadow-md">
            <div className="card-header">
              <h3>📷 Escanear Código QR de Equipo</h3>
            </div>
            <div className="card-body scanner-actions-body">
              
              {/* Interactive Camera Area */}
              {isScanning ? (
                <div className="camera-scan-container animate-fade-in">
                  <div id="reader" style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}></div>
                  <button className="btn btn-secondary btn-danger btn-block mt-md" onClick={stopCameraScan}>
                    ✕ Cancelar Escaneo
                  </button>
                </div>
              ) : (
                <div className="scan-placeholder-view">
                  <div className="qr-icon-large">📱</div>
                  <p>Escanea el código QR pegado en la licuadora, nevera, o equipo para ver su ficha técnica e historial.</p>
                  <button 
                    className="btn btn-primary btn-lg" 
                    onClick={startCameraScan}
                    disabled={!scannerLoaded}
                  >
                    {scannerLoaded ? '📷 Escanear con Cámara' : 'Cargando Cámara...'}
                  </button>
                </div>
              )}

              <div className="scanner-divider">
                <span>Ó Búsqueda Manual / Escritorio</span>
              </div>

              {/* Manual search input */}
              <div className="manual-search-form">
                <div className="form-group mb-0">
                  <label className="form-label" htmlFor="manual-qr-input">Código de Equipo</label>
                  <div className="input-with-button">
                    <input
                      id="manual-qr-input"
                      type="text"
                      className="form-input"
                      placeholder="Ej: EQ-1001"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleSearchEquipment(qrInput)}
                      disabled={searchLoading || !qrInput.trim()}
                    >
                      {searchLoading ? '...' : 'Buscar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick test links */}
              <div className="quick-test-section">
                <span>Códigos de Prueba Rápidos:</span>
                <div className="quick-test-buttons">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleSearchEquipment('EQ-1001')}>🔌 EQ-1001 (Licuadora)</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleSearchEquipment('EQ-1002')}>❄️ EQ-1002 (Nevera)</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleSearchEquipment('EQ-1003')}>🥞 EQ-1003 (Crepera)</button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Technical sheet results */}
        <div className="scanner-results-col">
          {searchError && (
            <div className="card error-card animate-fade-in">
              <div className="card-body text-center">
                <span className="error-icon">❌</span>
                <h4>No se encontró el equipo</h4>
                <p className="text-muted">{searchError}</p>
                <p className="suggest-hint">Prueba con los códigos de prueba `EQ-1001`, `EQ-1002` o `EQ-1003` para validar la ficha técnica.</p>
              </div>
            </div>
          )}

          {searchLoading && (
            <div className="card loading-results-card">
              <div className="card-body text-center">
                <div className="spinner"></div>
                <p>Consultando ficha del equipo...</p>
              </div>
            </div>
          )}

          {equipo && !searchLoading && (
            <div className="equipment-details-card card shadow-lg animate-fade-in">
              <div className="card-header equipment-main-header">
                <div>
                  <span className="equipment-qr-tag">{equipo.id}</span>
                  <h3>{equipo.nombre}</h3>
                  <p className="equipment-location">📍 {equipo.pdv_nombre} ({equipo.ciudad_nombre})</p>
                </div>
                <button className="btn btn-success" onClick={handleCreateMaintenance}>
                  🔧 Reportar Mantenimiento
                </button>
              </div>
              
              <div className="card-body equipment-specs-body">
                
                {/* General data grid */}
                <div className="equipment-general-grid">
                  <div className="spec-block">
                    <span className="block-label">Marca</span>
                    <span className="block-val">{equipo.marca || 'N/A'}</span>
                  </div>
                  <div className="spec-block">
                    <span className="block-label">Modelo</span>
                    <span className="block-val">{equipo.modelo || 'N/A'}</span>
                  </div>
                  <div className="spec-block">
                    <span className="block-label">Número de Serie</span>
                    <span className="block-val">{equipo.serie || 'N/A'}</span>
                  </div>
                  <div className="spec-block">
                    <span className="block-label">Estado de Mantenimiento</span>
                    <span className="block-val">{getNextMaintenanceBadge(equipo.proximo_mantenimiento) || 'Sin registrar'}</span>
                  </div>
                </div>

                {/* Technical data table */}
                <div className="technical-specs-section">
                  <h4>🔌 Especificaciones Técnicas (Ficha Técnica)</h4>
                  {renderTechnicalSpecs(equipo.datos_tecnicos)}
                </div>

                {/* Maintenance timeline schedule */}
                <div className="maintenance-dates-section">
                  <h4>📅 Próximas Fechas Operativas</h4>
                  <div className="maint-dates-row">
                    <div className="date-box">
                      <span className="date-label">Último Servicio Realizado</span>
                      <span className="date-val">{equipo.ultimo_mantenimiento || 'Sin datos'}</span>
                    </div>
                    <div className="date-box">
                      <span className="date-label">Fecha Límite Próximo Servicio</span>
                      <span className="date-val font-semibold">{equipo.proximo_mantenimiento || 'Sin datos'}</span>
                    </div>
                  </div>
                </div>

                {/* Recent service history */}
                <div className="recent-maint-history">
                  <h4>🕒 Historial de Mantenimientos Recientes en este PDV</h4>
                  {mantenimientos.length > 0 ? (
                    <div className="maint-history-list">
                      {mantenimientos.map((m) => (
                        <div key={m.id} className="maint-history-item">
                          <div className="history-item-header">
                            <span className="history-item-date">📅 {m.fecha}</span>
                            <span className="history-item-user">Auditor: {m.auditor_nombre}</span>
                          </div>
                          {m.observaciones && <p className="history-item-obs">" {m.observaciones} "</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-center py-2">No se registran visitas de mantenimiento recientes para este punto.</p>
                  )}
                </div>

              </div>
            </div>
          )}

          {!equipo && !searchError && !searchLoading && (
            <div className="card scan-welcome-card shadow-md">
              <div className="card-body text-center">
                <span className="welcome-icon">⚡</span>
                <h4>Esperando Escaneo o Búsqueda</h4>
                <p className="text-muted">Inicia la cámara para escanear el QR o ingresa un código arriba para cargar la ficha técnica del equipo.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        .scanner-page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .scanner-layout-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-lg);
          align-items: start;
        }

        @media (min-width: 992px) {
          .scanner-layout-grid {
            grid-template-columns: 0.9fr 1.1fr;
          }
        }

        .scan-placeholder-view {
          text-align: center;
          padding: var(--spacing-xl) 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-md);
        }

        .qr-icon-large {
          font-size: 4rem;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .scanner-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: var(--spacing-lg) 0;
          color: var(--color-text-muted);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .scanner-divider::before,
        .scanner-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--color-border-light);
        }

        .scanner-divider:not(:empty)::before { margin-right: .5em; }
        .scanner-divider:not(:empty)::after { margin-left: .5em; }

        .input-with-button {
          display: flex;
          gap: 6px;
        }

        .input-with-button input {
          flex: 1;
        }

        .quick-test-section {
          margin-top: var(--spacing-md);
          font-size: 0.75rem;
          color: var(--color-text-muted);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .quick-test-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        /* Results Sheet styling */
        .equipment-main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }

        .equipment-qr-tag {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-primary);
          background-color: var(--color-bg-secondary);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          margin-bottom: 4px;
        }

        .equipment-location {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }

        .equipment-general-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .spec-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-bottom: 1px solid var(--color-border-light);
          padding-bottom: var(--spacing-xs);
        }

        .block-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .block-val {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .maint-alert {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .maint-alert.overdue { background-color: var(--color-red-bg); color: #991B1B; }
        .maint-alert.warning { background-color: var(--color-yellow-bg); color: #854D0E; }
        .maint-alert.normal { background-color: var(--color-green-bg); color: #166534; }

        .technical-specs-section h4,
        .maintenance-dates-section h4,
        .recent-maint-history h4 {
          font-size: 0.9rem;
          color: var(--color-primary-dark);
          margin-bottom: var(--spacing-sm);
          font-weight: 700;
          border-bottom: 1.5px solid var(--color-border-light);
          padding-bottom: 4px;
        }

        .technical-specs-section {
          margin-bottom: var(--spacing-lg);
        }

        .specs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }

        .specs-table tr:nth-child(even) {
          background-color: var(--color-bg-primary);
        }

        .specs-table td {
          padding: 6px 12px;
          border-bottom: 1px solid var(--color-border-light);
        }

        .spec-key {
          font-weight: 600;
          color: var(--color-text-secondary);
          width: 40%;
        }

        .spec-val {
          color: var(--color-text-primary);
        }

        .maint-dates-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .date-box {
          background-color: var(--color-bg-primary);
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border-light);
        }

        .date-label {
          display: block;
          font-size: 0.7rem;
          color: var(--color-text-muted);
          margin-bottom: 2px;
        }

        .date-val {
          font-size: 0.85rem;
          color: var(--color-text-primary);
        }

        .font-semibold {
          font-weight: 600;
        }

        .maint-history-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .maint-history-item {
          border-left: 3px solid var(--color-secondary);
          background-color: var(--color-bg-primary);
          padding: var(--spacing-sm);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          font-size: 0.75rem;
        }

        .history-item-header {
          display: flex;
          justify-content: space-between;
          color: var(--color-text-secondary);
          margin-bottom: 2px;
        }

        .history-item-date {
          font-weight: 700;
        }

        .history-item-obs {
          font-style: italic;
          color: var(--color-text-primary);
        }

        /* Loading / Welcome card states */
        .scan-welcome-card,
        .error-card,
        .loading-results-card {
          padding: var(--spacing-xl) 0;
        }

        .welcome-icon,
        .error-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-md);
          display: inline-block;
        }

        .suggest-hint {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: var(--spacing-md);
        }

        .camera-scan-container {
          text-align: center;
        }

        .mt-md { margin-top: 12px; }
        .mb-0 { margin-bottom: 0 !important; }
        .text-center { text-align: center; }
        .text-muted { color: var(--color-text-muted); }
        .py-2 { padding-top: 8px; padding-bottom: 8px; }

        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid var(--color-bg-secondary);
          border-top: 3px solid var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto var(--spacing-sm) auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* Mobile responsive overrides for equipos */
        @media (max-width: 767px) {
          .equipment-general-grid {
            grid-template-columns: 1fr;
            gap: var(--spacing-sm);
          }

          .equipment-main-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .search-form-card .card-body {
            padding: var(--spacing-md);
          }
        }
      `}</style>
    </div>
  );
}
