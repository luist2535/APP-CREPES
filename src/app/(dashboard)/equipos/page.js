'use client';

import { useState, useEffect, useRef } from 'react';
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

  // Maintenance Reporting Modal States
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintObservaciones, setMaintObservaciones] = useState('');
  const [maintProximoFecha, setMaintProximoFecha] = useState('');
  const [maintSoportes, setMaintSoportes] = useState([]);
  const [uploadingSoporte, setUploadingSoporte] = useState(false);
  const [maintError, setMaintError] = useState('');
  const [maintSuccess, setMaintSuccess] = useState('');
  const [maintLoading, setMaintLoading] = useState(false);

  // Equipment Registration & Editing Form Modal States
  const [showEquipFormModal, setShowEquipFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formPdvId, setFormPdvId] = useState('');
  const [formMarca, setFormMarca] = useState('');
  const [formModelo, setFormModelo] = useState('');
  const [formSerie, setFormSerie] = useState('');
  const [formProximoMantenimiento, setFormProximoMantenimiento] = useState('');
  const [techSpecs, setTechSpecs] = useState([{ key: '', value: '' }]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [pdvs, setPdvs] = useState([]);
  const [userRole, setUserRole] = useState(null);

  // Mount logic: Load PDV list and read user role from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUserRole(parseInt(u.rol_id));
      } catch (e) {}
    }

    const loadPdvs = async () => {
      try {
        const res = await fetch('/api/pdv');
        if (res.ok) {
          const data = await res.json();
          setPdvs(data.pdvs || []);
        }
      } catch (e) {
        console.error('Error fetching PDVs:', e);
      }
    };
    loadPdvs();
  }, []);

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
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
      setQrInput(''); // Limpieza automática del campo tras buscar o escanear
    }
  };

  const startCameraScan = () => {
    if (!scannerLoaded) {
      setSearchError('La cámara no está lista aún. Por favor espera un momento.');
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSearchLoading(true);
    setSearchError('');
    setEquipo(null);
    setMantenimientos([]);
    
    if (!window.Html5Qrcode) {
      setSearchError('El decodificador de imagen no está listo aún. Por favor intenta de nuevo.');
      setSearchLoading(false);
      return;
    }

    try {
      const html5QrCode = new window.Html5Qrcode("reader-hidden");
      html5QrCode.scanFile(file, true)
        .then(decodedText => {
          handleSearchEquipment(decodedText);
        })
        .catch(err => {
          console.error("Error scanning file:", err);
          setSearchError("No se pudo detectar un código QR en la imagen. Intenta tomar una foto más nítida de cerca o ingresa el Sticker manualmente.");
          setSearchLoading(false);
        });
    } catch (err) {
      console.error("Failed to initialize scanner for file:", err);
      setSearchError("Error al iniciar el decodificador de archivo.");
      setSearchLoading(false);
    }
  };

  const handleCreateMaintenance = () => {
    if (!equipo) return;
    // Set default next maintenance date to 3 months from now
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 3);
    
    setMaintObservaciones('');
    setMaintProximoFecha(nextDate.toISOString().split('T')[0]);
    setMaintSoportes([]);
    setMaintError('');
    setMaintSuccess('');
    setShowMaintModal(true);
  };

  const handleUploadSoporte = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingSoporte(true);
    setMaintError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('etiqueta', 'soporte');

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir soporte');

      setMaintSoportes(prev => [...prev, { url: data.url, nombre: data.nombre }]);
    } catch (err) {
      setMaintError(err.message);
    } finally {
      setUploadingSoporte(false);
    }
  };

  const handleRemoveSoporte = (idx) => {
    setMaintSoportes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    if (!maintObservaciones.trim()) {
      setMaintError('Las observaciones son obligatorias.');
      return;
    }
    if (!maintProximoFecha) {
      setMaintError('Debe especificar la próxima fecha límite de servicio.');
      return;
    }

    setMaintLoading(true);
    setMaintError('');
    setMaintSuccess('');

    try {
      const res = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipo_id: equipo.id,
          observaciones: maintObservaciones.trim(),
          proximo_mantenimiento: maintProximoFecha,
          soportes: maintSoportes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar mantenimiento');

      setMaintSuccess(data.message || 'Mantenimiento registrado con éxito');

      // Update active equipment status local state values
      setEquipo(prev => ({
        ...prev,
        ultimo_mantenimiento: data.ultimo_mantenimiento,
        proximo_mantenimiento: data.proximo_mantenimiento
      }));

      // Reload maintenance history timeline list from server
      const resHistory = await fetch(`/api/equipos?id=${equipo.id}`);
      if (resHistory.ok) {
        const dataHist = await resHistory.json();
        setMantenimientos(dataHist.mantenimientos || []);
      }

      setTimeout(() => {
        setShowMaintModal(false);
        setMaintObservaciones('');
        setMaintProximoFecha('');
        setMaintSoportes([]);
        setMaintSuccess('');
      }, 1500);
    } catch (err) {
      setMaintError(err.message);
    } finally {
      setMaintLoading(false);
    }
  };

  const handleAddTechSpec = () => {
    setTechSpecs(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveTechSpec = (idx) => {
    setTechSpecs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleTechSpecChange = (idx, field, val) => {
    setTechSpecs(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleOpenCreationForm = () => {
    setFormId('');
    setFormNombre('');
    setFormPdvId('');
    setFormMarca('');
    setFormModelo('');
    setFormSerie('');
    setFormProximoMantenimiento('');
    setTechSpecs([{ key: '', value: '' }]);
    setFormError('');
    setFormSuccess('');
    setIsEditing(false);
    setShowEquipFormModal(true);
  };

  const handleOpenEditingForm = () => {
    if (!equipo) return;
    setFormId(equipo.id);
    setFormNombre(equipo.nombre);
    setFormPdvId(String(equipo.pdv_id));
    setFormMarca(equipo.marca || '');
    setFormModelo(equipo.modelo || '');
    setFormSerie(equipo.serie || '');
    setFormProximoMantenimiento(equipo.proximo_mantenimiento || '');
    
    try {
      const parsed = JSON.parse(equipo.datos_tecnicos || '{}');
      const specs = Object.entries(parsed).map(([key, value]) => ({ key, value }));
      setTechSpecs(specs.length > 0 ? specs : [{ key: '', value: '' }]);
    } catch (e) {
      setTechSpecs([{ key: '', value: '' }]);
    }
    
    setFormError('');
    setFormSuccess('');
    setIsEditing(true);
    setShowEquipFormModal(true);
  };

  const handleSaveEquipment = async (e) => {
    e.preventDefault();
    if (!formId.trim()) {
      setFormError('El código/Sticker es obligatorio.');
      return;
    }
    if (!formNombre.trim()) {
      setFormError('El nombre/tipo de equipo es obligatorio.');
      return;
    }
    if (!formPdvId) {
      setFormError('Debe seleccionar un Punto de Venta.');
      return;
    }

    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    const specsObj = {};
    techSpecs.forEach(s => {
      if (s.key.trim() && s.value.trim()) {
        specsObj[s.key.trim()] = s.value.trim();
      }
    });
    const specsJson = JSON.stringify(specsObj);

    try {
      const url = '/api/equipos';
      const method = isEditing ? 'PUT' : 'POST';
      const payload = {
        id: formId.trim().toUpperCase(),
        nombre: formNombre.trim(),
        pdv_id: parseInt(formPdvId),
        marca: formMarca.trim(),
        modelo: formModelo.trim(),
        serie: formSerie.trim(),
        datos_tecnicos: specsJson,
        proximo_mantenimiento: formProximoMantenimiento || null
      };

      if (!isEditing) {
        payload.is_creation = true;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar equipo');

      setFormSuccess(data.message || 'Equipo guardado exitosamente');

      setTimeout(() => {
        setShowEquipFormModal(false);
        handleSearchEquipment(payload.id);
      }, 1200);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
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
      
      {/* Title & Add Equipment header */}
      <div className="equipment-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2.5px solid var(--color-primary)', paddingBottom: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', color: 'var(--color-primary-dark)', fontWeight: 'bold' }}>📋 Ficha Técnica e Inventario de Equipos</h2>
          <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Escanear, buscar o registrar equipos en la base de datos de Sistemas o Mantenimiento.</p>
        </div>
        {[1, 4, 9, 12, 16].includes(userRole) && (
          <button className="btn btn-success" onClick={handleOpenCreationForm} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#2e7d32', color: '#fff' }}>
            ➕ Registrar Nuevo Equipo
          </button>
        )}
      </div>
      
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
                <div className="scan-placeholder-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="qr-icon-large">📱</div>
                  <p>Escanea el código QR o el código de barras (con el sticker de inventario) pegado en el equipo para ver su ficha técnica e historial.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center' }}>
                    <button 
                      className="btn btn-primary btn-lg" 
                      onClick={startCameraScan}
                      disabled={!scannerLoaded}
                      style={{ width: '100%', maxWidth: '280px' }}
                    >
                      {scannerLoaded ? '📷 Escanear con Cámara' : 'Cargando Cámara...'}
                    </button>

                    <label 
                      className="btn btn-secondary btn-lg" 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '8px', 
                        cursor: 'pointer',
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.95rem',
                        fontWeight: 'bold',
                        backgroundColor: '#FAF6F0',
                        color: 'var(--color-primary-dark)',
                        border: '1.5px dashed var(--color-primary)',
                        width: '100%',
                        maxWidth: '280px',
                        margin: 0
                      }}
                    >
                      <span>📁</span> Subir Foto del QR
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Hidden reader element for file decoding */}
              <div id="reader-hidden" style={{ display: 'none' }}></div>

              {/* HTTP Insecure Connection Warning Tip */}
              {typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                <div style={{ marginTop: '20px', padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', fontSize: '0.82rem', color: '#991B1B', textAlign: 'left' }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>⚠️ Aviso de Acceso a Cámara:</strong>
                  <p style={{ margin: '0 0 8px 0', lineHeight: '1.3' }}>Estás accediendo mediante una dirección IP no segura (HTTP). Por políticas de seguridad del navegador, la cámara directa requiere <strong>HTTPS</strong> o localhost.</p>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>¿Cómo solucionarlo?</p>
                  <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.4' }}>
                    <li>Usa la opción <strong>"Subir Foto del QR"</strong> para usar la cámara nativa del celular.</li>
                    <li>Digita manualmente el <strong>Sticker</strong> o <strong>Serial</strong> en el buscador de abajo.</li>
                    <li>
                      Configura Chrome ingresando a: <code style={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>, habilita la opción y agrega <code>http://172.25.13.26:3000</code>.
                    </li>
                  </ul>
                </div>
              )}

              <div className="scanner-divider">
                <span>Ó Búsqueda Manual / Escritorio</span>
              </div>

              {/* Manual search input */}
              <form 
                className="manual-search-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchEquipment(qrInput);
                }}
              >
                <div className="form-group mb-0">
                  <label className="form-label" htmlFor="manual-qr-input">Código de Equipo, Serial o Sticker</label>
                  <div className="input-with-button">
                    <input
                      id="manual-qr-input"
                      type="text"
                      className="form-input"
                      placeholder="Ej: RCSUIBZ1412230144 o EQ-1001"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      autoFocus
                    />
                    {qrInput && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setQrInput('')}
                        title="Limpiar campo"
                        style={{ padding: '0 14px', fontSize: '1rem', fontWeight: 'bold', color: '#991b1b', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="btn btn-primary"
                      disabled={searchLoading || !qrInput.trim()}
                    >
                      {searchLoading ? '...' : 'Buscar'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Quick test links */}
              <div className="quick-test-section">
                <span>Ejemplos de Códigos y Stickers de Prueba:</span>
                <div className="quick-test-buttons">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleSearchEquipment('RCSUIBZ1412230144')}>📦 RCSUIBZ... (Tu Sticker)</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleSearchEquipment('EQ-1001')}>🔌 EQ-1001 (Licuadora)</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleSearchEquipment('R05 000001613')}>🖥️ R05 000001613 (Servidor)</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleSearchEquipment('ADM 000002539')}>💻 ADM 000002539 (Desktop)</button>
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
                <h4>{searchError.includes('cámara') ? 'Cámara no disponible' : 'No se encontró el equipo'}</h4>
                <p className="text-muted">{searchError}</p>
                {!searchError.includes('cámara') && (
                  <p className="suggest-hint">Prueba con códigos como `EQ-1001` o con números de sticker de inventario como `R05 000001613` o `ADM 000002539` para validar la ficha técnica.</p>
                )}
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
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[1, 4, 9, 12, 16].includes(userRole) && (
                    <button className="btn btn-secondary" onClick={handleOpenEditingForm} style={{ border: '1px solid var(--color-border)', backgroundColor: '#fafafa', color: '#333', cursor: 'pointer', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem' }}>
                      ✏️ Editar Ficha
                    </button>
                  )}
                  <button className="btn btn-success" onClick={handleCreateMaintenance} style={{ cursor: 'pointer', padding: '8px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#2e7d32', color: '#fff' }}>
                    🔧 Reportar Mantenimiento
                  </button>
                </div>
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
                  <h4>🕒 Historial de Mantenimientos Recientes de este Equipo</h4>
                  {mantenimientos.length > 0 ? (
                    <div className="maint-history-list">
                      {mantenimientos.map((m) => (
                        <div key={m.id} className="maint-history-item">
                          <div className="history-item-header">
                            <span className="history-item-date">📅 {m.fecha}</span>
                            <span className="history-item-user">Ejecutor: {m.auditor_nombre}</span>
                          </div>
                          {m.observaciones && <p className="history-item-obs">" {m.observaciones} "</p>}
                          {m.evidencias && m.evidencias.length > 0 && (
                            <div className="maint-attachments" style={{ marginTop: '8px', borderTop: '1px dashed var(--color-border-light)', paddingTop: '6px' }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', textAlign: 'left' }}>📄 Soportes y Facturas:</span>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {m.evidencias.map((ev, eidx) => (
                                  <a 
                                    key={eidx} 
                                    href={ev.ruta_archivo} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="attachment-link"
                                    style={{
                                      fontSize: '0.7rem',
                                      color: 'var(--color-primary)',
                                      textDecoration: 'underline',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                  >
                                    📎 {ev.nombre_archivo}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-center py-2">No se registran visitas de mantenimiento recientes para este equipo.</p>
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

      {/* ===== Maintenance Reporting Modal ===== */}
      {showMaintModal && equipo && (
        <div className="maint-modal-overlay" onClick={() => setShowMaintModal(false)}>
          <div className="maint-modal" onClick={e => e.stopPropagation()}>
            <div className="maint-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary-dark)' }}>🔧 Reportar Mantenimiento para {equipo.nombre}</h3>
              <button className="maint-modal-close" onClick={() => setShowMaintModal(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            
            <form onSubmit={handleSaveMaintenance} className="maint-modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {maintError && <div className="error-alert" style={{ padding: '10px 14px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '6px', fontSize: '0.85rem' }}>⚠️ {maintError}</div>}
              {maintSuccess && <div className="success-alert" style={{ padding: '10px 14px', backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: '6px', fontSize: '0.85rem' }}>✅ {maintSuccess}</div>}

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="form-label" htmlFor="maint-obs" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Observaciones y Detalles del Trabajo *</label>
                <textarea
                  id="maint-obs"
                  className="form-textarea"
                  rows={4}
                  placeholder="Ej: Cambio de repuestos, lubricación, limpieza profunda, pruebas operativas satisfactorias."
                  value={maintObservaciones}
                  onChange={e => setMaintObservaciones(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px', resize: 'vertical' }}
                  required
                />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="form-label" htmlFor="maint-next-date" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Fecha Límite Próximo Servicio *</label>
                <input
                  id="maint-next-date"
                  type="date"
                  className="form-input"
                  value={maintProximoFecha}
                  onChange={e => setMaintProximoFecha(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                  required
                />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Adjuntar Facturas / Soportes de Mantenimiento</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, padding: '8px 14px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: '#fafafa', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {uploadingSoporte ? '⏳ Subiendo...' : '📁 Seleccionar Archivo'}
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      onChange={handleUploadSoporte}
                      disabled={uploadingSoporte}
                    />
                  </label>
                  {uploadingSoporte && <span style={{ fontSize: '0.8rem', color: '#666' }}>Subiendo documento...</span>}
                </div>

                {maintSoportes.length > 0 && (
                  <div className="soportes-list" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {maintSoportes.map((s, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '8px 12px', 
                          backgroundColor: '#f5f5f5', 
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          border: '1px solid #e0e0e0'
                        }}
                      >
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px', fontWeight: 'bold', color: '#333' }}>
                          📄 {s.nombre}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveSoporte(idx)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#c62828',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            padding: '0 4px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="maint-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid var(--color-border-light)', paddingTop: '15px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowMaintModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  disabled={maintLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-success"
                  style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                  disabled={maintLoading || uploadingSoporte}
                >
                  {maintLoading ? 'Guardando...' : '💾 Registrar Mantenimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Add / Edit Equipment Form Modal ===== */}
      {showEquipFormModal && (
        <div className="maint-modal-overlay" onClick={() => setShowEquipFormModal(false)}>
          <div className="maint-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="maint-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary-dark)', textAlign: 'left' }}>
                {isEditing ? `✏️ Editar Ficha Técnica: ${formId}` : '➕ Registrar Nuevo Equipo en el Sistema'}
              </h3>
              <button className="maint-modal-close" onClick={() => setShowEquipFormModal(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <form onSubmit={handleSaveEquipment} className="maint-modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {formError && <div className="error-alert" style={{ padding: '10px 14px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'left' }}>⚠️ {formError}</div>}
              {formSuccess && <div className="success-alert" style={{ padding: '10px 14px', backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'left' }}>✅ {formSuccess}</div>}

              {/* Code / Sticker input (Only editable during creation) */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' }}>
                <label className="form-label" htmlFor="equip-sticker" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Código / Sticker del Equipo (Código de Barras/QR) *</label>
                <input
                  id="equip-sticker"
                  type="text"
                  className="form-input"
                  placeholder="Ej: EQ-1002 o ADM 000002539 (Pistolea el código aquí)"
                  value={formId}
                  onChange={e => setFormId(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                  disabled={isEditing}
                  required
                  autoFocus
                />
                <span style={{ fontSize: '0.72rem', color: '#888' }}>
                  {isEditing ? 'El código identificador único (Sticker) no se puede modificar.' : 'Consejo: Enfoca esta casilla y usa el lector de códigos de barra físico para rellenarlo al instante.'}
                </span>
              </div>

              {/* Nombre / Tipo */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' }}>
                <label className="form-label" htmlFor="equip-name" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Nombre / Tipo de Equipo *</label>
                <input
                  id="equip-name"
                  type="text"
                  className="form-input"
                  placeholder="Ej: Impresora Térmica, Nevera Horizontal, Pantalla Monitor"
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                  required
                />
                {/* Suggestions list based on user's branch role */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {([9, 16].includes(userRole) ? ['Computador', 'Impresora Térmica', 'Pantalla Monitor', 'Lector de Barras', 'Servidor', 'Switch Red', 'UPS', 'Tablet'] :
                    [4, 12].includes(userRole) ? ['Nevera Comercial', 'Licuadora Industrial', 'Estufa a Gas', 'Plancha de Cocina', 'Horno Convector', 'Calentador de Agua', 'Aire Acondicionado', 'Extractor de Humo'] :
                    ['Computador', 'Impresora Térmica', 'Pantalla Monitor', 'Nevera Comercial', 'Licuadora Industrial', 'Estufa a Gas', 'Horno Convector', 'Aire Acondicionado']
                  ).map(sug => (
                    <span 
                      key={sug}
                      onClick={() => setFormNombre(sug)}
                      style={{ 
                        fontSize: '0.72rem', 
                        padding: '4px 10px', 
                        backgroundColor: '#f5f5f5', 
                        borderRadius: '12px', 
                        cursor: 'pointer',
                        color: '#555',
                        border: formNombre === sug ? '1px solid var(--color-primary)' : '1px solid #e0e0e0',
                        fontWeight: formNombre === sug ? 'bold' : 'normal'
                      }}
                    >
                      {sug}
                    </span>
                  ))}
                </div>
              </div>

              {/* PDV Select */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' }}>
                <label className="form-label" htmlFor="equip-pdv" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Ubicación (Punto de Venta) *</label>
                <select
                  id="equip-pdv"
                  className="form-select"
                  value={formPdvId}
                  onChange={e => setFormPdvId(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: '#fff' }}
                  required
                >
                  <option value="">-- Seleccionar PDV --</option>
                  {pdvs.map(p => (
                    <option key={p.id} value={p.id}>{p.ciudad_nombre} - {p.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'left' }}>
                {/* Marca */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label className="form-label" htmlFor="equip-brand" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Marca</label>
                  <input
                    id="equip-brand"
                    type="text"
                    className="form-input"
                    placeholder="Ej: Epson, Samsung, Rational"
                    value={formMarca}
                    onChange={e => setFormMarca(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                  />
                </div>
                {/* Modelo */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label className="form-label" htmlFor="equip-model" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Modelo</label>
                  <input
                    id="equip-model"
                    type="text"
                    className="form-input"
                    placeholder="Ej: TM-T20II"
                    value={formModelo}
                    onChange={e => setFormModelo(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                  />
                </div>
                {/* Serie */}
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label className="form-label" htmlFor="equip-serial" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Número de Serie</label>
                  <input
                    id="equip-serial"
                    type="text"
                    className="form-input"
                    placeholder="Ej: ABC123XYZ"
                    value={formSerie}
                    onChange={e => setFormSerie(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Proximo Mantenimiento */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' }}>
                <label className="form-label" htmlFor="equip-next-maint" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Fecha Próximo Mantenimiento Límite</label>
                <input
                  id="equip-next-maint"
                  type="date"
                  className="form-input"
                  value={formProximoMantenimiento}
                  onChange={e => setFormProximoMantenimiento(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                />
              </div>

              {/* Technical specifications key-value builder */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', margin: 0 }}>🔌 Ficha Técnica / Especificaciones Especiales</label>
                  <button type="button" onClick={handleAddTechSpec} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}>
                    ➕ Agregar Especificidad
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {techSpecs.map((spec, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Ej: Memoria RAM, Voltaje, Capacidad"
                        value={spec.key}
                        onChange={e => handleTechSpecChange(idx, 'key', e.target.value)}
                        style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.8rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Ej: 8 GB, 220V, 400 Litros"
                        value={spec.value}
                        onChange={e => handleTechSpecChange(idx, 'value', e.target.value)}
                        style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.8rem' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTechSpec(idx)}
                        style={{ border: 'none', background: 'none', color: '#c62828', fontSize: '1.2rem', cursor: 'pointer' }}
                        disabled={techSpecs.length <= 1}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid var(--color-border-light)', paddingTop: '15px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowEquipFormModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-success"
                  style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                  disabled={formLoading}
                >
                  {formLoading ? 'Guardando...' : '💾 Registrar/Guardar Equipo'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .scanner-page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        /* ===== Maintenance Modal ===== */
        .maint-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .maint-modal {
          background-color: #fff;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
          max-width: 550px;
          width: 100%;
          padding: 24px;
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
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
