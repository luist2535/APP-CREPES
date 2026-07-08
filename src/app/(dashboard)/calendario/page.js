'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SearchableCategorySelect({ categories, selectedId, onChange, areaId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Reset drill-down level when area changes
  useEffect(() => {
    setActiveParentId(null);
  }, [areaId]);

  // Filter categories by area inspectora
  const filtered = categories.filter(c => c.area_id === parseInt(areaId));

  // Helper to build full hierarchical path
  const getCategoryFullPath = (catId) => {
    const path = [];
    let current = filtered.find(c => c.id === catId);
    while (current) {
      path.unshift(current.nombre);
      current = filtered.find(c => c.id === current.padre_id);
    }
    return path.join(' › ');
  };

  // Find currently selected option
  const selectedCat = filtered.find(c => String(c.id) === String(selectedId));
  const selectedFullPath = selectedCat ? getCategoryFullPath(selectedCat.id) : '';

  // Breadcrumbs for drill-down navigation
  const crumbs = [];
  let curr = filtered.find(c => c.id === activeParentId);
  while (curr) {
    crumbs.unshift(curr);
    curr = filtered.find(c => c.id === curr.padre_id);
  }

  // Determine which options to show
  let visibleOptions = [];
  if (searchTerm) {
    // Search mode: Flat list of matching categories
    visibleOptions = filtered
      .filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(c => ({
        ...c,
        fullPath: getCategoryFullPath(c.id),
        hasChildren: filtered.some(child => child.padre_id === c.id)
      }));
  } else {
    // Drill-down mode: direct children of activeParentId
    visibleOptions = filtered
      .filter(c => activeParentId ? c.padre_id === activeParentId : !c.padre_id)
      .map(c => ({
        ...c,
        fullPath: c.nombre,
        hasChildren: filtered.some(child => child.padre_id === c.id)
      }));
  }

  return (
    <div className="searchable-select-container" ref={containerRef} style={{ position: 'relative' }}>
      <div 
        className="searchable-select-trigger" 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            // When opening, show either parent of selected or root
            if (selectedCat && selectedCat.padre_id) {
              setActiveParentId(selectedCat.padre_id);
            } else {
              setActiveParentId(null);
            }
          }
        }}
        style={{
          padding: '10px 14px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          minHeight: '38px',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ color: selectedCat ? '#333' : '#777' }}>
          {selectedCat ? selectedFullPath : '-- Seleccionar Categoría --'}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#999' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div 
          className="searchable-select-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: '#fff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            marginTop: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <input
            type="text"
            className="searchable-select-input"
            placeholder="Escribe para buscar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
            onClick={e => e.stopPropagation()}
            style={{
              padding: '10px 12px',
              border: 'none',
              borderBottom: '1px solid var(--color-border-light)',
              outline: 'none',
              fontSize: '0.85rem',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />

          {/* Breadcrumbs for easy drill-down navigation */}
          {!searchTerm && (
            <div 
              className="maint-breadcrumbs"
              style={{
                padding: '8px 12px',
                backgroundColor: '#fafafa',
                borderBottom: '1px solid #eee',
                fontSize: '0.72rem',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexWrap: 'wrap',
                textAlign: 'left'
              }}
            >
              <span 
                style={{ cursor: 'pointer', color: 'var(--color-primary)', fontWeight: !activeParentId ? 'bold' : 'normal' }}
                onClick={() => setActiveParentId(null)}
              >
                Categorías
              </span>
              {crumbs.map((c, idx) => (
                <span key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>›</span>
                  <span 
                    style={{ 
                      cursor: 'pointer', 
                      color: idx === crumbs.length - 1 ? '#333' : 'var(--color-primary)',
                      fontWeight: idx === crumbs.length - 1 ? 'bold' : 'normal'
                    }}
                    onClick={() => setActiveParentId(c.id)}
                  >
                    {c.nombre}
                  </span>
                </span>
              ))}
            </div>
          )}

          <div className="searchable-select-options" style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
            {visibleOptions.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>
                No se encontraron categorías
              </div>
            ) : (
              visibleOptions.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => {
                    if (searchTerm) {
                      // Select directly in search mode
                      onChange(String(cat.id));
                      setIsOpen(false);
                      setSearchTerm('');
                    } else if (cat.hasChildren) {
                      // Drill down if it has children
                      setActiveParentId(cat.id);
                    } else {
                      // Select leaf node
                      onChange(String(cat.id));
                      setIsOpen(false);
                    }
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    backgroundColor: String(selectedId) === String(cat.id) ? '#fdf8f3' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #f0f0f0',
                    textAlign: 'left'
                  }}
                  className="searchable-option"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fdf8f3'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = String(selectedId) === String(cat.id) ? '#fdf8f3' : 'transparent'}
                >
                  <span style={{ fontWeight: String(selectedId) === String(cat.id) ? 'bold' : 'normal', color: '#333' }}>
                    {cat.fullPath}
                  </span>
                  {!searchTerm && cat.hasChildren && (
                    <span style={{ fontSize: '0.72rem', color: '#999', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '10px' }}>
                      ver subcategorías »
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [eventos, setEventos] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [areas, setAreas] = useState([]);
  const [tiposVisita, setTiposVisita] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Date states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPdvId, setFormPdvId] = useState('');
  const [formAreaId, setFormAreaId] = useState('');
  const [formTipoVisitaId, setFormTipoVisitaId] = useState('');
  const [formHoraInicio, setFormHoraInicio] = useState('08:00');
  const [formHoraFin, setFormHoraFin] = useState('09:00');
  const [formTipo, setFormTipo] = useState('visita');
  const [formSyncOutlook, setFormSyncOutlook] = useState(true);
  const [categorias, setCategorias] = useState([]);
  const [formCategoriaId, setFormCategoriaId] = useState('');

  // Custom checklist items states
  const [customizeChecklist, setCustomizeChecklist] = useState(false);
  const [customChecklistTasks, setCustomChecklistTasks] = useState([]);
  const [newCustomTaskText, setNewCustomTaskText] = useState('');
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  
  // User info
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);

  // Conflict override modal states (for area chiefs)
  const [conflictModal, setConflictModal] = useState(null); // { titulo, usuario_nombre, hora_inicio, hora_fin }
  const [overrideJustificacion, setOverrideJustificacion] = useState('');
  const [overridePending, setOverridePending] = useState(null); // Saved payload for retry

  const getAreaIdFromRol = (rolId) => {
    const rol = parseInt(rolId);
    if (rol === 1) return 'admin'; // Admin has master override
    if (rol === 2 || rol === 10) return 1; // Coordinator / Auxiliar Operaciones -> Operaciones
    if (rol === 3 || rol === 11) return 2; // SST / Auxiliar SST -> SST
    if (rol === 4 || rol === 12) return 3; // Mantenimiento / Auxiliar Mantenimiento -> Mantenimiento
    if (rol === 5 || rol === 13) return 4; // Calidad / Auxiliar Calidad -> Calidad
    if (rol === 6 || rol === 14) return 5; // VRH / Auxiliar VRH -> VRH
    if (rol === 7 || rol === 15) return 6; // Formación / Auxiliar Formación -> Formación
    if (rol === 9 || rol === 16) return 7; // Jefe Sistemas / Auxiliar Sistemas -> Sistemas
    return null;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch all events
      const resEventos = await fetch('/api/calendario');
      if (!resEventos.ok) throw new Error('Error al cargar eventos');
      const dataEventos = await resEventos.json();
      setEventos(dataEventos.eventos);

      // Fetch PDVs for dropdown
      const resPdvs = await fetch('/api/pdv');
      if (resPdvs.ok) {
        const dataPdvs = await resPdvs.json();
        setPdvs(dataPdvs.pdvs);
        if (dataPdvs.pdvs.length > 0) {
          setFormPdvId(String(dataPdvs.pdvs[0].id));
        }
      }

      // Fetch Areas to set for events
      const resVisitas = await fetch('/api/visitas');
      if (resVisitas.ok) {
        const dataVisitas = await resVisitas.json();
        setAreas(dataVisitas.areas || []);
        setTiposVisita(dataVisitas.tiposVisita || []);
        setPlantillas(dataVisitas.plantillas || []);
        setCategorias(dataVisitas.categorias || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUserRole(parseInt(u.rol_id));
        if (u.id) setUserId(parseInt(u.id));
        
        // Auto-select area based on role
        const mappedArea = getAreaIdFromRol(u.rol_id);
        if (mappedArea && mappedArea !== 'admin') {
          setFormAreaId(String(mappedArea));
        }
      } catch (e) {}
    }
  }, []);

  // Prefill scheduling form from query parameters (for redirections from solicitudes page)
  useEffect(() => {
    if (!loading && searchParams) {
      const pdv = searchParams.get('pdv_id');
      const area = searchParams.get('area_id');
      const title = searchParams.get('titulo');
      const desc = searchParams.get('descripcion');
      const date = searchParams.get('fecha');
      const show = searchParams.get('show_form');
      
      if (pdv) setFormPdvId(pdv);
      if (area) setFormAreaId(area);
      if (title) setFormTitle(title);
      if (desc) setFormDesc(desc);
      if (date) setSelectedDateStr(date);
      if (show === 'true') setShowForm(true);
    }
  }, [loading, searchParams]);

  // Reset or pre-select visit type when area changes
  useEffect(() => {
    if (formAreaId && tiposVisita.length > 0) {
      const filtered = tiposVisita.filter(t => t.area_id === parseInt(formAreaId));
      if (filtered.length > 0) {
        setFormTipoVisitaId(String(filtered[0].id));
      } else {
        setFormTipoVisitaId('');
      }
    } else {
      setFormTipoVisitaId('');
    }
  }, [formAreaId, tiposVisita]);

  // Update default selected area if Admin or Coordinator once areas are loaded
  useEffect(() => {
    if (areas.length > 0 && !formAreaId) {
      setFormAreaId(String(areas[0].id));
    }
  }, [areas, formAreaId]);

  // Synchronize custom checklist tasks with the selected template as a baseline
  useEffect(() => {
    if (formAreaId && formTipoVisitaId && plantillas.length > 0) {
      const template = plantillas.find(
        (p) => p.area_id === parseInt(formAreaId) && p.tipo_visita_id === parseInt(formTipoVisitaId)
      );
      if (template) {
        try {
          const parsed = JSON.parse(template.campos);
          if (parsed[0] && parsed[0].tipo === 'matrix') {
            const rows = parsed[0].secciones.flatMap(s => s.filas);
            setCustomChecklistTasks(rows);
          } else if (parsed[0] && parsed[0].tipo === 'simple_checklist') {
            const rows = parsed[0].secciones.flatMap(s => s.filas);
            setCustomChecklistTasks(rows);
          } else {
            const labels = parsed.filter(f => f.tipo === 'checkbox').map(f => f.label);
            setCustomChecklistTasks(labels);
          }
        } catch (e) {
          setCustomChecklistTasks([]);
        }
      } else {
        setCustomChecklistTasks([]);
      }
    } else {
      setCustomChecklistTasks([]);
    }
  }, [formAreaId, formTipoVisitaId, plantillas]);

  const handleAddCustomTask = () => {
    if (newCustomTaskText.trim()) {
      setCustomChecklistTasks([...customChecklistTasks, newCustomTaskText.trim()]);
      setNewCustomTaskText('');
    }
  };

  const handleDeleteCustomTask = (idx) => {
    const updated = [...customChecklistTasks];
    updated.splice(idx, 1);
    setCustomChecklistTasks(updated);
  };

  const handleEditCustomTask = (idx, text) => {
    const updated = [...customChecklistTasks];
    updated[idx] = text;
    setCustomChecklistTasks(updated);
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (dayNum) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    setSelectedDateStr(`${year}-${month}-${day}`);
    setSubmitSuccess('');
    setSubmitError('');
  };

  const OVERRIDE_ROLES = [1, 2, 3, 4, 5, 6, 7, 9]; // Admin + all chiefs

  const handleScheduleVisit = async (e, overrideJustif = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitLoading(true);

    // Find matching template
    let selectedPlantillaId = null;
    if (formAreaId && formTipoVisitaId) {
      const template = plantillas.find(
        (p) => p.area_id === parseInt(formAreaId) && p.tipo_visita_id === parseInt(formTipoVisitaId)
      );
      if (template) selectedPlantillaId = template.id;
    }

    let camposPersonalizados = null;
    if (customizeChecklist && customChecklistTasks.length > 0) {
      camposPersonalizados = JSON.stringify(
        customChecklistTasks.map((task, idx) => ({
          nombre: `custom_field_${idx}`,
          tipo: 'checkbox',
          label: task,
          requerido: true
        }))
      );
    }

    // Validation: Category is mandatory for systems/maintenance roles when area is Sistemas/Mantenimiento
    const isSistemasOrMantenimiento = parseInt(formAreaId) === 3 || parseInt(formAreaId) === 7;
    if (isSistemasOrMantenimiento && [1, 4, 9, 12, 16].includes(userRole)) {
      if (!formCategoriaId) {
        setSubmitError('Debe clasificar la visita en una categoría.');
        setSubmitLoading(false);
        return;
      }
    }

    const payload = {
      pdv_id: parseInt(formPdvId),
      area_id: parseInt(formAreaId),
      titulo: formTitle,
      descripcion: formDesc,
      fecha: selectedDateStr,
      hora_inicio: formHoraInicio,
      hora_fin: formHoraFin,
      tipo_evento: formTipo,
      tipo_visita_id: formTipoVisitaId ? parseInt(formTipoVisitaId) : null,
      plantilla_id: selectedPlantillaId,
      campos_personalizados: camposPersonalizados,
      categoria_id: formCategoriaId ? parseInt(formCategoriaId) : null,
      ...(overrideJustif ? { override_justificacion: overrideJustif } : {})
    };

    try {
      const res = await fetch('/api/calendario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.conflicto && OVERRIDE_ROLES.includes(userRole)) {
        // Chief detected a conflict - show override modal
        setConflictModal(data.evento_conflicto);
        setOverridePending(payload);
        setOverrideJustificacion('');
        setSubmitLoading(false);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Error al programar visita');

      setSubmitSuccess(data.message || 'Visita programada exitosamente');
      setFormTitle('');
      setFormDesc('');
      setFormCategoriaId('');
      setCustomizeChecklist(false);
      setCustomChecklistTasks([]);
      setShowForm(false);
      setConflictModal(null);
      setOverridePending(null);

      // Reload calendar events
      const resEventos = await fetch('/api/calendario');
      if (resEventos.ok) {
        const dataEventos = await resEventos.json();
        setEventos(dataEventos.eventos);
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleConfirmOverride = async () => {
    if (!overrideJustificacion.trim()) {
      alert('Debes ingresar una justificación para autorizar esta excepción.');
      return;
    }
    setConflictModal(null);
    await handleScheduleVisit(null, overrideJustificacion.trim());
  };


  const handleCompleteAudit = (event) => {
    // Redirect to checklists module prefilled
    router.push(`/visitas?pdv_id=${event.pdv_id}&area_id=${event.area_id}&evento_id=${event.id}`);
  };

  // Calendar math
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const totalDays = getDaysInMonth(currentDate);
  const startDayIndex = getFirstDayOfMonth(currentDate);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Group events by date
  const eventsByDate = eventos.reduce((groups, ev) => {
    if (!groups[ev.fecha]) groups[ev.fecha] = [];
    groups[ev.fecha].push(ev);
    return groups;
  }, {});

  // Selected date events
  const selectedDayEvents = eventsByDate[selectedDateStr] || [];

  // Generate calendar grid cells
  const gridCells = [];
  for (let i = 0; i < startDayIndex; i++) {
    gridCells.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    gridCells.push(i);
  }

  // Check if current user has permission to fill checklist for this event
  const canUserCompleteVisit = (event) => {
    if (!userRole) return false;
    if (userRole === 1 || userRole === 2) return true; // Admin/Coordinator can complete all
    
    const userAreaId = getAreaIdFromRol(userRole);
    return userAreaId === event.area_id;
  };

  // Determine if dropdown should be disabled (locked to supervisor area)
  const isAreaLocked = userRole !== 1 && userRole !== 2;

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Cargando calendario...</p>
        <style jsx>{`
          .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; }
          .spinner { width: 40px; height: 40px; border: 4px solid var(--color-bg-secondary); border-top: 4px solid var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="calendario-page-container">
      {error && <div className="card error-card"><div className="card-body">❌ {error}</div></div>}

      {/* ===== Conflict Override Modal for Area Chiefs ===== */}
      {conflictModal && (
        <div className="cal-modal-overlay" onClick={() => setConflictModal(null)}>
          <div className="cal-modal conflict-modal" onClick={e => e.stopPropagation()}>
            <div className="conflict-modal-icon">⚠️</div>
            <h3 className="conflict-modal-title">Conflicto de Horario Detectado</h3>
            <p className="conflict-modal-desc">
              Ya existe la visita <strong>"{conflictModal?.titulo}"</strong> programada por{' '}
              <strong>{conflictModal?.usuario_nombre}</strong> de{' '}
              <strong>{conflictModal?.hora_inicio}</strong> a{' '}
              <strong>{conflictModal?.hora_fin}</strong> en este PDV y fecha.
            </p>
            <p className="conflict-modal-auth">
              Como Jefe de Área, puedes autorizar esta excepción ingresando una justificación:
            </p>
            <textarea
              className="conflict-justif-input"
              placeholder="Ej: Visita urgente solicitada por gerencia. Se coordinó con el área de Mantenimiento."
              value={overrideJustificacion}
              onChange={e => setOverrideJustificacion(e.target.value)}
              rows={3}
              id="input-override-justificacion"
            />
            <div className="conflict-modal-actions">
              <button
                className="btn-conflict-cancel"
                onClick={() => { setConflictModal(null); setOverridePending(null); }}
              >
                Cancelar
              </button>
              <button
                className="btn-conflict-confirm"
                onClick={handleConfirmOverride}
                disabled={!overrideJustificacion.trim()}
                id="btn-confirmar-excepcion"
              >
                ✅ Autorizar Excepción
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="calendar-layout-grid">
        
        {/* Left Column: Calendar Grid */}
        <div className="calendar-left-col">
          <div className="card shadow-md">
            <div className="card-header calendar-month-header">
              <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth}>◀</button>
              <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
              <button className="btn btn-secondary btn-sm" onClick={handleNextMonth}>▶</button>
            </div>
            <div className="card-body">
              {/* Day headers */}
              <div className="calendar-week-headers">
                <span>Dom</span><span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span>
              </div>
              
              {/* Day cells */}
              <div className="calendar-days-grid">
                {gridCells.map((dayNum, idx) => {
                  if (dayNum === null) {
                    return <div key={`empty-${idx}`} className="calendar-day empty"></div>;
                  }
                  
                  const year = currentDate.getFullYear();
                  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                  const day = String(dayNum).padStart(2, '0');
                  const cellDateStr = `${year}-${month}-${day}`;
                  
                  const hasEvents = !!eventsByDate[cellDateStr];
                  const isSelected = selectedDateStr === cellDateStr;
                  const isToday = new Date().toISOString().split('T')[0] === cellDateStr;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      className={`calendar-day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      onClick={() => handleDayClick(dayNum)}
                    >
                      <span className="day-number">{dayNum}</span>
                      {hasEvents && (
                        <span className="calendar-day-events-dots">
                          {eventsByDate[cellDateStr].slice(0, 3).map((ev, evIdx) => (
                            <span 
                              key={evIdx} 
                              className="ev-dot"
                              style={{ backgroundColor: ev.area_color || 'var(--color-secondary)' }}
                            ></span>
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Day details / Book form */}
        <div className="calendar-right-col">
          
          {/* Day list card */}
          <div className="card shadow-md">
            <div className="card-header">
              <h3>📅 Visitas para el {selectedDateStr}</h3>
              {(!showForm && userRole !== 8 && userRole !== 17) && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                  + Programar
                </button>
              )}
            </div>
            <div className="card-body day-events-body">
              
              {submitSuccess && <div className="success-alert">{submitSuccess}</div>}
              
              {selectedDayEvents.length > 0 ? (
                <div className="day-events-list">
                  {selectedDayEvents.map((ev) => {
                    const isCompleted = ev.estado === 'completado';
                    const userCanFill = canUserCompleteVisit(ev);
                    
                    return (
                      <div key={ev.id} className="event-item-card">
                        <div className="event-header-row">
                          <span className="event-time-badge">
                            🕒 {ev.hora_inicio} - {ev.hora_fin}
                          </span>
                          <span className="event-area-badge" style={{ borderLeftColor: ev.area_color || '#6B3A2A' }}>
                            {ev.area_nombre || 'General'}
                          </span>
                        </div>
                        
                        <div className="event-details">
                          <div className="event-title-line">
                            <h4>{ev.titulo}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={`status-badge-text ${isCompleted ? 'completado' : 'programado'}`}>
                                {isCompleted ? '✓ Completada' : '⏳ Programada'}
                              </span>
                              {(userRole === 1 || userRole > 9 || parseInt(ev.created_by) === userId || parseInt(ev.responsable_id) === userId) && (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`¿Estás seguro de que deseas eliminar este evento programado (${ev.titulo})? Esta acción también eliminará la visita si ya fue iniciada.`)) {
                                      try {
                                        const res = await fetch(`/api/calendario?id=${ev.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                          alert('✅ Evento eliminado correctamente');
                                          loadData();
                                        } else {
                                          const data = await res.json();
                                          alert('❌ Error al eliminar: ' + (data.error || 'Desconocido'));
                                        }
                                      } catch (err) {
                                        alert('❌ Error de conexión al eliminar evento');
                                      }
                                    }
                                  }}
                                  style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                                  title="Eliminar evento de calendario por arrepentimiento o error"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="event-pdv">🏢 {ev.pdv_nombre} ({ev.ciudad_nombre})</p>
                          {ev.descripcion && <p className="event-desc">📝 {ev.descripcion}</p>}
                          <p className="event-author">👤 Asignado por: {ev.usuario_nombre}</p>
                          
                          {/* Completion / Access checks */}
                          {!isCompleted && (
                            <div className="event-action-box">
                              {userCanFill ? (
                                <button 
                                  className="btn btn-primary btn-sm btn-block"
                                  onClick={() => handleCompleteAudit(ev)}
                                >
                                  📋 Realizar Auditoría / Cargar Evidencias
                                </button>
                              ) : (
                                <div className="maint-notice-badge">
                                  ℹ️ Corresponde al área de <strong>{ev.area_nombre}</strong>. Solo su personal puede completar este checklist.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-events-view">
                  <p>No hay visitas operativas programadas para este día.</p>
                </div>
              )}
            </div>
          </div>

          {/* Scheduling form Modal */}
          {showForm && (
            <div className="modal-backdrop no-print">
              <div className="modal-content card shadow-md animate-fade-in" style={{ maxWidth: '500px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>📝 Programar Visita</h3>
                  <button className="modal-close-btn" onClick={() => setShowForm(false)}>×</button>
                </div>
                <div className="card-body modal-scrollable-body">
                  
                  {submitError && <div className="error-alert">{submitError}</div>}

                  <form onSubmit={handleScheduleVisit} className="scheduling-form">
                    <div className="form-group">
                      <label className="form-label" htmlFor="form-title">Título de la Visita</label>
                      <input
                        id="form-title"
                        type="text"
                        className="form-input"
                        placeholder="Ej: Inspección Mensual SST o Visita Calidad"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="form-pdv">Punto de Venta (PDV)</label>
                      <select
                        id="form-pdv"
                        className="form-select"
                        value={formPdvId}
                        onChange={(e) => setFormPdvId(e.target.value)}
                        required
                      >
                        {pdvs.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} ({p.ciudad_nombre})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="form-area">Área Responsable</label>
                      <select
                        id="form-area"
                        className="form-select"
                        value={formAreaId}
                        onChange={(e) => setFormAreaId(e.target.value)}
                        required
                        disabled={isAreaLocked}
                      >
                        {areas.map(a => (
                          <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Tipo de Visita Selection */}
                    {formAreaId && (
                      <div className="form-group animate-fade-in">
                        <label className="form-label" htmlFor="form-tipo-visita">Tipo de Visita</label>
                        <select
                          id="form-tipo-visita"
                          className="form-select"
                          value={formTipoVisitaId}
                          onChange={(e) => setFormTipoVisitaId(e.target.value)}
                          required
                        >
                          <option value="">-- Seleccionar Tipo --</option>
                          {tiposVisita
                            .filter((t) => t.area_id === parseInt(formAreaId))
                            .map((t) => (
                              <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                      </div>
                    )}

                    {formAreaId && (parseInt(formAreaId) === 3 || parseInt(formAreaId) === 7) && [1, 4, 9, 12, 16].includes(userRole) && (
                      <div className="form-group animate-fade-in">
                        <label className="form-label" htmlFor="form-categoria">Categoría del Soporte</label>
                        <SearchableCategorySelect
                          categories={categorias}
                          selectedId={formCategoriaId}
                          onChange={(val) => setFormCategoriaId(val)}
                          areaId={formAreaId}
                        />
                      </div>
                    )}

                    <div className="form-row-split">
                      <div className="form-group">
                        <label className="form-label" htmlFor="form-start-time">Hora Inicio</label>
                        <input
                          id="form-start-time"
                          type="time"
                          className="form-input"
                          value={formHoraInicio}
                          onChange={(e) => setFormHoraInicio(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="form-end-time">Hora Fin</label>
                        <input
                          id="form-end-time"
                          type="time"
                          className="form-input"
                          value={formHoraFin}
                          onChange={(e) => setFormHoraFin(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="form-desc">Descripción / Observaciones</label>
                      <textarea
                        id="form-desc"
                        className="form-textarea"
                        placeholder="Detalles sobre los puntos clave de la visita..."
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                      ></textarea>
                    </div>

                    {/* Custom Checklist Section */}
                    {formTipo === 'visita' && formAreaId && formTipoVisitaId && (
                      <div className="custom-checklist-schedule-section" style={{ marginTop: '10px', padding: '12px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-secondary)', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <input
                            id="form-customize-checklist"
                            type="checkbox"
                            className="form-checkbox"
                            checked={customizeChecklist}
                            onChange={(e) => setCustomizeChecklist(e.target.checked)}
                          />
                          <label htmlFor="form-customize-checklist" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary-dark)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            📋 Personalizar checklist específico para esta visita
                          </label>
                        </div>

                        {customizeChecklist && (
                          <div className="custom-tasks-list-editor animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Lista de tareas a realizar (el Auxiliar las marcará):</span>
                            
                            <div className="tasks-chips-container" style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '150px', overflowY: 'auto', padding: '6px', background: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-light)' }}>
                              {customChecklistTasks.map((task, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-bg-secondary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', border: '1px solid var(--color-border-light)' }}>
                                  <span style={{ flex: 1 }}>{task}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCustomTask(idx)}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold', fontSize: '0.9rem' }}
                                    title="Eliminar tarea"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              {customChecklistTasks.length === 0 && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px' }}>No hay tareas en el checklist. Agrega una abajo.</span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Ej. Limpiar CPU, Soplar fuentes..."
                                value={newCustomTaskText}
                                onChange={(e) => setNewCustomTaskText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomTask();
                                  }
                                }}
                                style={{ padding: '4px 8px', fontSize: '0.75rem', height: '30px' }}
                              />
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleAddCustomTask}
                                style={{ padding: '4px 10px', fontSize: '0.75rem', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                Añadir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="form-checkbox-group">
                      <input
                        id="form-sync"
                        type="checkbox"
                        className="form-checkbox"
                        checked={formSyncOutlook}
                        onChange={(e) => setFormSyncOutlook(e.target.checked)}
                      />
                      <label htmlFor="form-sync" className="checkbox-label">
                        📧 Sincronizar automáticamente con Microsoft Outlook
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-block"
                      disabled={submitLoading}
                    >
                      {submitLoading ? 'Programando...' : 'Confirmar Programación'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      <style jsx>{`
        .calendario-page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .calendar-layout-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-lg);
        }

        @media (min-width: 992px) {
          .calendar-layout-grid {
            grid-template-columns: 1.1fr 0.9fr;
          }
        }

        .calendar-month-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .calendar-month-header h2 {
          color: var(--color-primary-dark);
          font-family: 'Playfair Display', serif;
        }

        .calendar-week-headers {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-sm);
        }

        .calendar-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }

        .calendar-day.empty {
          height: 60px;
          background: transparent;
        }

        .calendar-day-btn {
          height: 60px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border-light);
          background-color: var(--color-bg-card);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 6px 4px;
          transition: all var(--transition-fast);
          position: relative;
        }

        .calendar-day-btn:hover {
          border-color: var(--color-primary);
          background-color: var(--color-bg-secondary);
        }

        .calendar-day-btn.selected {
          background-color: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .calendar-day-btn.today {
          border: 2px solid var(--color-secondary);
        }

        .day-number {
          font-weight: 600;
          font-size: 0.85rem;
        }

        .calendar-day-btn.selected .day-number {
          color: white;
        }

        .calendar-day-events-dots {
          display: flex;
          gap: 3px;
          justify-content: center;
          width: 100%;
        }

        .ev-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .calendar-day-btn.selected .ev-dot {
          border: 1px solid white;
        }

        /* Right Column Day Event details */
        .day-events-body {
          min-height: 200px;
        }

        .no-events-view {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 180px;
          color: var(--color-text-muted);
          font-size: 0.85rem;
          text-align: center;
        }

        .day-events-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .event-item-card {
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          background-color: var(--color-bg-primary);
          position: relative;
        }

        .event-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xs);
        }

        .event-time-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          color: white;
          background-color: var(--color-primary-light);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .event-area-badge {
          font-size: 0.75rem;
          font-weight: 700;
          border-left: 3.5px solid #8B6914;
          padding-left: 6px;
          color: var(--color-text-primary);
        }

        .event-title-line {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-xs);
        }

        .event-details h4 {
          font-size: 0.9rem;
          color: var(--color-primary-dark);
          line-height: 1.2;
        }

        .status-badge-text {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }

        .status-badge-text.programado {
          background-color: var(--color-yellow-bg);
          color: #854D0E;
        }

        .status-badge-text.completado {
          background-color: #DCFCE7;
          color: #166534;
        }

        .event-pdv, .event-desc, .event-author {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-bottom: 2px;
        }

        .event-desc {
          margin-top: var(--spacing-xs);
          color: var(--color-text-primary);
          font-style: italic;
        }

        .event-action-box {
          margin-top: var(--spacing-md);
          border-top: 1px dashed var(--color-border);
          padding-top: var(--spacing-sm);
        }

        .maint-notice-badge {
          font-size: 0.72rem;
          background-color: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--color-primary);
        }

        /* Modal Overlay Styling */
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
          max-width: 500px;
          max-height: 90vh;
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
        }

        .modal-scrollable-body {
          overflow-y: auto;
          max-height: calc(90vh - 80px);
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.75rem;
          cursor: pointer;
          color: var(--color-text-muted);
          transition: color var(--transition-fast);
        }

        .modal-close-btn:hover {
          color: var(--color-error);
        }

        .scheduling-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .form-row-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm);
        }

        .form-checkbox-group {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin: var(--spacing-xs) 0;
        }

        .form-checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--color-primary);
        }

        .checkbox-label {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
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

        /* Mobile responsive overrides for calendario */
        @media (max-width: 767px) {
          .calendar-layout-grid {
            grid-template-columns: 1fr;
          }

          .calendar-month-header h2 {
            font-size: 1rem;
          }

          .calendar-month-header .btn-sm {
            padding: 4px 8px;
            font-size: 0.7rem;
          }

          .calendar-week-headers {
            font-size: 0.65rem;
          }

          .calendar-days-grid {
            gap: 3px;
          }

          .calendar-day-btn {
            height: 45px;
            padding: 4px 2px;
            font-size: 0.75rem;
          }

          .day-number {
            font-size: 0.75rem;
          }

          .ev-dot {
            width: 4px;
            height: 4px;
          }

          .event-item-card {
            padding: var(--spacing-sm);
            font-size: 0.8rem;
          }

          .create-event-form {
            gap: var(--spacing-sm);
          }

          .form-row-split {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 479px) {
          .calendar-day-btn {
            height: 38px;
            padding: 3px 1px;
          }

          .day-number {
            font-size: 0.7rem;
          }
        }

        /* ===== Conflict Override Modal ===== */
        .cal-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .conflict-modal {
          background: #fff;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          animation: slideUp 0.25s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .conflict-modal-icon {
          font-size: 2.5rem;
          text-align: center;
          margin-bottom: 12px;
        }

        .conflict-modal-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: #92400e;
          text-align: center;
          margin: 0 0 12px;
        }

        .conflict-modal-desc {
          font-size: 0.88rem;
          color: var(--color-text-secondary);
          background: #fef3c7;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 12px;
          line-height: 1.5;
        }

        .conflict-modal-auth {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin-bottom: 10px;
        }

        .conflict-justif-input {
          width: 100%;
          border: 2px solid var(--color-border);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.85rem;
          color: var(--color-text-primary);
          resize: vertical;
          margin-bottom: 16px;
          box-sizing: border-box;
        }

        .conflict-justif-input:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .conflict-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-conflict-cancel {
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-conflict-cancel:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }

        .btn-conflict-confirm {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-conflict-confirm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245,158,11,0.4);
        }

        .btn-conflict-confirm:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
