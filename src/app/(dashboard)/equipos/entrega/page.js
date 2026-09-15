'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ================ CONSTANTS ================
const STEPS = [
  { id: 1, title: 'Datos del Receptor', icon: '👤' },
  { id: 2, title: 'Equipos a Entregar', icon: '💻' },
  { id: 3, title: 'Observaciones', icon: '📝' },
];

const EQUIPO_VACIO = {
  descripcion: '', tipo: '', placa: '', marca: '', modelo: '', serie: '',
  placaMonitor: '', serieMonitor: '', nombrePC: '', ipPC: '',
  soW11: false, soW10: false, soW08: false,
  antivirus: false, anydesk: false, aloha: false, erpSiesa: false, office: false, libreOffice: false,
};

const ESTADO_LABELS = {
  pendiente: { text: 'Pendiente de Firma', color: '#D97706', bg: '#FEF9C3', icon: '⏳' },
  firmada: { text: 'Firmada', color: '#16A34A', bg: '#DCFCE7', icon: '✅' },
  descargada: { text: 'Descargada', color: '#2563EB', bg: '#DBEAFE', icon: '📥' },
};

// ================ SIGNATURE PAD MODAL ================
function SignaturePad({ label, onSignatureChange, signatureData }) {
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize canvas only when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    // Give modal animation time to finish before setting size
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      const rect = parent.getBoundingClientRect();
      
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 2;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }, 150);
    
    return () => clearTimeout(timer);
  }, [isOpen]);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }, []);

  const startDrawing = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleSave = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSignatureChange(dataUrl);
    setIsOpen(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  return (
    <div className="ent-sig-container">
      <label className="ent-label">{label}</label>
      
      {signatureData ? (
        <div className="ent-sig-preview">
          <img src={signatureData} alt="Firma" className="ent-sig-img" />
          <button type="button" className="ent-btn-text danger" onClick={() => onSignatureChange(null)}>
            🗑️ Borrar Firma
          </button>
        </div>
      ) : (
        <button type="button" className="ent-btn-open-sig" onClick={() => setIsOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Abrir Panel de Firma
        </button>
      )}

      {isOpen && (
        <div className="ent-modal-overlay">
          <div className="ent-modal-content">
            <h3>{label}</h3>
            <p className="ent-modal-desc">Firme en el recuadro blanco utilizando su dedo o mouse.</p>
            
            <div className="ent-modal-canvas-wrap">
              <canvas
                ref={canvasRef}
                className="ent-modal-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            
            <div className="ent-modal-actions">
              <button type="button" className="ent-btn-modal cancel" onClick={() => setIsOpen(false)}>Cancelar</button>
              <button type="button" className="ent-btn-modal clear" onClick={handleClear}>Limpiar</button>
              <button type="button" className="ent-btn-modal save" onClick={handleSave}>Guardar Firma</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================ MAIN PAGE ================
export default function EntregaEquipoPage() {
  // View state: 'list' | 'create' | 'sign'
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // List state
  const [actas, setActas] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState('');

  // Create wizard state
  const [step, setStep] = useState(1);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [quienRecibe, setQuienRecibe] = useState('');
  const [cedula, setCedula] = useState('');
  const [cargo, setCargo] = useState('');
  const [area, setArea] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [tipoUbicacion, setTipoUbicacion] = useState('pdv');
  const [equipos, setEquipos] = useState([{ ...EQUIPO_VACIO }]);
  const [observaciones, setObservaciones] = useState('');

  // Equipment search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSearchIdx, setActiveSearchIdx] = useState(null);

  // Sign view state
  const [selectedActa, setSelectedActa] = useState(null);
  const [entregaNombre, setEntregaNombre] = useState('');
  const [entregaCedula, setEntregaCedula] = useState('');
  const [firmaEntrega, setFirmaEntrega] = useState(null);
  const [firmaRecibe, setFirmaRecibe] = useState(null);

  // ---- Load actas on mount ----
  useEffect(() => { loadActas(); }, []);

  const loadActas = async () => {
    setListLoading(true);
    try {
      const url = filterEstado ? `/api/equipos/acta-entrega?estado=${filterEstado}` : '/api/equipos/acta-entrega';
      const res = await fetch(url);
      const data = await res.json();
      setActas(data.actas || []);
    } catch (e) {
      console.error('Error loading actas:', e);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { loadActas(); }, [filterEstado]);

  // Auto-fill entrega name from logged user
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setEntregaNombre(u.nombre || '');
      }
    } catch (e) {}
  }, []);

  // ---- Equipment search ----
  const searchEquipo = async (query) => {
    if (!query || query.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/equipos?id=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.equipo) setSearchResults([data.equipo]);
      else if (data.equipos_sugeridos) setSearchResults(data.equipos_sugeridos);
      else setSearchResults([]);
    } catch (e) { setSearchResults([]); }
    finally { setSearchLoading(false); }
  };

  const selectEquipoFromSearch = (eq, idx) => {
    const updated = [...equipos];
    updated[idx] = {
      ...updated[idx],
      descripcion: eq.nombre || '', tipo: eq.modelo || '', placa: eq.id || '',
      marca: eq.marca || '', modelo: eq.modelo || '', serie: eq.serie || '',
    };
    setEquipos(updated);
    setSearchResults([]);
    setSearchQuery('');
    setActiveSearchIdx(null);
  };

  const addEquipo = () => { if (equipos.length < 14) setEquipos([...equipos, { ...EQUIPO_VACIO }]); };
  const removeEquipo = (idx) => { if (equipos.length > 1) setEquipos(equipos.filter((_, i) => i !== idx)); };
  const updateEquipo = (idx, field, value) => {
    const updated = [...equipos];
    updated[idx] = { ...updated[idx], [field]: value };
    setEquipos(updated);
  };

  // Validation
  const canProceed = () => {
    if (step === 1) return quienRecibe.trim() && cedula.trim() && cargo.trim() && area.trim() && ciudad.trim();
    if (step === 2) return equipos.some(eq => eq.descripcion.trim());
    return true;
  };

  // ---- Save Acta (Jefe) ----
  const handleSaveActa = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/equipos/acta-entrega', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha, quienRecibe, cedula, cargo, area, ciudad, tipoUbicacion,
          equipos: equipos.filter(eq => eq.descripcion.trim()),
          observaciones,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('¡Acta creada exitosamente! El auxiliar ya puede firmarla.');
      resetCreateForm();
      setView('list');
      loadActas();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setStep(1);
    setFecha(new Date().toISOString().split('T')[0]);
    setQuienRecibe(''); setCedula(''); setCargo(''); setArea(''); setCiudad('');
    setTipoUbicacion('pdv');
    setEquipos([{ ...EQUIPO_VACIO }]);
    setObservaciones('');
  };

  // ---- Open Sign View ----
  const openSignView = async (actaId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/equipos/acta-entrega?id=${actaId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedActa(data.acta);
      setFirmaEntrega(null);
      setFirmaRecibe(null);
      setView('sign');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Sign & Download ----
  const handleSignAndDownload = async () => {
    if (!firmaEntrega || !firmaRecibe) {
      setError('Ambas firmas son requeridas');
      return;
    }
    if (!entregaNombre.trim() || !entregaCedula.trim()) {
      setError('Nombre y cédula de quien entrega son requeridos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Save signatures
      const signRes = await fetch('/api/equipos/acta-entrega', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedActa.id,
          nombreEntrega: entregaNombre,
          cedulaEntrega: entregaCedula,
          firmaEntrega,
          firmaRecibe,
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error);

      // 2. Download Excel
      const dlRes = await fetch(`/api/equipos/acta-entrega?id=${selectedActa.id}&action=download`);
      if (!dlRes.ok) {
        const errData = await dlRes.json();
        throw new Error(errData.error || 'Error descargando');
      }
      const blob = await dlRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Acta_Entrega_${(selectedActa.quien_recibe || '').replace(/\s+/g, '_')}_${selectedActa.fecha}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('¡Acta firmada y descargada exitosamente!');
      setView('list');
      loadActas();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Re-download already signed acta ----
  const handleRedownload = async (actaId, nombre, fechaActa) => {
    try {
      const res = await fetch(`/api/equipos/acta-entrega?id=${actaId}&action=download`);
      if (!res.ok) throw new Error('Error descargando');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Acta_Entrega_${(nombre || '').replace(/\s+/g, '_')}_${fechaActa}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  // ---- Delete acta ----
  const handleDelete = async (actaId) => {
    if (!confirm('¿Está seguro de eliminar esta acta?')) return;
    try {
      const res = await fetch(`/api/equipos/acta-entrega?id=${actaId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error eliminando');
      loadActas();
    } catch (err) {
      setError(err.message);
    }
  };

  // ===================== RENDER =====================
  return (
    <>
      <div className="ent-page">
        {/* Alerts */}
        {error && <div className="ent-alert error" onClick={() => setError('')}>⚠️ {error}</div>}
        {success && <div className="ent-alert success">✅ {success}</div>}

        {/* ============== LIST VIEW ============== */}
        {view === 'list' && (
          <div className="ent-animate">
            <div className="ent-list-header">
              <h2 className="ent-title">📋 Actas de Entrega de Equipos</h2>
            </div>

            {/* Filters */}
            <div className="ent-filters">
              <button className={`ent-filter-btn ${filterEstado === '' ? 'active' : ''}`} onClick={() => setFilterEstado('')}>Todas</button>
              <button className={`ent-filter-btn ${filterEstado === 'pendiente' ? 'active' : ''}`} onClick={() => setFilterEstado('pendiente')}>🏆 Pendientes</button>
              <button className={`ent-filter-btn ${filterEstado === 'firmada' ? 'active' : ''}`} onClick={() => setFilterEstado('firmada')}>✅ Firmadas</button>
            </div>

            {listLoading ? (
              <div className="ent-loading">
                <div className="ent-spinner-lg"></div>
                <p>Cargando actas...</p>
              </div>
            ) : actas.length === 0 ? (
              <div className="ent-empty">
                <div className="ent-empty-icon">📄</div>
                <h3>No hay actas creadas</h3>
                <p>Haga clic en el botón de "Nueva Acta" para crear la primera</p>
              </div>
            ) : (
              <div className="ent-cards-list">
                {actas.map((acta) => {
                  const est = ESTADO_LABELS[acta.estado] || ESTADO_LABELS.pendiente;
                  return (
                    <div key={acta.id} className="ent-acta-card">
                      <div className="ent-acta-card-header">
                        <span className="ent-acta-id">#</span>
                        <span className="ent-acta-date">{acta.fecha}</span>
                      </div>
                      <div className="ent-acta-card-body">
                        <div className="ent-acta-field">
                          <label>RECEPTOR:</label>
                          <div className="ent-acta-value">{acta.quien_recibe}</div>
                        </div>
                        <div className="ent-acta-field">
                          <label>CÉDULA:</label>
                          <div className="ent-acta-value">{acta.cedula_recibe}</div>
                        </div>
                        <div className="ent-acta-field">
                          <label>CIUDAD:</label>
                          <div className="ent-acta-value">{acta.ciudad}</div>
                        </div>
                        <div className="ent-acta-field">
                          <label>CREADO POR:</label>
                          <div className="ent-acta-value">{acta.creador_nombre || '—'}</div>
                        </div>
                      </div>
                      <div className="ent-acta-card-footer">
                        <div className="ent-acta-estado">
                          <span className="ent-badge-estado" style={{ color: est.color, borderColor: est.color, background: est.bg }}>
                            {est.icon} {est.text}
                          </span>
                        </div>
                        <div className="ent-acta-actions">
                          {acta.estado === 'pendiente' && (
                            <button className="ent-btn-action sign-card" onClick={() => openSignView(acta.id)} title="Firmar">
                              ✍️ Firmar
                            </button>
                          )}
                          {acta.estado === 'firmada' && (
                            <button className="ent-btn-action download-card" onClick={() => handleRedownload(acta.id, acta.quien_recibe, acta.fecha)} title="Descargar">
                              📥 Descargar
                            </button>
                          )}
                          <button className="ent-btn-action delete-card" onClick={() => handleDelete(acta.id)} title="Eliminar">
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="ent-fab" onClick={() => { resetCreateForm(); setView('create'); }}>
              ➕ Nueva Acta
            </button>
          </div>
        )}

        {/* ============== CREATE VIEW (WIZARD) ============== */}
        {view === 'create' && (
          <div className="ent-animate">
            <button className="ent-btn-text" onClick={() => setView('list')}>← Volver a la lista</button>

            {/* Steps Progress */}
            <div className="ent-steps-bar">
              {STEPS.map((s) => (
                <div key={s.id} className={`ent-step ${step === s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}
                     onClick={() => { if (s.id < step) setStep(s.id); }}>
                  <div className="ent-step-dot">{step > s.id ? '✓' : s.icon}</div>
                  <span className="ent-step-text">{s.title}</span>
                </div>
              ))}
            </div>

            {/* Step 1: Receptor */}
            {step === 1 && (
              <div className="ent-card ent-animate">
                <div className="ent-card-head">
                  <h2>👤 Datos del Receptor</h2>
                  <p>Información de quien recibirá los equipos</p>
                </div>
                <div className="ent-grid-2">
                  <div className="ent-field">
                    <label className="ent-label">Fecha de Entrega</label>
                    <input type="date" className="ent-input" value={fecha} onChange={e => setFecha(e.target.value)} />
                  </div>
                  <div className="ent-field">
                    <label className="ent-label">Nombre Completo *</label>
                    <input className="ent-input" placeholder="Nombre de quien recibe" value={quienRecibe} onChange={e => setQuienRecibe(e.target.value)} />
                  </div>
                  <div className="ent-field">
                    <label className="ent-label">Cédula *</label>
                    <input className="ent-input" placeholder="Número de cédula" value={cedula} onChange={e => setCedula(e.target.value)} />
                  </div>
                  <div className="ent-field">
                    <label className="ent-label">Cargo *</label>
                    <input className="ent-input" placeholder="Cargo del receptor" value={cargo} onChange={e => setCargo(e.target.value)} />
                  </div>
                  <div className="ent-field">
                    <label className="ent-label">Área *</label>
                    <input className="ent-input" placeholder="Área de trabajo" value={area} onChange={e => setArea(e.target.value)} />
                  </div>
                  <div className="ent-field">
                    <label className="ent-label">Ciudad *</label>
                    <input className="ent-input" placeholder="Ciudad" value={ciudad} onChange={e => setCiudad(e.target.value)} />
                  </div>
                  <div className="ent-field ent-full">
                    <label className="ent-label">Tipo de Ubicación</label>
                    <div className="ent-radio-row">
                      <label className={`ent-radio-card ${tipoUbicacion === 'oficinas' ? 'on' : ''}`}>
                        <input type="radio" name="ub" value="oficinas" checked={tipoUbicacion === 'oficinas'} onChange={() => setTipoUbicacion('oficinas')} />
                        <span className="ent-radio-ico">🏢</span><span>Oficinas ADM / LOG</span>
                      </label>
                      <label className={`ent-radio-card ${tipoUbicacion === 'pdv' ? 'on' : ''}`}>
                        <input type="radio" name="ub" value="pdv" checked={tipoUbicacion === 'pdv'} onChange={() => setTipoUbicacion('pdv')} />
                        <span className="ent-radio-ico">🏪</span><span>Puntos de Venta</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Equipos */}
            {step === 2 && (
              <div className="ent-card ent-animate">
                <div className="ent-card-head">
                  <h2>💻 Equipos a Entregar</h2>
                  <p>Agregue los equipos ({equipos.length}/14)</p>
                </div>
                {equipos.map((eq, idx) => (
                  <div key={idx} className="ent-equipo-block">
                    <div className="ent-equipo-top">
                      <h3>Equipo #{idx + 1}</h3>
                      <div className="ent-equipo-actions">
                        <button className="ent-btn-inv" onClick={() => setActiveSearchIdx(activeSearchIdx === idx ? null : idx)}>🔍 Inventario</button>
                        {equipos.length > 1 && <button className="ent-btn-del" onClick={() => removeEquipo(idx)}>✕</button>}
                      </div>
                    </div>
                    {activeSearchIdx === idx && (
                      <div className="ent-search-box">
                        <input className="ent-input" placeholder="Buscar por placa, serie, nombre..." value={searchQuery}
                          onChange={e => { setSearchQuery(e.target.value); searchEquipo(e.target.value); }} autoFocus />
                        {searchLoading && <span className="ent-search-status">Buscando...</span>}
                        {searchResults.length > 0 && (
                          <div className="ent-search-drop">
                            {searchResults.map((r, ri) => (
                              <div key={ri} className="ent-search-item" onClick={() => selectEquipoFromSearch(r, idx)}>
                                <strong>{r.nombre || r.id}</strong>
                                <span>{r.marca} {r.modelo}</span>
                                <span className="ent-search-tag">{r.id}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="ent-grid-3">
                      <div className="ent-field"><label className="ent-label-sm">Descripción *</label><input className="ent-input" placeholder="Ej: Computador Portátil" value={eq.descripcion} onChange={e => updateEquipo(idx, 'descripcion', e.target.value)} /></div>
                      <div className="ent-field"><label className="ent-label-sm">Tipo</label><input className="ent-input" placeholder="Ej: Laptop" value={eq.tipo} onChange={e => updateEquipo(idx, 'tipo', e.target.value)} /></div>
                      <div className="ent-field"><label className="ent-label-sm">Placa</label><input className="ent-input" placeholder="Placa" value={eq.placa} onChange={e => updateEquipo(idx, 'placa', e.target.value)} /></div>
                      <div className="ent-field"><label className="ent-label-sm">Marca</label><input className="ent-input" placeholder="Marca" value={eq.marca} onChange={e => updateEquipo(idx, 'marca', e.target.value)} /></div>
                      <div className="ent-field"><label className="ent-label-sm">Modelo</label><input className="ent-input" placeholder="Modelo" value={eq.modelo} onChange={e => updateEquipo(idx, 'modelo', e.target.value)} /></div>
                      <div className="ent-field"><label className="ent-label-sm">Serie</label><input className="ent-input" placeholder="Serie" value={eq.serie} onChange={e => updateEquipo(idx, 'serie', e.target.value)} /></div>
                    </div>
                    
                    <div className="ent-equipo-sub">Datos Adicionales (Opcional)</div>
                    <div className="ent-grid-4">
                      <div className="ent-field"><label className="ent-label-sm">Placa Monitor</label><input className="ent-input" placeholder="N/A" value={eq.placaMonitor} onChange={e => updateEquipo(idx, 'placaMonitor', e.target.value)} /></div>
                      <div className="ent-field"><label className="ent-label-sm">Serie Monitor</label><input className="ent-input" placeholder="N/A" value={eq.serieMonitor} onChange={e => updateEquipo(idx, 'serieMonitor', e.target.value)} /></div>
                      <div className="ent-field"><label className="ent-label-sm">Nombre PC</label><input className="ent-input" placeholder="N/A" value={eq.nombrePC} onChange={e => updateEquipo(idx, 'nombrePC', e.target.value)} /></div>
                      <div className="ent-field"><label className="ent-label-sm">IP PC / IMP</label><input className="ent-input" placeholder="N/A" value={eq.ipPC} onChange={e => updateEquipo(idx, 'ipPC', e.target.value)} /></div>
                    </div>
                    <div className="ent-checks">
                      <div className="ent-checks-row">
                        <span className="ent-checks-label">SO:</span>
                        <label className="ent-chk"><input type="checkbox" checked={eq.soW11} onChange={e => updateEquipo(idx, 'soW11', e.target.checked)} /> W11</label>
                        <label className="ent-chk"><input type="checkbox" checked={eq.soW10} onChange={e => updateEquipo(idx, 'soW10', e.target.checked)} /> W10</label>
                        <label className="ent-chk"><input type="checkbox" checked={eq.soW08} onChange={e => updateEquipo(idx, 'soW08', e.target.checked)} /> W08</label>
                      </div>
                      <div className="ent-checks-row">
                        <span className="ent-checks-label">Verificación:</span>
                        <label className="ent-chk"><input type="checkbox" checked={eq.antivirus} onChange={e => updateEquipo(idx, 'antivirus', e.target.checked)} /> Antivirus</label>
                        <label className="ent-chk"><input type="checkbox" checked={eq.anydesk} onChange={e => updateEquipo(idx, 'anydesk', e.target.checked)} /> Anydesk</label>
                        <label className="ent-chk"><input type="checkbox" checked={eq.aloha} onChange={e => updateEquipo(idx, 'aloha', e.target.checked)} /> Aloha</label>
                        <label className="ent-chk"><input type="checkbox" checked={eq.erpSiesa} onChange={e => updateEquipo(idx, 'erpSiesa', e.target.checked)} /> ERP Siesa</label>
                        <label className="ent-chk"><input type="checkbox" checked={eq.office} onChange={e => updateEquipo(idx, 'office', e.target.checked)} /> Office</label>
                        <label className="ent-chk"><input type="checkbox" checked={eq.libreOffice} onChange={e => updateEquipo(idx, 'libreOffice', e.target.checked)} /> Libre Office</label>
                      </div>
                    </div>
                  </div>
                ))}
                {equipos.length < 14 && (
                  <button className="ent-btn-add" onClick={addEquipo}>➕ Agregar Equipo</button>
                )}
              </div>
            )}

            {/* Step 3: Observaciones + Save */}
            {step === 3 && (
              <div className="ent-card ent-animate">
                <div className="ent-card-head">
                  <h2>📝 Observaciones y Guardar</h2>
                  <p>Agregue observaciones generales y guarde el acta</p>
                </div>
                <div className="ent-field ent-full">
                  <label className="ent-label">Observaciones Generales</label>
                  <textarea className="ent-textarea" rows={4} placeholder="Ej: Se realiza entrega de Radios con sus cargadores y Diademas originales"
                    value={observaciones} onChange={e => setObservaciones(e.target.value)} />
                </div>

                {/* Summary before saving */}
                <div className="ent-summary">
                  <h3>📋 Resumen del Acta</h3>
                  <div className="ent-summary-grid">
                    <div className="ent-summary-item"><span>Receptor:</span><strong>{quienRecibe}</strong></div>
                    <div className="ent-summary-item"><span>Cédula:</span><strong>{cedula}</strong></div>
                    <div className="ent-summary-item"><span>Cargo:</span><strong>{cargo}</strong></div>
                    <div className="ent-summary-item"><span>Ciudad:</span><strong>{ciudad}</strong></div>
                    <div className="ent-summary-item"><span>Equipos:</span><strong>{equipos.filter(eq => eq.descripcion.trim()).length} equipo(s)</strong></div>
                    <div className="ent-summary-item"><span>Fecha:</span><strong>{fecha}</strong></div>
                  </div>
                </div>

                <button className="ent-btn-save" onClick={handleSaveActa} disabled={loading}>
                  {loading ? <><span className="ent-spinner"></span> Guardando...</> : <>💾 Guardar Acta</>}
                </button>
                <p className="ent-hint">Una vez guardada, el auxiliar podrá abrir esta acta para recoger las firmas y descargar el Excel.</p>
              </div>
            )}

            {/* Nav Buttons */}
            <div className="ent-nav">
              {step > 1 && <button className="ent-btn-back" onClick={() => setStep(step - 1)}>← Anterior</button>}
              {step < 3 && <button className="ent-btn-next" onClick={() => setStep(step + 1)} disabled={!canProceed()}>Siguiente →</button>}
            </div>
          </div>
        )}

        {/* ============== SIGN VIEW ============== */}
        {view === 'sign' && selectedActa && (
          <div className="ent-animate">
            <button className="ent-btn-text" onClick={() => setView('list')}>← Volver a la lista</button>

            <div className="ent-card">
              <div className="ent-card-head">
                <h2>📄 Acta de Entrega #{selectedActa.id}</h2>
                <p>Revise los datos y recolecte las firmas</p>
              </div>

              {/* READ-ONLY DATA */}
              <div className="ent-readonly-section">
                <h3>👤 Datos del Receptor</h3>
                <div className="ent-ro-grid">
                  <div className="ent-ro-item"><span>Fecha:</span><strong>{selectedActa.fecha}</strong></div>
                  <div className="ent-ro-item"><span>Nombre:</span><strong>{selectedActa.quien_recibe}</strong></div>
                  <div className="ent-ro-item"><span>Cédula:</span><strong>{selectedActa.cedula_recibe}</strong></div>
                  <div className="ent-ro-item"><span>Cargo:</span><strong>{selectedActa.cargo}</strong></div>
                  <div className="ent-ro-item"><span>Área:</span><strong>{selectedActa.area}</strong></div>
                  <div className="ent-ro-item"><span>Ciudad:</span><strong>{selectedActa.ciudad}</strong></div>
                  <div className="ent-ro-item"><span>Ubicación:</span><strong>{selectedActa.tipo_ubicacion === 'oficinas' ? '🏢 Oficinas' : '🏪 PDV'}</strong></div>
                </div>
              </div>

              <div className="ent-readonly-section">
                <h3>💻 Equipos a Entregar ({selectedActa.equipos_lista?.length || 0})</h3>
                <div className="ent-table-wrapper">
                  <table className="ent-table compact">
                    <thead>
                      <tr><th>#</th><th>Descripción</th><th>Tipo</th><th>Placa</th><th>Marca</th><th>Modelo</th><th>Serie</th></tr>
                    </thead>
                    <tbody>
                      {(selectedActa.equipos_lista || []).map((eq, i) => (
                        <tr key={i}><td>{i + 1}</td><td>{eq.descripcion}</td><td>{eq.tipo}</td><td>{eq.placa}</td><td>{eq.marca}</td><td>{eq.modelo}</td><td>{eq.serie}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedActa.observaciones && (
                <div className="ent-readonly-section">
                  <h3>📝 Observaciones</h3>
                  <p className="ent-ro-obs">{selectedActa.observaciones}</p>
                </div>
              )}

              {/* LEGAL TEXT */}
              <div className="ent-legal">
                <p>Por medio de este formato se hace entrega de los dispositivos tecnológicos requeridos para desempeñar adecuadamente sus funciones dentro de la compañía. Recuerde que el cuidado, correcto trato y funcionamiento del dispositivo es de su absoluta responsabilidad. No está autorizado la instalación de software en los equipos salvo aquellos aplicativos autorizados por Tecnología e instalados únicamente por el personal de dicha área. En caso de pérdida, robo, daño, uso indebido e instalación de software no autorizado en el equipo y/o de sus componentes, será objeto de investigación por parte del área de Gestión Humana y Seguridad para los correspondientes procesos disciplinarios.</p>
              </div>

              {/* SIGNATURES */}
              <div className="ent-sign-section">
                <h3>✍️ Firmas Requeridas</h3>
                <div className="ent-sign-grid">
                  <div className="ent-sign-col">
                    <h4>Quien Entrega</h4>
                    <div className="ent-field">
                      <label className="ent-label">Nombre *</label>
                      <input className="ent-input" value={entregaNombre} onChange={e => setEntregaNombre(e.target.value)} placeholder="Nombre completo" />
                    </div>
                    <div className="ent-field">
                      <label className="ent-label">Cédula *</label>
                      <input className="ent-input" value={entregaCedula} onChange={e => setEntregaCedula(e.target.value)} placeholder="Número de cédula" />
                    </div>
                    <SignaturePad label="Firma" onSignatureChange={setFirmaEntrega} signatureData={firmaEntrega} />
                  </div>
                  <div className="ent-sign-col">
                    <h4>Quien Recibe</h4>
                    <div className="ent-field">
                      <label className="ent-label">Nombre</label>
                      <input className="ent-input" value={selectedActa.quien_recibe} disabled />
                    </div>
                    <div className="ent-field">
                      <label className="ent-label">Cédula</label>
                      <input className="ent-input" value={selectedActa.cedula_recibe} disabled />
                    </div>
                    <SignaturePad label="Firma" onSignatureChange={setFirmaRecibe} signatureData={firmaRecibe} />
                  </div>
                </div>
              </div>

              <button className="ent-btn-generate" onClick={handleSignAndDownload} disabled={loading}>
                {loading ? <><span className="ent-spinner"></span> Procesando...</> : <>✍️ Firmar y Descargar Excel</>}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .ent-page { max-width: 1200px; margin: 0 auto; padding: var(--spacing-lg); min-height: 100vh; background-color: #F9F1E7; }

        /* Alerts */
        .ent-alert { padding: 14px 18px; border-radius: var(--radius-lg); margin-bottom: var(--spacing-md); font-size: 0.88rem; font-weight: 500; animation: entSlide 0.3s ease; cursor: pointer; }
        .ent-alert.error { background: var(--color-red-bg); color: var(--color-red); border: 1px solid var(--color-red); }
        .ent-alert.success { background: var(--color-green-bg); color: var(--color-success); border: 1px solid var(--color-green); }

        /* List Header */
        .ent-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg); flex-wrap: wrap; gap: var(--spacing-md); }
        .ent-title { font-size: 1.4rem; color: var(--color-primary-dark); font-weight: 700; }
        .ent-subtitle { font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 4px; }

        /* Filters */
        .ent-filters { display: flex; gap: 8px; margin-bottom: var(--spacing-lg); flex-wrap: wrap; }
        .ent-filter-btn { padding: 8px 16px; border-radius: var(--radius-full); border: 1.5px solid var(--color-border); background: #fff; color: var(--color-text-secondary); font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .ent-filter-btn:hover { border-color: var(--color-primary-light); }
        .ent-filter-btn.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }

        /* Table */
        .ent-table-wrapper { overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--color-border-light); }
        .ent-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .ent-table th { background: var(--color-primary); color: #fff; padding: 12px 14px; text-align: left; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
        .ent-table td { padding: 12px 14px; border-bottom: 1px solid var(--color-border-light); color: var(--color-text-primary); }
        .ent-table tbody tr:hover { background: var(--color-bg-secondary); }
        .ent-table.compact th, .ent-table.compact td { padding: 8px 10px; font-size: 0.82rem; }
        .ent-td-id { font-weight: 700; color: var(--color-primary); }
        .ent-td-name { font-weight: 600; }

        /* Badge */
        .ent-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; white-space: nowrap; }

        /* Actions */
        .ent-actions { display: flex; gap: 6px; }
        .ent-btn-action { padding: 6px 12px; border-radius: var(--radius-md); border: 1.5px solid; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .ent-btn-action.sign { border-color: var(--color-secondary); color: var(--color-secondary-dark); background: rgba(212,168,71,0.08); }
        .ent-btn-action.sign:hover { background: var(--color-secondary); color: #fff; }
        .ent-btn-action.download { border-color: var(--color-green); color: var(--color-success); background: var(--color-green-bg); }
        .ent-btn-action.download:hover { background: var(--color-green); color: #fff; }
        .ent-btn-action.delete { border-color: var(--color-border); color: var(--color-text-muted); background: transparent; }
        .ent-btn-action.delete:hover { border-color: var(--color-red); color: var(--color-red); background: var(--color-red-bg); }

        /* Buttons */
        .ent-btn-primary { padding: 12px 24px; background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light)); color: #fff; border: none; border-radius: var(--radius-lg); font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(107,58,42,0.25); }
        .ent-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(107,58,42,0.35); }
        .ent-btn-text { padding: 8px 0; background: none; border: none; color: var(--color-primary); font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .ent-btn-text:hover { opacity: 0.7; }
        .ent-btn-text.danger { color: var(--color-red); font-size: 0.78rem; }

        /* Empty / Loading */
        .ent-loading { text-align: center; padding: 60px 0; color: var(--color-text-secondary); }
        .ent-spinner-lg { width: 40px; height: 40px; border: 4px solid var(--color-border); border-top: 4px solid var(--color-primary); border-radius: 50%; animation: entSpin 0.8s linear infinite; margin: 0 auto 16px; }
        .ent-empty { text-align: center; padding: 80px 20px; background: var(--color-bg-card); border-radius: var(--radius-xl); border: 2px dashed var(--color-border); }
        .ent-empty-icon { font-size: 3rem; margin-bottom: 12px; }
        .ent-empty h3 { color: var(--color-text-primary); margin-bottom: 8px; }
        .ent-empty p { color: var(--color-text-muted); font-size: 0.88rem; }

        /* Steps Bar */
        .ent-steps-bar { display: flex; justify-content: center; background: var(--color-bg-card); border-radius: var(--radius-xl); padding: var(--spacing-md); box-shadow: var(--shadow-md); margin: var(--spacing-lg) 0; }
        .ent-step { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: var(--spacing-sm) var(--spacing-xl); flex: 1; min-width: 90px; cursor: default; transition: all 0.3s; position: relative; }
        .ent-step.done { cursor: pointer; }
        .ent-step::after { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 1px; height: 40%; background: var(--color-border); }
        .ent-step:last-child::after { display: none; }
        .ent-step-dot { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; background: var(--color-bg-secondary); border: 2px solid var(--color-border); transition: all 0.3s; }
        .ent-step.active .ent-step-dot { background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light)); color: #fff; border-color: var(--color-primary); box-shadow: 0 4px 15px rgba(107,58,42,0.3); transform: scale(1.1); }
        .ent-step.done .ent-step-dot { background: var(--color-green); color: #fff; border-color: var(--color-green); }
        .ent-step-text { font-size: 0.7rem; font-weight: 600; color: var(--color-text-muted); text-align: center; }
        .ent-step.active .ent-step-text { color: var(--color-primary); }
        .ent-step.done .ent-step-text { color: var(--color-green); }

        /* Card */
        .ent-card { background: var(--color-bg-card); border-radius: var(--radius-xl); box-shadow: var(--shadow-md); padding: var(--spacing-xl); margin-bottom: var(--spacing-lg); border: 1px solid var(--color-border-light); }
        .ent-card-head { margin-bottom: var(--spacing-xl); padding-bottom: var(--spacing-md); border-bottom: 2px solid var(--color-bg-secondary); }
        .ent-card-head h2 { font-size: 1.25rem; color: var(--color-primary-dark); }
        .ent-card-head p { font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 4px; }

        /* Form */
        .ent-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); }
        .ent-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-md); }
        .ent-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-md); }
        .ent-field { display: flex; flex-direction: column; gap: 5px; }
        .ent-full { grid-column: 1 / -1; }
        .ent-label { font-size: 0.82rem; font-weight: 600; color: var(--color-text-primary); }
        .ent-label-sm { font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary); }
        .ent-input { padding: 10px 14px; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.88rem; color: var(--color-text-primary); background: var(--color-bg-primary); transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .ent-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(107,58,42,0.1); background: #fff; }
        .ent-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .ent-textarea { padding: 10px 14px; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.88rem; color: var(--color-text-primary); background: var(--color-bg-primary); font-family: 'Inter', sans-serif; resize: vertical; transition: all 0.2s; }
        .ent-textarea:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(107,58,42,0.1); background: #fff; }

        /* Radio cards */
        .ent-radio-row { display: flex; gap: var(--spacing-md); }
        .ent-radio-card { flex: 1; display: flex; align-items: center; gap: 8px; padding: 14px 18px; border: 2px solid var(--color-border); border-radius: var(--radius-lg); cursor: pointer; transition: all 0.2s; background: var(--color-bg-primary); }
        .ent-radio-card:hover { border-color: var(--color-primary-light); }
        .ent-radio-card.on { border-color: var(--color-primary); background: rgba(107,58,42,0.04); box-shadow: 0 0 0 3px rgba(107,58,42,0.08); }
        .ent-radio-card input { display: none; }
        .ent-radio-ico { font-size: 1.4rem; }

        /* Equipment block */
        .ent-equipo-sub { font-size: 0.75rem; font-weight: 700; color: var(--color-primary); margin: var(--spacing-md) 0 var(--spacing-sm); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--color-border-light); padding-bottom: 4px; }
        .ent-equipo-block { background: var(--color-bg-primary); border: 1.5px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg); margin-bottom: var(--spacing-md); transition: all 0.2s; }
        .ent-equipo-block:hover { border-color: var(--color-primary-light); box-shadow: var(--shadow-sm); }
        .ent-equipo-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md); }
        .ent-equipo-top h3 { font-size: 0.95rem; color: var(--color-primary); font-weight: 700; }
        .ent-equipo-actions { display: flex; gap: 8px; align-items: center; }
        .ent-btn-inv { padding: 6px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--color-secondary); background: rgba(212,168,71,0.08); color: var(--color-secondary-dark); font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .ent-btn-inv:hover { background: var(--color-secondary); color: #fff; }
        .ent-btn-del { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid var(--color-red); background: var(--color-red-bg); color: var(--color-red); font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .ent-btn-del:hover { background: var(--color-red); color: #fff; }
        .ent-btn-add { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; border: 2px dashed var(--color-primary-light); border-radius: var(--radius-lg); background: transparent; color: var(--color-primary); font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .ent-btn-add:hover { background: rgba(107,58,42,0.05); border-color: var(--color-primary); }

        /* Checkboxes */
        .ent-checks { display: flex; flex-direction: column; gap: 8px; margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px dashed var(--color-border); }
        .ent-checks-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .ent-checks-label { font-size: 0.78rem; font-weight: 700; color: var(--color-text-secondary); min-width: 100px; }
        .ent-chk { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 3px 8px; background: #fff; border-radius: var(--radius-sm); border: 1px solid var(--color-border); cursor: pointer; transition: all 0.15s; }
        .ent-chk:hover { border-color: var(--color-primary-light); }
        .ent-chk input { accent-color: var(--color-primary); }

        /* Search */
        .ent-search-box { position: relative; margin-bottom: var(--spacing-md); }
        .ent-search-status { font-size: 0.78rem; color: var(--color-text-muted); padding: 4px; }
        .ent-search-drop { position: absolute; top: 100%; left: 0; right: 0; z-index: 50; background: #fff; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); max-height: 200px; overflow-y: auto; }
        .ent-search-item { padding: 10px 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 0.85rem; border-bottom: 1px solid var(--color-border-light); transition: background 0.15s; }
        .ent-search-item:hover { background: var(--color-bg-secondary); }
        .ent-search-tag { font-size: 0.72rem; background: var(--color-bg-secondary); padding: 2px 8px; border-radius: var(--radius-sm); color: var(--color-text-muted); }

        /* Summary */
        .ent-summary { background: var(--color-bg-primary); border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); padding: var(--spacing-lg); margin: var(--spacing-xl) 0; }
        .ent-summary h3 { font-size: 1rem; color: var(--color-primary); margin-bottom: var(--spacing-md); }
        .ent-summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .ent-summary-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.85rem; border-bottom: 1px dotted var(--color-border-light); }
        .ent-summary-item span { color: var(--color-text-secondary); }
        .ent-summary-item strong { color: var(--color-text-primary); }

        /* Save */
        .ent-btn-save { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 16px; background: linear-gradient(135deg, var(--color-success), #22C55E); color: #fff; border: none; border-radius: var(--radius-lg); font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(22,163,74,0.25); }
        .ent-btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(22,163,74,0.35); }
        .ent-btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
        .ent-hint { font-size: 0.8rem; color: var(--color-text-muted); text-align: center; margin-top: var(--spacing-sm); font-style: italic; }

        /* Sign View */
        .ent-readonly-section { background: var(--color-bg-primary); border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); padding: var(--spacing-lg); margin-bottom: var(--spacing-md); }
        .ent-readonly-section h3 { font-size: 0.95rem; color: var(--color-primary); margin-bottom: var(--spacing-md); padding-bottom: 8px; border-bottom: 1px solid var(--color-border); }
        .ent-ro-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .ent-ro-item { display: flex; flex-direction: column; gap: 4px; padding: 12px; background: #fff; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); }
        .ent-ro-item span { font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .ent-ro-item strong { font-size: 0.95rem; color: var(--color-text-primary); font-weight: 700; word-break: break-word; }
        .ent-ro-obs { font-size: 0.88rem; color: var(--color-text-primary); padding: 8px 12px; background: #fff; border-radius: var(--radius-md); border: 1px solid var(--color-border-light); }
        .ent-legal { background: var(--color-yellow-bg); border: 1px solid rgba(234,179,8,0.3); border-radius: var(--radius-lg); padding: var(--spacing-md); margin-bottom: var(--spacing-md); }
        .ent-legal p { font-size: 0.78rem; color: #92400E; line-height: 1.5; }

        .ent-sign-section { margin-top: var(--spacing-lg); }
        .ent-sign-section h3 { font-size: 1.1rem; color: var(--color-primary); margin-bottom: var(--spacing-lg); text-align: center; }
        .ent-sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-xl); }
        .ent-sign-col { background: var(--color-bg-primary); border: 1.5px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg); }
        .ent-sign-col h4 { font-size: 0.95rem; color: var(--color-primary); margin-bottom: var(--spacing-md); text-align: center; }

        /* Signature Pad Modal & Preview */
        .ent-sig-container { display: flex; flex-direction: column; gap: 8px; margin-top: var(--spacing-md); }
        .ent-btn-open-sig { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 14px; background: #FFF4E5; border: 2px dashed #F5B041; border-radius: var(--radius-md); color: #B9770E; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; }
        .ent-btn-open-sig:hover { border-color: #D68910; background: #FDEBD0; color: #9C640C; transform: translateY(-1px); }
        .ent-sig-preview { display: flex; flex-direction: column; gap: 8px; align-items: center; background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--spacing-sm); }
        .ent-sig-img { max-height: 80px; object-fit: contain; }
        
        .ent-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(3px); padding: 20px; }
        .ent-modal-content { background: var(--color-bg-primary); padding: var(--spacing-xl); border-radius: var(--radius-xl); box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 100%; max-width: 800px; display: flex; flex-direction: column; }
        .ent-modal-content h3 { font-size: 1.4rem; color: var(--color-primary); margin-bottom: 8px; text-align: center; font-weight: 800; }
        .ent-modal-desc { font-size: 0.95rem; color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); text-align: center; }
        .ent-modal-canvas-wrap { width: 100%; height: 400px; background: #fff; border: 2px dashed #D6D0C4; border-radius: var(--radius-lg); overflow: hidden; touch-action: none; margin-bottom: var(--spacing-xl); transition: border-color 0.2s; }
        .ent-modal-canvas-wrap:hover { border-color: var(--color-primary); }
        .ent-modal-canvas { width: 100%; height: 100%; cursor: crosshair; display: block; }
        .ent-modal-actions { display: flex; justify-content: space-between; gap: 12px; }
        .ent-btn-modal { padding: 12px 20px; border-radius: var(--radius-md); font-weight: 600; font-size: 0.9rem; cursor: pointer; flex: 1; border: none; }
        .ent-btn-modal.cancel { background: #f3f4f6; color: var(--color-text-secondary); }
        .ent-btn-modal.clear { background: #fee2e2; color: #dc2626; }
        .ent-btn-modal.save { background: var(--color-primary); color: #fff; }

        .ent-btn-generate { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 18px; background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light)); color: #fff; border: none; border-radius: var(--radius-lg); font-size: 1.05rem; font-weight: 700; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(107,58,42,0.25); margin-top: var(--spacing-xl); }
        .ent-btn-generate:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(107,58,42,0.35); }
        .ent-btn-generate:disabled { opacity: 0.7; cursor: not-allowed; }

        /* Nav */
        .ent-nav { display: flex; justify-content: space-between; gap: var(--spacing-md); }
        .ent-btn-back { padding: 12px 24px; border: 1.5px solid var(--color-border); border-radius: var(--radius-lg); background: #fff; color: var(--color-text-secondary); font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .ent-btn-back:hover { border-color: var(--color-primary); color: var(--color-primary); }
        .ent-btn-next { padding: 12px 28px; border: none; border-radius: var(--radius-lg); background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light)); color: #fff; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s; margin-left: auto; box-shadow: 0 3px 12px rgba(107,58,42,0.2); }
        .ent-btn-next:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(107,58,42,0.3); }
        .ent-btn-next:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Spinner */
        .ent-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid #fff; border-radius: 50%; animation: entSpin 0.8s linear infinite; display: inline-block; }

        /* Animations */
        @keyframes entSlide { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes entSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .ent-animate { animation: entFadeUp 0.35s ease; }
        @keyframes entFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        /* Responsive */
        @media (max-width: 768px) {
          .ent-page { padding: var(--spacing-md); }
          .ent-grid-2, .ent-summary-grid, .ent-ro-grid { grid-template-columns: 1fr; }
          .ent-grid-3, .ent-grid-4 { grid-template-columns: 1fr 1fr; }
          .ent-sign-grid { grid-template-columns: 1fr; }
          .ent-radio-row { flex-direction: column; }
          .ent-equipo-top { flex-direction: column; align-items: flex-start; gap: 8px; }
          .ent-list-header { flex-direction: column; align-items: flex-start; }
          .ent-acta-card-body { grid-template-columns: 1fr; gap: 12px; }
        }
        @media (max-width: 480px) {
          .ent-grid-3, .ent-grid-4 { grid-template-columns: 1fr; }
          .ent-acta-card-footer { flex-direction: column; align-items: flex-start; gap: 12px; }
          .ent-acta-actions { width: 100%; justify-content: space-between; }
        }

        /* UI Mockup Card Styles */
        .ent-cards-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 80px; }
        .ent-acta-card { background: #FFFFFF; border-radius: 12px; border: 1px solid #E5E0D8; box-shadow: 0 4px 6px rgba(0,0,0,0.03); overflow: hidden; }
        .ent-acta-card-header { display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid #F0ECE4; }
        .ent-acta-id { font-weight: 800; font-size: 1.2rem; color: #4A2C21; }
        .ent-acta-date { font-weight: 700; font-size: 1.15rem; color: #4A2C21; }
        
        .ent-acta-card-body { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #F0ECE4; }
        .ent-acta-field { display: flex; flex-direction: column; gap: 4px; }
        .ent-acta-field label { font-size: 0.75rem; text-transform: uppercase; color: #333; font-weight: 600; letter-spacing: 0.5px; }
        .ent-acta-value { font-size: 1.05rem; color: #111; font-weight: 500; }
        
        .ent-acta-card-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #FFFFFF; }
        .ent-badge-estado { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; border: 1px solid; }
        .ent-acta-actions { display: flex; gap: 8px; }
        
        .ent-btn-action.sign-card, .ent-btn-action.download-card { padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; border: 1px solid; background-color: transparent; }
        .ent-btn-action.sign-card { color: #B45309; border-color: #B45309; background: #FEF3C7; }
        .ent-btn-action.sign-card:hover { background: #FDE68A; }
        .ent-btn-action.download-card { color: #16A34A; border-color: #16A34A; background: #DCFCE7; }
        .ent-btn-action.download-card:hover { background: #BBF7D0; }
        
        .ent-btn-action.delete-card { width: 38px; height: 38px; border-radius: 8px; background: #FAF5F0; border: 1px solid #E5E0D8; color: #999; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 1.1rem; }
        .ent-btn-action.delete-card:hover { background: #FEE2E2; border-color: #EF4444; color: #EF4444; }
        
        /* Floating Action Button */
        .ent-fab { position: fixed; bottom: 30px; right: 30px; background: linear-gradient(135deg, #5E3B2E, #4A2C21); color: #FFF; border: none; border-radius: 12px; padding: 16px 24px; font-size: 1.05rem; font-weight: 600; cursor: pointer; box-shadow: 0 8px 20px rgba(94, 59, 46, 0.4); display: flex; align-items: center; gap: 8px; z-index: 100; transition: transform 0.2s; }
        .ent-fab:hover { transform: scale(1.05); }
        
        /* Updated Filters for Mockup */
        .ent-filters { gap: 12px; margin-bottom: 24px; }
        .ent-filter-btn { padding: 10px 20px; font-size: 0.95rem; color: #666; border-color: #D6D0C4; border-radius: 20px; background: #FFF; }
        .ent-filter-btn.active { background: #5E3B2E; color: #FFF; border-color: #5E3B2E; }
        
        .ent-title { font-size: 1.6rem; color: #4A2C21; font-weight: 800; margin-bottom: 20px; }
        @media (max-width: 480px) {
          .ent-grid-3, .ent-grid-4 { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
