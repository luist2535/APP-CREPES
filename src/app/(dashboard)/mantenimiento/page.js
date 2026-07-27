'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

// Custom Interactive Signature Pad Component using HTML5 Canvas
function SignaturePad({ onSave, onClear, label, value }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [signatureData, setSignatureData] = useState(value || '');

  useEffect(() => {
    setSignatureData(value || '');
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#2C1810';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || canvas.offsetWidth || 500;
      canvas.height = rect.height || canvas.offsetHeight || 250;
      ctx.strokeStyle = '#2C1810';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const preventDefault = (e) => {
        if (e.target === canvas) {
          e.preventDefault();
        }
      };

      const handleTouchStart = (e) => {
        e.preventDefault();
        const coords = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        isDrawing.current = true;
      };

      const handleTouchMove = (e) => {
        if (!isDrawing.current) return;
        e.preventDefault();
        const coords = getCoordinates(e);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      };

      const handleTouchEnd = (e) => {
        if (isDrawing.current) {
          isDrawing.current = false;
        }
      };

      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      canvas.addEventListener('gesturestart', preventDefault, { passive: false });

      return () => {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('gesturestart', preventDefault);
      };
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    isDrawing.current = true;
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();
    setSignatureData(dataUrl);
    onSave(dataUrl);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSignatureData('');
    onClear();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4A2518' }}>{label}</label>

      {signatureData ? (
        <div style={{ border: '1px solid #E8DDD4', borderRadius: '8px', padding: '10px', background: '#FAF6F0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <img src={signatureData} alt="Firma capturada" style={{ maxHeight: '80px', maxWidth: '100%' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setIsOpen(true)} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
              ✏️ Cambiar Firma
            </button>
            <button type="button" onClick={handleClear} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', border: 'none', background: '#FEE2E2', color: '#991B1B', cursor: 'pointer' }}>
              🗑️ Limpiar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setIsOpen(true)} style={{ padding: '10px 14px', fontSize: '0.82rem', borderRadius: '8px', border: '1.5px dashed #6B3A2A', background: '#FFF', color: '#6B3A2A', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
          ✍️ Pulsar para Dibujar Firma
        </button>
      )}

      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: '#2C1810' }}>✍️ Dibujar Firma</h4>
              <button type="button" onClick={() => setIsOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#666' }}>Por favor dibuje su firma dentro del recuadro:</p>
              <div style={{ border: '2px dashed #6B3A2A', borderRadius: '8px', background: '#FDFBF7', height: '220px', overflow: 'hidden' }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{ width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
                />
              </div>
            </div>
            <div style={{ padding: '12px 20px', background: '#f9f9f9', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" onClick={clearCanvas} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                🧹 Limpiar
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setIsOpen(false)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="button" onClick={saveSignature} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: '#166534', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  Aceptar Firma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =================== CONSTANTS ===================
const ESTADOS = ['Pendiente', 'Asignado', 'En proceso', 'Por Aprobar', 'Finalizado', 'Cancelado'];
const TIPOS = ['Preventivo', 'Correctivo', 'Locativo'];
const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Crítica'];
const AREAS_REGISTRO = ['Calidad', 'Mantenimiento', 'Sistemas'];

const ESTADO_COLORS = {
  'Pendiente': { bg: '#FEF9C3', color: '#854D0E', border: '#FDE68A' },
  'Asignado': { bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE' },
  'En proceso': { bg: '#FFE4B5', color: '#92400E', border: '#FCD34D' },
  'Por Aprobar': { bg: '#E0E7FF', color: '#3730A3', border: '#C7D2FE' },
  'Finalizado': { bg: '#DCFCE7', color: '#166534', border: '#BBF7D0' },
  'Cancelado': { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
};

const PRIORIDAD_COLORS = {
  'Baja': { bg: '#F0FDF4', color: '#15803D' },
  'Media': { bg: '#FEF9C3', color: '#854D0E' },
  'Alta': { bg: '#FFF7ED', color: '#C2410C' },
  'Crítica': { bg: '#FEE2E2', color: '#991B1B' },
};

const PREFIJO_STYLE = {
  'MT': { bg: '#F5EDE4', color: '#6B3A2A', border: '#D4A847' },
  'ST': { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' },
};

function formatMinutes(min) {
  if (!min || min === 0) return '-';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function parseChecklist(input) {
  if (!input) return [];
  let arr = [];
  try {
    arr = typeof input === 'string' ? JSON.parse(input) : input;
  } catch (e) {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === 'string') {
      return { texto: item, completada: false };
    }
    if (item && typeof item === 'object') {
      const texto = item.texto || item.tarea || item.descripcion || item.nombre || item.label || item.item || item.actividad || item.title || item.name || item[0] || '(Actividad de mantenimiento)';
      return {
        ...item,
        texto: String(texto),
        completada: Boolean(item.completada || item.completado || item.checked || item.done || item.status === 'done' || item.status === 'completed')
      };
    }
    return { texto: '(Actividad de mantenimiento)', completada: false };
  });
}

// =================== TICKET CARD (Mobile exacto a input_file_1.png) ===================
function TicketCard({ ticket, onOpen, onStartModoVisita, onOpenModoVisita, onApprove, esJefe }) {
  const ec = ESTADO_COLORS[ticket.estado] || ESTADO_COLORS['Pendiente'];
  const pc = PRIORIDAD_COLORS[ticket.prioridad] || PRIORIDAD_COLORS['Media'];
  const pref = PREFIJO_STYLE[ticket.prefijo] || PREFIJO_STYLE['MT'];

  let estadoColor = '#D97706'; // Pendiente por defecto
  if (ticket.estado === 'Finalizado') estadoColor = '#16A34A';
  if (ticket.estado === 'Por Aprobar') estadoColor = '#2563EB';
  if (ticket.estado === 'En proceso') estadoColor = '#EA580C';

  return (
    <div
      onClick={() => onOpen(ticket)}
      style={{
        background: '#fff', borderRadius: '18px', border: '1px solid #E5D8CC',
        padding: '16px 18px', cursor: 'pointer', transition: 'all 0.18s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '6px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#2C1810' }}>
          {ticket.id}
        </span>
        <span style={{ fontSize: '0.86rem', fontWeight: 800, color: estadoColor }}>
          {ticket.estado}
        </span>
      </div>

      <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '1px', fontWeight: 500 }}>
        {ticket.tipo_mantenimiento} • {ticket.area_registro}
      </div>

      <div style={{ fontSize: '0.94rem', fontWeight: 600, color: '#1F2937', lineHeight: 1.35, margin: '6px 0 10px' }}>
        {ticket.descripcion?.length > 95 ? ticket.descripcion.substring(0, 95) + '…' : ticket.descripcion}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F5ECE5', paddingTop: '12px', marginTop: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {ticket.prioridad !== 'Media' ? (
            <span style={{ fontSize: '0.72rem', background: pc.bg, color: pc.color, padding: '3px 9px', borderRadius: '10px', fontWeight: 700 }}>
              {ticket.prioridad}
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>
              📅 {formatDate(ticket.fecha_registro)}
            </span>
          )}
          {ticket.prioridad !== 'Media' && (
            <span style={{ fontSize: '0.75rem', color: '#888' }}>
              {formatDate(ticket.fecha_registro)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onOpen(ticket)}
            style={{ background: '#F3EBE3', color: '#2C1810', border: '1px solid #D1C7BD', borderRadius: '10px', padding: '6px 16px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer' }}
          >
            Ver
          </button>
          {ticket.estado === 'Asignado' && (
            <button onClick={() => onStartModoVisita ? onStartModoVisita(ticket) : null} style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: '#D97706', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              🚀 Iniciar
            </button>
          )}
          {ticket.estado === 'En proceso' && (
            <button onClick={() => onOpenModoVisita ? onOpenModoVisita(ticket) : null} style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: '#166534', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              🛠️ Continuar
            </button>
          )}
          {ticket.estado === 'Por Aprobar' && esJefe && (
            <button onClick={() => onApprove ? onApprove(ticket) : null} style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              🔍 Aprobar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    setActiveParentId(null);
  }, [areaId]);

  const safeCategories = Array.isArray(categories) ? categories : [];
  const filtered = safeCategories.filter(c => c && c.area_id === parseInt(areaId));

  const getCategoryFullPath = (catId) => {
    const path = [];
    let current = filtered.find(c => c && c.id === catId);
    while (current) {
      path.unshift(current.nombre || 'Sin nombre');
      current = filtered.find(c => c && c.id === current.padre_id);
    }
    return path.join(' › ');
  };

  const selectedCat = filtered.find(c => c && String(c.id) === String(selectedId));
  const selectedFullPath = selectedCat ? getCategoryFullPath(selectedCat.id) : '';

  const crumbs = [];
  let curr = filtered.find(c => c && c.id === activeParentId);
  while (curr) {
    crumbs.unshift(curr);
    curr = filtered.find(c => c && c.id === curr.padre_id);
  }

  let visibleOptions = [];
  if (searchTerm) {
    visibleOptions = filtered
      .filter(c => c && (c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()))
      .map(c => ({
        ...c,
        fullPath: getCategoryFullPath(c.id),
        hasChildren: filtered.some(child => child && child.padre_id === c.id)
      }));
  } else {
    visibleOptions = filtered
      .filter(c => c && (activeParentId ? c.padre_id === activeParentId : !c.padre_id))
      .map(c => ({
        ...c,
        fullPath: c.nombre || 'Sin nombre',
        hasChildren: filtered.some(child => child && child.padre_id === c.id)
      }));
  }

  return (
    <div className="searchable-select-container" ref={containerRef} style={{ position: 'relative' }}>
      <div
        className="searchable-select-trigger"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            if (selectedCat && selectedCat.padre_id) {
              setActiveParentId(selectedCat.padre_id);
            } else {
              setActiveParentId(null);
            }
          }
        }}
        style={{
          padding: '10px 14px',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          backgroundColor: '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.88rem',
          minHeight: '40px',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ color: selectedCat ? '#111827' : '#6B7280', fontWeight: selectedCat ? '600' : 'normal' }}>
          {selectedCat ? selectedFullPath : '-- Seleccionar Categoría / Subcategoría --'}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{isOpen ? '▲' : '▼'}</span>
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
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            marginTop: '4px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <input
            type="text"
            className="searchable-select-input"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
            onClick={e => e.stopPropagation()}
            style={{
              padding: '10px 12px',
              border: 'none',
              borderBottom: '1px solid #E5E7EB',
              outline: 'none',
              fontSize: '0.85rem',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />

          {!searchTerm && (
            <div
              className="maint-breadcrumbs"
              style={{
                padding: '8px 12px',
                backgroundColor: '#F9FAFB',
                borderBottom: '1px solid #E5E7EB',
                fontSize: '0.75rem',
                color: '#4B5563',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexWrap: 'wrap',
                textAlign: 'left'
              }}
            >
              <span
                style={{ cursor: 'pointer', color: '#2563EB', fontWeight: !activeParentId ? 'bold' : 'normal' }}
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
                      color: idx === crumbs.length - 1 ? '#1F2937' : '#2563EB',
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
              <div style={{ padding: '12px', fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center' }}>
                No se encontraron categorías
              </div>
            ) : (
              visibleOptions.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => {
                    if (searchTerm) {
                      onChange(String(cat.id));
                      setIsOpen(false);
                      setSearchTerm('');
                    } else if (cat.hasChildren) {
                      setActiveParentId(cat.id);
                    } else {
                      onChange(String(cat.id));
                      setIsOpen(false);
                    }
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    backgroundColor: String(selectedId) === String(cat.id) ? '#EFF6FF' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #F3F4F6',
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = String(selectedId) === String(cat.id) ? '#EFF6FF' : 'transparent'}
                >
                  <span style={{ fontWeight: String(selectedId) === String(cat.id) ? 'bold' : 'normal', color: '#1F2937' }}>
                    {cat.fullPath}
                  </span>
                  {!searchTerm && cat.hasChildren && (
                    <span style={{ fontSize: '0.72rem', color: '#3B82F6', backgroundColor: '#DBEAFE', padding: '2px 6px', borderRadius: '10px', fontWeight: '600' }}>
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


// =================== MAIN PAGE ===================
export default function MantenimientoPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'tablero');

  // State
  const [tickets, setTickets] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [stats, setStats] = useState({});
  const [tecnicosMT, setTecnicosMT] = useState([]);
  const [tecnicosST, setTecnicosST] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Toast notifications (reemplaza alert())
  const [toasts, setToasts] = useState([]);
  const showToast = (text, type = 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  // Filters
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrefijo, setFiltroPrefijo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [showFiltrosAvanzados, setShowFiltrosAvanzados] = useState(false);

  // Modal de ticket
  const [ticketModal, setTicketModal] = useState({ open: false, ticket: null, historial: [] });
  const [accionModal, setAccionModal] = useState({ open: false, tipo: '', ticketId: '' });
  const [accionData, setAccionData] = useState({});
  const [activeExecutionTicket, setActiveExecutionTicket] = useState(null);
  const [executionData, setExecutionData] = useState({});
  const [printTicketModal, setPrintTicketModal] = useState(null);
  const [equipoDetailsModal, setEquipoDetailsModal] = useState({ open: false, equipo: null, isConfirming: false });
  const [approvalModalTicket, setApprovalModalTicket] = useState(null);
  const [approvalData, setApprovalData] = useState({ firma_jefe: '', observaciones_aprobacion: '', motivo_devolucion: '' });
  const [openApprovalAccordion, setOpenApprovalAccordion] = useState('aprobar');
  const [showDetailsApproval, setShowDetailsApproval] = useState(false);
  const [drawingBossSignature, setDrawingBossSignature] = useState(false);

  // Formulario nuevo ticket
  const [formTicket, setFormTicket] = useState({
    tipo_mantenimiento: 'Correctivo', area_registro: 'Mantenimiento', pdv_id: '',
    area_hallazgo: '', equipo_id: '', descripcion: '', fecha_evidencia: new Date().toISOString().split('T')[0],
    prioridad: 'Media', observaciones: ''
  });
  const [evidenciasFiles, setEvidenciasFiles] = useState([]);
  const [tipoElemento, setTipoElemento] = useState('equipo'); // 'equipo' | 'locativo'
  const [formMsg, setFormMsg] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  const [scannerLoaded, setScannerLoaded] = useState(false);

  // Inspección global (Sistemas/Calidad)
  const [formInspeccion, setFormInspeccion] = useState({
    pdv_id: '', area_revision: 'Mantenimiento', fecha_inspeccion: new Date().toISOString().split('T')[0],
    observaciones_generales: '', hallazgos: []
  });
  const [inspMsg, setInspMsg] = useState(null);
  const [inspSubmitting, setInspSubmitting] = useState(false);

  // Reportes
  const [reportes, setReportes] = useState(null);

  // Notificaciones
  const [recibirCorreos, setRecibirCorreos] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  // Load user y script del scanner
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) {
        setCurrentUser(d.user);
        const rolInt = parseInt(d.user.rol_id || 0);
        const rolNombre = (d.user.rol || d.user.rol_nombre || '').toLowerCase();
        const perms = d.user.permisos_adicionales || {};
        const esJefeUser = [1, 4, 9].includes(rolInt) || Boolean(perms['mantenimiento.asignar_tickets']?.permitido) || Boolean(perms['mantenimiento.gestionar_tablero']?.permitido);
        if (!esJefeUser && rolInt !== 1 && !Boolean(perms['mantenimiento.gestionar_tablero']?.permitido)) {
          if (rolInt === 12 || rolNombre.includes('mantenimiento')) {
            setActiveTab('ejecucion');
          } else if (rolInt === 5 || rolInt === 13 || rolNombre.includes('calidad')) {
            setActiveTab('nuevo');
          }
        }
      }
    }).catch(() => { });

    // Cargar script html5-qrcode
    if (!document.getElementById('html5-qrcode-script')) {
      const script = document.createElement('script');
      script.id = 'html5-qrcode-script';
      script.src = 'https://unpkg.com/html5-qrcode';
      script.onload = () => setScannerLoaded(true);
      document.body.appendChild(script);
    } else {
      setScannerLoaded(true);
    }

    return () => stopCameraScan();
  }, []);

  const rolIdInt = currentUser ? parseInt(currentUser.rol_id || 0) : 0;
  const rolNombre = (currentUser?.rol || currentUser?.rol_nombre || '').toLowerCase();
  const permsAdic = currentUser?.permisos_adicionales || {};
  const tienePermGranular = (actionKey) => Boolean(permsAdic[actionKey]?.permitido);

  const esAdmin = rolIdInt === 1 || rolNombre.includes('administrador');
  const esJefe = currentUser && ([1, 4, 9].includes(rolIdInt) || tienePermGranular('mantenimiento.asignar_tickets') || tienePermGranular('mantenimiento.gestionar_tablero'));
  const esTecnicoMantenimiento = !esJefe && !esAdmin && (rolIdInt === 12 || rolNombre.includes('mantenimiento') || tienePermGranular('mantenimiento.ver_asignados'));
  const esSistemasCalidad = !esJefe && !esAdmin && !esTecnicoMantenimiento && (rolIdInt === 5 || rolIdInt === 13 || rolNombre.includes('calidad'));

  const puedeVerTablero = esAdmin || esJefe || (!esTecnicoMantenimiento && !esSistemasCalidad) || tienePermGranular('mantenimiento.gestionar_tablero');
  const puedeVerIndicadores = esAdmin || esJefe || (!esTecnicoMantenimiento && !esSistemasCalidad) || tienePermGranular('mantenimiento.ver_indicadores');
  const puedeExportarExcel = esAdmin || esJefe || tienePermGranular('mantenimiento.exportar_excel');

  const handlePrintMantenimientoPDF = async (ticket) => {
    if (!ticket) return;
    try {
      const chkList = parseChecklist(ticket.checklist_tareas);
      let chkStr = chkList.length > 0
        ? chkList.map(c => `• [${c.completada ? '✅ SI' : '❌ NO'}] ${c.texto}`).join('\n')
        : 'No se registraron ítems de checklist en esta orden.';

      const content = `REPORTE TÉCNICO DE MANTENIMIENTO Y HOJA DE VIDA
==================================================
ID Ticket: #${ticket.id}
Tipo Mantenimiento: ${ticket.tipo_mantenimiento || 'Correctivo'}
Prioridad: ${ticket.prioridad || 'Media'}
Área / Solicitante: ${ticket.area_registro || 'N/A'} (${ticket.usuario_registro_nombre || 'N/A'})
Fecha Registro: ${formatDate(ticket.fecha_registro)}
Fecha Finalización: ${ticket.fecha_real_finalizacion ? formatDate(ticket.fecha_real_finalizacion) : new Date().toLocaleString('es-ES')}

ELEMENTO INTERVENIDO / HOJA DE VIDA:
${ticket.equipo_nombre ? `• Equipo: ${ticket.equipo_nombre} (Código: ${ticket.equipo_codigo || 'N/A'})` : `• Elemento Locativo: ${ticket.area_hallazgo || 'N/A'}`}

DESCRIPCIÓN DEL HALLAZGO / PROBLEMA:
${ticket.descripcion || 'Sin descripción'}

SOLUCIÓN Y REPARACIÓN APLICADA:
${ticket.solucion_aplicada || 'En proceso / No finalizado'}

OBSERVACIONES / REPUESTOS:
${ticket.observaciones || 'Ninguna'}

TÉCNICO RESPONSABLE:
• Nombre: ${ticket.tecnico_nombre || currentUser?.nombre || 'Técnico Asignado'}

CHECKLIST DE ACTIVIDADES REALIZADAS:
${chkStr}
==================================================
Generado automáticamente por Crepes en Punto - Módulo de Mantenimiento el ${new Date().toLocaleString('es-ES')}
`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const fileName = `Reporte_Mantenimiento_ID${ticket.id}_${(ticket.equipo_nombre || ticket.area_hallazgo || 'Ticket').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('mantenimiento_id', ticket.id);
        formData.append('categoria', 'reporte_pdf');
        formData.append('tipo_documento', 'Reporte PDF Mantenimiento (Soporte)');
        formData.append('observaciones', `Copia automática del reporte de mantenimiento #${ticket.id}`);
        await fetch('/api/uploads', { method: 'POST', body: formData });
      } catch (err) {
        console.warn('Error guardando respaldo del reporte de mantenimiento:', err);
      }
    } catch (err) {
      console.error(err);
    }

    setPrintTicketModal(ticket);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const exportarExcelMantenimiento = async () => {
    if (!puedeExportarExcel) {
      showToast('No tienes permisos para exportar los reportes de mantenimiento a Excel.', 'error');
      return;
    }
    try {
      showToast('Generando archivo Excel de Mantenimiento...', 'info');
      const XLSX = await import('xlsx');
      const rows = tickets.map(t => ({
        'ID Ticket': t.id,
        'Prefijo': t.prefijo,
        'Estado': t.estado,
        'Prioridad': t.prioridad,
        'Tipo Mantenimiento': t.tipo_mantenimiento,
        'Equipo / Elemento': t.equipo_nombre ? `${t.equipo_nombre} (${t.equipo_codigo || ''})` : (t.area_hallazgo || 'Locativo'),
        'Área Solicitante': t.area_registro || '',
        'Registrado Por': t.usuario_registro_nombre || '',
        'Técnico Responsable': t.tecnico_nombre || 'No asignado',
        'Asignado Por': t.responsable_asignacion_nombre || '',
        'Descripción Hallazgo': t.descripcion || '',
        'Solución / Reparación Aplicada': t.solucion_aplicada || '',
        'Observaciones / Repuestos': t.observaciones || '',
        'Fecha Evidencia': formatDate(t.fecha_evidencia),
        'Fecha Registro': formatDate(t.fecha_registro),
        'Fecha Programada': formatDate(t.fecha_programada),
        'Fecha Finalización': t.fecha_real_finalizacion ? formatDate(t.fecha_real_finalizacion) : '',
        'T. Atención (min)': t.tiempo_atencion_minutos || 0,
        'T. Ejecución (min)': t.tiempo_ejecucion_minutos || 0
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tickets de Mantenimiento');

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Reporte_Mantenimiento_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast('✅ Reporte Excel descargado exitosamente.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error al exportar a Excel: ' + e.message, 'error');
    }
  };

  // Load tickets
  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filtroEstado) p.set('estado', filtroEstado);
      if (filtroPrefijo) p.set('prefijo', filtroPrefijo);
      if (filtroTipo) p.set('tipo', filtroTipo);
      if (filtroTecnico) p.set('tecnico_id', filtroTecnico);
      if (filtroFechaDesde) p.set('fecha_desde', filtroFechaDesde);
      if (filtroFechaHasta) p.set('fecha_hasta', filtroFechaHasta);
      if (busqueda) p.set('search', busqueda);
      const res = await fetch(`/api/mantenimientos?${p}`);
      const data = await res.json();
      setTickets(data.mantenimientos || []);
      setCategorias(data.categorias || []);
      setStats(data.stats || {});
      setTecnicosMT(data.tecnicosMT || []);
      setTecnicosST(data.tecnicosST || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filtroEstado, filtroPrefijo, filtroTipo, filtroTecnico, filtroFechaDesde, filtroFechaHasta, busqueda]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Auto-abrir en Modo Visita si se pasa el ID por la URL desde la pantalla central de Modo Visita (/visitas)
  useEffect(() => {
    if (typeof window !== 'undefined' && tickets.length > 0 && !activeExecutionTicket) {
      const params = new URLSearchParams(window.location.search);
      const openTicketId = params.get('openTicket');
      if (openTicketId) {
        const found = tickets.find(t => String(t.id) === String(openTicketId));
        if (found) {
          openModoVisita(found);
          window.history.replaceState({}, '', '/mantenimiento?tab=ejecucion');
        } else {
          fetch(`/api/mantenimientos/${openTicketId}`)
            .then(r => r.json())
            .then(d => {
              if (d && d.mantenimiento) {
                openModoVisita(d.mantenimiento);
                window.history.replaceState({}, '', '/mantenimiento?tab=ejecucion');
              }
            }).catch(() => {});
        }
      }
    }
  }, [tickets, activeExecutionTicket]);

  // Load equipos and pdvs for form (best-effort, non-blocking)
  useEffect(() => {
    fetch('/api/equipos?pdv_id=0')
      .then(r => r.json())
      .then(d => { if (d.equipos) setEquipos(d.equipos); })
      .catch(() => { /* Equipment list is optional */ });

    fetch('/api/pdv')
      .then(r => r.json())
      .then(d => { if (d.pdvs) setPdvs(d.pdvs); })
      .catch(() => {});
  }, []);

  // Load reportes
  const loadReportes = async () => {
    try {
      const res = await fetch('/api/mantenimientos/reportes');
      const data = await res.json();
      setReportes(data);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { if (activeTab === 'indicadores') loadReportes(); }, [activeTab]);

  // Open ticket detail
  const openTicket = async (ticket) => {
    try {
      const res = await fetch(`/api/mantenimientos/${ticket.id}`);
      const data = await res.json();
      setTicketModal({ open: true, ticket: data.mantenimiento, historial: data.historial || [] });
    } catch (e) { console.error(e); }
  };

  // Submit action (asignar, finalizar, etc.)
  const ejecutarAccion = async () => {
    try {
      let res;
      if (accionModal.tipo === 'finalizar') {
        const formData = new FormData();
        formData.append('accion', accionModal.tipo);
        formData.append('solucion_aplicada', accionData.solucion_aplicada || '');
        formData.append('observaciones', accionData.observaciones || '');
        if (accionData.checklist_completado) {
          formData.append('checklist_completado', JSON.stringify(accionData.checklist_completado));
        }
        if (accionData.firma_tecnico) {
          formData.append('firma_tecnico', accionData.firma_tecnico);
        }
        if (accionData.firma_solicitante) {
          formData.append('firma_solicitante', accionData.firma_solicitante);
        }
        if (accionData.evidencias_cierre_files && accionData.evidencias_cierre_files.length > 0) {
          accionData.evidencias_cierre_files.forEach(f => formData.append('evidencias_cierre', f));
        }
        res = await fetch(`/api/mantenimientos/${accionModal.ticketId}`, {
          method: 'PATCH', body: formData
        });
      } else {
        const body = { accion: accionModal.tipo, ...accionData };
        res = await fetch(`/api/mantenimientos/${accionModal.ticketId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const isFinalizar = accionModal.tipo === 'finalizar';
      const finishedTicket = data.mantenimiento || tickets.find(t => t.id === accionModal.ticketId) || {};
      setAccionModal({ open: false, tipo: '', ticketId: '', prefijo: '' });
      setAccionData({});
      setTicketModal({ open: false, ticket: null, historial: [] });
      showToast(data.message || 'Acción realizada correctamente', 'success');
      loadTickets();
      if (isFinalizar) {
        setTimeout(() => handlePrintMantenimientoPDF(finishedTicket), 500);
      }
    } catch (e) { showToast(e.message, 'error'); }
  };

  // ===================== FUNCIONES MODO VISITA / EJECUCIÓN =====================
  const openModoVisita = (ticket) => {
    setActiveExecutionTicket(ticket);
    const checkList = parseChecklist(ticket.checklist_tareas);
    setExecutionData({
      solucion_aplicada: ticket.solucion_aplicada || '',
      observaciones: ticket.observaciones || '',
      checklist_completado: checkList,
      firma_tecnico: ticket.firma_tecnico || '',
      firma_solicitante: ticket.firma_solicitante || '',
      evidencias_cierre_files: []
    });
    setActiveTab('ejecucion');
  };

  const iniciarYAbriModoVisita = async (ticket) => {
    try {
      const res = await fetch(`/api/mantenimientos/${ticket.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'iniciar' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('🚀 Ticket iniciado. Entrando en Modo Visita...', 'success');
      loadTickets();
      openModoVisita(data.mantenimiento || { ...ticket, estado: 'En proceso' });
    } catch (e) { showToast(e.message, 'error'); }
  };

  const guardarAvanceModoVisita = async () => {
    if (!activeExecutionTicket) return;
    try {
      let res;
      if (executionData.evidencias_cierre_files && executionData.evidencias_cierre_files.length > 0) {
        const formData = new FormData();
        formData.append('accion', 'guardar_avance');
        if (executionData.solucion_aplicada !== undefined) formData.append('solucion_aplicada', executionData.solucion_aplicada);
        if (executionData.observaciones !== undefined) formData.append('observaciones', executionData.observaciones);
        if (executionData.checklist_completado) formData.append('checklist_completado', JSON.stringify(executionData.checklist_completado));
        executionData.evidencias_cierre_files.forEach(f => formData.append('evidencias_cierre', f));
        res = await fetch(`/api/mantenimientos/${activeExecutionTicket.id}`, { method: 'PATCH', body: formData });
      } else {
        res = await fetch(`/api/mantenimientos/${activeExecutionTicket.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accion: 'guardar_avance',
            solucion_aplicada: executionData.solucion_aplicada,
            observaciones: executionData.observaciones,
            checklist_completado: executionData.checklist_completado
          })
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (executionData.evidencias_cierre_files && executionData.evidencias_cierre_files.length > 0) {
        setExecutionData(p => ({ ...p, evidencias_cierre_files: [] }));
      }
      showToast('💾 Avance y evidencias guardados correctamente en el servidor', 'success');
      loadTickets();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const finalizarDesdeModoVisita = async () => {
    if (!activeExecutionTicket) return;
    if (!executionData.solucion_aplicada || !executionData.solucion_aplicada.trim()) {
      showToast('Por favor escribe la solución o reparación aplicada antes de finalizar.', 'error');
      return;
    }
    if (!executionData.firma_tecnico) {
      showToast('Por favor dibuja la firma del técnico ejecutor antes de finalizar.', 'error');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('accion', 'finalizar');
      formData.append('solucion_aplicada', executionData.solucion_aplicada);
      formData.append('observaciones', executionData.observaciones || '');
      if (executionData.checklist_completado) {
        formData.append('checklist_completado', JSON.stringify(executionData.checklist_completado));
      }
      if (executionData.firma_tecnico) {
        formData.append('firma_tecnico', executionData.firma_tecnico);
      }
      if (executionData.firma_solicitante) {
        formData.append('firma_solicitante', executionData.firma_solicitante);
      }
      if (executionData.evidencias_cierre_files && executionData.evidencias_cierre_files.length > 0) {
        executionData.evidencias_cierre_files.forEach(f => formData.append('evidencias_cierre', f));
      }
      const res = await fetch(`/api/mantenimientos/${activeExecutionTicket.id}`, {
        method: 'PATCH', body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('📋 ¡Trabajo enviado a revisión! El Jefe de Mantenimiento debe aprobarlo para cerrar la gestión como Finalizado.', 'success');
      const ticketPorAprobar = data.mantenimiento || { ...activeExecutionTicket, estado: 'Por Aprobar', solucion_aplicada: executionData.solucion_aplicada, observaciones: executionData.observaciones, firma_tecnico: executionData.firma_tecnico, firma_solicitante: executionData.firma_solicitante };
      setActiveExecutionTicket(null);
      setExecutionData({});
      setActiveTab('tablero');
      loadTickets();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleAprobarTicket = async () => {
    if (!approvalModalTicket) return;
    if (!approvalData.firma_jefe) {
      showToast('Por favor dibuja la firma del Jefe de Mantenimiento para aprobar y cerrar el ticket.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/mantenimientos/${approvalModalTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'aprobar',
          firma_jefe: approvalData.firma_jefe,
          observaciones_aprobacion: approvalData.observaciones_aprobacion || 'Aprobado a satisfacción por Jefe de Mantenimiento'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('🎉 ¡Excelente! Ticket aprobado y finalizado oficialmente.', 'success');
      const ticketFinalizado = { ...approvalModalTicket, estado: 'Finalizado', firma_jefe: approvalData.firma_jefe, observaciones_aprobacion: approvalData.observaciones_aprobacion };
      setApprovalModalTicket(null);
      setApprovalData({ firma_jefe: '', observaciones_aprobacion: '', motivo_devolucion: '' });
      loadTickets();
      setTimeout(() => handlePrintMantenimientoPDF(ticketFinalizado), 500);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleDevolverTicket = async () => {
    if (!approvalModalTicket) return;
    if (!approvalData.motivo_devolucion || !approvalData.motivo_devolucion.trim()) {
      showToast('Por favor escribe el motivo o las observaciones por las que devuelves el ticket al técnico.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/mantenimientos/${approvalModalTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'devolver',
          motivo_devolucion: approvalData.motivo_devolucion
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('⚠️ Ticket devuelto al técnico para continuar o corregir su ejecución.', 'info');
      setApprovalModalTicket(null);
      setApprovalData({ firma_jefe: '', observaciones_aprobacion: '', motivo_devolucion: '' });
      loadTickets();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Subida de evidencias y crear ticket
  const submitTicket = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormMsg(null);
    try {
      const formData = new FormData();
      if (tipoElemento === 'locativo') {
        formData.append('area_hallazgo', formTicket.area_hallazgo);
      } else {
        formData.append('equipo_id', formTicket.equipo_id);
      }
      if (formTicket.pdv_id) {
        formData.append('pdv_id', formTicket.pdv_id);
      }
      formData.append('tipo_mantenimiento', formTicket.tipo_mantenimiento);
      formData.append('area_registro', formTicket.area_registro);
      formData.append('descripcion', formTicket.descripcion);
      formData.append('fecha_evidencia', formTicket.fecha_evidencia);
      formData.append('prioridad', formTicket.prioridad);
      formData.append('observaciones', formTicket.observaciones);

      Array.from(evidenciasFiles).forEach(f => formData.append('evidencias', f));

      const res = await fetch('/api/mantenimientos', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFormMsg({ type: 'success', text: data.message });
      showToast(data.message, 'success');
      setFormTicket({ tipo_mantenimiento: 'Correctivo', area_registro: 'Mantenimiento', pdv_id: '', area_hallazgo: '', equipo_id: '', descripcion: '', fecha_evidencia: new Date().toISOString().split('T')[0], prioridad: 'Media', observaciones: '' });
      setEvidenciasFiles([]);
      loadTickets();
    } catch (e) {
      setFormMsg({ type: 'error', text: e.message });
      showToast(e.message, 'error');
    }
    setFormSubmitting(false);
  };

  // Submit inspección
  const submitInspeccion = async (e) => {
    e.preventDefault();
    setInspSubmitting(true);
    setInspMsg(null);
    try {
      const res = await fetch('/api/inspecciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formInspeccion)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInspMsg({ type: 'success', text: data.message });
      loadTickets();
    } catch (e) { setInspMsg({ type: 'error', text: e.message }); }
    setInspSubmitting(false);
  };

  const startCameraScan = () => {
    if (!scannerLoaded) {
      showToast('La cámara no está lista aún. Por favor espera un momento.', 'error');
      return;
    }
    setIsScanning(true);
    setTimeout(() => {
      try {
        const scanner = new window.Html5QrcodeScanner("reader", {
          fps: 15, qrbox: { width: 300, height: 180 }, aspectRatio: 1.3333,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }, rememberLastUsedCamera: true
        }, false);
        scanner.render(
          (decodedText) => {
            setFormTicket(prev => ({ ...prev, equipo_id: decodedText }));
            scanner.clear().catch(e => console.error(e));
            setIsScanning(false);
            setScannerInstance(null);
            showToast('Equipo escaneado correctamente: ' + decodedText, 'success');
          },
          (err) => { } // ignore
        );
        setScannerInstance(scanner);
      } catch (e) {
        setIsScanning(false);
        showToast('No se pudo acceder a la cámara.', 'error');
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

  const handleConsultarEquipo = async (equipoIdParaConsultar = null, isConfirmingParam = false) => {
    const idToSearch = typeof equipoIdParaConsultar === 'string' ? equipoIdParaConsultar : formTicket.equipo_id;
    if (!idToSearch || idToSearch.trim().length < 4) {
      showToast('Ingresa al menos 4 caracteres del código o número para consultar.', 'error');
      return;
    }
    showToast('Consultando equipo...', 'info');
    try {
      const res = await fetch(`/api/equipos?id=${encodeURIComponent(idToSearch.trim())}`);
      const data = await res.json();
      if (res.ok) {
        if (data.equipo) {
          setEquipoDetailsModal({ open: true, equipo: data.equipo, isConfirming: typeof equipoIdParaConsultar !== 'string' || isConfirmingParam });
        }
      } else {
        if (data.equipos_sugeridos && data.equipos_sugeridos.length > 0) {
          alert('⚠️ Se encontraron varios equipos. Sé más específico:\n\n' + data.equipos_sugeridos.map(eq => `• ${eq.id} - ${eq.nombre}`).join('\n'));
        } else {
          showToast(data.error || 'No se encontró el equipo.', 'error');
        }
      }
    } catch (e) {
      showToast('Error de conexión al consultar el equipo.', 'error');
    }
  };

  const addHallazgo = () => {
    setFormInspeccion(prev => ({
      ...prev,
      hallazgos: [...prev.hallazgos, { tipo_mantenimiento: 'Correctivo', area_registro: 'Mantenimiento', area_hallazgo: '', equipo_id: '', descripcion: '', prioridad: 'Media' }]
    }));
  };

  const updateHallazgo = (idx, field, val) => {
    setFormInspeccion(prev => {
      const h = [...prev.hallazgos];
      h[idx] = { ...h[idx], [field]: val };
      return { ...prev, hallazgos: h };
    });
  };

  const removeHallazgo = (idx) => {
    setFormInspeccion(prev => ({ ...prev, hallazgos: prev.hallazgos.filter((_, i) => i !== idx) }));
  };

  // ========================= RENDER =========================
  const tabs = [
    ...(puedeVerTablero ? [{ id: 'tablero', label: '📋 Tablero', emoji: '📋' }] : []),
    ...(esTecnicoMantenimiento ? [] : [{ id: 'nuevo', label: '➕ Nuevo Ticket', emoji: '➕' }]),
    ...(esTecnicoMantenimiento ? [] : [{ id: 'inspeccion', label: '🔍 Inspección / Mis Tickets', emoji: '🔍' }]),
    ...(esSistemasCalidad ? [] : [{ id: 'ejecucion', label: `🛠️ Modo Visita (${tickets.filter(t => t.estado === 'En proceso' || (t.estado === 'Asignado' && (!currentUser?.id || t.tecnico_id === currentUser?.id || esJefe))).length})`, emoji: '🛠️' }]),
    ...(esJefe ? [{ id: 'asignacion', label: '👔 Asignación', emoji: '👔' }] : []),
    ...(puedeVerIndicadores ? [{ id: 'indicadores', label: '📊 Indicadores', emoji: '📊' }] : []),
    ...(puedeVerIndicadores ? [{ id: 'alertas', label: '🔔 Alertas', emoji: '🔔' }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '70px' }}>

      {/* ====== HEADER MÓVIL EXACTO A input_file_1.png ====== */}
      <div className="mobile-only-cards" style={{
        background: '#3D2314', color: '#fff', padding: '18px 20px 22px', borderRadius: '18px',
        flexDirection: 'column', gap: '4px', boxShadow: '0 6px 16px rgba(61,35,20,0.25)', marginTop: '-4px'
      }}>
        <div style={{ fontSize: '1.32rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Hola, {currentUser?.nombre?.split(' ')[0] || 'Auxiliar'} 👋</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize' }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* ====== HEADER DESKTOP EXACTO A input_file_0.png ====== */}
      <div className="desktop-only-table" style={{
        background: '#fff', padding: '16px 24px', borderRadius: '16px', border: '1px solid #E5D8CC',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#2C1810', fontFamily: "'Playfair Display', serif" }}>Módulo de Mantenimiento</h1>
            <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '3px', textTransform: 'capitalize' }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#FAF6F0', padding: '6px 16px', borderRadius: '24px', border: '1px solid #E5D8CC', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#2C1810' }}>
              <span style={{ fontSize: '1.1rem' }}>👷</span>
              <span>{currentUser?.nombre || 'Auxiliar Mantenimiento'}</span>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>▼</span>
            </div>
          </div>
        </div>
      </div>

      {/* ====== ACCIONES / TABS SUPERIORES DESKTOP (input_file_0.png) ====== */}
      <div className="desktop-only-table" style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!esTecnicoMantenimiento && (
            <button
              onClick={() => setActiveTab('nuevo')}
              style={{
                background: activeTab === 'nuevo' ? '#2C1810' : '#3D2314', color: '#fff', border: 'none',
                borderRadius: '12px', padding: '11px 20px', fontWeight: 800, fontSize: '0.88rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(61,35,20,0.25)', transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>+</span>
              <span>Nuevo Ticket</span>
            </button>
          )}
          {tabs.filter(t => t.id !== 'nuevo').map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: isActive ? '#4A2C20' : '#fff', color: isActive ? '#fff' : '#4B5563',
                  border: isActive ? '1px solid #4A2C20' : '1px solid #E5D8CC', borderRadius: '12px',
                  padding: '11px 18px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: isActive ? '0 4px 10px rgba(74,44,32,0.2)' : '0 1px 4px rgba(0,0,0,0.02)'
                }}
              >
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ====== STATS CARDS GRID EXACTO A input_file_0.png Y input_file_1.png ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '12px' }} className="stats-grid">
        {[
          { label: 'TOTAL TICKETS', labelMob: 'TOTAL', value: stats.total || 0, color: '#2C1810', bg: '#fff', border: '#E5D8CC' },
          { label: 'PENDIENTES', labelMob: 'PENDIENTES', value: stats.pendientes || 0, color: '#B7950B', bg: '#FEF9E7', border: '#FDEBD0' },
          { label: 'EN PROCESO', labelMob: 'EN PROCESO', value: stats.en_proceso || 0, color: '#D35400', bg: '#FEF5E7', border: '#FAD7A0' },
          { label: 'VENCIDOS', labelMob: 'VENCIDOS', value: stats.vencidos || 0, color: '#C0392B', bg: '#FDEDEC', border: '#F5B7B1' },
          { label: 'MT', labelMob: 'MT', value: stats.total_mt || 0, color: '#2C3E50', bg: '#F2F4F4', border: '#D7DBDD', bold: true },
          { label: 'ST', labelMob: 'ST', value: stats.total_st || 0, color: '#2980B9', bg: '#EBF5FB', border: '#AED6F1', bold: true },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: '14px', padding: '14px 16px', textAlign: 'center', border: `1px solid ${s.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
            <div className="desktop-only-table" style={{ fontSize: '0.72rem', color: s.color, fontWeight: s.bold ? 800 : 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{s.label}</div>
            <div className="mobile-only-cards" style={{ fontSize: '0.70rem', color: s.color, fontWeight: s.bold ? 800 : 700, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: '4px', textAlign: 'center' }}>{s.labelMob}</div>
          </div>
        ))}
      </div>

      {/* ====== ACCIONES EN CÍRCULO MÓVIL (Dinámico según permisos) ====== */}
      <div className="mobile-only-cards" style={{ display: 'none', gap: '16px', padding: '6px 8px 10px', borderBottom: '1px solid #E5D8CC', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {tabs.map(item => {
          const isNuevo = item.id === 'nuevo';
          const isActive = activeTab === item.id;
          const bg = isNuevo ? '#3D2314' : (isActive ? '#4A2C20' : '#F3EBE3');
          const color = (isNuevo || isActive) ? '#fff' : '#2C1810';
          
          let icon = item.emoji;
          if (item.id === 'nuevo') icon = '+';
          if (item.id === 'ejecucion') icon = '📍';
          if (item.id === 'inspeccion') icon = '📋';

          let shortLabel = item.id.charAt(0).toUpperCase() + item.id.slice(1);
          if (item.id === 'ejecucion') shortLabel = 'Modo Visita';
          if (item.id === 'inspeccion') shortLabel = 'Mis Tickets';
          if (item.id === 'nuevo') shortLabel = 'Nuevo Ticket';
          if (item.id === 'asignacion') shortLabel = 'Asignación';

          return (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', minWidth: '65px' }}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', background: bg,
                color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: isNuevo ? '1.5rem' : '1.25rem', fontWeight: 800, 
                boxShadow: (isNuevo || isActive) ? '0 4px 10px rgba(61,35,20,0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease', flexShrink: 0
              }}>
                {icon}
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#2C1810' : '#6B7280', textAlign: 'center', lineHeight: '1.1' }}>
                {shortLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* ====== TAB: TABLERO ====== */}
      {activeTab === 'tablero' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ====== BUSCADOR Y BOTÓN FILTROS EXACTO A AMBOS MOCKUPS ====== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '14px', fontSize: '1.05rem', color: '#888' }}>🔍</span>
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar ticket o descripción..."
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px', border: '1px solid #E5D8CC',
                    borderRadius: '14px', fontSize: '0.88rem', background: '#fff', color: '#2C1810',
                    outline: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                />
              </div>
              <button
                onClick={() => setShowFiltrosAvanzados(!showFiltrosAvanzados)}
                style={{
                  background: showFiltrosAvanzados ? '#4A2C20' : '#F3EBE3',
                  color: showFiltrosAvanzados ? '#fff' : '#2C1810',
                  border: '1px solid #E5D8CC', borderRadius: '14px', padding: '12px 18px',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s ease'
                }}
              >
                <span>⚙️</span>
                <span>Filtros</span>
              </button>
            </div>

            {/* Panel de filtros colapsable */}
            {showFiltrosAvanzados && (
              <div className="card animate-fade-in" style={{ padding: '16px 18px', borderRadius: '16px', border: '1px solid #E5D8CC', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                  <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={selectStyle}>
                    <option value="">Todos los estados</option>
                    {ESTADOS.map(e => <option key={e}>{e}</option>)}
                  </select>
                  <select value={filtroPrefijo} onChange={e => setFiltroPrefijo(e.target.value)} style={selectStyle}>
                    <option value="">MT y ST</option>
                    <option value="MT">MT (Mantenimiento)</option>
                    <option value="ST">ST (Sistemas)</option>
                  </select>
                  <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={selectStyle}>
                    <option value="">Todos los tipos</option>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <select value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)} style={selectStyle}>
                    <option value="">Todos los técnicos</option>
                    {Array.from(new Map([...tecnicosMT, ...tecnicosST].map(t => [t.id, t])).values()).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                  <input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} style={selectStyle} title="Desde" />
                  <input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} style={selectStyle} title="Hasta" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setFiltroEstado(''); setFiltroPrefijo(''); setFiltroTipo(''); setFiltroTecnico(''); setFiltroFechaDesde(''); setFiltroFechaHasta(''); setBusqueda(''); }}
                    style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '8px 16px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                    ✕ Limpiar filtros
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#888', background: '#fff', borderRadius: '16px', border: '1px solid #E5D8CC' }}>
              ⏳ Cargando tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#888', background: '#fff', borderRadius: '16px', border: '1px solid #E5D8CC' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔧</div>
              <p style={{ margin: 0, fontWeight: 600, color: '#4B5563' }}>No se encontraron tickets con los filtros seleccionados.</p>
            </div>
          ) : (
            <>
              {/* Vista desktop: tabla exacta a input_file_0.png */}
              <div className="desktop-only-table" style={{ overflowX: 'auto', background: '#fff', borderRadius: '16px', border: '1px solid #E5D8CC', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#FAF6F0' }}>
                      {['ID', 'Tipo', 'Área', 'Descripción', 'Prioridad', 'Estado', 'Técnico', 'Fecha', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#2C1810', fontWeight: 800, borderBottom: '2px solid #E5D8CC', whiteSpace: 'nowrap', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => {
                      const ec = ESTADO_COLORS[t.estado] || ESTADO_COLORS['Pendiente'];
                      const pc = PRIORIDAD_COLORS[t.prioridad] || PRIORIDAD_COLORS['Media'];
                      const pref = PREFIJO_STYLE[t.prefijo] || PREFIJO_STYLE['MT'];

                      let prioStyle = { bg: '#FEF3C7', color: '#92400E' };
                      if (t.prioridad === 'Alta') prioStyle = { bg: '#FEE2E2', color: '#991B1B' };
                      if (t.prioridad === 'Crítica') prioStyle = { bg: '#FECACA', color: '#7F1D1D' };

                      let estStyle = { bg: '#FEF3C7', color: '#92400E' };
                      if (t.estado === 'Finalizado') estStyle = { bg: '#D1FAE5', color: '#065F46' };
                      if (t.estado === 'Por Aprobar') estStyle = { bg: '#DBEAFE', color: '#1E40AF' };
                      if (t.estado === 'En proceso') estStyle = { bg: '#FFEDD5', color: '#9A3412' };

                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #F5ECE5', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FAF6F0'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.84rem', background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', padding: '4px 12px', borderRadius: '8px' }}>{t.id}</span>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#4B5563', fontWeight: 600 }}>{t.tipo_mantenimiento}</td>
                          <td style={{ padding: '14px 16px', color: '#4B5563', fontWeight: 600 }}>{t.area_registro}</td>
                          <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1F2937', fontWeight: 600 }} title={t.descripcion}>{t.descripcion}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, background: prioStyle.bg, color: prioStyle.color, padding: '4px 10px', borderRadius: '8px' }}>{t.prioridad}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, background: estStyle.bg, color: estStyle.color, padding: '4px 12px', borderRadius: '8px' }}>{t.estado}</span>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#4B5563', fontSize: '0.82rem', fontWeight: 600 }}>{t.tecnico_nombre || '—'}</td>
                          <td style={{ padding: '14px 16px', color: '#6B7280', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{formatDate(t.fecha_registro)}</td>
                          <td style={{ padding: '14px 16px', display: 'flex', gap: '8px' }}>
                            <button onClick={() => openTicket(t)} style={{ background: '#3D2314', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>Ver</button>
                            {t.estado === 'Asignado' && (
                              <button onClick={() => iniciarYAbriModoVisita(t)} style={{ background: '#D97706', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                🚀 Iniciar Trabajo
                              </button>
                            )}
                            {t.estado === 'En proceso' && (
                              <button onClick={() => openModoVisita(t)} style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                🛠️ Modo Visita
                              </button>
                            )}
                            {t.estado === 'Por Aprobar' && (esJefe || esAdmin) && (
                              <button onClick={() => setApprovalModalTicket(t)} style={{ background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                🔍 Evaluar y Aprobar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista móvil: tarjetas exactas a input_file_1.png */}
              <div className="mobile-only-cards" style={{ display: 'none', flexDirection: 'column', gap: '12px' }}>
                {tickets.map(t => <TicketCard key={t.id} ticket={t} onOpen={openTicket} onStartModoVisita={iniciarYAbriModoVisita} onOpenModoVisita={openModoVisita} onApprove={setApprovalModalTicket} esJefe={esJefe || esAdmin} />)}
              </div>

              {/* ====== ACCESOS RÁPIDOS FOOTER DESKTOP EXACTO A input_file_0.png ====== */}
              <div className="desktop-only-table" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E5D8CC', padding: '22px 24px', marginTop: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#2C1810', fontFamily: "'Playfair Display', serif" }}>Accesos Rápidos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                  {[
                    { icon: '📅', title: 'Calendario', desc: 'Ver agenda', path: '/calendario' },
                    { icon: '👥', title: 'Asignación', desc: 'Asignar técnicos', action: () => setActiveTab('asignacion') },
                    { icon: '🔔', title: 'Alertas', desc: 'Ver alertas', action: () => setActiveTab('alertas') },
                    { icon: '📄', title: 'Reportes PDF', desc: 'Generar reportes', path: '/reportes' },
                    { icon: '📊', title: 'Exportar a Excel', desc: 'Exportar información', path: '/reportes' },
                    { icon: '📁', title: 'Repositorio', desc: 'Archivos y evidencias', path: '/archivos' },
                  ].map((acc, idx) => (
                    <div key={idx} onClick={() => acc.action ? acc.action() : window.location.href = acc.path}
                      style={{ background: '#FAF6F0', borderRadius: '14px', border: '1px solid #E5D8CC', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ fontSize: '1.5rem', background: '#fff', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                        {acc.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#2C1810' }}>{acc.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{acc.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E8DDD4', fontSize: '0.78rem', color: '#888' }}>
                  Crepes & Waffles® | Sistema de Gestión Operativa | Versión 2.0.0
                </div>
              </div>

              {/* Floating Action Button para móvil (+ Nuevo Ticket) */}
              {!esTecnicoMantenimiento && (
                <div className="mobile-only-cards" style={{ position: 'fixed', bottom: '76px', left: '0', right: '0', display: 'none', justifyContent: 'center', zIndex: 999, pointerEvents: 'none' }}>
                  <button
                    onClick={() => setActiveTab('nuevo')}
                    style={{
                      background: '#3D2314', color: '#fff', border: 'none', borderRadius: '28px',
                      padding: '13px 26px', fontWeight: 800, fontSize: '0.94rem',
                      boxShadow: '0 8px 24px rgba(61,35,20,0.5)', display: 'flex', alignItems: 'center',
                      gap: '8px', pointerEvents: 'auto', cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>+</span>
                    <span>Nuevo Ticket</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}


      {/* ====== TAB: NUEVO TICKET ====== */}
      {activeTab === 'nuevo' && (
        <div className="card animate-fade-in" style={{ borderRadius: '16px', border: '1px solid #E8DDD4', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #8B5E3C 100%)', padding: '20px 24px' }}>
            <h3 style={{ margin: 0, color: '#fff', fontFamily: "'Playfair Display', serif" }}>➕ Registrar Hallazgo / Ticket</h3>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
              El prefijo <strong>MT</strong> o <strong>ST</strong> se asignará automáticamente según el área de registro.
            </p>
          </div>
          <form onSubmit={submitTicket} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formMsg && <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, background: formMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2', color: formMsg.type === 'success' ? '#166534' : '#991B1B' }}>{formMsg.text}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Tipo de Mantenimiento *</label>
                <select required value={formTicket.tipo_mantenimiento} onChange={e => setFormTicket(p => ({ ...p, tipo_mantenimiento: e.target.value }))} style={inputStyle}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Área Responsable del Registro *</label>
                <select required value={formTicket.area_registro} onChange={e => setFormTicket(p => ({ ...p, area_registro: e.target.value }))} style={inputStyle}>
                  {AREAS_REGISTRO.map(a => <option key={a}>{a}</option>)}
                </select>
                <div style={{ fontSize: '0.72rem', color: formTicket.area_registro === 'Sistemas' ? '#1D4ED8' : '#6B3A2A', marginTop: '4px', fontWeight: 700 }}>
                  → Prefijo automático: {formTicket.area_registro === 'Sistemas' ? '🔵 ST-XXXX' : '🟤 MT-XXXX'}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Prioridad *</label>
                <select required value={formTicket.prioridad} onChange={e => setFormTicket(p => ({ ...p, prioridad: e.target.value }))} style={inputStyle}>
                  {PRIORIDADES.map(pr => <option key={pr}>{pr}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Punto de Venta / Lugar *</label>
                <select required value={formTicket.pdv_id || ''} onChange={e => setFormTicket(p => ({ ...p, pdv_id: e.target.value }))} style={inputStyle}>
                  <option value="">Selecciona el Punto de Venta / Lugar...</option>
                  {pdvs.map(p => (
                    <option key={p.id} value={p.id}>
                      📍 {p.nombre} {p.ciudad_nombre ? `(${p.ciudad_nombre})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={labelStyle}>Tipo de Elemento *</label>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <input type="radio" name="tipoElemento" value="equipo" checked={tipoElemento === 'equipo'} onChange={() => setTipoElemento('equipo')} />
                    🔌 Equipo (Sticker)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <input type="radio" name="tipoElemento" value="locativo" checked={tipoElemento === 'locativo'} onChange={() => { setTipoElemento('locativo'); setFormTicket(p => ({ ...p, equipo_id: '' })); }} />
                    🧱 Sin sticker
                  </label>
                </div>
              </div>

              {tipoElemento === 'equipo' ? (
                <div>
                  <label style={labelStyle}>Equipo (Código o Escáner) *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input value={formTicket.equipo_id} onChange={e => setFormTicket(p => ({ ...p, equipo_id: e.target.value }))} placeholder="Ej: EQ-1002 (o últimos 4 dígitos)" style={{ ...inputStyle, flex: 1 }} required />
                    <button type="button" onClick={handleConsultarEquipo} style={{ padding: '0 12px', flexShrink: 0, borderRadius: '8px', border: '1px solid #D1D5DB', background: '#F3F4F6', color: '#374151', fontWeight: 'bold', cursor: 'pointer' }} title="Consultar Equipo">
                      🔍 Consultar
                    </button>
                    <button type="button" onClick={startCameraScan} style={{ ...btnSecondary, padding: '0 12px', flexShrink: 0 }} title="Escanear QR">
                      📷 Escanear
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Descripción del Elemento Locativo *</label>
                  <input value={formTicket.area_hallazgo} onChange={e => setFormTicket(p => ({ ...p, area_hallazgo: e.target.value }))} placeholder="Ej: Pared del pasillo, Lámpara del techo, Puerta principal..." style={inputStyle} required />
                </div>
              )}
              <div>
                <label style={labelStyle}>Fecha en que se evidenció *</label>
                <input type="date" required value={formTicket.fecha_evidencia} onChange={e => setFormTicket(p => ({ ...p, fecha_evidencia: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            {/* Scanner modal overlay */}
            {isScanning && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: '400px', background: '#fff', padding: '20px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 16px', textAlign: 'center' }}>📷 Escanear Código QR</h4>
                  <div id="reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }}></div>
                  <button type="button" onClick={stopCameraScan} style={{ ...btnSecondary, width: '100%', marginTop: '16px', color: '#991B1B' }}>
                    Cancelar / Cerrar
                  </button>
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Descripción del hallazgo o problema *</label>
              <textarea required value={formTicket.descripcion} onChange={e => setFormTicket(p => ({ ...p, descripcion: e.target.value }))}
                rows={3} placeholder="Describe detalladamente el hallazgo o problema encontrado..."
                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} />
            </div>
            <div>
              <label style={labelStyle}>Observaciones adicionales</label>
              <textarea value={formTicket.observaciones} onChange={e => setFormTicket(p => ({ ...p, observaciones: e.target.value }))}
                rows={2} placeholder="Observaciones opcionales..." style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div>
              <label style={labelStyle}>Evidencias Fotográficas (Puedes seleccionar múltiples fotos a la vez)</label>
              <input type="file" multiple accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={e => setEvidenciasFiles(Array.from(e.target.files))} style={{ ...inputStyle, padding: '8px' }} />
              {evidenciasFiles && evidenciasFiles.length > 0 ? (
                <div style={{ marginTop: '8px', padding: '10px 14px', background: '#DCFCE7', borderRadius: '10px', border: '1px solid #BBF7D0', fontSize: '0.82rem', color: '#166534' }}>
                  <strong>✅ {evidenciasFiles.length} imagen(es) seleccionada(s) para cargar:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '18px', maxHeight: '90px', overflowY: 'auto' }}>
                    {evidenciasFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                  </ul>
                </div>
              ) : (
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#666' }}>💡 Tip: Selecciona varias fotos desde tu galería o PC para adjuntar todas las evidencias iniciales de una vez.</p>
              )}
            </div>

            <button type="submit" disabled={formSubmitting} style={{ ...btnPrimary, alignSelf: 'flex-start', padding: '12px 28px', fontSize: '0.9rem' }}>
              {formSubmitting ? '⏳ Registrando...' : '✅ Registrar Ticket'}
            </button>
          </form>
        </div>
      )}

      {/* ====== TAB: INSPECCIÓN ====== */}
      {activeTab === 'inspeccion' && (
        <div className="card animate-fade-in" style={{ borderRadius: '16px', border: '1px solid #E8DDD4', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)', padding: '20px 24px' }}>
            <h3 style={{ margin: 0, color: '#fff', fontFamily: "'Playfair Display', serif" }}>🔍 Registrar Inspección</h3>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>Cada hallazgo generará automáticamente un ticket MT o ST.</p>
          </div>
          <form onSubmit={submitInspeccion} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {inspMsg && <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, background: inspMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2', color: inspMsg.type === 'success' ? '#166534' : '#991B1B' }}>{inspMsg.text}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Tipo de Inspección *</label>
                <select required value={formInspeccion.tipo_inspeccion} onChange={e => setFormInspeccion(p => ({ ...p, tipo_inspeccion: e.target.value }))} style={inputStyle}>
                  {AREAS_REGISTRO.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha de Inspección *</label>
                <input type="date" required value={formInspeccion.fecha_inspeccion} onChange={e => setFormInspeccion(p => ({ ...p, fecha_inspeccion: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Hora inicio</label>
                <input type="time" value={formInspeccion.hora_inicio} onChange={e => setFormInspeccion(p => ({ ...p, hora_inicio: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Hora fin</label>
                <input type="time" value={formInspeccion.hora_fin} onChange={e => setFormInspeccion(p => ({ ...p, hora_fin: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Observaciones generales</label>
              <textarea value={formInspeccion.observaciones_generales} onChange={e => setFormInspeccion(p => ({ ...p, observaciones_generales: e.target.value }))}
                rows={2} placeholder="Observaciones generales de la inspección..." style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ borderTop: '2px solid #E8DDD4', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, color: '#4A2518' }}>🏷️ Hallazgos ({formInspeccion.hallazgos.length})</h4>
                <button type="button" onClick={addHallazgo} style={{ ...btnSecondary, fontSize: '0.8rem', padding: '8px 14px' }}>+ Agregar hallazgo</button>
              </div>
              {formInspeccion.hallazgos.map((h, idx) => (
                <div key={idx} style={{ border: '1px solid #E8DDD4', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px', background: '#FDFAF7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, color: '#4A2518', fontSize: '0.85rem' }}>Hallazgo #{idx + 1}</span>
                    {formInspeccion.hallazgos.length > 1 && (
                      <button type="button" onClick={() => removeHallazgo(idx)} style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem' }}>✕ Eliminar</button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Tipo *</label>
                      <select value={h.tipo_mantenimiento} onChange={e => updateHallazgo(idx, 'tipo_mantenimiento', e.target.value)} style={inputStyle} required>
                        {TIPOS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Área Registro *</label>
                      <select value={h.area_registro} onChange={e => updateHallazgo(idx, 'area_registro', e.target.value)} style={inputStyle} required>
                        {AREAS_REGISTRO.map(a => <option key={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Área del hallazgo</label>
                      <input value={h.area_hallazgo} onChange={e => updateHallazgo(idx, 'area_hallazgo', e.target.value)} placeholder="Área específica..." style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Prioridad</label>
                      <select value={h.prioridad} onChange={e => updateHallazgo(idx, 'prioridad', e.target.value)} style={inputStyle}>
                        {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Descripción *</label>
                      <textarea value={h.descripcion} onChange={e => updateHallazgo(idx, 'descripcion', e.target.value)} required
                        rows={2} placeholder="Descripción del hallazgo..." style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" disabled={inspSubmitting} style={{ ...btnPrimary, background: '#1D4ED8', alignSelf: 'flex-start', padding: '12px 28px', fontSize: '0.9rem' }}>
              {inspSubmitting ? '⏳ Registrando...' : `🔍 Registrar Inspección (${formInspeccion.hallazgos.length} hallazgo${formInspeccion.hallazgos.length !== 1 ? 's' : ''})`}
            </button>
          </form>
        </div>
      )}

      {/* ====== TAB: MODO VISITA / EJECUCIÓN ====== */}
      {activeTab === 'ejecucion' && (
        <div>
          {!activeExecutionTicket ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'linear-gradient(135deg, #166534 0%, #15803D 100%)', padding: '20px 24px', borderRadius: '14px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif" }}>🛠️ Tareas de Soporte por Ejecutar (Modo Visita)</h3>
                  <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                    Selecciona una orden de trabajo para ver el checklist de actividades, capturar fotografías y firmar en pantalla completa.
                  </p>
                </div>
              </div>

              {tickets.filter(t => t.estado === 'En proceso' || (t.estado === 'Asignado' && (!currentUser?.id || t.tecnico_id === currentUser?.id || esJefe))).length === 0 ? (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#888', borderRadius: '14px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✅</div>
                  <h4 style={{ margin: '0 0 8px', color: '#4A2518' }}>No tienes tareas pendientes de ejecutar</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Cuando te asignen un ticket o inicies un trabajo, aparecerá aquí en Modo Visita.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {tickets.filter(t => t.estado === 'En proceso' || (t.estado === 'Asignado' && (!currentUser?.id || t.tecnico_id === currentUser?.id || esJefe))).map(t => {
                    let evs = [];
                    try { evs = t.evidencias ? JSON.parse(t.evidencias) : []; } catch (e) { }
                    const chk = parseChecklist(t.checklist_tareas);
                    return (
                      <div key={t.id} className="card" style={{ padding: '18px 22px', borderRadius: '14px', border: t.estado === 'En proceso' ? '2px solid #166534' : '1px solid #D97706', background: '#fff', boxShadow: '0 3px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.9rem', background: '#F5EDE4', color: '#6B3A2A', padding: '3px 10px', borderRadius: '20px' }}>{t.id}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: t.estado === 'En proceso' ? '#DCFCE7' : '#FEF9C3', color: t.estado === 'En proceso' ? '#166534' : '#854D0E' }}>
                                {t.estado === 'En proceso' ? '🟢 En Proceso' : '🟡 Asignado (Pendiente de iniciar)'}
                              </span>
                              <span style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1D4ED8', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                                ⚡ Prioridad {t.prioridad}
                              </span>
                            </div>
                            <h4 style={{ margin: '0 0 4px', color: '#2C1810', fontSize: '1.1rem' }}>
                              {t.equipo_nombre ? `🖥️ Equipo: ${t.equipo_nombre} (${t.equipo_codigo || ''})` : `📍 Locativo: ${t.area_hallazgo}`}
                            </h4>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                              Área: <strong>{t.area_registro}</strong> · Solicitado el: {formatDate(t.fecha_registro)}
                            </div>
                          </div>
                          <div>
                            {t.estado === 'Asignado' && (
                              <button onClick={() => iniciarYAbriModoVisita(t)} style={{ ...btnPrimary, background: '#D97706', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 700 }}>
                                🚀 Iniciar Trabajo
                              </button>
                            )}
                            {t.estado === 'En proceso' && (
                              <button onClick={() => openModoVisita(t)} style={{ ...btnPrimary, background: '#166534', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 700 }}>
                                🛠️ Abrir Ejecución
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ background: '#FAF6F0', padding: '12px 14px', borderRadius: '10px', borderLeft: '4px solid #6B3A2A', fontSize: '0.9rem', color: '#333' }}>
                          <strong style={{ color: '#6B3A2A' }}>Descripción de la Solicitud:</strong> <br />
                          {t.descripcion}
                        </div>

                        {evs.length > 0 && (
                          <div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#666' }}>📷 Fotos subidas por el solicitante ({evs.length}):</span>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '6px' }}>
                              {evs.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: 'block', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', flexShrink: 0 }}>
                                  <img src={url} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {chk && chk.length > 0 && (
                          <div style={{ fontSize: '0.82rem', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📋 <strong>Checklist asignado:</strong> {chk.filter(c => c.completada).length} / {chk.length} tareas completadas</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* =================== FORMULARIO DE EJECUCIÓN COMPLETO (MODO VISITA) =================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Barra superior de volver */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#fff', padding: '14px 20px', borderRadius: '14px', border: '1px solid #E8DDD4', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => setActiveExecutionTicket(null)} style={{ ...btnSecondary, padding: '8px 14px', fontSize: '0.85rem' }}>
                    ⬅ Volver a Lista
                  </button>
                  <div>
                    <h3 style={{ margin: 0, color: '#2C1810', fontSize: '1.2rem' }}>
                      🛠️ Ejecución de Soporte - Ticket <strong>#{activeExecutionTicket.id}</strong>
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#666' }}>Modo Visita Activo · Registro en tiempo real</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={guardarAvanceModoVisita} style={{ ...btnSecondary, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 700, fontSize: '0.85rem' }}>
                    💾 Guardar Avance
                  </button>
                  <button onClick={finalizarDesdeModoVisita} style={{ ...btnPrimary, background: '#166534', fontWeight: 700, fontSize: '0.85rem' }}>
                    ✅ Finalizar Trabajo
                  </button>
                </div>
              </div>

              {/* Grid principal de la ejecución */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>

                {/* COLUMNA IZQUIERDA: Información del Ticket y Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* Ficha de la Solicitud */}
                  <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid #E8DDD4', background: '#fff' }}>
                    <h4 style={{ margin: '0 0 14px', color: '#6B3A2A', borderBottom: '1px solid #F5EDE4', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📌 Datos de la Solicitud de Soporte
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', marginBottom: '14px' }}>
                      <div><span style={{ color: '#888' }}>Tipo:</span> <br /><strong style={{ color: '#2C1810' }}>{activeExecutionTicket.tipo_mantenimiento}</strong></div>
                      <div><span style={{ color: '#888' }}>Prioridad:</span> <br /><strong style={{ color: '#D97706' }}>⚡ {activeExecutionTicket.prioridad}</strong></div>
                      <div><span style={{ color: '#888' }}>Área Registro:</span> <br /><strong style={{ color: '#2C1810' }}>{activeExecutionTicket.area_registro}</strong></div>
                      <div><span style={{ color: '#888' }}>Solicitado:</span> <br /><strong style={{ color: '#2C1810' }}>{formatDate(activeExecutionTicket.fecha_registro)}</strong></div>
                    </div>

                    <div style={{ marginBottom: '14px', background: '#F5ECE5', padding: '12px', borderRadius: '10px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#6B3A2A', fontWeight: 700 }}>📍 ELEMENTO O EQUIPO A REPARAR:</span>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2C1810', marginTop: '4px' }}>
                        {activeExecutionTicket.equipo_nombre ? (
                          `🖥️ ${activeExecutionTicket.equipo_nombre} (Código: ${activeExecutionTicket.equipo_codigo || 'N/A'})`
                        ) : (
                          `📍 Elemento Locativo: ${activeExecutionTicket.area_hallazgo}`
                        )}
                      </div>
                    </div>

                    <div style={{ background: '#FEF9C3', border: '1px solid #FDE68A', padding: '14px', borderRadius: '10px', color: '#713F12', fontSize: '0.9rem' }}>
                      <strong style={{ display: 'block', marginBottom: '6px', color: '#854D0E' }}>📝 Descripción del Problema reportado:</strong>
                      {activeExecutionTicket.descripcion}
                    </div>

                    {/* Evidencias del solicitante */}
                    {(() => {
                      let evs = [];
                      try { evs = activeExecutionTicket.evidencias ? JSON.parse(activeExecutionTicket.evidencias) : []; } catch (e) { }
                      if (evs.length === 0) return null;
                      return (
                        <div style={{ marginTop: '14px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4A2518' }}>📷 Fotos adjuntadas en la solicitud ({evs.length}):</span>
                          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '8px' }}>
                            {evs.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ display: 'block', width: '90px', height: '90px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #E8DDD4', flexShrink: 0 }}>
                                <img src={url} alt="Evidencia inicial" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Checklist interactivo en Modo Visita */}
                  <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid #E8DDD4', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F5EDE4', paddingBottom: '8px', marginBottom: '14px' }}>
                      <h4 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📋 Checklist de Actividades por Realizar
                      </h4>
                      <span style={{ fontSize: '0.8rem', background: '#DCFCE7', color: '#166534', padding: '2px 10px', borderRadius: '20px', fontWeight: 700 }}>
                        {executionData.checklist_completado ? executionData.checklist_completado.filter(c => c.completada).length : 0} / {executionData.checklist_completado ? executionData.checklist_completado.length : 0} completadas
                      </span>
                    </div>

                    {!executionData.checklist_completado || executionData.checklist_completado.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', background: '#F9F6F0', borderRadius: '10px', color: '#888', fontSize: '0.85rem' }}>
                        No se adjuntaron tareas específicas en el checklist al asignar este ticket. <br /> Puedes continuar con la reparación y registrar la solución.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {executionData.checklist_completado.map((item, idx) => (
                          <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: item.completada ? '#DCFCE7' : '#F8F6F0', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', border: item.completada ? '1px solid #86EFAC' : '1px solid #E8DDD4', transition: 'all 0.2s ease' }}>
                            <input
                              type="checkbox"
                              checked={item.completada || false}
                              onChange={e => {
                                const newChk = [...executionData.checklist_completado];
                                newChk[idx] = { ...newChk[idx], completada: e.target.checked };
                                setExecutionData(p => ({ ...p, checklist_completado: newChk }));
                              }}
                              style={{ width: '22px', height: '22px', accentColor: '#166534', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.95rem', fontWeight: item.completada ? 700 : 500, color: item.completada ? '#166534' : '#2C1810', textDecoration: item.completada ? 'line-through' : 'none' }}>
                              {item.texto || item.tarea || item.descripcion || item.nombre || (typeof item === 'string' ? item : '(Tarea sin texto)')}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMNA DERECHA: Registro de Solución, Fotos y Firmas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* Formulario del Técnico */}
                  <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid #E8DDD4', background: '#fff' }}>
                    <h4 style={{ margin: '0 0 14px', color: '#6B3A2A', borderBottom: '1px solid #F5EDE4', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🛠️ Registro de Trabajo / Reparación Realizada
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4A2518', marginBottom: '6px' }}>
                          Solución / Reparación Aplicada *
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={executionData.solucion_aplicada}
                          onChange={e => setExecutionData(p => ({ ...p, solucion_aplicada: e.target.value }))}
                          placeholder="Describe con detalle qué trabajo realizaste, qué piezas cambiaste o cómo solucionaste el problema..."
                          style={{ width: '100%', padding: '12px', border: '1.5px solid #E8DDD4', borderRadius: '10px', fontSize: '0.9rem', resize: 'vertical', minHeight: '90px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4A2518', marginBottom: '6px' }}>
                          Observaciones, Repuestos o Recomendaciones (Opcional)
                        </label>
                        <textarea
                          rows={3}
                          value={executionData.observaciones}
                          onChange={e => setExecutionData(p => ({ ...p, observaciones: e.target.value }))}
                          placeholder="Repuestos instalados, recomendaciones para el punto de venta, etc..."
                          style={{ width: '100%', padding: '12px', border: '1.5px solid #E8DDD4', borderRadius: '10px', fontSize: '0.9rem', resize: 'vertical' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4A2518', marginBottom: '6px' }}>
                          📷 Adjuntar Evidencias Fotográficas de Cierre (Puedes seleccionar múltiples imágenes a la vez)
                        </label>
                        <input
                          type="file"
                          multiple
                          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                          onChange={e => setExecutionData(p => ({ ...p, evidencias_cierre_files: Array.from(e.target.files) }))}
                          style={{ width: '100%', padding: '10px', background: '#F5ECE5', border: '1px dashed #6B3A2A', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer' }}
                        />
                        {executionData.evidencias_cierre_files && executionData.evidencias_cierre_files.length > 0 ? (
                          <div style={{ marginTop: '8px', padding: '10px 14px', background: '#DCFCE7', borderRadius: '10px', border: '1px solid #BBF7D0', fontSize: '0.82rem', color: '#166534' }}>
                            <strong>✅ {executionData.evidencias_cierre_files.length} foto(s) seleccionada(s):</strong>
                            <ul style={{ margin: '6px 0 0', paddingLeft: '18px', maxHeight: '90px', overflowY: 'auto' }}>
                              {executionData.evidencias_cierre_files.map((f, i) => <li key={i}>{f.name}</li>)}
                            </ul>
                          </div>
                        ) : (
                          <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#666', fontStyle: 'italic' }}>
                            💡 Tip: Puedes seleccionar varias fotos a la vez para evidenciar todo el trabajo realizado.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Firmas Digitales */}
                  <div className="card" style={{ padding: '20px', borderRadius: '14px', border: '1px solid #E8DDD4', background: '#fff' }}>
                    <h4 style={{ margin: '0 0 14px', color: '#6B3A2A', borderBottom: '1px solid #F5EDE4', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ✍️ Pizarras de Firmas Digitales
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <SignaturePad
                          label="1. Firma del Técnico Ejecutor *"
                          onSave={dataUrl => setExecutionData(p => ({ ...p, firma_tecnico: dataUrl }))}
                          initialSignature={executionData.firma_tecnico}
                        />
                      </div>

                      <div>
                        <SignaturePad
                          label="2. Firma de Conformidad del Punto de Venta / Solicitante (Opcional)"
                          onSave={dataUrl => setExecutionData(p => ({ ...p, firma_solicitante: dataUrl }))}
                          initialSignature={executionData.firma_solicitante}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button onClick={guardarAvanceModoVisita} style={{ ...btnSecondary, flex: 1, padding: '12px', fontSize: '0.95rem', fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                        💾 Guardar Avance
                      </button>
                      <button onClick={finalizarDesdeModoVisita} style={{ ...btnPrimary, flex: 2, background: '#166534', padding: '12px', fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(22,101,52,0.3)' }}>
                        ✅ Finalizar y Firmar Trabajo
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== TAB: ASIGNACIÓN (solo jefes) ====== */}
      {activeTab === 'asignacion' && esJefe && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 18px', fontSize: '0.85rem', color: '#854D0E', fontWeight: 600 }}>
            👔 Mostrando solo tickets <strong>Pendientes</strong> listos para asignación.
          </div>
          {tickets.filter(t => t.estado === 'Pendiente').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
              <p>No hay tickets pendientes de asignación.</p>
            </div>
          ) : (
            tickets.filter(t => t.estado === 'Pendiente').map(t => {
              const pref = PREFIJO_STYLE[t.prefijo] || PREFIJO_STYLE['MT'];
              const pc = PRIORIDAD_COLORS[t.prioridad] || PRIORIDAD_COLORS['Media'];
              return (
                <div key={t.id} className="card" style={{ borderRadius: '14px', border: '1px solid #E8DDD4', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, background: pref.bg, color: pref.color, border: `1px solid ${pref.border}`, padding: '3px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>{t.id}</span>
                      <span style={{ fontSize: '0.8rem', color: '#555' }}>{t.tipo_mantenimiento}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, background: pc.bg, color: pc.color, padding: '2px 8px', borderRadius: '10px' }}>{t.prioridad}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#888' }}>📅 {formatDate(t.fecha_registro)}</span>
                  </div>
                  <div style={{ background: '#FAF6F0', padding: '12px', borderRadius: '10px', border: '1px solid #E8DDD4' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#2C1810', fontWeight: 600 }}>📝 Descripción de la Solicitud:</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#333', whiteSpace: 'pre-wrap' }}>{t.descripcion}</p>
                    {(t.equipo_nombre || t.area_hallazgo) && (
                      <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '8px', borderTop: '1px solid #E8DDD4', paddingTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div>
                          📍 Elemento: <strong>{t.equipo_nombre ? `${t.equipo_nombre}${t.equipo_marca || t.equipo_modelo ? ` (${[t.equipo_marca, t.equipo_modelo].filter(Boolean).join(' ')})` : ''}` : `Locativo - ${t.area_hallazgo}`}</strong>
                        </div>
                        {t.equipo_id && (
                          <button onClick={() => handleConsultarEquipo(t.equipo_id, false)} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE', cursor: 'pointer', fontWeight: 'bold' }}>
                            🔍 Ver Detalles
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {t.evidencias && (() => {
                    let evs = [];
                    try { evs = typeof t.evidencias === 'string' ? JSON.parse(t.evidencias) : (t.evidencias || []); } catch (e) { }
                    if (!Array.isArray(evs) || evs.length === 0) return null;
                    return (
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4A2518', display: 'block', marginBottom: '6px' }}>📷 Evidencias fotográficas del problema:</span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {evs.map((imgUrl, i) => (
                            <a key={i} href={imgUrl} target="_blank" rel="noopener noreferrer">
                              <img src={imgUrl} alt={`evidencia-${i}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Técnico *</label>
                      <select style={inputStyle} id={`tec-${t.id}`}>
                        <option value="">Seleccionar técnico...</option>
                        {(t.prefijo === 'ST' ? tecnicosST : tecnicosMT).map(tc => <option key={tc.id} value={tc.id}>{tc.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Fecha Programada *</label>
                      <input type="date" style={inputStyle} id={`fecha-${t.id}`} />
                    </div>
                    <div>
                      <label style={labelStyle}>Prioridad</label>
                      <select style={inputStyle} id={`prio-${t.id}`} defaultValue={t.prioridad}>
                        {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Observaciones</label>
                      <input style={inputStyle} id={`obs-${t.id}`} placeholder="Instrucciones para el técnico..." />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const tec = document.getElementById(`tec-${t.id}`)?.value;
                      const fecha = document.getElementById(`fecha-${t.id}`)?.value;
                      const prio = document.getElementById(`prio-${t.id}`)?.value;
                      const obs = document.getElementById(`obs-${t.id}`)?.value;
                      if (!tec || !fecha) { showToast('Técnico y fecha programada son obligatorios', 'error'); return; }
                      setAccionModal({ open: true, tipo: 'asignar', ticketId: t.id, prefijo: t.prefijo });
                      setAccionData({ tecnico_id: parseInt(tec), fecha_programada: fecha, prioridad: prio, observaciones_asignacion: obs, categoria_id: t.categoria_id || '' });
                    }}
                    style={{ ...btnPrimary, alignSelf: 'flex-start', padding: '10px 24px' }}>
                    ✅ Asignar Ticket {t.id}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ====== TAB: INDICADORES ====== */}
      {activeTab === 'indicadores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!reportes ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>⏳ Cargando indicadores...</div>
          ) : (
            <>
              {/* Resumen KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Total Tickets', value: reportes.resumen?.total || 0 },
                  { label: 'Finalizados', value: reportes.resumen?.finalizados || 0, color: '#166534', bg: '#DCFCE7' },
                  { label: 'Vencidos', value: reportes.resumen?.vencidos || 0, color: '#991B1B', bg: '#FEE2E2' },
                  { label: 'Críticos Activos', value: reportes.resumen?.criticos_activos || 0, color: '#C2410C', bg: '#FFF7ED' },
                  { label: 'T. Atención Prom.', value: formatMinutes(reportes.resumen?.promedio_tiempo_atencion), sub: 'tiempo medio' },
                  { label: 'T. Ejecución Prom.', value: formatMinutes(reportes.resumen?.promedio_tiempo_ejecucion), sub: 'tiempo medio' },
                ].map(k => (
                  <div key={k.label} style={{ background: k.bg || '#FAF6F0', borderRadius: '12px', padding: '14px 16px', textAlign: 'center', border: '1px solid #E8DDD4' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: k.color || '#6B3A2A' }}>{k.value}</div>
                    <div style={{ fontSize: '0.72rem', color: k.color || '#6B3A2A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Por tipo y por área */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ borderRadius: '14px', border: '1px solid #E8DDD4', overflow: 'hidden' }}>
                  <div style={{ background: '#F8F4EE', padding: '12px 18px', borderBottom: '1px solid #E8DDD4' }}>
                    <h5 style={{ margin: 0, color: '#4A2518', fontWeight: 'bold' }}>📊 Por Tipo de Mantenimiento</h5>
                  </div>
                  <div style={{ padding: '14px 18px' }}>
                    {(reportes.porTipo || []).map(r => (
                      <div key={r.tipo_mantenimiento} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F0EAE1' }}>
                        <span style={{ fontSize: '0.85rem', color: '#333' }}>{r.tipo_mantenimiento}</span>
                        <span style={{ fontWeight: 800, color: '#6B3A2A', background: '#F5EDE4', padding: '3px 10px', borderRadius: '10px', fontSize: '0.85rem' }}>{r.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ borderRadius: '14px', border: '1px solid #E8DDD4', overflow: 'hidden' }}>
                  <div style={{ background: '#F8F4EE', padding: '12px 18px', borderBottom: '1px solid #E8DDD4' }}>
                    <h5 style={{ margin: 0, color: '#4A2518', fontWeight: 'bold' }}>🏢 Por Área de Registro</h5>
                  </div>
                  <div style={{ padding: '14px 18px' }}>
                    {(reportes.porArea || []).map(r => (
                      <div key={r.area_registro} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F0EAE1' }}>
                        <span style={{ fontSize: '0.85rem', color: '#333' }}>{r.area_registro}</span>
                        <span style={{ fontWeight: 800, color: '#1D4ED8', background: '#EFF6FF', padding: '3px 10px', borderRadius: '10px', fontSize: '0.85rem' }}>{r.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Equipos con más fallas */}
              {reportes.equiposConFallas?.length > 0 && (
                <div className="card" style={{ borderRadius: '14px', border: '1px solid #E8DDD4', overflow: 'hidden' }}>
                  <div style={{ background: '#F8F4EE', padding: '12px 18px', borderBottom: '1px solid #E8DDD4' }}>
                    <h5 style={{ margin: 0, color: '#4A2518', fontWeight: 'bold' }}>⚠️ Equipos con Más Intervenciones</h5>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#FAF6F0' }}>
                          <th style={thStyle}>Equipo</th>
                          <th style={thStyle}>Total</th>
                          <th style={thStyle}>Correctivos</th>
                          <th style={thStyle}>Preventivos</th>
                          <th style={thStyle}>Último</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportes.equiposConFallas.map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #F0EAE1' }}>
                            <td style={tdStyle}><strong>{r.equipo}</strong></td>
                            <td style={tdStyle}><span style={{ fontWeight: 800, color: '#6B3A2A' }}>{r.total_mantenimientos}</span></td>
                            <td style={tdStyle}><span style={{ color: '#991B1B', fontWeight: 700 }}>{r.correctivos}</span></td>
                            <td style={tdStyle}><span style={{ color: '#166534', fontWeight: 700 }}>{r.preventivos}</span></td>
                            <td style={tdStyle}>{formatDate(r.ultimo_mantenimiento)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cumplimiento */}
              {reportes.cumplimiento && (
                <div className="card" style={{ borderRadius: '14px', border: '1px solid #E8DDD4', padding: '16px 20px' }}>
                  <h5 style={{ margin: '0 0 12px', color: '#4A2518', fontWeight: 'bold' }}>📅 Cumplimiento de Programados</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {[
                      { label: 'Programados', value: reportes.cumplimiento.programados, color: '#6B3A2A', bg: '#FAF6F0' },
                      { label: 'A Tiempo', value: reportes.cumplimiento.a_tiempo, color: '#166534', bg: '#DCFCE7' },
                      { label: 'Con Retraso', value: reportes.cumplimiento.con_retraso, color: '#C2410C', bg: '#FFF7ED' },
                      { label: 'Vencidos', value: reportes.cumplimiento.vencidos_sin_finalizar, color: '#991B1B', bg: '#FEE2E2' },
                    ].map(k => (
                      <div key={k.label} style={{ background: k.bg, borderRadius: '10px', padding: '12px', textAlign: 'center', border: `1px solid ${k.color}20` }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: '0.7rem', color: k.color, fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>{k.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {puedeExportarExcel && (
                  <button style={{ ...btnPrimary, background: '#166534', padding: '12px 22px' }} onClick={exportarExcelMantenimiento}>
                    📥 Exportar Excel
                  </button>
                )}
                <button style={{ ...btnPrimary, background: '#991B1B', padding: '12px 22px' }} onClick={() => { if (tickets.length > 0) handlePrintMantenimientoPDF(tickets[0]); else showToast('No hay tickets disponibles para generar PDF', 'info'); }}>
                  📄 Exportar PDF
                </button>
                <button style={{ ...btnSecondary, padding: '12px 22px' }} onClick={loadReportes}>
                  🔄 Actualizar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ====== TAB: ALERTAS / NOTIFICACIONES ====== */}
      {activeTab === 'alertas' && (
        <div className="card animate-fade-in" style={{ borderRadius: '16px', border: '1px solid #E8DDD4', padding: '24px 28px', maxWidth: '480px' }}>
          <h4 style={{ margin: '0 0 16px', color: '#4A2518', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem' }}>🔔 Configuración de Notificaciones</h4>
          <p style={{ margin: '0 0 20px', color: '#666', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Configura si deseas recibir notificaciones por correo electrónico cuando esta funcionalidad esté habilitada.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAF6F0', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E8DDD4' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#2C1810', fontSize: '0.92rem' }}>Recibir correos de notificación</div>
              <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '2px' }}>Alertas de asignación, finalización y vencimiento</div>
            </div>
            <button
              onClick={async () => {
                const nuevo = !recibirCorreos;
                setRecibirCorreos(nuevo);
                setSavingNotif(true);
                try {
                  await fetch('/api/users/notificaciones', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recibir_correos: nuevo ? 1 : 0 }) });
                } catch (e) { console.error(e); }
                setSavingNotif(false);
              }}
              style={{
                width: '52px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                background: recibirCorreos ? '#22C55E' : '#E5E7EB',
                position: 'relative', transition: 'background 0.2s ease', flexShrink: 0
              }}
            >
              <span style={{
                position: 'absolute', top: '3px', width: '22px', height: '22px', borderRadius: '50%',
                background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.2s ease', left: recibirCorreos ? '27px' : '3px'
              }} />
            </button>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#888', fontStyle: 'italic' }}>
            ⚠️ El envío automático de correos estará disponible en una próxima versión. Esta configuración se guardará para cuando sea habilitado.
          </div>
          {savingNotif && <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#6B3A2A', fontWeight: 600 }}>⏳ Guardando preferencia...</div>}
        </div>
      )}

      {/* ====== MODAL: DETALLE TICKET ====== */}
      {ticketModal.open && ticketModal.ticket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '680px', boxShadow: '0 20px 60px rgba(107,58,42,0.25)', overflow: 'hidden', marginTop: '20px', marginBottom: '20px' }}>
            {/* Header modal */}
            {(() => {
              const t = ticketModal.ticket;
              const pref = PREFIJO_STYLE[t.prefijo] || PREFIJO_STYLE['MT'];
              const ec = ESTADO_COLORS[t.estado] || ESTADO_COLORS['Pendiente'];
              return (
                <>
                  <div style={{ background: `linear-gradient(135deg, ${pref.color} 0%, #8B5E3C 100%)`, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#fff', letterSpacing: '1px' }}>{t.id}</span>
                      <span style={{ marginLeft: '10px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '3px 10px', borderRadius: '10px' }}>{t.tipo_mantenimiento}</span>
                    </div>
                    <button onClick={() => setTicketModal({ open: false, ticket: null, historial: [] })} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '80vh', overflowY: 'auto' }}>
                    {/* Estado y prioridad */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, background: ec.bg, color: ec.color, border: `1px solid ${ec.border}`, padding: '4px 14px', borderRadius: '20px' }}>{t.estado}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, background: PRIORIDAD_COLORS[t.prioridad]?.bg || '#FEF9C3', color: PRIORIDAD_COLORS[t.prioridad]?.color || '#854D0E', padding: '4px 14px', borderRadius: '20px' }}>⚡ {t.prioridad}</span>
                    </div>

                    {/* Descripción */}
                    <div style={{ background: '#FAF6F0', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Descripción del Hallazgo</div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#333', lineHeight: 1.5 }}>{t.descripcion}</p>
                    </div>

                    {/* Info grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      {[
                        { label: 'Área Registro', value: t.area_registro },
                        { label: 'Categoría', value: t.categoria_nombre || (t.categoria_id ? `Categoría #${t.categoria_id}` : '—') },
                        { label: 'Área Hallazgo', value: t.area_hallazgo || '—' },
                        { label: 'Equipo', value: t.equipo_nombre || 'Locativo', action: t.equipo_id ? <button onClick={() => handleConsultarEquipo(t.equipo_id, false)} style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#DBEAFE', color: '#1E40AF', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Ver Detalles</button> : null },
                        { label: 'Fecha Evidencia', value: formatDate(t.fecha_evidencia) },
                        { label: 'Fecha Registro', value: formatDate(t.fecha_registro) },
                        { label: 'Fecha Programada', value: formatDate(t.fecha_programada) },
                        { label: 'Registrado por', value: t.usuario_registro_nombre || '—' },
                        { label: 'Asignado por', value: t.responsable_asignacion_nombre || '—' },
                        { label: 'Técnico', value: t.tecnico_nombre || 'Sin asignar' },
                        { label: 'T. Atención', value: formatMinutes(t.tiempo_atencion_minutos) },
                        { label: 'T. Ejecución', value: formatMinutes(t.tiempo_ejecucion_minutos) },
                        { label: 'Finalizado', value: formatDate(t.fecha_real_finalizacion) },
                      ].map(f => (
                        <div key={f.label} style={{ background: '#F8F4EE', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '0.68rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>{f.label}</div>
                          <div style={{ fontSize: '0.85rem', color: '#2C1810', fontWeight: 600, display: 'flex', alignItems: 'center' }}>{f.value} {f.action}</div>
                        </div>
                      ))}
                    </div>

                    {/* Solución aplicada */}
                    {t.solucion_aplicada && (
                      <div style={{ background: '#DCFCE7', borderRadius: '10px', padding: '14px', border: '1px solid #BBF7D0' }}>
                        <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>✅ Solución Aplicada</div>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#15803D' }}>{t.solucion_aplicada}</p>
                      </div>
                    )}

                    {/* Observaciones */}
                    {t.observaciones && (
                      <div style={{ background: '#FAF6F0', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Observaciones</div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#555' }}>{t.observaciones}</p>
                      </div>
                    )}

                    {/* Evidencias fotográficas */}
                    {t.evidencias && (() => {
                      try {
                        const fotos = JSON.parse(t.evidencias);
                        if (!fotos || fotos.length === 0) return null;
                        return (
                          <div style={{ marginTop: '4px' }}>
                            <h5 style={{ margin: '0 0 8px', color: '#4A2518' }}>📷 Evidencias Fotográficas</h5>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                              {fotos.map((f, i) => (
                                <img key={i} src={f} alt={`Evidencia ${i}`} style={{ height: '120px', borderRadius: '8px', cursor: 'pointer', objectFit: 'cover' }} onClick={() => window.open(f, '_blank')} />
                              ))}
                            </div>
                          </div>
                        );
                      } catch (e) { return null; }
                    })()}

                    {/* Checklist */}
                    {t.checklist_tareas && (() => {
                      try {
                        const chk = parseChecklist(t.checklist_tareas);
                        if (!chk || chk.length === 0) return null;
                        return (
                          <div style={{ background: '#F0F9FF', borderRadius: '10px', padding: '14px', border: '1px solid #BAE6FD' }}>
                            <h5 style={{ margin: '0 0 10px', color: '#0369A1' }}>📋 Checklist de Tareas (Asignado)</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {chk.map((tarea, i) => (
                                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#0F172A' }}>
                                  <input type="checkbox" checked={tarea.completada} disabled />
                                  {tarea.texto || tarea.tarea || (typeof tarea === 'string' ? tarea : '(Tarea sin texto)')}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      } catch (e) { return null; }
                    })()}

                    {/* Historial de auditoría */}
                    {ticketModal.historial.length > 0 && (
                      <div>
                        <h5 style={{ margin: '0 0 10px', color: '#4A2518' }}>📜 Historial de Cambios</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {ticketModal.historial.map(h => (
                            <div key={h.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.8rem' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D4A847', flexShrink: 0, marginTop: '5px' }} />
                              <div>
                                <span style={{ fontWeight: 700, color: '#4A2518' }}>{h.accion}</span>
                                {h.estado_nuevo && <span style={{ marginLeft: '6px', color: '#888' }}>→ {h.estado_nuevo}</span>}
                                <span style={{ marginLeft: '8px', color: '#aaa' }}>· {h.user_nombre} · {formatDate(h.created_at)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #F0EAE1', paddingTop: '14px' }}>
                      <button onClick={() => handlePrintMantenimientoPDF(t)} style={{ ...btnPrimary, fontSize: '0.85rem', background: '#991B1B', padding: '10px 18px' }}>
                        📄 Imprimir / Reporte PDF
                      </button>
                      {t.estado !== 'Finalizado' && t.estado !== 'Cancelado' && (
                        <>
                          {t.estado === 'Asignado' && (
                            <button onClick={() => { setTicketModal({ open: false, ticket: null, historial: [] }); iniciarYAbriModoVisita(t); }} style={{ ...btnPrimary, fontSize: '0.85rem', background: '#D97706', padding: '10px 18px' }}>
                              🚀 Iniciar Trabajo (Modo Visita)
                            </button>
                          )}
                          {t.estado === 'En proceso' && (
                            <button onClick={() => { setTicketModal({ open: false, ticket: null, historial: [] }); openModoVisita(t); }} style={{ ...btnPrimary, fontSize: '0.85rem', background: '#166534', padding: '10px 18px' }}>
                              🛠️ Abrir / Continuar (Modo Visita)
                            </button>
                          )}
                          {t.estado === 'Por Aprobar' && (esJefe || esAdmin) && (
                            <button onClick={() => { setTicketModal({ open: false, ticket: null, historial: [] }); setApprovalModalTicket(t); }} style={{ ...btnPrimary, fontSize: '0.85rem', background: '#4F46E5', padding: '10px 18px' }}>
                              🔍 Evaluar y Aprobar
                            </button>
                          )}
                          {esJefe && (t.estado === 'Pendiente' || t.estado === 'Asignado') && (
                            <button onClick={() => {
                              setAccionModal({ open: true, tipo: 'asignar', ticketId: t.id, prefijo: t.prefijo });
                              if (t.estado === 'Asignado') {
                                const checkList = parseChecklist(t.checklist_tareas);
                                setAccionData({
                                  tecnico_id: t.tecnico_id || '',
                                  fecha_programada: t.fecha_programada || '',
                                  prioridad: t.prioridad || '',
                                  observaciones_asignacion: t.observaciones_asignacion || '',
                                  categoria_id: t.categoria_id || '',
                                  checklist_tareas: checkList
                                });
                              } else {
                                setAccionData({ categoria_id: t.categoria_id || '' });
                              }
                            }} style={{ ...btnPrimary, fontSize: '0.82rem', background: t.estado === 'Asignado' ? '#D97706' : undefined }}>
                              {t.estado === 'Asignado' ? '🔄 Reasignar Técnico' : '👔 Asignar'}
                            </button>
                          )}
                          <button onClick={() => { setAccionModal({ open: true, tipo: 'cancelar', ticketId: t.id }); setAccionData({}); }} style={{ ...btnSecondary, fontSize: '0.82rem', background: '#FEE2E2', color: '#991B1B' }}>
                            ✕ Cancelar Ticket
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ====== MODAL: CONFIRMACIÓN DE ACCIÓN ====== */}
      {accionModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.6)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(107,58,42,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0EAE1' }}>
              <h4 style={{ margin: 0, color: '#4A2518', fontFamily: "'Playfair Display', serif" }}>
                {accionModal.tipo === 'finalizar' ? '✅ Finalizar Ticket' : accionModal.tipo === 'cancelar' ? '✕ Cancelar Ticket' : accionModal.tipo === 'iniciar' ? '▶️ Iniciar Ejecución' : '👔 Asignar Ticket'}
              </h4>
              <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '4px' }}>Ticket: {accionModal.ticketId}</div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {accionModal.tipo === 'finalizar' && (() => {
                const targetTicket = tickets.find(t => t.id === accionModal.ticketId) || ticketModal.ticket || {};
                const checkList = parseChecklist(targetTicket.checklist_tareas);
                const currentList = parseChecklist(accionData.checklist_completado || checkList);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {currentList.length > 0 && (
                      <div style={{ background: '#F0F9FF', borderRadius: '10px', padding: '14px', border: '1px solid #BAE6FD' }}>
                        <h5 style={{ margin: '0 0 10px', color: '#0369A1' }}>📋 Marcar Checklist de Tareas ({currentList.length})</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {currentList.map((tarea, i) => (
                            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#0F172A', cursor: 'pointer' }}>
                              <input type="checkbox" checked={tarea.completada || false}
                                onChange={(e) => {
                                  const newChk = [...currentList];
                                  newChk[i].completada = e.target.checked;
                                  setAccionData(p => ({ ...p, checklist_completado: newChk }));
                                }}
                              />
                              <span style={{ textDecoration: tarea.completada ? 'line-through' : 'none', color: tarea.completada ? '#64748B' : '#0F172A' }}>
                                {tarea.texto || tarea.tarea || (typeof tarea === 'string' ? tarea : '(Tarea sin texto)')}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label style={labelStyle}>Solución Aplicada *</label>
                      <textarea required rows={3} value={accionData.solucion_aplicada || ''} onChange={e => setAccionData(p => ({ ...p, solucion_aplicada: e.target.value }))} placeholder="Describe la solución o reparación implementada..." style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Observaciones finales</label>
                      <textarea rows={2} value={accionData.observaciones || ''} onChange={e => setAccionData(p => ({ ...p, observaciones: e.target.value }))} placeholder="Observaciones adicionales..." style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>📷 Adjuntar Evidencias / Fotos del Cierre (Puedes seleccionar múltiples imágenes a la vez)</label>
                      <input
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                        onChange={e => setAccionData(p => ({ ...p, evidencias_cierre_files: Array.from(e.target.files) }))}
                        style={{ ...inputStyle, padding: '8px', background: '#FAF6F0' }}
                      />
                      {accionData.evidencias_cierre_files && accionData.evidencias_cierre_files.length > 0 ? (
                        <div style={{ marginTop: '8px', padding: '10px 14px', background: '#DCFCE7', borderRadius: '10px', border: '1px solid #BBF7D0', fontSize: '0.82rem', color: '#166534' }}>
                          <strong>✅ {accionData.evidencias_cierre_files.length} archivo(s) seleccionado(s):</strong>
                          <ul style={{ margin: '6px 0 0', paddingLeft: '18px', maxHeight: '90px', overflowY: 'auto' }}>
                            {accionData.evidencias_cierre_files.map((f, i) => <li key={i}>{f.name}</li>)}
                          </ul>
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#666', fontStyle: 'italic' }}>
                          💡 Tip: Puedes elegir varias fotos simultáneamente para adjuntar todas las evidencias del cierre.
                        </div>
                      )}
                    </div>
                    <SignaturePad
                      label="✍️ Firma del Técnico Ejecutor *"
                      value={accionData.firma_tecnico || ''}
                      onSave={dataUrl => setAccionData(p => ({ ...p, firma_tecnico: dataUrl }))}
                      onClear={() => setAccionData(p => ({ ...p, firma_tecnico: '' }))}
                    />
                    <SignaturePad
                      label="✍️ Firma de Conformidad del Punto de Venta / Solicitante"
                      value={accionData.firma_solicitante || ''}
                      onSave={dataUrl => setAccionData(p => ({ ...p, firma_solicitante: dataUrl }))}
                      onClear={() => setAccionData(p => ({ ...p, firma_solicitante: '' }))}
                    />
                  </div>
                );
              })()}
              {accionModal.tipo === 'cancelar' && (
                <div>
                  <label style={labelStyle}>Motivo de cancelación</label>
                  <textarea rows={2} value={accionData.motivo || ''} onChange={e => setAccionData(p => ({ ...p, motivo: e.target.value }))} placeholder="Motivo de la cancelación..." style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              )}
              {accionModal.tipo === 'asignar' && (
                <>
                  <div>
                    <label style={labelStyle}>Técnico *</label>
                    <select required value={accionData.tecnico_id || ''} onChange={e => setAccionData(p => ({ ...p, tecnico_id: parseInt(e.target.value) }))} style={inputStyle}>
                      <option value="">Seleccionar técnico...</option>
                      {(accionModal.prefijo === 'ST' ? tecnicosST : tecnicosMT).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Categoría del Soporte / Ticket</label>
                    <SearchableCategorySelect
                      categories={categorias}
                      selectedId={accionData.categoria_id || ''}
                      onChange={(val) => setAccionData(p => ({ ...p, categoria_id: val }))}
                      areaId={accionModal.prefijo === 'ST' ? 7 : 3}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Fecha Programada *</label>
                    <input type="date" required value={accionData.fecha_programada || ''} onChange={e => setAccionData(p => ({ ...p, fecha_programada: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Observaciones de asignación</label>
                    <input value={accionData.observaciones_asignacion || ''} onChange={e => setAccionData(p => ({ ...p, observaciones_asignacion: e.target.value }))} placeholder="Instrucciones para el técnico..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Añadir Tarea al Checklist (Opcional)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input id="nuevaTareaInput" placeholder="Ej: Revisar motor..." style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.target.value.trim()) {
                            setAccionData(p => ({ ...p, checklist_tareas: [...(p.checklist_tareas || []), { texto: e.target.value.trim(), completada: false }] }));
                            e.target.value = '';
                          }
                        }
                      }} />
                      <button type="button" onClick={() => {
                        const input = document.getElementById('nuevaTareaInput');
                        if (input.value.trim()) {
                          setAccionData(p => ({ ...p, checklist_tareas: [...(p.checklist_tareas || []), { texto: input.value.trim(), completada: false }] }));
                          input.value = '';
                        }
                      }} style={{ ...btnSecondary }}>Añadir</button>
                    </div>
                    {accionData.checklist_tareas && accionData.checklist_tareas.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {accionData.checklist_tareas.map((t, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8F4EE', padding: '6px 10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                            <span style={{ color: '#2C1810', fontWeight: 600, flex: 1 }}>{t.texto || t.tarea || '(Tarea sin texto)'}</span>
                            <button type="button" onClick={() => setAccionData(p => ({ ...p, checklist_tareas: p.checklist_tareas.filter((_, idx) => idx !== i) }))} style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontWeight: 900, flexShrink: 0, padding: '0 4px' }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              {accionModal.tipo === 'iniciar' && (
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#555' }}>¿Confirmas que vas a iniciar la ejecución de este ticket? Se registrará la hora de inicio automáticamente.</p>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => { setAccionModal({ open: false, tipo: '', ticketId: '' }); setAccionData({}); }} style={{ ...btnSecondary, padding: '10px 20px' }}>Cancelar</button>
                <button onClick={ejecutarAccion} style={{ ...btnPrimary, padding: '10px 24px', background: accionModal.tipo === 'cancelar' ? '#991B1B' : accionModal.tipo === 'finalizar' ? '#166534' : '#6B3A2A' }}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== TOASTS ====== */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 999999 }}>
        {toasts.map(t => (
          <div key={t.id} className="animate-slide-up" style={{
            background: t.type === 'success' ? '#166534' : '#991B1B', color: '#fff',
            padding: '12px 20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            {t.type === 'success' ? '✅' : '⚠️'} {t.text}
          </div>
        ))}
      </div>

      {/* ====== MODAL DE APROBACIÓN POR JEFE DE MANTENIMIENTO ====== */}
      {approvalModalTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
          <div className="animate-fade-in" style={{ background: '#FAF6F0', borderRadius: '24px', width: '100%', maxWidth: '620px', maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>

            {/* Header morado-azul estilo app móvil */}
            <div style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                  👔
                </div>
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '1.18rem', fontFamily: "'Playfair Display', serif", fontWeight: 800, lineHeight: 1.2 }}>
                    Revisión y Aprobación
                  </h2>
                  <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700, marginTop: '2px' }}>
                    Jefe de Mantenimiento
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.85)', marginTop: '3px', lineHeight: 1.3 }}>
                    Evaluación de calidad de la reparación antes del cierre oficial
                  </div>
                </div>
              </div>
              <button onClick={() => setApprovalModalTicket(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>

            {/* Contenido scrolleable */}
            <div style={{ padding: '18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>

              {/* Tarjetas de Firmas Técnico y Solicitante (Grid responsive como el mockup) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#fff', border: '1px solid #E5D8CC', borderRadius: '16px', padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6B3A2A', letterSpacing: '0.5px', marginBottom: '8px' }}>FIRMA TÉCNICO</div>
                  {approvalModalTicket.firma_tecnico ? (
                    <img src={approvalModalTicket.firma_tecnico} alt="Tecnico" style={{ maxHeight: '48px', margin: '0 auto' }} />
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>No firmó</span>
                  )}
                </div>
                <div style={{ background: '#fff', border: '1px solid #E5D8CC', borderRadius: '16px', padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6B3A2A', letterSpacing: '0.5px', marginBottom: '8px' }}>FIRMA SOLICITANTE</div>
                  {approvalModalTicket.firma_solicitante ? (
                    <img src={approvalModalTicket.firma_solicitante} alt="Solicitante" style={{ maxHeight: '48px', margin: '0 auto' }} />
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>No firmó</span>
                  )}
                </div>
              </div>

              {/* Acordeón para inspeccionar Hallazgo, Solución, Checklist y Evidencias sin saturar el móvil */}
              <button
                type="button"
                onClick={() => setShowDetailsApproval(!showDetailsApproval)}
                style={{ background: '#EAE2D8', color: '#3730A3', border: '1px solid #D1C7BD', borderRadius: '14px', padding: '12px 16px', fontWeight: 700, fontSize: '0.86rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', width: '100%', textAlign: 'left' }}
              >
                <span>🔍 Ver Hallazgo, Solución, Checklist y Fotos</span>
                <span style={{ fontSize: '1rem', fontWeight: 800 }}>{showDetailsApproval ? '▲' : '▼'}</span>
              </button>

              {showDetailsApproval && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #E5D8CC', fontSize: '0.88rem' }}>
                  <div>
                    <strong style={{ color: '#6B3A2A', display: 'block', marginBottom: '4px' }}>📌 ID #{approvalModalTicket.id} - {approvalModalTicket.equipo_nombre || approvalModalTicket.area_hallazgo || 'Locativo'}</strong>
                    <div style={{ fontSize: '0.82rem', color: '#666' }}>Técnico: {approvalModalTicket.tecnico_nombre || 'Sin asignar'} | Estado: {approvalModalTicket.estado}</div>
                  </div>
                  <div style={{ borderTop: '1px dashed #E5D8CC', paddingTop: '10px' }}>
                    <strong style={{ color: '#6B3A2A', display: 'block', marginBottom: '4px' }}>🔍 Hallazgo Original:</strong>
                    <p style={{ margin: 0, color: '#444', whiteSpace: 'pre-wrap' }}>{approvalModalTicket.descripcion}</p>
                  </div>
                  <div style={{ borderTop: '1px dashed #E5D8CC', paddingTop: '10px' }}>
                    <strong style={{ color: '#166534', display: 'block', marginBottom: '4px' }}>🛠️ Solución Aplicada:</strong>
                    <p style={{ margin: 0, color: '#166534', fontWeight: 600, whiteSpace: 'pre-wrap' }}>{approvalModalTicket.solucion_aplicada || 'Sin solución registrada aún'}</p>
                    {approvalModalTicket.observaciones && <div style={{ fontSize: '0.82rem', color: '#065F46', marginTop: '4px' }}><strong>Obs:</strong> {approvalModalTicket.observaciones}</div>}
                  </div>
                  <div style={{ borderTop: '1px dashed #E5D8CC', paddingTop: '10px' }}>
                    <strong style={{ color: '#6B3A2A', display: 'block', marginBottom: '6px' }}>📋 Checklist Verificado:</strong>
                    {(() => {
                      const chkList = parseChecklist(approvalModalTicket.checklist_tareas);
                      if (chkList.length === 0) return <span style={{ color: '#888', fontStyle: 'italic', fontSize: '0.82rem' }}>Sin checklist.</span>;
                      return (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                          {chkList.map((chk, idx) => (
                            <li key={idx} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: chk.completada ? '#F0FDF4' : '#FEF2F2', borderRadius: '6px', border: `1px solid ${chk.completada ? '#BBF7D0' : '#FECACA'}` }}>
                              <span>{chk.completada ? '✅' : '❌'}</span>
                              <span style={{ fontWeight: chk.completada ? 600 : 400 }}>{chk.texto || chk.tarea || (typeof chk === 'string' ? chk : '(Tarea sin texto)')}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                  <div style={{ borderTop: '1px dashed #E5D8CC', paddingTop: '10px' }}>
                    <strong style={{ color: '#6B3A2A', display: 'block', marginBottom: '6px' }}>📷 Evidencias Fotográficas:</strong>
                    {(() => {
                      let evs = [];
                      try { evs = typeof approvalModalTicket.evidencias === 'string' ? JSON.parse(approvalModalTicket.evidencias) : (approvalModalTicket.evidencias || []); } catch (e) { }
                      if (evs.length === 0) return <span style={{ color: '#888', fontStyle: 'italic', fontSize: '0.82rem' }}>Sin fotos adjuntas.</span>;
                      return (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {evs.map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noopener noreferrer" style={{ display: 'block', flexShrink: 0, width: '80px', height: '65px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #DDD' }}>
                              <img src={img} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </a>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TÍTULO Y PANEL DE DECISIÓN DEL JEFE */}
              {approvalModalTicket.estado === 'Por Aprobar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '2px' }}>
                  <h3 style={{ margin: '4px 0 0 0', color: '#3730A3', fontFamily: "'Playfair Display', serif", fontSize: '1.08rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎯 Decisión de Cierre y Aprobación del Jefe de Mantenimiento
                  </h3>

                  {/* Tarjeta Opción 1: APROBAR TRABAJO */}
                  <div style={{ background: '#F0FDF4', padding: '16px', borderRadius: '18px', border: '2px solid #16A34A', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 14px rgba(22,163,74,0.08)' }}>
                    <div
                      onClick={() => setOpenApprovalAccordion(openApprovalAccordion === 'aprobar' ? '' : 'aprobar')}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✅ Opción 1: APROBAR TRABAJO Y CERRAR GESTIÓN</span>
                      </div>
                      <span style={{ fontSize: '1.2rem', color: '#166534', fontWeight: 800 }}>{openApprovalAccordion === 'aprobar' ? '︿' : '﹀'}</span>
                    </div>

                    {openApprovalAccordion === 'aprobar' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px dashed #86EFAC', paddingTop: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>OBSERVACIONES DE APROBACIÓN</label>
                          <textarea
                            placeholder="Ej: Trabajo verificado a satisfacción, se confirma reemplazo correcto."
                            value={approvalData.observaciones_aprobacion}
                            onChange={e => setApprovalData(p => ({ ...p, observaciones_aprobacion: e.target.value }))}
                            style={{ background: '#fff', border: '1px solid #86EFAC', borderRadius: '10px', padding: '12px', fontSize: '0.88rem', color: '#166534', width: '100%', boxSizing: 'border-box', minHeight: '72px', outline: 'none' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>FIRMA DIGITAL DEL JEFE DE MANTENIMIENTO *</label>
                          <SignaturePad
                            value={approvalData.firma_jefe}
                            onSave={dataUrl => setApprovalData(p => ({ ...p, firma_jefe: dataUrl }))}
                            onClear={() => setApprovalData(p => ({ ...p, firma_jefe: '' }))}
                            label=""
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAprobarTicket}
                          style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '0.95rem', fontWeight: 800, width: '100%', cursor: 'pointer', boxShadow: '0 4px 14px rgba(22,101,52,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '2px' }}
                        >
                          ✅ APROBAR Y FINALIZADO OFICIALMENTE
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tarjeta Opción 2: DEVOLVER TRABAJO */}
                  <div style={{ background: '#FEF2F2', padding: '16px', borderRadius: '18px', border: '2px solid #EF4444', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 14px rgba(239,68,68,0.08)' }}>
                    <div
                      onClick={() => setOpenApprovalAccordion(openApprovalAccordion === 'devolver' ? '' : 'devolver')}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🔄 Opción 2: DEVOLVER TRABAJO AL TÉCNICO</span>
                      </div>
                      <span style={{ fontSize: '1.2rem', color: '#991B1B', fontWeight: 800 }}>{openApprovalAccordion === 'devolver' ? '︿' : '﹀'}</span>
                    </div>

                    {openApprovalAccordion === 'devolver' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px dashed #FECACA', paddingTop: '12px' }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#7F1D1D', lineHeight: 1.4 }}>
                          Si el trabajo quedó incompleto o faltan evidencias, indícalo abajo. El ticket volverá a estado <strong>En proceso</strong> para el técnico.
                        </p>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991B1B', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>MOTIVO DE DEVOLUCIÓN / QUÉ CORREGIR *</label>
                          <textarea
                            placeholder="Ej: Falta cambiar la válvula secundaria y adjuntar la foto del repuesto instalado."
                            value={approvalData.motivo_devolucion}
                            onChange={e => setApprovalData(p => ({ ...p, motivo_devolucion: e.target.value }))}
                            style={{ background: '#fff', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px', fontSize: '0.88rem', color: '#991B1B', width: '100%', boxSizing: 'border-box', minHeight: '80px', outline: 'none' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleDevolverTicket}
                          style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '0.95rem', fontWeight: 800, width: '100%', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '2px' }}
                        >
                          🔄 DEVOLVER AL TÉCNICO PARA CORREGIR
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {approvalModalTicket.estado === 'Finalizado' && (
                <div style={{ background: '#DCFCE7', padding: '18px', borderRadius: '16px', border: '1px solid #16A34A', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: 800, color: '#166534', fontSize: '1.05rem' }}>✅ GESTIÓN APROBADA Y FINALIZADA POR JEFE DE MANTENIMIENTO</div>
                  <div style={{ fontSize: '0.86rem', color: '#15803D' }}><strong>Observaciones:</strong> {approvalModalTicket.observaciones_aprobacion || 'Aprobado a satisfacción'}</div>
                  {approvalModalTicket.firma_jefe && (
                    <div style={{ textAlign: 'center', background: '#fff', padding: '10px', borderRadius: '12px', border: '1px solid #BBF7D0', width: 'fit-content', margin: '0 auto' }}>
                      <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, marginBottom: '6px' }}>FIRMA JEFE DE MANTENIMIENTO</div>
                      <img src={approvalModalTicket.firma_jefe} alt="Firma Jefe" style={{ maxHeight: '55px', margin: '0 auto' }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer de acción (Botón Rojo Ver Reporte PDF + Botón Beige Cerrar exacto al mockup) */}
            <div style={{ padding: '16px 20px', background: '#FAF6F0', borderTop: '1px solid #E5D8CC', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => handlePrintMantenimientoPDF(approvalModalTicket)}
                style={{ background: '#991B1B', color: '#fff', borderRadius: '14px', padding: '14px', fontWeight: 700, fontSize: '0.92rem', border: 'none', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                📄 Ver Reporte PDF
              </button>
              <button
                type="button"
                onClick={() => setApprovalModalTicket(null)}
                style={{ background: '#E8DDD4', color: '#2C1810', borderRadius: '14px', padding: '14px', fontWeight: 700, fontSize: '0.92rem', border: 'none', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== VISTA IMPRIMIBLE PARA PDF (@media print) ====== */}
      {printTicketModal && (
        <div className="printable-modal" style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 999999, padding: '40px', overflowY: 'auto' }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #ccc', paddingBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#6B3A2A' }}>🖨️ Vista previa del Reporte PDF de Mantenimiento</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={() => window.print()} style={{ background: '#166534', color: '#fff', padding: '8px 18px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                🖨️ Imprimir / Guardar como PDF
              </button>
              <button className="btn btn-secondary" onClick={() => setPrintTicketModal(null)} style={{ background: '#e5e7eb', color: '#374151', padding: '8px 18px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                ✕ Cerrar
              </button>
            </div>
          </div>

          <div style={{ fontFamily: "'Inter', sans-serif", color: '#1f2937', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', borderBottom: '3px solid #6B3A2A', paddingBottom: '15px', marginBottom: '25px' }}>
              <h1 style={{ margin: '0 0 5px 0', fontSize: '1.8rem', color: '#4A2518', fontFamily: "'Playfair Display', serif" }}>CREPES EN PUNTO</h1>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#6B3A2A', textTransform: 'uppercase', letterSpacing: '1px' }}>Reporte Técnico de Mantenimiento y Cierre de Orden</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#FAF6F0', padding: '18px', borderRadius: '10px', border: '1px solid #E5D8CC', marginBottom: '25px' }}>
              <div>
                <p style={{ margin: '0 0 8px 0' }}><strong>ID Ticket:</strong> #{printTicketModal.id}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Tipo Mantenimiento:</strong> {printTicketModal.tipo_mantenimiento || 'Correctivo'}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Prioridad:</strong> {printTicketModal.prioridad || 'Media'}</p>
                <p style={{ margin: 0 }}><strong>Estado:</strong> {printTicketModal.estado}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 8px 0' }}><strong>Área Solicitante:</strong> {printTicketModal.area_registro || 'N/A'}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Categoría:</strong> {printTicketModal.categoria_nombre || (printTicketModal.categoria_id ? `Categoría #${printTicketModal.categoria_id}` : '—')}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Registrado por:</strong> {printTicketModal.usuario_registro_nombre || 'N/A'}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Fecha Registro:</strong> {formatDate(printTicketModal.fecha_registro)}</p>
                <p style={{ margin: 0 }}><strong>Fecha Finalización:</strong> {printTicketModal.fecha_real_finalizacion ? formatDate(printTicketModal.fecha_real_finalizacion) : new Date().toLocaleString('es-ES')}</p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#4A2518', borderBottom: '1px solid #E5D8CC', paddingBottom: '6px', marginBottom: '10px' }}>📌 Elemento o Equipo Intervenido</h3>
              {printTicketModal.equipo_nombre ? (
                <p style={{ margin: 0, fontSize: '0.95rem' }}><strong>Equipo:</strong> {printTicketModal.equipo_nombre} (Código: {printTicketModal.equipo_codigo || 'N/A'})</p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.95rem' }}><strong>Elemento Locativo / Área:</strong> {printTicketModal.area_hallazgo || 'Locativo'}</p>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#4A2518', borderBottom: '1px solid #E5D8CC', paddingBottom: '6px', marginBottom: '10px' }}>🔍 Descripción del Hallazgo / Problema</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', background: '#f9fafb', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap' }}>
                {printTicketModal.descripcion || 'Sin descripción detallada.'}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#166534', borderBottom: '1px solid #E5D8CC', paddingBottom: '6px', marginBottom: '10px' }}>✅ Solución y Reparación Aplicada</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', background: '#f0fdf4', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#166534', fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                {printTicketModal.solucion_aplicada || 'En ejecución / No se ha especificado solución final aún.'}
              </p>
            </div>

            {printTicketModal.observaciones && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', color: '#4A2518', borderBottom: '1px solid #E5D8CC', paddingBottom: '6px', marginBottom: '10px' }}>📝 Observaciones y Repuestos Utilizados</h3>
                <p style={{ margin: 0, fontSize: '0.95rem', background: '#f9fafb', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap' }}>
                  {printTicketModal.observaciones}
                </p>
              </div>
            )}

            {/* Checklist de Actividades */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#4A2518', borderBottom: '1px solid #E5D8CC', paddingBottom: '6px', marginBottom: '10px' }}>📋 Checklist de Actividades Ejecutadas</h3>
              {(() => {
                const chkList = parseChecklist(printTicketModal.checklist_tareas);
                if (chkList.length === 0) return <p style={{ fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>No se definieron ítems de checklist específicos para este ticket.</p>;
                return (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {chkList.map((chk, idx) => (
                      <li key={idx} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: chk.completada ? '#f0fdf4' : '#fef2f2', borderRadius: '6px', border: `1px solid ${chk.completada ? '#bbf7d0' : '#fecaca'}` }}>
                        <span>{chk.completada ? '✅ SI' : '❌ NO'}</span>
                        <span style={{ fontWeight: chk.completada ? 600 : 400 }}>{chk.texto || chk.tarea || (typeof chk === 'string' ? chk : '(Tarea sin texto)')}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>

            {/* Firmas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #E5D8CC' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  {printTicketModal.firma_tecnico ? (
                    <img src={printTicketModal.firma_tecnico} alt="Firma Técnico" style={{ maxHeight: '75px', maxWidth: '100%' }} />
                  ) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin firma electrónica</span>
                  )}
                </div>
                <div style={{ borderTop: '1px solid #374151', paddingTop: '6px', fontWeight: 700, fontSize: '0.9rem' }}>
                  {printTicketModal.tecnico_nombre || currentUser?.nombre || 'Técnico Responsable'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Firma del Técnico Ejecutor</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  {printTicketModal.firma_solicitante ? (
                    <img src={printTicketModal.firma_solicitante} alt="Firma Solicitante/PDV" style={{ maxHeight: '75px', maxWidth: '100%' }} />
                  ) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin firma electrónica</span>
                  )}
                </div>
                <div style={{ borderTop: '1px solid #374151', paddingTop: '6px', fontWeight: 700, fontSize: '0.9rem' }}>
                  {printTicketModal.usuario_registro_nombre || 'Punto de Venta / Solicitante'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Firma de Recibido a Satisfacción</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  {printTicketModal.firma_jefe ? (
                    <img src={printTicketModal.firma_jefe} alt="Firma Jefe Mantenimiento" style={{ maxHeight: '75px', maxWidth: '100%' }} />
                  ) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Pendiente de aprobación</span>
                  )}
                </div>
                <div style={{ borderTop: '1px solid #374151', paddingTop: '6px', fontWeight: 700, fontSize: '0.9rem' }}>
                  Jefe de Mantenimiento
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Firma de Aprobación y Cierre</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '0.72rem', color: '#9ca3af' }}>
              Documento generado automáticamente por Crepes en Punto — Sistema de Mantenimiento y Calidad.
            </div>
          </div>
        </div>
      )}

      {/* ====== EQUIPO DETAILS MODAL ====== */}
      {equipoDetailsModal.open && equipoDetailsModal.equipo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="animate-slide-up" style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '450px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ background: '#2C1810', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Detalles del Equipo</h3>
              <button onClick={() => setEquipoDetailsModal({ open: false, equipo: null, isConfirming: false })} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><strong style={{ color: '#6B3A2A' }}>Nombre:</strong> <span style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{equipoDetailsModal.equipo.nombre}</span></div>
              <div><strong style={{ color: '#6B3A2A' }}>ID / Código:</strong> {equipoDetailsModal.equipo.id}</div>
              {equipoDetailsModal.equipo.marca && <div><strong style={{ color: '#6B3A2A' }}>Marca:</strong> {equipoDetailsModal.equipo.marca}</div>}
              {equipoDetailsModal.equipo.modelo && <div><strong style={{ color: '#6B3A2A' }}>Modelo:</strong> {equipoDetailsModal.equipo.modelo}</div>}
              {equipoDetailsModal.equipo.serie && <div><strong style={{ color: '#6B3A2A' }}>Serie:</strong> {equipoDetailsModal.equipo.serie}</div>}
              {equipoDetailsModal.equipo.pdv_nombre && <div><strong style={{ color: '#6B3A2A' }}>Punto de Venta:</strong> {equipoDetailsModal.equipo.pdv_nombre}</div>}
            </div>
            <div style={{ padding: '16px 20px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setEquipoDetailsModal({ open: false, equipo: null, isConfirming: false })} style={{ ...btnSecondary, padding: '8px 16px' }}>
                {equipoDetailsModal.isConfirming ? 'Cancelar' : 'Cerrar'}
              </button>
              {equipoDetailsModal.isConfirming && (
                <button 
                  onClick={() => {
                    setFormTicket(p => ({ ...p, equipo_id: equipoDetailsModal.equipo.id }));
                    setEquipoDetailsModal({ open: false, equipo: null, isConfirming: false });
                    showToast(`✅ Equipo confirmado: ${equipoDetailsModal.equipo.nombre}`, 'success');
                  }} 
                  style={{ ...btnPrimary, padding: '8px 16px', background: '#166534' }}
                >
                  ✅ Confirmar este equipo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        .desktop-only-table { display: block; }
        .mobile-only-cards { display: none; }
        @media (max-width: 767px) {
          .desktop-only-table { display: none !important; }
          .mobile-only-cards { display: flex !important; }
        }
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
        }
      `}</style>
    </div>
  );
}

// ===== Style helpers =====
const selectStyle = { padding: '9px 12px', border: '1.5px solid #E8DDD4', borderRadius: '8px', fontSize: '0.82rem', background: '#fff', width: '100%', color: '#2C1810', outline: 'none' };
const inputStyle = { padding: '9px 12px', border: '1.5px solid #E8DDD4', borderRadius: '8px', fontSize: '0.85rem', background: '#fff', width: '100%', color: '#2C1810', fontFamily: 'inherit', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6B5B52', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px' };
const btnPrimary = { background: '#6B3A2A', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '0.85rem', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' };
const btnSecondary = { background: '#F5EDE4', color: '#4A2518', border: '1px solid #E8DDD4', borderRadius: '10px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '0.85rem', fontFamily: 'inherit' };
const thStyle = { padding: '10px 12px', textAlign: 'left', color: '#6B5B52', fontWeight: 700, borderBottom: '2px solid #E8DDD4', whiteSpace: 'nowrap', fontSize: '0.8rem' };
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #F0EAE1', fontSize: '0.82rem', color: '#333' };
