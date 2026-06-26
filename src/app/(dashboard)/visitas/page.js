'use client';

import { useState, useEffect } from 'react';

export default function VisitasPage() {
  const [visitas, setVisitas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [tiposVisita, setTiposVisita] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);
  
  const getAreaIdFromRol = (rolId) => {
    const rol = parseInt(rolId);
    if (rol === 1) return 'admin'; // Admin has master override
    if (rol === 2) return 1; // Coordinator -> Operaciones
    if (rol === 3) return 2; // SST
    if (rol === 4) return 3; // Mantenimiento
    if (rol === 5) return 4; // Calidad
    if (rol === 6) return 5; // VRH
    if (rol === 7) return 6; // Formación
    return null;
  };

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'

  // Form states
  const [selectedPdvId, setSelectedPdvId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedTipoId, setSelectedTipoId] = useState('');
  const [activePlantilla, setActivePlantilla] = useState(null);
  const [linkedEventoId, setLinkedEventoId] = useState(null);

  // Parse URL search parameters on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pdvIdParam = params.get('pdv_id');
      const areaIdParam = params.get('area_id');
      const eventoIdParam = params.get('evento_id');

      if (pdvIdParam && areaIdParam) {
        setActiveTab('new');
        setSelectedPdvId(pdvIdParam);
        setSelectedAreaId(areaIdParam);
        if (eventoIdParam) {
          setLinkedEventoId(eventoIdParam);
        }
      }
    }
  }, []);
  
  const [formAnswers, setFormAnswers] = useState({});
  const [formResponsableId, setFormResponsableId] = useState('');
  const [formFechaCompromiso, setFormFechaCompromiso] = useState('');
  const [formObservaciones, setFormObservaciones] = useState('');
  
  // File Upload states
  const [antesFile, setAntesFile] = useState(null);
  const [antesUrl, setAntesUrl] = useState('');
  const [antesUploading, setAntesUploading] = useState(false);

  const [despuesFile, setDespuesFile] = useState(null);
  const [despuesUrl, setDespuesUrl] = useState('');
  const [despuesUploading, setDespuesUploading] = useState(false);

  const [soporteFile, setSoporteFile] = useState(null);
  const [soporteUrl, setSoporteUrl] = useState('');
  const [soporteUploading, setSoporteUploading] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Selected visit details modal
  const [selectedVisit, setSelectedVisit] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const resVisitas = await fetch('/api/visitas');
      if (!resVisitas.ok) throw new Error('Error al cargar visitas');
      const dataVisitas = await resVisitas.json();
      
      setVisitas(dataVisitas.visitas);
      setAreas(dataVisitas.areas);
      setTiposVisita(dataVisitas.tiposVisita);
      setPlantillas(dataVisitas.plantillas);

      // Load PDVs
      const resPdvs = await fetch('/api/pdv');
      if (resPdvs.ok) {
        const dataPdvs = await resPdvs.json();
        setPdvs(dataPdvs.pdvs);
        if (dataPdvs.pdvs.length > 0) {
          setSelectedPdvId(String(dataPdvs.pdvs[0].id));
        }
      }

      // Load Users for responsible list
      const resUsers = await fetch('/api/users');
      if (resUsers.ok) {
        const dataUsers = await resUsers.json();
        setUsers(dataUsers.users);
      }

      // Check query params to pre-select first visit type for area
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const areaIdParam = params.get('area_id');
        if (areaIdParam) {
          const firstType = dataVisitas.tiposVisita.find(t => t.area_id === parseInt(areaIdParam));
          if (firstType) {
            setSelectedTipoId(String(firstType.id));
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          setUserRole(parseInt(u.rol_id));
          
          // Auto-select area based on role (unless overridden by query param)
          const params = new URLSearchParams(window.location.search);
          const areaIdParam = params.get('area_id');
          if (!areaIdParam) {
            const mappedArea = getAreaIdFromRol(u.rol_id);
            if (mappedArea && mappedArea !== 'admin') {
              setSelectedAreaId(String(mappedArea));
            }
          }
        } catch (e) {}
      }
    }
  }, []);

  // Pre-select first type of visit when area changes
  useEffect(() => {
    if (selectedAreaId && tiposVisita.length > 0) {
      const filtered = tiposVisita.filter(t => t.area_id === parseInt(selectedAreaId));
      if (filtered.length > 0) {
        const exists = filtered.some(t => String(t.id) === selectedTipoId);
        if (!exists) {
          setSelectedTipoId(String(filtered[0].id));
        }
      } else {
        setSelectedTipoId('');
      }
    }
  }, [selectedAreaId, tiposVisita]);

  // Update dynamic fields when Area / Type changes
  useEffect(() => {
    if (selectedAreaId && selectedTipoId) {
      const template = plantillas.find(
        (p) => p.area_id === parseInt(selectedAreaId) && p.tipo_visita_id === parseInt(selectedTipoId)
      );
      if (template) {
        setActivePlantilla(template);
        try {
          const fields = JSON.parse(template.campos);
          const initialAnswers = {};
          fields.forEach((f) => {
            if (f.tipo === 'checkbox') initialAnswers[f.nombre] = false;
            else if (f.tipo === 'number') initialAnswers[f.nombre] = 0;
            else initialAnswers[f.nombre] = '';
          });
          setFormAnswers(initialAnswers);
        } catch (e) {
          setActivePlantilla(null);
          setFormAnswers({});
        }
      } else {
        setActivePlantilla(null);
        setFormAnswers({});
      }
    } else {
      setActivePlantilla(null);
      setFormAnswers({});
    }
  }, [selectedAreaId, selectedTipoId, plantillas]);

  const handleAreaChange = (areaId) => {
    setSelectedAreaId(areaId);
    setSelectedTipoId(''); // Reset type when area changes
  };

  const handleInputChange = (fieldName, value) => {
    setFormAnswers((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleFileUpload = async (e, etiqueta, setFileState, setUrlState, setUploadingState) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileState(file);
    setUploadingState(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('etiqueta', etiqueta);

    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir archivo');
      
      setUrlState(data.url);
    } catch (err) {
      alert('Error en la subida: ' + err.message);
      setFileState(null);
    } finally {
      setUploadingState(false);
    }
  };

  const handleSubmitVisita = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitLoading(true);

    try {
      // Build evidences array
      const evidenciasArray = [];
      if (antesUrl) evidenciasArray.push({ url: antesUrl, nombre: antesFile.name, etiqueta: 'antes' });
      if (despuesUrl) evidenciasArray.push({ url: despuesUrl, nombre: despuesFile.name, etiqueta: 'despues' });
      if (soporteUrl) evidenciasArray.push({ url: soporteUrl, nombre: soporteFile.name, etiqueta: 'soporte' });

      const payload = {
        pdv_id: parseInt(selectedPdvId),
        area_id: parseInt(selectedAreaId),
        tipo_visita_id: parseInt(selectedTipoId),
        plantilla_id: activePlantilla ? activePlantilla.id : null,
        fecha: new Date().toISOString().split('T')[0],
        hora_inicio: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
        datos_formulario: formAnswers,
        responsable_id: formResponsableId ? parseInt(formResponsableId) : null,
        fecha_compromiso: formFechaCompromiso || null,
        observaciones: formObservaciones,
        evidencias: evidenciasArray,
        evento_id: linkedEventoId ? parseInt(linkedEventoId) : null
      };

      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la visita');

      setSubmitSuccess('Visita operativa guardada y registrada correctamente.');
      
      // Reset form fields
      setAntesFile(null);
      setAntesUrl('');
      setDespuesFile(null);
      setDespuesUrl('');
      setSoporteFile(null);
      setSoporteUrl('');
      setActivePlantilla(null);
      setLinkedEventoId(null);
      
      // Clean up URL parameters to prevent re-triggering form on reload
      if (typeof window !== 'undefined' && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Reload lists
      loadData();
      
      // Switch back to list tab
      setTimeout(() => {
        setActiveTab('list');
        setSubmitSuccess('');
      }, 1500);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenVisitDetails = async (visit) => {
    let parsedFields = [];
    let parsedData = {};

    const template = plantillas.find((p) => p.id === visit.plantilla_id);
    if (template) {
      try {
        parsedFields = JSON.parse(template.campos);
      } catch (e) {}
    }

    try {
      parsedData = JSON.parse(visit.datos_formulario || '{}');
    } catch (e) {}

    // Fetch evidences dynamically
    let visitEvidences = [];
    try {
      const res = await fetch(`/api/visitas?visita_id=${visit.id}`);
      if (res.ok) {
        const evData = await res.json();
        visitEvidences = evData.evidencias;
      }
    } catch (e) {
      console.error('Error cargando evidencias:', e);
    }

    setSelectedVisit({
      ...visit,
      fields: parsedFields,
      data: parsedData,
      evidencias: visitEvidences,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter visit types based on selected area
  const filteredTypes = tiposVisita.filter(
    (t) => t.area_id === parseInt(selectedAreaId)
  );

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Cargando datos de visitas...</p>
        <style jsx>{`
          .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; }
          .spinner { width: 40px; height: 40px; border: 4px solid var(--color-bg-secondary); border-top: 4px solid var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="visitas-page-container">
      
      {/* Navigation tabs */}
      <div className="tabs-header no-print">
        <button 
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 Historial de Visitas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          ➕ Registrar Nueva Visita
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="visitas-list-tab animate-fade-in no-print">
          {visitas.length > 0 ? (
            <div className="visitas-table-card card shadow-md">
              <div className="card-body px-0 py-0">
                <div className="table-responsive">
                  <table className="visitas-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>PDV</th>
                        <th>Área</th>
                        <th>Tipo de Visita</th>
                        <th>Inspector</th>
                        <th>Estado</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitas.map((v) => (
                        <tr key={v.id}>
                          <td>{v.fecha}</td>
                          <td className="font-semibold">{v.pdv_nombre} ({v.ciudad_nombre})</td>
                          <td>
                            <span className="area-color-tag" style={{ borderLeftColor: v.area_color || '#6B3A2A' }}>
                              {v.area_nombre}
                            </span>
                          </td>
                          <td>{v.tipo_visita_nombre}</td>
                          <td>{v.usuario_nombre}</td>
                          <td>
                            <span className="status-pill completed">Completada</span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenVisitDetails(v)}
                            >
                              Ver respuestas 👁️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center text-muted py-8 shadow-sm">
              <p>No se registran visitas previas en el sistema.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="new-visita-tab animate-fade-in no-print">
          <div className="card shadow-md">
            <div className="card-header">
              <h3>📝 Registrar Visita Operativa</h3>
            </div>
            <div className="card-body">
              {submitSuccess && <div className="success-alert">{submitSuccess}</div>}
              {submitError && <div className="error-alert">{submitError}</div>}

              <form onSubmit={handleSubmitVisita} className="visita-form">
                
                {/* 1. PDV Selection */}
                <div className="form-group">
                  <label className="form-label" htmlFor="visita-pdv">1. Seleccionar Punto de Venta (PDV)</label>
                  <select
                    id="visita-pdv"
                    className="form-select"
                    value={selectedPdvId}
                    onChange={(e) => setSelectedPdvId(e.target.value)}
                    required
                  >
                    {pdvs.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.ciudad_nombre}) - {p.estado_nombre}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Area Selection */}
                <div className="form-group">
                  <label className="form-label" htmlFor="visita-area">2. Seleccionar Área Inspectora</label>
                  <select
                    id="visita-area"
                    className="form-select"
                    value={selectedAreaId}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    required
                    disabled={userRole !== 1 && userRole !== 2 && userRole !== null}
                  >
                    <option value="">-- Seleccionar Área --</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Visit Type Selection (conditional) */}
                {selectedAreaId && (
                  <div className="form-group animate-fade-in">
                    <label className="form-label" htmlFor="visita-tipo">3. Seleccionar Tipo de Visita</label>
                    <select
                      id="visita-tipo"
                      className="form-select"
                      value={selectedTipoId}
                      onChange={(e) => setSelectedTipoId(e.target.value)}
                      required
                    >
                      <option value="">-- Seleccionar Tipo --</option>
                      {filteredTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 4. Dynamic Form Template (conditional) */}
                {activePlantilla && (
                  <div className="dynamic-template-section card animate-fade-in">
                    <div className="card-header">
                      <h4>📋 Formulario Checklist: {activePlantilla.nombre} (v{activePlantilla.version})</h4>
                    </div>
                    <div className="card-body">
                      {JSON.parse(activePlantilla.campos).map((field, idx) => (
                        <div key={idx} className="form-group">
                          
                          {/* Checkbox rendering */}
                          {field.tipo === 'checkbox' && (
                            <div className="checkbox-field-group">
                              <input
                                id={`field-${field.nombre}`}
                                type="checkbox"
                                className="form-checkbox"
                                checked={!!formAnswers[field.nombre]}
                                onChange={(e) => handleInputChange(field.nombre, e.target.checked)}
                              />
                              <label htmlFor={`field-${field.nombre}`} className="checkbox-field-label">
                                {field.label} {field.requerido && <span className="req-star">*</span>}
                              </label>
                            </div>
                          )}

                          {/* Textarea rendering */}
                          {field.tipo === 'textarea' && (
                            <>
                              <label className="form-label" htmlFor={`field-${field.nombre}`}>
                                {field.label} {field.requerido && <span className="req-star">*</span>}
                              </label>
                              <textarea
                                id={`field-${field.nombre}`}
                                className="form-textarea"
                                value={formAnswers[field.nombre] || ''}
                                onChange={(e) => handleInputChange(field.nombre, e.target.value)}
                                required={field.requerido}
                              ></textarea>
                            </>
                          )}

                          {/* Text rendering */}
                          {field.tipo === 'text' && (
                            <>
                              <label className="form-label" htmlFor={`field-${field.nombre}`}>
                                {field.label} {field.requerido && <span className="req-star">*</span>}
                              </label>
                              <input
                                id={`field-${field.nombre}`}
                                type="text"
                                className="form-input"
                                value={formAnswers[field.nombre] || ''}
                                onChange={(e) => handleInputChange(field.nombre, e.target.value)}
                                required={field.requerido}
                              />
                            </>
                          )}

                          {/* Number rendering */}
                          {field.tipo === 'number' && (
                            <>
                              <label className="form-label" htmlFor={`field-${field.nombre}`}>
                                {field.label} {field.requerido && <span className="req-star">*</span>}
                              </label>
                              <input
                                id={`field-${field.nombre}`}
                                type="number"
                                className="form-input"
                                value={formAnswers[field.nombre] || 0}
                                onChange={(e) => handleInputChange(field.nombre, parseInt(e.target.value) || 0)}
                                required={field.requerido}
                              />
                            </>
                          )}

                          {/* Date rendering */}
                          {field.tipo === 'date' && (
                            <>
                              <label className="form-label" htmlFor={`field-${field.nombre}`}>
                                {field.label} {field.requerido && <span className="req-star">*</span>}
                              </label>
                              <input
                                id={`field-${field.nombre}`}
                                type="date"
                                className="form-input"
                                value={formAnswers[field.nombre] || ''}
                                onChange={(e) => handleInputChange(field.nombre, e.target.value)}
                                required={field.requerido}
                              />
                            </>
                          )}

                          {/* Select rendering */}
                          {field.tipo === 'select' && (
                            <>
                              <label className="form-label" htmlFor={`field-${field.nombre}`}>
                                {field.label} {field.requerido && <span className="req-star">*</span>}
                              </label>
                              <select
                                id={`field-${field.nombre}`}
                                className="form-select"
                                value={formAnswers[field.nombre] || ''}
                                onChange={(e) => handleInputChange(field.nombre, e.target.value)}
                                required={field.requerido}
                              >
                                <option value="">-- Seleccionar opción --</option>
                                {field.opciones?.map((opt, oIdx) => (
                                  <option key={oIdx} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Additional Plan / Supervisor Assignment */}
                <div className="additional-form-block card animate-fade-in">
                  <div className="card-header">
                    <h4>🛠️ Seguimiento y Evidencias</h4>
                  </div>
                  <div className="card-body">
                    
                    <div className="form-group">
                      <label className="form-label" htmlFor="form-responsable">Asignar Responsable de Seguimiento</label>
                      <select
                        id="form-responsable"
                        className="form-select"
                        value={formResponsableId}
                        onChange={(e) => setFormResponsableId(e.target.value)}
                      >
                        <option value="">-- Ninguno / Sin Asignar --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre} ({u.rol_nombre})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="form-fecha-cierre">Fecha Límite Compromiso</label>
                      <input
                        id="form-fecha-cierre"
                        type="date"
                        className="form-input"
                        value={formFechaCompromiso}
                        onChange={(e) => setFormFechaCompromiso(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="form-observaciones">Observaciones Generales</label>
                      <textarea
                        id="form-observaciones"
                        className="form-textarea"
                        placeholder="Observaciones adicionales, hallazgos críticos o notas..."
                        value={formObservaciones}
                        onChange={(e) => setFormObservaciones(e.target.value)}
                      ></textarea>
                    </div>

                    {/* Evidencias de Fotos del Antes y Después y Documentos */}
                    <div className="evidencias-upload-section">
                      <h5>📸 Registro de Evidencias (Fotos y Archivos)</h5>
                      
                      <div className="upload-fields-grid">
                        
                        {/* 1. Foto del ANTES */}
                        <div className="upload-card">
                          <label className="form-label">Foto del ANTES</label>
                          <div className="real-upload-control">
                            <input
                              id="upload-antes"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'antes', setAntesFile, setAntesUrl, setAntesUploading)}
                              style={{ display: 'none' }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm btn-block"
                              onClick={() => document.getElementById('upload-antes').click()}
                              disabled={antesUploading}
                            >
                              {antesUploading ? 'Subiendo...' : '📸 Cargar Foto Antes'}
                            </button>
                            {antesUrl && (
                              <div className="upload-success-badge">
                                ✓ Subido: <a href={antesUrl} target="_blank" rel="noreferrer">Ver imagen</a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2. Foto del DESPUÉS */}
                        <div className="upload-card">
                          <label className="form-label">Foto del DESPUÉS</label>
                          <div className="real-upload-control">
                            <input
                              id="upload-despues"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'despues', setDespuesFile, setDespuesUrl, setDespuesUploading)}
                              style={{ display: 'none' }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm btn-block"
                              onClick={() => document.getElementById('upload-despues').click()}
                              disabled={despuesUploading}
                            >
                              {despuesUploading ? 'Subiendo...' : '📸 Cargar Foto Después'}
                            </button>
                            {despuesUrl && (
                              <div className="upload-success-badge">
                                ✓ Subido: <a href={despuesUrl} target="_blank" rel="noreferrer">Ver imagen</a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. Documento / PDF */}
                        <div className="upload-card">
                          <label className="form-label">Documento o PDF de Soporte</label>
                          <div className="real-upload-control">
                            <input
                              id="upload-soporte"
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                              onChange={(e) => handleFileUpload(e, 'soporte', setSoporteFile, setSoporteUrl, setSoporteUploading)}
                              style={{ display: 'none' }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm btn-block"
                              onClick={() => document.getElementById('upload-soporte').click()}
                              disabled={soporteUploading}
                            >
                              {soporteUploading ? 'Subiendo...' : '📎 Cargar Documento'}
                            </button>
                            {soporteUrl && (
                              <div className="upload-success-badge">
                                ✓ Subido: <a href={soporteUrl} target="_blank" rel="noreferrer">Ver archivo</a>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-lg"
                  disabled={submitLoading || antesUploading || despuesUploading || soporteUploading}
                >
                  {submitLoading ? 'Registrando Visita...' : 'Finalizar y Guardar Visita'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details / Print modal */}
      {selectedVisit && (
        <div className="modal-backdrop">
          <div className="modal-content card animate-fade-in printable-modal">
            
            {/* Modal actions (hide on printing) */}
            <div className="card-header no-print">
              <h3>Auditoría Operativa de Punto de Venta</h3>
              <div className="modal-header-actions">
                <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                  🖨️ Imprimir / Guardar PDF
                </button>
                <button className="modal-close-btn" onClick={() => setSelectedVisit(null)}>×</button>
              </div>
            </div>

            {/* Content to display and print */}
            <div className="card-body modal-scrollable-body print-layout">
              
              {/* Logo / Header for print */}
              <div className="print-only-header">
                <h2>🥞 Crepes en Punto</h2>
                <p>Reporte de Auditoría Operativa Interna</p>
                <hr className="print-divider" />
              </div>

              <div className="visit-meta-grid">
                <p><strong>Punto de Venta (PDV):</strong> {selectedVisit.pdv_nombre} ({selectedVisit.ciudad_nombre})</p>
                <p><strong>Inspector / Auditor:</strong> {selectedVisit.usuario_nombre}</p>
                <p><strong>Fecha y Hora:</strong> {selectedVisit.fecha} {selectedVisit.hora_inicio || ''}</p>
                <p><strong>Área Inspectora:</strong> {selectedVisit.area_nombre}</p>
                <p><strong>Tipo de Visita:</strong> {selectedVisit.tipo_visita_nombre}</p>
                {selectedVisit.responsable_nombre && (
                  <p><strong>Responsable Seguimiento:</strong> {selectedVisit.responsable_nombre}</p>
                )}
                {selectedVisit.fecha_compromiso && (
                  <p><strong>Fecha de Compromiso:</strong> {selectedVisit.fecha_compromiso}</p>
                )}
              </div>

              {/* Dynamic checklist results */}
              <div className="visit-responses-section">
                <h4>📋 Checklist Respuestas de Evaluación</h4>
                <div className="responses-grid">
                  {selectedVisit.fields && selectedVisit.fields.length > 0 ? (
                    selectedVisit.fields.map((f, idx) => {
                      const answer = selectedVisit.data[f.nombre];
                      let displayAnswer = String(answer || 'No responde');
                      if (f.tipo === 'checkbox') {
                        displayAnswer = answer ? '🟢 CUMPLE / SÍ' : '❌ NO CUMPLE / NO';
                      }
                      
                      return (
                        <div key={idx} className="response-row">
                          <span className="response-label">{f.label}:</span>
                          <span className={`response-value ${f.tipo === 'checkbox' ? (answer ? 'green-text' : 'red-text') : ''}`}>
                            {displayAnswer}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted">No se cargaron campos dinámicos para esta visita.</p>
                  )}
                </div>
              </div>

              {selectedVisit.observaciones && (
                <div className="visit-obs-section">
                  <h4>📝 Observaciones Generales</h4>
                  <p className="obs-content">"{selectedVisit.observaciones}"</p>
                </div>
              )}

              {/* Evidences (grouped by "Antes y Después") */}
              {selectedVisit.evidencias && selectedVisit.evidencias.length > 0 && (
                <div className="visit-evidence-section">
                  <h4>📸 Evidencias Registradas</h4>
                  
                  {/* Photo comparison group */}
                  {selectedVisit.evidencias.some(e => e.etiqueta === 'antes' || e.etiqueta === 'despues') && (
                    <div className="antes-despues-grid">
                      {/* Antes view */}
                      <div className="evidence-preview-card">
                        <span className="evidence-badge red-badge">FOTO DEL ANTES</span>
                        {selectedVisit.evidencias.filter(e => e.etiqueta === 'antes').map((e, idx) => (
                          <div key={idx} className="img-container">
                            <img src={e.ruta_archivo} alt="Antes" className="img-evidence" />
                          </div>
                        ))}
                        {selectedVisit.evidencias.filter(e => e.etiqueta === 'antes').length === 0 && (
                          <div className="no-img-placeholder">Sin foto registrada del antes.</div>
                        )}
                      </div>

                      {/* Después view */}
                      <div className="evidence-preview-card">
                        <span className="evidence-badge green-badge">FOTO DEL DESPUÉS</span>
                        {selectedVisit.evidencias.filter(e => e.etiqueta === 'despues').map((e, idx) => (
                          <div key={idx} className="img-container">
                            <img src={e.ruta_archivo} alt="Después" className="img-evidence" />
                          </div>
                        ))}
                        {selectedVisit.evidencias.filter(e => e.etiqueta === 'despues').length === 0 && (
                          <div className="no-img-placeholder">Sin foto registrada del después.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Supporting Documents */}
                  {selectedVisit.evidencias.some(e => e.etiqueta === 'soporte') && (
                    <div className="soporte-docs-container">
                      <h5>Otros Documentos Adjuntos:</h5>
                      {selectedVisit.evidencias.filter(e => e.etiqueta === 'soporte').map((e) => (
                        <div key={e.id} className="soporte-doc-item">
                          <span>📄 {e.nombre_archivo}</span>
                          <a href={e.ruta_archivo} target="_blank" rel="noreferrer" className="no-print">
                            Descargar / Ver 📥
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Signature block for PDF printing */}
              <div className="print-signature-block">
                <div className="sig-line">
                  <div className="line"></div>
                  <p>Firma Inspector / Auditor</p>
                </div>
                <div className="sig-line">
                  <div className="line"></div>
                  <p>Firma Responsable del PDV</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .visitas-page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .tabs-header {
          display: flex;
          gap: var(--spacing-sm);
          border-bottom: 2px solid var(--color-border-light);
          padding-bottom: 2px;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 10px 20px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          border-bottom: 3px solid transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .tab-btn:hover { color: var(--color-primary); }
        .tab-btn.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

        .visitas-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }

        .visitas-table th, .visitas-table td {
          padding: 12px var(--spacing-md);
          border-bottom: 1px solid var(--color-border-light);
        }

        .visitas-table th {
          background-color: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .table-responsive { overflow-x: auto; }
        .px-0 { padding-left: 0 !important; padding-right: 0 !important; }
        .py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
        .font-semibold { font-weight: 600; }

        .area-color-tag {
          border-left: 4px solid #6B3A2A;
          padding-left: 8px;
          font-weight: 600;
        }

        .status-pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-pill.completed {
          background-color: var(--color-green-bg);
          color: #166534;
        }

        .visita-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .dynamic-template-section,
        .additional-form-block {
          border: 1px solid var(--color-border-light);
        }

        .dynamic-template-section h4,
        .additional-form-block h4 {
          color: var(--color-primary-dark);
          font-size: 0.95rem;
          font-weight: 700;
        }

        .checkbox-field-group {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .checkbox-field-label {
          font-size: 0.85rem;
          color: var(--color-text-primary);
        }

        .req-star { color: var(--color-error); }

        /* Evidencias Upload section */
        .evidencias-upload-section {
          margin-top: var(--spacing-md);
          border-top: 1.5px solid var(--color-border-light);
          padding-top: var(--spacing-md);
        }

        .evidencias-upload-section h5 {
          color: var(--color-primary-dark);
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: var(--spacing-sm);
        }

        .upload-fields-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-sm);
        }

        @media (min-width: 768px) {
          .upload-fields-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .upload-card {
          background-color: var(--color-bg-primary);
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border-light);
        }

        .real-upload-control {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .upload-success-badge {
          font-size: 0.7rem;
          color: #166534;
          font-weight: 600;
          background-color: #DCFCE7;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          text-align: center;
        }

        .upload-success-badge a {
          text-decoration: underline;
        }

        /* Modal styling */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
        }

        .modal-content {
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
        }

        .modal-scrollable-body {
          overflow-y: auto;
          max-height: calc(90vh - 80px);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.75rem;
          cursor: pointer;
          color: var(--color-text-muted);
        }

        .modal-header-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .visit-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-sm);
          font-size: 0.8rem;
          background-color: var(--color-bg-secondary);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
        }

        .visit-responses-section h4,
        .visit-obs-section h4,
        .visit-evidence-section h4 {
          font-size: 0.9rem;
          color: var(--color-primary-dark);
          margin-bottom: var(--spacing-sm);
          font-weight: 700;
          border-bottom: 1.5px solid var(--color-border-light);
          padding-bottom: 4px;
        }

        .responses-grid {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .response-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          padding: var(--spacing-xs) 0;
          border-bottom: 1px dashed var(--color-border-light);
        }

        .response-row:last-child { border-bottom: none; }
        .response-label { font-weight: 600; color: var(--color-text-secondary); }
        .response-value.green-text { color: #166534; font-weight: 700; }
        .response-value.red-text { color: #991B1B; font-weight: 700; }

        .obs-content {
          font-size: 0.8rem;
          font-style: italic;
          color: var(--color-text-primary);
          background-color: var(--color-bg-primary);
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--color-primary-light);
        }

        /* Evidencia view side-by-side */
        .antes-despues-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-md);
        }

        @media (min-width: 600px) {
          .antes-despues-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .evidence-preview-card {
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          background-color: var(--color-bg-primary);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .evidence-badge {
          font-size: 0.65rem;
          font-weight: 700;
          color: white;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .red-badge { background-color: var(--color-error); }
        .green-badge { background-color: var(--color-success); }

        .img-container {
          width: 100%;
          height: 180px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--color-border-light);
        }

        .img-evidence {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-img-placeholder {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .soporte-docs-container {
          margin-top: var(--spacing-md);
          border-top: 1px solid var(--color-border-light);
          padding-top: var(--spacing-sm);
        }

        .soporte-docs-container h5 {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin-bottom: 6px;
        }

        .soporte-doc-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          background-color: var(--color-bg-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          margin-bottom: 4px;
        }

        .soporte-doc-item a {
          color: var(--color-primary);
          font-weight: 600;
          text-decoration: underline;
        }

        .print-only-header {
          display: none;
        }

        .print-signature-block {
          display: none;
        }

        .error-alert {
          background-color: var(--color-red-bg);
          color: #991B1B;
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          margin-bottom: var(--spacing-sm);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .success-alert {
          background-color: var(--color-green-bg);
          color: #166534;
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          margin-bottom: var(--spacing-sm);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        /* PRINT STYLES */
        @media print {
          body * {
            visibility: hidden;
          }
          
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }

          .printable-modal, .printable-modal * {
            visibility: visible;
          }

          .printable-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            max-height: none;
            box-shadow: none;
            border: none;
            background: white;
            padding: 0;
            margin: 0;
          }

          .modal-scrollable-body {
            overflow: visible;
            max-height: none;
          }

          .print-only-header {
            display: block;
            text-align: center;
            margin-bottom: 20px;
          }

          .print-only-header h2 {
            font-family: 'Playfair Display', serif;
            color: #4A2518;
          }

          .print-divider {
            border: 0;
            border-top: 2px solid #6B3A2A;
            margin-top: 8px;
          }

          .visit-meta-grid {
            grid-template-columns: repeat(2, 1fr);
            background-color: #F5EDE4 !important;
            border: 1px solid #E8DDD4;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin-bottom: 20px;
          }

          .response-row {
            page-break-inside: avoid;
          }

          .antes-despues-grid {
            grid-template-columns: 1fr 1fr;
            page-break-inside: avoid;
          }

          .img-container {
            height: 250px;
          }

          .print-signature-block {
            display: flex;
            justify-content: space-around;
            margin-top: 50px;
            page-break-inside: avoid;
          }

          .sig-line {
            text-align: center;
            width: 200px;
          }

          .sig-line .line {
            border-bottom: 1px solid #2C1810;
            height: 40px;
            margin-bottom: 8px;
          }

          .sig-line p {
            font-size: 0.8rem;
            font-weight: 600;
          }
        }
      `}</style>
    </div>
  );
}
