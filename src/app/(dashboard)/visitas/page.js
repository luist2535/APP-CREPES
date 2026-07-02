'use client';

import { useState, useEffect, useRef } from 'react';

// Custom Interactive Signature Pad Component using HTML5 Canvas
function SignaturePad({ onSave, onClear, label, value }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [signatureData, setSignatureData] = useState(value || '');

  // Synchronize internal state if value prop changes
  useEffect(() => {
    setSignatureData(value || '');
  }, [value]);

  // Prevent background scrolling when modal is open
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

  // Handle canvas sizing and touch listeners when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    // Tiny delay to ensure DOM is rendered before getting dimensions
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

      // Programmatic touch event handlers to prevent default warning and page scrolling
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
    <div className="signature-pad-wrapper">
      <span className="form-label">{label}</span>
      
      {signatureData ? (
        <div className="signature-preview-box">
          <div className="signature-preview-img-wrap">
            <img src={signatureData} alt="Firma capturada" />
          </div>
          <div className="signature-preview-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsOpen(true)}>
              ✏️ Cambiar Firma
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleClear}>
              🗑️ Limpiar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-block btn-lg drawing-trigger-btn" onClick={() => setIsOpen(true)}>
          ✍️ Pulsar para Dibujar Firma
        </button>
      )}

      {/* Modal Overlay for drawing */}
      {isOpen && (
        <div className="sig-modal-overlay">
          <div className="sig-modal-container">
            <div className="sig-modal-header">
              <h3>✍️ Dibujar Firma Digital</h3>
              <button type="button" className="sig-modal-close" onClick={() => setIsOpen(false)}>×</button>
            </div>
            
            <div className="sig-modal-body">
              <p className="sig-instruction">Por favor dibuje su firma dentro del recuadro:</p>
              
              <div className="sig-canvas-frame">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            </div>

            <div className="sig-modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearCanvas}>
                🧹 Limpiar
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-success btn-sm" onClick={saveSignature}>
                  Aceptar Firma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .signature-pad-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          margin-top: var(--spacing-sm);
          width: 100%;
        }
        .drawing-trigger-btn {
          background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%);
          color: white;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 0.95rem;
          padding: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: var(--shadow-sm);
        }
        .signature-preview-box {
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .signature-preview-img-wrap {
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px dashed var(--color-border-light);
          width: 100%;
          padding-bottom: 8px;
        }
        .signature-preview-img-wrap img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
        }
        .signature-preview-actions {
          display: flex;
          gap: var(--spacing-sm);
          width: 100%;
          justify-content: center;
        }
        
        /* Modal Styles */
        .sig-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(44, 24, 16, 0.6);
          backdrop-filter: blur(8px);
          WebkitBackdropFilter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
        }
        
        .sig-modal-container {
          background: var(--color-bg-card);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 500px;
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUpSig 0.25s ease-out;
        }

        @keyframes slideUpSig {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .sig-modal-header {
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--color-border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--color-bg-secondary);
        }
        .sig-modal-header h3 {
          font-size: 1.05rem;
          color: var(--color-primary-dark);
          margin: 0;
          font-weight: 700;
        }
        .sig-modal-close {
          background: none;
          border: none;
          font-size: 1.8rem;
          color: var(--color-text-muted);
          cursor: pointer;
          line-height: 1;
        }
        .sig-modal-body {
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          background-color: var(--color-bg-primary);
        }
        .sig-instruction {
          font-size: 0.825rem;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .sig-canvas-frame {
          border: 2.5px dashed var(--color-primary-light);
          border-radius: var(--radius-lg);
          background-color: white;
          height: 250px;
          width: 100%;
          overflow: hidden;
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.05);
        }
        canvas {
          display: block;
          width: 100%;
          height: 100%;
          cursor: crosshair;
          touch-action: none; /* Prevents default touch actions like scroll */
        }
        .sig-modal-footer {
          padding: var(--spacing-md) var(--spacing-lg);
          border-top: 1px solid var(--color-border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--color-bg-secondary);
        }
      `}</style>
    </div>
  );
}

// Matrix and Simple checklist helper components for Quality Area
const MatrixChecklistForm = ({ template, answers, onChange, activeTab, onTabChange }) => {
  return (
    <div className="matrix-checklist-execution" style={{ maxWidth: '650px', margin: '0 auto' }}>
      {/* Scrollable sub-area tabs */}
      <div className="tabs-header scrollable-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '15px', borderBottom: '1px solid var(--color-border-light)' }}>
        {template.columnas.map((col) => (
          <button
            key={col}
            type="button"
            className={`tab-btn ${activeTab === col ? 'active' : ''}`}
            onClick={() => onTabChange(col)}
            style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}
          >
            📍 {col}
          </button>
        ))}
      </div>

      {/* Checklist items for the active sub-area */}
      <div className="matrix-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {template.secciones.map((sec, sIdx) => (
          <div key={sIdx} className="section-block" style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
            <h5 style={{ color: 'var(--color-primary-dark)', borderBottom: '2px solid var(--color-border-light)', paddingBottom: '4px', marginBottom: '10px', textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 'bold' }}>
              📁 {sec.nombre}
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sec.filas.map((fila, fIdx) => {
                const answerKey = `${fila}__${activeTab}`;
                const currentValue = answers[answerKey] || '';
                
                return (
                  <div key={fIdx} className="checklist-row-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', padding: '6px 0', borderBottom: '1px dotted var(--color-border-light)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-primary)', flex: '1', lineHeight: '1.2' }}>{fila}</span>
                    <div className="btn-group" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => onChange(answerKey, currentValue === 'SI' ? '' : 'SI')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          borderRadius: '15px',
                          border: '1px solid ' + (currentValue === 'SI' ? 'var(--color-success)' : 'var(--color-border-light)'),
                          backgroundColor: currentValue === 'SI' ? 'var(--color-success)' : 'transparent',
                          color: currentValue === 'SI' ? 'white' : 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        SI
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(answerKey, currentValue === 'NO' ? '' : 'NO')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          borderRadius: '15px',
                          border: '1px solid ' + (currentValue === 'NO' ? 'var(--color-danger)' : 'var(--color-border-light)'),
                          backgroundColor: currentValue === 'NO' ? 'var(--color-danger)' : 'transparent',
                          color: currentValue === 'NO' ? 'white' : 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        NO
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(answerKey, currentValue === 'NA' ? '' : 'NA')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          borderRadius: '15px',
                          border: '1px solid ' + (currentValue === 'NA' ? '#6c757d' : 'var(--color-border-light)'),
                          backgroundColor: currentValue === 'NA' ? '#6c757d' : 'transparent',
                          color: currentValue === 'NA' ? 'white' : 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        N/A
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimpleChecklistForm = ({ template, answers, onChange }) => {
  return (
    <div className="simple-checklist-execution" style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {template.secciones.map((sec, sIdx) => (
        <div key={sIdx} className="section-block" style={{ backgroundColor: 'var(--color-bg-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
          <h5 style={{ color: 'var(--color-primary-dark)', borderBottom: '2px solid var(--color-border-light)', paddingBottom: '4px', marginBottom: '10px', textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 'bold' }}>
              📁 {sec.nombre}
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sec.filas.map((fila, fIdx) => {
              const currentValue = answers[fila] || '';
              const obsKey = `${fila}__obs`;
              const currentObs = answers[obsKey] || '';
              
              return (
                <div key={fIdx} className="checklist-row-item" style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-primary)', flex: '1', lineHeight: '1.2' }}>{fila}</span>
                    <div className="btn-group" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => onChange(fila, currentValue === 'SI' ? '' : 'SI')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          borderRadius: '15px',
                          border: '1px solid ' + (currentValue === 'SI' ? 'var(--color-success)' : 'var(--color-border-light)'),
                          backgroundColor: currentValue === 'SI' ? 'var(--color-success)' : 'transparent',
                          color: currentValue === 'SI' ? 'white' : 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        SI
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(fila, currentValue === 'NO' ? '' : 'NO')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          borderRadius: '15px',
                          border: '1px solid ' + (currentValue === 'NO' ? 'var(--color-danger)' : 'var(--color-border-light)'),
                          backgroundColor: currentValue === 'NO' ? 'var(--color-danger)' : 'transparent',
                          color: currentValue === 'NO' ? 'white' : 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        NO
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(fila, currentValue === 'NA' ? '' : 'NA')}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          borderRadius: '15px',
                          border: '1px solid ' + (currentValue === 'NA' ? '#6c757d' : 'var(--color-border-light)'),
                          backgroundColor: currentValue === 'NA' ? '#6c757d' : 'transparent',
                          color: currentValue === 'NA' ? 'white' : 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        N/A
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Escribir comentario / observación..."
                    style={{ fontSize: '0.74rem', padding: '3px 6px', marginTop: '2px', height: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-light)' }}
                    value={currentObs}
                    onChange={(e) => onChange(obsKey, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function VisitasPage() {
  const [visitas, setVisitas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [tiposVisita, setTiposVisita] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTermVisita, setSearchTermVisita] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('all');
  
  // Custom Confirm & Alert Modal States
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const triggerConfirm = (title, message, callback) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        callback();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const triggerAlert = (title, message, type = 'info') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Active navigation tab: 'pending_tasks', 'awaiting_approval', 'list', 'new'
  const [activeTab, setActiveTab] = useState('list');

  // Form states (Creating directly)
  const [selectedPdvId, setSelectedPdvId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedTipoId, setSelectedTipoId] = useState('');
  const [activePlantilla, setActivePlantilla] = useState(null);
  const [activeMatrixTab, setActiveMatrixTab] = useState('');
  
  // Execution states
  const [activeExecutionVisit, setActiveExecutionVisit] = useState(null);
  const [formAnswers, setFormAnswers] = useState({});
  const [formObservaciones, setFormObservaciones] = useState('');
  const [formRepuestos, setFormRepuestos] = useState('');
  const [formHallazgos, setFormHallazgos] = useState('');
  const [formAccionesCorrectivas, setFormAccionesCorrectivas] = useState('');
  const [auxiliarSignature, setAuxiliarSignature] = useState('');
  
  // Applicant details and PDV signature states
  const [solicitanteNombre, setSolicitanteNombre] = useState('');
  const [solicitanteDocumento, setSolicitanteDocumento] = useState('');
  const [solicitanteTelefono, setSolicitanteTelefono] = useState('');
  const [firmaPdv, setFirmaPdv] = useState('');
  
  // Jefe Approval states
  const [jefeComments, setJefeComments] = useState('');
  const [jefeSignature, setJefeSignature] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Checklist Template Editor states
  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [templateFields, setTemplateFields] = useState([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newFieldType, setNewFieldType] = useState('checkbox');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(true);

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
  const [modalTab, setModalTab] = useState('general');

  const isTechnicalArea = (areaId) => {
    const area = areas.find(a => a.id === parseInt(areaId));
    return area ? area.tipo_flujo === 'tecnico' : false;
  };

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

  const isUserAuxiliar = (rolId) => {
    return [10, 11, 12, 13, 14, 15, 16].includes(parseInt(rolId));
  };

  const isUserJefe = (rolId) => {
    return [3, 4, 5, 6, 7, 9, 17].includes(parseInt(rolId));
  };

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
        setCurrentUser(u);
        setUserRole(parseInt(u.rol_id));
        
        // Determinate active tab based on role
        if (isUserAuxiliar(u.rol_id)) {
          setActiveTab('pending_tasks');
        } else if (isUserJefe(u.rol_id)) {
          setActiveTab('awaiting_approval');
        } else {
          setActiveTab('list');
        }

        // Pre-select area
        const mappedArea = getAreaIdFromRol(u.rol_id);
        if (mappedArea && mappedArea !== 'admin') {
          setSelectedAreaId(String(mappedArea));
        }
      } catch (e) {}
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

  // Load template fields for editing in the checklist designer
  useEffect(() => {
    if (activeTab === 'templates') {
      if (isUserJefe(userRole)) {
        const userAreaId = getAreaIdFromRol(userRole);
        if (userAreaId) {
          const myTemplate = plantillas.find(p => p.area_id === parseInt(userAreaId));
          if (myTemplate) {
            setEditingTemplateId(String(myTemplate.id));
            try {
              setTemplateFields(JSON.parse(myTemplate.campos || '[]'));
            } catch (e) {
              setTemplateFields([]);
            }
          }
        }
      } else if (editingTemplateId) {
        const selectedTemp = plantillas.find(p => String(p.id) === editingTemplateId);
        if (selectedTemp) {
          try {
            setTemplateFields(JSON.parse(selectedTemp.campos || '[]'));
          } catch (e) {
            setTemplateFields([]);
          }
        }
      }
    }
  }, [activeTab, editingTemplateId, plantillas, userRole]);

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      triggerAlert('Campo Requerido', 'Debe ingresar una etiqueta para el nuevo elemento.', 'warning');
      return;
    }
    
    const isComplex = templateFields.length > 0 && (templateFields[0].tipo === 'matrix' || templateFields[0].tipo === 'simple_checklist');
    if (isComplex) {
      triggerAlert('Acción no permitida', 'No se pueden añadir campos individuales a plantillas de tipo matriz.', 'warning');
      return;
    }

    const newField = {
      nombre: 'field_' + Math.random().toString(36).substring(2, 9),
      tipo: newFieldType,
      label: newFieldLabel,
      requerido: newFieldRequired
    };

    setTemplateFields([...templateFields, newField]);
    setNewFieldLabel('');
    setNewFieldRequired(true);
  };

  const handleDeleteField = (index) => {
    const isComplex = templateFields.length > 0 && (templateFields[0].tipo === 'matrix' || templateFields[0].tipo === 'simple_checklist');
    if (isComplex) {
      triggerAlert('Acción no permitida', 'No se pueden eliminar campos individuales en plantillas de tipo matriz.', 'warning');
      return;
    }
    const updated = [...templateFields];
    updated.splice(index, 1);
    setTemplateFields(updated);
  };

  const handleFieldChange = (index, key, val) => {
    const updated = [...templateFields];
    updated[index][key] = val;
    setTemplateFields(updated);
  };

  const handleMoveField = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === templateFields.length - 1) return;
    
    const updated = [...templateFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setTemplateFields(updated);
  };

  const handleMatrixRowChange = (sectionIdx, rowIdx, val) => {
    const updated = JSON.parse(JSON.stringify(templateFields));
    updated[0].secciones[sectionIdx].filas[rowIdx] = val;
    setTemplateFields(updated);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplateId) return;
    setIsSavingTemplate(true);

    try {
      const res = await fetch('/api/plantillas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(editingTemplateId),
          campos: templateFields
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la plantilla');

      triggerAlert('Éxito', 'Plantilla de checklist guardada exitosamente.', 'success');
      loadData();
    } catch (err) {
      triggerAlert('Error', 'Error: ' + err.message, 'error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Update dynamic fields when Area / Type changes (Direct creation or Execution)
  const syncPlantillaFields = (areaId, tipoId) => {
    if (areaId && tipoId) {
      const template = plantillas.find(
        (p) => p.area_id === parseInt(areaId) && p.tipo_visita_id === parseInt(tipoId)
      );
      if (template) {
        setActivePlantilla(template);
        try {
          const fields = JSON.parse(template.campos);
          const initialAnswers = {};
          if (fields[0] && fields[0].tipo === 'matrix') {
            setActiveMatrixTab(fields[0].columnas[0]);
            fields[0].secciones.forEach((sec) => {
              sec.filas.forEach((fila) => {
                fields[0].columnas.forEach((col) => {
                  const key = `${fila}__${col}`;
                  initialAnswers[key] = '';
                });
              });
            });
          } else if (fields[0] && fields[0].tipo === 'simple_checklist') {
            fields[0].secciones.forEach((sec) => {
              sec.filas.forEach((fila) => {
                initialAnswers[fila] = '';
                initialAnswers[`${fila}__obs`] = '';
              });
            });
          } else {
            fields.forEach((f) => {
              if (f.tipo === 'checkbox') initialAnswers[f.nombre] = false;
              else if (f.tipo === 'number') initialAnswers[f.nombre] = 0;
              else initialAnswers[f.nombre] = '';
            });
          }
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
  };

  useEffect(() => {
    if (!activeExecutionVisit) {
      syncPlantillaFields(selectedAreaId, selectedTipoId);
    }
  }, [selectedAreaId, selectedTipoId, plantillas, activeExecutionVisit]);

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
      triggerAlert('Error de Carga', 'Error en la subida: ' + err.message, 'error');
      setFileState(null);
    } finally {
      setUploadingState(false);
    }
  };

  // Execution flow actions
  const handleStartWork = async (visitId) => {
    try {
      setSubmitError('');
      const res = await fetch('/api/visitas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: visitId, action: 'iniciar' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar trabajo');

      triggerAlert('Éxito', 'Trabajo iniciado. Se ha registrado la hora de inicio.', 'success');
      loadData();
    } catch (err) {
      triggerAlert('Error', err.message, 'error');
    }
  };

  const handleOpenExecutionForm = (visit) => {
    setActiveExecutionVisit(visit);
    setFormObservaciones(visit.observaciones || '');
    setFormRepuestos(visit.repuestos || '');
    setFormHallazgos(visit.hallazgos || '');
    setFormAccionesCorrectivas(visit.acciones_correctivas || '');
    setAuxiliarSignature('');
    setAntesUrl('');
    setAntesFile(null);
    setDespuesUrl('');
    setDespuesFile(null);
    setSoporteUrl('');
    setSoporteFile(null);

    setSolicitanteNombre(visit.solicitante_nombre || '');
    setSolicitanteDocumento(visit.solicitante_documento || '');
    setSolicitanteTelefono(visit.solicitante_telefono || '');
    setFirmaPdv(visit.firma_pdv || '');

    // Load visit template fields
    let areaId = visit.area_id;
    let tipoId = visit.tipo_visita_id;

    if (visit.campos_personalizados) {
      try {
        const fields = JSON.parse(visit.campos_personalizados);
        const existingAnswers = JSON.parse(visit.datos_formulario || '{}');
        const initialAnswers = {};
        fields.forEach((f) => {
          if (f.nombre in existingAnswers) {
            initialAnswers[f.nombre] = existingAnswers[f.nombre];
          } else {
            if (f.tipo === 'checkbox') initialAnswers[f.nombre] = false;
            else if (f.tipo === 'number') initialAnswers[f.nombre] = 0;
            else initialAnswers[f.nombre] = '';
          }
        });
        setFormAnswers(initialAnswers);
        setActivePlantilla({
          id: null,
          nombre: 'Tareas Personalizadas',
          campos: visit.campos_personalizados,
          area_id: visit.area_id
        });
        return;
      } catch (e) {
        console.error("Error parsing campos_personalizados:", e);
      }
    }
    
    // If tipo_visita_id is null (created without template in calendar),
    // default to the first one available for the area
    if (!tipoId && tiposVisita.length > 0) {
      const filtered = tiposVisita.filter(t => t.area_id === parseInt(areaId));
      if (filtered.length > 0) {
        tipoId = filtered[0].id;
      }
    }

    if (areaId && tipoId) {
      const template = plantillas.find(
        (p) => p.area_id === parseInt(areaId) && p.tipo_visita_id === parseInt(tipoId)
      );
      if (template) {
        setActivePlantilla(template);
        try {
          // Prefill from existing answers if any, otherwise prefill blank
          const existingAnswers = JSON.parse(visit.datos_formulario || '{}');
          const fields = JSON.parse(template.campos);
          const initialAnswers = {};
          if (fields[0] && fields[0].tipo === 'matrix') {
            setActiveMatrixTab(fields[0].columnas[0]);
            fields[0].secciones.forEach((sec) => {
              sec.filas.forEach((fila) => {
                fields[0].columnas.forEach((col) => {
                  const key = `${fila}__${col}`;
                  initialAnswers[key] = existingAnswers[key] || '';
                });
              });
            });
          } else if (fields[0] && fields[0].tipo === 'simple_checklist') {
            fields[0].secciones.forEach((sec) => {
              sec.filas.forEach((fila) => {
                initialAnswers[fila] = existingAnswers[fila] || '';
                initialAnswers[`${fila}__obs`] = existingAnswers[`${fila}__obs`] || existingAnswers[`${fila}_obs`] || '';
              });
            });
          } else {
            fields.forEach((f) => {
              if (f.nombre in existingAnswers) {
                initialAnswers[f.nombre] = existingAnswers[f.nombre];
              } else {
                if (f.tipo === 'checkbox') initialAnswers[f.nombre] = false;
                else if (f.tipo === 'number') initialAnswers[f.nombre] = 0;
                else initialAnswers[f.nombre] = '';
              }
            });
          }
          setFormAnswers(initialAnswers);
        } catch (e) {
          setActivePlantilla(null);
          setFormAnswers({});
        }
      } else {
        setActivePlantilla(null);
        setFormAnswers({});
      }
    }
  };

  const handleFinishWork = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitLoading(true);

    const isTech = activeExecutionVisit.area_tipo_flujo === 'tecnico';

    // Validations for Technical / Systems Flow
    if (isTech) {
      if (!antesUrl) {
        setSubmitError('La fotografía del ANTES es obligatoria en trabajos técnicos.');
        setSubmitLoading(false);
        return;
      }
      if (!despuesUrl) {
        setSubmitError('La fotografía del DESPUÉS es obligatoria en trabajos técnicos.');
        setSubmitLoading(false);
        return;
      }
      if (!auxiliarSignature) {
        setSubmitError('La firma digital del Auxiliar es obligatoria para certificar la ejecución.');
        setSubmitLoading(false);
        return;
      }
      if (!solicitanteNombre.trim()) {
        setSubmitError('El nombre del funcionario del Punto de Venta es obligatorio.');
        setSubmitLoading(false);
        return;
      }
      if (!firmaPdv) {
        setSubmitError('La firma del funcionario del Punto de Venta es obligatoria.');
        setSubmitLoading(false);
        return;
      }
    }

    try {
      const evidenciasArray = [];
      if (antesUrl) evidenciasArray.push({ url: antesUrl, nombre: antesFile?.name || 'Antes', etiqueta: 'antes' });
      if (despuesUrl) evidenciasArray.push({ url: despuesUrl, nombre: despuesFile?.name || 'Después', etiqueta: 'despues' });
      if (soporteUrl) evidenciasArray.push({ url: soporteUrl, nombre: soporteFile?.name || 'Soporte', etiqueta: 'soporte' });

      // Determine template/visit type IDs to link if they were null
      let areaId = activeExecutionVisit.area_id;
      let tipoId = activeExecutionVisit.tipo_visita_id;
      if (!tipoId && tiposVisita.length > 0) {
        const filtered = tiposVisita.filter(t => t.area_id === parseInt(areaId));
        if (filtered.length > 0) {
          tipoId = filtered[0].id;
        }
      }
      const templateId = activePlantilla ? activePlantilla.id : null;

      const payload = {
        id: activeExecutionVisit.id,
        action: 'finalizar',
        datos_formulario: formAnswers,
        observaciones: formObservaciones,
        repuestos: isTech ? formRepuestos : null,
        firma_auxiliar: isTech ? auxiliarSignature : null,
        hallazgos: !isTech ? formHallazgos : null,
        acciones_correctivas: !isTech ? formAccionesCorrectivas : null,
        tipo_visita_id: tipoId,
        plantilla_id: templateId,
        evidencias: evidenciasArray,
        solicitante_nombre: solicitanteNombre.trim(),
        solicitante_documento: solicitanteDocumento.trim(),
        solicitante_telefono: solicitanteTelefono.trim(),
        firma_pdv: firmaPdv
      };

      const res = await fetch('/api/visitas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la visita');

      setSubmitSuccess('Trabajo finalizado y enviado al Jefe de Área para aprobación.');
      setActiveExecutionVisit(null);
      loadData();
      
      setTimeout(() => {
        setSubmitSuccess('');
        setActiveTab(isUserAuxiliar(userRole) ? 'pending_tasks' : 'list');
      }, 2000);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Jefe approval actions
  const handleApproveVisit = async (visitId) => {
    setIsApproving(true);
    setSubmitError('');
    setSubmitSuccess('');

    if (!jefeSignature) {
      triggerAlert('Firma Requerida', 'La firma digital del Jefe es obligatoria para aprobar y cerrar esta visita.', 'warning');
      setIsApproving(false);
      return;
    }

    try {
      const res = await fetch('/api/visitas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: visitId,
          action: 'aprobar',
          comentarios_jefe: jefeComments,
          firma_jefe: jefeSignature
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al aprobar visita');

      triggerAlert('Éxito', 'Visita aprobada y cerrada exitosamente.', 'success');
      setSelectedVisit(null);
      setJefeComments('');
      setJefeSignature('');
      setModalTab('general');
      loadData();
    } catch (err) {
      triggerAlert('Error', 'Error: ' + err.message, 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReturnVisit = async (visitId) => {
    if (!jefeComments) {
      triggerAlert('Comentario Requerido', 'Debe escribir comentarios u observaciones explicando qué corregir al devolver la tarea.', 'warning');
      return;
    }

    setIsApproving(true);
    try {
      const res = await fetch('/api/visitas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: visitId,
          action: 'devolver',
          comentarios_jefe: jefeComments
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al devolver visita');

      triggerAlert('Éxito', 'Visita devuelta al Auxiliar para corregir.', 'success');
      setSelectedVisit(null);
      setJefeComments('');
      setModalTab('general');
      loadData();
    } catch (err) {
      triggerAlert('Error', 'Error: ' + err.message, 'error');
    } finally {
      setIsApproving(false);
    }
  };

  // Direct Creation form submit (Admins / Coordinadores)
  const handleSubmitVisitaDirect = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitLoading(true);

    try {
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
        hora_fin: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
        datos_formulario: formAnswers,
        observaciones: formObservaciones,
        evidencias: evidenciasArray
      };

      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la visita');

      setSubmitSuccess('Visita operativa registrada correctamente.');
      
      // Reset form
      setAntesFile(null);
      setAntesUrl('');
      setDespuesFile(null);
      setDespuesUrl('');
      setSoporteFile(null);
      setSoporteUrl('');
      setFormObservaciones('');
      
      loadData();
      
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

    if (visit.campos_personalizados) {
      try {
        parsedFields = JSON.parse(visit.campos_personalizados);
      } catch (e) {
        console.error("Error parsing campos_personalizados in details:", e);
      }
    } else {
      const template = plantillas.find((p) => p.id === visit.plantilla_id);
      if (template) {
        try {
          parsedFields = JSON.parse(template.campos);
        } catch (e) {}
      }
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

    console.log('Abriendo modal de visita:', { id: visit.id, estado: visit.estado, userRole, isJefe: isUserJefe(userRole) });

    setSelectedVisit({
      ...visit,
      fields: parsedFields,
      data: parsedData,
      evidencias: visitEvidences,
    });
    setModalTab('general');
  };

  const handlePrint = () => {
    window.print();
  };

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

  // Filter listings based on role
  const pendingVisits = visitas.filter(
    v => ['pendiente', 'en_progreso', 'devuelta'].includes(v.estado)
  );

  const approvalRequiredVisits = visitas.filter(
    v => v.estado === 'finalizada'
  );

  const completedVisits = visitas.filter(
    v => ['cerrada', 'completada'].includes(v.estado)
  );

  const filteredVisitas = visitas.filter((v) => {
    const matchesSearch = 
      (v.pdv_nombre || '').toLowerCase().includes(searchTermVisita.toLowerCase()) ||
      (v.ciudad_nombre || '').toLowerCase().includes(searchTermVisita.toLowerCase()) ||
      (v.usuario_nombre || '').toLowerCase().includes(searchTermVisita.toLowerCase()) ||
      (v.responsable_nombre || '').toLowerCase().includes(searchTermVisita.toLowerCase()) ||
      (v.tipo_visita_nombre || '').toLowerCase().includes(searchTermVisita.toLowerCase()) ||
      (v.estado || '').toLowerCase().includes(searchTermVisita.toLowerCase());
      
    const matchesArea = selectedAreaFilter === 'all' || String(v.area_id) === selectedAreaFilter;
    
    return matchesSearch && matchesArea;
  });

  return (
    <div className="visitas-page-container">
      
      {/* Navigation tabs */}
      <div className="tabs-header no-print" style={{ display: 'flex', borderBottom: '2px solid #E8DDD4', marginBottom: '20px', gap: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {isUserJefe(userRole) && (
          <button 
            className={`tab-btn ${activeTab === 'awaiting_approval' ? 'active' : ''}`}
            onClick={() => { setActiveTab('awaiting_approval'); setActiveExecutionVisit(null); }}
            style={{
              padding: '12px 16px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'awaiting_approval' ? '3px solid #6B3A2A' : '3px solid transparent',
              color: activeTab === 'awaiting_approval' ? '#6B3A2A' : '#777',
              cursor: 'pointer',
              transition: 'all 0.2s',
              margin: 0,
              whiteSpace: 'nowrap'
            }}
          >
            <span className="desktop-only-inline">📋 Pendientes de Aprobación</span>
            <span className="mobile-only-inline">📋 Pendientes</span> ({approvalRequiredVisits.length})
          </button>
        )}

        {isUserAuxiliar(userRole) && (
          <button 
            className={`tab-btn ${activeTab === 'pending_tasks' ? 'active' : ''}`}
            onClick={() => { setActiveTab('pending_tasks'); setActiveExecutionVisit(null); }}
            style={{
              padding: '12px 16px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'pending_tasks' ? '3px solid #6B3A2A' : '3px solid transparent',
              color: activeTab === 'pending_tasks' ? '#6B3A2A' : '#777',
              cursor: 'pointer',
              transition: 'all 0.2s',
              margin: 0,
              whiteSpace: 'nowrap'
            }}
          >
            Mis Tareas ({pendingVisits.length})
          </button>
        )}
        
        <button 
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => { setActiveTab('list'); setActiveExecutionVisit(null); }}
          style={{
            padding: '12px 16px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'list' ? '3px solid #6B3A2A' : '3px solid transparent',
            color: activeTab === 'list' ? '#6B3A2A' : '#777',
            cursor: 'pointer',
            transition: 'all 0.2s',
            margin: 0,
            whiteSpace: 'nowrap'
          }}
        >
          <span className="desktop-only-inline">📋 Historial de Visitas</span>
          <span className="mobile-only-inline">📋 Historial</span>
        </button>

        {(userRole === 1 || userRole === 2) && (
          <button 
            className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => { setActiveTab('new'); setActiveExecutionVisit(null); }}
            style={{
              padding: '12px 16px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'new' ? '3px solid #6B3A2A' : '3px solid transparent',
              color: activeTab === 'new' ? '#6B3A2A' : '#777',
              cursor: 'pointer',
              transition: 'all 0.2s',
              margin: 0,
              whiteSpace: 'nowrap'
            }}
          >
            ➕ Registrar Visita
          </button>
        )}

        {(userRole === 1 || userRole === 2 || isUserJefe(userRole)) && (
          <button 
            className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => { setActiveTab('templates'); setActiveExecutionVisit(null); }}
            style={{
              padding: '12px 16px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'templates' ? '3px solid #6B3A2A' : '3px solid transparent',
              color: activeTab === 'templates' ? '#6B3A2A' : '#777',
              cursor: 'pointer',
              transition: 'all 0.2s',
              margin: 0,
              whiteSpace: 'nowrap'
            }}
          >
            ⚙️ Configurar
          </button>
        )}
      </div>

      {/* Execution Form View (Active when Auxiliar has opened a task) */}
      {activeExecutionVisit ? (
        <div className="new-visita-tab animate-fade-in no-print">
          <div className="card shadow-md">
            <div className="card-header execution-header" style={{ borderLeftColor: activeExecutionVisit.area_color || '#6B3A2A' }}>
              <div className="exec-title">
                <h3>🛠️ Ejecución de Visita / Tarea</h3>
                <p><strong>Punto de Venta:</strong> {activeExecutionVisit.pdv_nombre} | <strong>Área:</strong> {activeExecutionVisit.area_nombre} ({activeExecutionVisit.area_tipo_flujo === 'tecnico' ? 'Flujo Técnico' : 'Flujo Administrativo'})</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveExecutionVisit(null)}>
                Volver a la lista ⬅
              </button>
            </div>
            <div className="card-body">
              {submitSuccess && <div className="success-alert">{submitSuccess}</div>}
              {submitError && <div className="error-alert">{submitError}</div>}

              <form onSubmit={handleFinishWork} className="visita-form">
                
                {/* Check list Renderer (conditional on template existance) */}
                {(activePlantilla || (activeExecutionVisit && activeExecutionVisit.campos_personalizados)) && (
                  <div className="dynamic-template-section card shadow-sm">
                    <div className="card-header">
                      <h4>📋 Checklist Formulario: {activeExecutionVisit.campos_personalizados ? 'Tareas Personalizadas de la Visita' : (activePlantilla ? activePlantilla.nombre : 'Checklist')}</h4>
                    </div>
                    <div className="card-body">
                      {(() => {
                        const parsedCampos = activeExecutionVisit.campos_personalizados 
                          ? JSON.parse(activeExecutionVisit.campos_personalizados) 
                          : (activePlantilla ? JSON.parse(activePlantilla.campos) : []);
                        const firstField = parsedCampos[0];
                        if (firstField && firstField.tipo === 'matrix') {
                          return (
                            <MatrixChecklistForm
                              template={firstField}
                              answers={formAnswers}
                              onChange={handleInputChange}
                              activeTab={activeMatrixTab}
                              onTabChange={setActiveMatrixTab}
                            />
                          );
                        } else if (firstField && firstField.tipo === 'simple_checklist') {
                          return (
                            <SimpleChecklistForm
                              template={firstField}
                              answers={formAnswers}
                              onChange={handleInputChange}
                            />
                          );
                        } else {
                          return parsedCampos.map((field, idx) => (
                            <div key={idx} className="form-group">
                              {field.tipo === 'checkbox' && (
                                <div className="checkbox-field-group">
                                  <input
                                    id={`exec-field-${field.nombre}`}
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={!!formAnswers[field.nombre]}
                                    onChange={(e) => handleInputChange(field.nombre, e.target.checked)}
                                  />
                                  <label htmlFor={`exec-field-${field.nombre}`} className="checkbox-field-label">
                                    {field.label} {field.requerido && <span className="req-star">*</span>}
                                  </label>
                                </div>
                              )}

                              {field.tipo === 'textarea' && (
                                <>
                                  <label className="form-label" htmlFor={`exec-field-${field.nombre}`}>
                                    {field.label} {field.requerido && <span className="req-star">*</span>}
                                  </label>
                                  <textarea
                                    id={`exec-field-${field.nombre}`}
                                    className="form-textarea"
                                    value={formAnswers[field.nombre] || ''}
                                    onChange={(e) => handleInputChange(field.nombre, e.target.value)}
                                    required={field.requerido}
                                  ></textarea>
                                </>
                              )}

                              {field.tipo === 'text' && (
                                <>
                                  <label className="form-label" htmlFor={`exec-field-${field.nombre}`}>
                                    {field.label} {field.requerido && <span className="req-star">*</span>}
                                  </label>
                                  <input
                                    id={`exec-field-${field.nombre}`}
                                    type="text"
                                    className="form-input"
                                    value={formAnswers[field.nombre] || ''}
                                    onChange={(e) => handleInputChange(field.nombre, e.target.value)}
                                    required={field.requerido}
                                  />
                                </>
                              )}

                              {field.tipo === 'number' && (
                                <>
                                  <label className="form-label" htmlFor={`exec-field-${field.nombre}`}>
                                    {field.label} {field.requerido && <span className="req-star">*</span>}
                                  </label>
                                  <input
                                    id={`exec-field-${field.nombre}`}
                                    type="number"
                                    className="form-input"
                                    value={formAnswers[field.nombre] || 0}
                                    onChange={(e) => handleInputChange(field.nombre, parseInt(e.target.value) || 0)}
                                    required={field.requerido}
                                  />
                                </>
                              )}

                              {field.tipo === 'date' && (
                                <>
                                  <label className="form-label" htmlFor={`exec-field-${field.nombre}`}>
                                    {field.label} {field.requerido && <span className="req-star">*</span>}
                                  </label>
                                  <input
                                    id={`exec-field-${field.nombre}`}
                                    type="date"
                                    className="form-input"
                                    value={formAnswers[field.nombre] || ''}
                                    onChange={(e) => handleInputChange(field.nombre, e.target.value)}
                                    required={field.requerido}
                                  />
                                </>
                              )}
                            </div>
                          ));
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* Additional inputs based on workflow type */}
                <div className="additional-form-block card shadow-sm">
                  <div className="card-header">
                    <h4>📝 Datos Adicionales de la Ejecución</h4>
                  </div>
                  <div className="card-body">
                    
                    {/* General observations */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="exec-observaciones">Observaciones Generales</label>
                      <textarea
                        id="exec-observaciones"
                        className="form-textarea"
                        placeholder="Escriba aquí anotaciones del trabajo realizado..."
                        value={formObservaciones}
                        onChange={(e) => setFormObservaciones(e.target.value)}
                      ></textarea>
                    </div>

                    {/* Specific Fields for Administrative Flow */}
                    {activeExecutionVisit.area_tipo_flujo !== 'tecnico' && (
                      <>
                        <div className="form-group">
                          <label className="form-label" htmlFor="exec-hallazgos">Hallazgos Registrados</label>
                          <textarea
                            id="exec-hallazgos"
                            className="form-textarea"
                            placeholder="Describa los hallazgos críticos detectados..."
                            value={formHallazgos}
                            onChange={(e) => setFormHallazgos(e.target.value)}
                          ></textarea>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="exec-acciones">Acciones Correctivas Recomendadas</label>
                          <textarea
                            id="exec-acciones"
                            className="form-textarea"
                            placeholder="Acciones sugeridas a tomar..."
                            value={formAccionesCorrectivas}
                            onChange={(e) => setFormAccionesCorrectivas(e.target.value)}
                          ></textarea>
                        </div>
                      </>
                    )}

                    {/* Specific Fields for Technical Flow */}
                    {activeExecutionVisit.area_tipo_flujo === 'tecnico' && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="exec-repuestos">Materiales / Repuestos Utilizados (Opcional)</label>
                        <textarea
                          id="exec-repuestos"
                          className="form-textarea"
                          placeholder="Disco duro SSD 500GB, Ram 8GB, Conector RJ45, etc..."
                          value={formRepuestos}
                          onChange={(e) => setFormRepuestos(e.target.value)}
                        ></textarea>
                      </div>
                    )}

                    {/* Evidences (grouped by label) */}
                    <div className="evidencias-upload-section">
                      <h5>📸 Cargar Evidencias ({activeExecutionVisit.area_tipo_flujo === 'tecnico' ? 'Obligatorias' : 'Opcionales'})</h5>
                      
                      <div className="upload-fields-grid">
                        
                        {/* 1. Foto del ANTES */}
                        <div className="upload-card">
                          <label className="form-label">
                            Foto del ANTES {activeExecutionVisit.area_tipo_flujo === 'tecnico' && <span className="req-star">*</span>}
                          </label>
                          <div className="real-upload-control">
                            <input
                              id="exec-upload-antes"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'antes', setAntesFile, setAntesUrl, setAntesUploading)}
                              style={{ display: 'none' }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm btn-block"
                              onClick={() => document.getElementById('exec-upload-antes').click()}
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
                          <label className="form-label">
                            Foto del DESPUÉS {activeExecutionVisit.area_tipo_flujo === 'tecnico' && <span className="req-star">*</span>}
                          </label>
                          <div className="real-upload-control">
                            <input
                              id="exec-upload-despues"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'despues', setDespuesFile, setDespuesUrl, setDespuesUploading)}
                              style={{ display: 'none' }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm btn-block"
                              onClick={() => document.getElementById('exec-upload-despues').click()}
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
                              id="exec-upload-soporte"
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                              onChange={(e) => handleFileUpload(e, 'soporte', setSoporteFile, setSoporteUrl, setSoporteUploading)}
                              style={{ display: 'none' }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm btn-block"
                              onClick={() => document.getElementById('exec-upload-soporte').click()}
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

                    {/* Applicant Info and Signature for Technical/Systems Flow */}
                    {activeExecutionVisit.area_tipo_flujo === 'tecnico' && (
                      <div className="applicant-info-section card shadow-sm" style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)' }}>
                        <h4 style={{ color: 'var(--color-primary-dark)', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '15px', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '6px' }}>
                          👤 Información del Solicitante (Funcionario PDV)
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="form-group">
                            <label className="form-label" htmlFor="solic-name">Nombre Completo del Solicitante *</label>
                            <input
                              id="solic-name"
                              type="text"
                              className="form-input"
                              placeholder="Ej. Kelly Marrugo"
                              value={solicitanteNombre}
                              onChange={(e) => setSolicitanteNombre(e.target.value)}
                              required
                            />
                          </div>

                          <div className="signature-section" style={{ marginTop: '10px' }}>
                            <SignaturePad
                              label="Firma del Funcionario de Punto de Venta *"
                              value={firmaPdv}
                              onSave={(base64) => setFirmaPdv(base64)}
                              onClear={() => setFirmaPdv('')}
                            />
                            {firmaPdv && (
                              <div className="upload-success-badge" style={{ marginTop: '8px' }}>
                                ✓ Firma del funcionario capturada
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Auxiliar Digital Signature for Technical Flow */}
                    {activeExecutionVisit.area_tipo_flujo === 'tecnico' && (
                      <div className="signature-section" style={{ marginTop: '20px' }}>
                        <SignaturePad
                          label="Firma de Conformidad de Ejecución (Auxiliar / Funcionario Tecnología) *"
                          value={auxiliarSignature}
                          onSave={(base64) => setAuxiliarSignature(base64)}
                          onClear={() => setAuxiliarSignature('')}
                        />
                        {auxiliarSignature && (
                          <div className="upload-success-badge" style={{ marginTop: '8px' }}>
                            ✓ Firma digital capturada
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-lg"
                  disabled={submitLoading || antesUploading || despuesUploading || soporteUploading}
                >
                  {submitLoading ? 'Procesando...' : 'Finalizar y Guardar Visita'}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 1: Auxiliar Tasks list */}
      {(!activeExecutionVisit && activeTab === 'pending_tasks') && (
        <div className="visitas-list-tab animate-fade-in no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card shadow-md">
            <div className="card-header" style={{ padding: '15px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
              <h3 style={{ margin: 0, fontWeight: 'bold' }}>📥 Mis Tareas y Visitas Asignadas</h3>
            </div>
            <div className="card-body px-0 py-0">
              {pendingVisits.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="table-responsive desktop-only-table">
                    <table className="visitas-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>PDV</th>
                          <th>Área</th>
                          <th>Observaciones</th>
                          <th>Estado</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingVisits.map((v) => (
                          <tr key={v.id}>
                            <td>{v.fecha}</td>
                            <td className="font-semibold">{v.pdv_nombre} ({v.ciudad_nombre})</td>
                            <td>
                              <span className="area-color-tag" style={{ borderLeftColor: v.area_color || '#6B3A2A' }}>
                                {v.area_nombre}
                              </span>
                            </td>
                            <td>{v.observaciones || 'Sin detalles adicionales'}</td>
                            <td>
                              <span className={`status-pill ${v.estado}`}>
                                {v.estado === 'pendiente' && '⏳ Pendiente'}
                                {v.estado === 'en_progreso' && '⚙️ En Progreso'}
                                {v.estado === 'devuelta' && '❌ Devuelta'}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons-group">
                                {v.estado === 'pendiente' && (
                                  <button className="btn btn-primary btn-sm" onClick={() => handleStartWork(v.id)}>
                                    Iniciar Trabajo 🚀
                                  </button>
                                )}
                                {v.estado === 'devuelta' && (
                                  <button className="btn btn-warning btn-sm" onClick={() => handleOpenExecutionForm(v)}>
                                    Corregir y Abrir ⚙️
                                  </button>
                                )}
                                {v.estado === 'en_progreso' && (
                                  <button className="btn btn-success btn-sm" onClick={() => handleOpenExecutionForm(v)}>
                                    Diligenciar Formulario 📋
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Card-based list for both Desktop & Mobile */}
                  <div className="visitas-cards-grid" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {pendingVisits.map((v) => {
                      const statusConfig = {
                        pendiente: { label: '⏳ PENDIENTE', bg: '#FEF3C7', color: '#92400E' },
                        en_progreso: { label: '⚙️ EN PROGRESO', bg: '#DBEAFE', color: '#1E40AF' },
                        devuelta: { label: '❌ DEVUELTA', bg: '#FEE2E2', color: '#991B1B' }
                      };
                      const st = statusConfig[v.estado] || statusConfig.pendiente;

                      return (
                        <div 
                          key={v.id} 
                          className="visita-pending-card" 
                          style={{
                            backgroundColor: '#fff',
                            border: '1.5px solid #e8ddd4',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 2px 8px rgba(44, 24, 16, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            position: 'relative'
                          }}
                        >
                          {/* Card Top: PDV */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: 'var(--color-primary-dark)', fontSize: '1rem' }}>
                              <span>📍</span> {v.pdv_nombre} ({v.ciudad_nombre})
                            </div>
                            <span 
                              style={{ 
                                backgroundColor: st.bg, 
                                color: st.color, 
                                fontWeight: 'bold', 
                                fontSize: '0.72rem', 
                                padding: '4px 10px', 
                                borderRadius: '20px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {st.label}
                            </span>
                          </div>

                          {/* Card Content */}
                          <div className="pending-card-content-row" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '150px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#555' }}>
                                <span>📋</span> {v.area_nombre}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#555' }}>
                                <span>📋</span> {v.tipo_visita_nombre || 'Soporte General'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#888', fontStyle: 'italic' }}>
                                <span>📅</span> Programada: {v.fecha}
                              </div>
                            </div>

                            {v.observaciones && (
                              <div style={{ flex: '1', minWidth: '150px', backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '10px', fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>
                                <strong style={{ color: '#4A2518', fontStyle: 'normal' }}>Observaciones:</strong><br/>
                                "{v.observaciones}"
                              </div>
                            )}
                          </div>

                          {/* Devuelta warning note */}
                          {v.estado === 'devuelta' && v.comentarios_jefe && (
                            <div style={{ backgroundColor: '#FEE2E2', borderRadius: '8px', padding: '10px', fontSize: '0.8rem', color: '#991B1B' }}>
                              <strong>⚠️ Nota del Jefe:</strong> "{v.comentarios_jefe}"
                            </div>
                          )}

                          {/* Card Footer Actions */}
                          <div className="pending-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f2ece6', paddingTop: '12px' }}>
                            {v.estado === 'pendiente' && (
                              <button
                                className="btn btn-primary"
                                onClick={() => handleStartWork(v.id)}
                                style={{ 
                                  backgroundColor: '#6B3A2A', 
                                  color: '#fff', 
                                  fontWeight: 'bold',
                                  fontSize: '0.82rem',
                                  padding: '10px 20px',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                Iniciar Trabajo 🚀
                              </button>
                            )}
                            {v.estado === 'devuelta' && (
                              <button
                                className="btn btn-warning"
                                onClick={() => handleOpenExecutionForm(v)}
                                style={{ 
                                  backgroundColor: '#F59E0B', 
                                  color: '#fff', 
                                  fontWeight: 'bold',
                                  fontSize: '0.82rem',
                                  padding: '10px 20px',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                Corregir y Reenviar ⚙️
                              </button>
                            )}
                            {v.estado === 'en_progreso' && (
                              <button
                                className="btn btn-success"
                                onClick={() => handleOpenExecutionForm(v)}
                                style={{ 
                                  backgroundColor: '#15803D', 
                                  color: '#fff', 
                                  fontWeight: 'bold',
                                  fontSize: '0.82rem',
                                  padding: '10px 20px',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                Diligenciar Formulario 📋
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="card text-center text-muted py-8 shadow-sm" style={{ border: 'none', margin: '20px' }}>
                  <p>No tienes tareas asignadas pendientes de ejecutar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Jefe Awaiting Approval list */}
      {(!activeExecutionVisit && activeTab === 'awaiting_approval') && (
        <div className="visitas-list-tab animate-fade-in no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card shadow-md">
            <div className="card-header" style={{ padding: '15px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
              <h3 style={{ margin: 0, fontWeight: 'bold' }}>📋 Visitas Pendientes de Aprobación</h3>
            </div>
            <div className="card-body px-0 py-0">
              {approvalRequiredVisits.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="table-responsive desktop-only-table">
                    <table className="visitas-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>PDV</th>
                          <th>Área</th>
                          <th>Tipo de Visita</th>
                          <th>Ejecutado Por</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvalRequiredVisits.map((v) => (
                          <tr key={v.id}>
                            <td>{v.fecha}</td>
                            <td className="font-semibold">{v.pdv_nombre} ({v.ciudad_nombre})</td>
                            <td>
                              <span className="area-color-tag" style={{ borderLeftColor: v.area_color || '#6B3A2A' }}>
                                {v.area_nombre}
                              </span>
                            </td>
                            <td>{v.tipo_visita_nombre || 'Sin definir'}</td>
                            <td>{v.responsable_nombre}</td>
                            <td>
                              <span className="status-pill finalizada" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', fontWeight: 'bold' }}>⏳ FINALIZADA</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Desktop & Mobile Card-based detailed list */}
                  <div className="visitas-cards-grid" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {approvalRequiredVisits.map((v) => {
                      // Custom role translation
                      const getTechRoleName = (roleId, areaName) => {
                        const rol = parseInt(roleId);
                        if (rol === 16) return 'Auxiliar de Sistemas';
                        if (rol === 12) return 'Auxiliar de Mantenimiento';
                        if (rol === 10) return 'Auxiliar de Operaciones';
                        if (rol === 11) return 'Auxiliar SST';
                        if (rol === 13) return 'Auxiliar de Calidad';
                        if (rol === 14) return 'Auxiliar de VRH';
                        if (rol === 15) return 'Auxiliar de Formación';
                        return `Auxiliar ${areaName || ''}`;
                      };
                      const techRole = getTechRoleName(v.responsable_rol_id, v.area_nombre);
                      
                      return (
                        <div 
                          key={v.id} 
                          className="visita-pending-card" 
                          style={{
                            backgroundColor: '#fff',
                            border: '1.5px solid #e8ddd4',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 2px 8px rgba(44, 24, 16, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            position: 'relative'
                          }}
                        >
                          {/* Card Top: PDV and Options */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: 'var(--color-primary-dark)', fontSize: '1rem' }}>
                              <span>📍</span> {v.pdv_nombre} ({v.ciudad_nombre})
                            </div>
                            <span style={{ color: '#aaa', cursor: 'pointer', fontSize: '1.2rem' }}>•••</span>
                          </div>

                          {/* Card Content Row */}
                          <div className="pending-card-content-row" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                            {/* Left block: details list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '150px', flex: '1' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#555' }}>
                                <span>📋</span> Visita {v.area_nombre}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#555' }}>
                                <span>📋</span> {v.tipo_visita_nombre || 'Soporte General'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#888', fontStyle: 'italic' }}>
                                <span>📅</span> Realizada el: {v.fecha}
                              </div>
                            </div>

                            {/* Right block: Technician & Status badge */}
                            <div className="pending-card-tech-row" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Técnico Ejecutor</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {v.responsable_avatar ? (
                                    <img 
                                      src={v.responsable_avatar} 
                                      alt={v.responsable_nombre} 
                                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                                    />
                                  ) : (
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FAF6F0', color: '#6B3A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', border: '1px solid #e8ddd4' }}>
                                      {v.responsable_nombre ? v.responsable_nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AX'}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#4A2518' }}>{techRole}</span>
                                    <span style={{ fontSize: '0.78rem', color: '#555' }}>{v.responsable_nombre}</span>
                                  </div>
                                </div>
                              </div>

                              <span 
                                className="status-pill finalizada" 
                                style={{ 
                                  backgroundColor: '#F3E8FF', 
                                  color: '#6B21A8', 
                                  fontWeight: 'bold', 
                                  fontSize: '0.75rem', 
                                  padding: '6px 12px', 
                                  borderRadius: '20px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                🏆 FINALIZADA
                              </span>
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="pending-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f2ece6', paddingTop: '12px' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleOpenVisitDetails(v)}
                              style={{ 
                                backgroundColor: '#FAF6F0', 
                                color: '#6B3A2A', 
                                border: '1px solid #e8ddd4', 
                                fontWeight: 'bold',
                                fontSize: '0.82rem',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              Ver Detalles
                            </button>
                            <button
                              className="btn btn-primary"
                              onClick={() => handleOpenVisitDetails(v)}
                              style={{ 
                                backgroundColor: '#6B3A2A', 
                                color: '#fff', 
                                fontWeight: 'bold',
                                fontSize: '0.82rem',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              Revisar y Aprobar ✍️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="card text-center text-muted py-8 shadow-sm" style={{ border: 'none', margin: '20px' }}>
                  <p>No hay visitas en tu área pendientes de aprobación en este momento.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: History list */}
      {(!activeExecutionVisit && activeTab === 'list') && (
        <div className="visitas-list-tab animate-fade-in no-print">
          <div className="visitas-table-card card shadow-md">
            <div className="card-header" style={{ borderBottom: 'none' }}>
              <h3>📋 Historial de Visitas Registradas</h3>
            </div>
            
            {visitas.length > 0 ? (
              <div>
                {/* Search & Filter Bar */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-light)', borderBottom: '1px solid var(--color-border-light)', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'var(--color-bg-primary)' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="🔍 Buscar por PDV, ciudad, inspector, tipo, estado..."
                      value={searchTermVisita}
                      onChange={(e) => setSearchTermVisita(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginRight: '4px' }}>Filtrar Área:</span>
                    <button
                      type="button"
                      className={`filter-chip ${selectedAreaFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedAreaFilter('all')}
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      Todas ({visitas.length})
                    </button>
                    {areas.map(a => {
                      const count = visitas.filter(v => v.area_id === a.id).length;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          className={`filter-chip ${selectedAreaFilter === String(a.id) ? 'active' : ''}`}
                          onClick={() => setSelectedAreaFilter(String(a.id))}
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderLeft: `3px solid ${a.color || '#6B3A2A'}` }}
                        >
                          {a.nombre} <span className="filter-chip-count">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="visitas-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>PDV</th>
                        <th>Área</th>
                        <th>Tipo de Visita</th>
                        <th>Inspector</th>
                        <th>Responsable</th>
                        <th>Estado</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVisitas.length > 0 ? (
                        filteredVisitas.map((v) => (
                          <tr key={v.id}>
                            <td>{v.fecha}</td>
                            <td className="font-semibold">{v.pdv_nombre} ({v.ciudad_nombre})</td>
                            <td>
                              <span className="area-color-tag" style={{ borderLeftColor: v.area_color || '#6B3A2A' }}>
                                {v.area_nombre}
                              </span>
                            </td>
                            <td>{v.tipo_visita_nombre || 'Sin definir'}</td>
                            <td>{v.usuario_nombre}</td>
                            <td>{v.responsable_nombre || 'No asignado'}</td>
                            <td>
                              <span className={`status-pill ${v.estado}`}>
                                {v.estado === 'pendiente' && '⏳ Pendiente'}
                                {v.estado === 'en_progreso' && '⚙️ En Progreso'}
                                {v.estado === 'finalizada' && '⏳ Por Aprobar'}
                                {v.estado === 'devuelta' && '❌ Devuelta'}
                                {v.estado === 'completada' && '✔ Completada'}
                                {v.estado === 'cerrada' && '🔒 Cerrada'}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenVisitDetails(v)}
                              >
                                Ver Respuestas 👁️
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                            No se encontraron visitas que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card text-center text-muted py-8 shadow-sm">
                <p>No se registran visitas previas en el sistema.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Direct Create Visit (Admin / Coordinator) */}
      {(!activeExecutionVisit && activeTab === 'new') && (
        <div className="new-visita-tab animate-fade-in no-print">
          <div className="card shadow-md">
            <div className="card-header">
              <h3>📝 Registrar Visita Operativa Directa</h3>
            </div>
            <div className="card-body">
              {submitSuccess && <div className="success-alert">{submitSuccess}</div>}
              {submitError && <div className="error-alert">{submitError}</div>}

              <form onSubmit={handleSubmitVisitaDirect} className="visita-form">
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
                      <option key={p.id} value={p.id}>{p.nombre} ({p.ciudad_nombre})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="visita-area">2. Seleccionar Área Inspectora</label>
                  <select
                    id="visita-area"
                    className="form-select"
                    value={selectedAreaId}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    required
                  >
                    <option value="">-- Seleccionar Área --</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

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
                      {tiposVisita.filter(t => t.area_id === parseInt(selectedAreaId)).map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {activePlantilla && (
                  <div className="dynamic-template-section card shadow-sm animate-fade-in">
                    <div className="card-header">
                      <h4>📋 Formulario Checklist: {activePlantilla.nombre}</h4>
                    </div>
                    <div className="card-body">
                      {(() => {
                        const parsedCampos = JSON.parse(activePlantilla.campos);
                        const firstField = parsedCampos[0];
                        if (firstField && firstField.tipo === 'matrix') {
                          return (
                            <MatrixChecklistForm
                              template={firstField}
                              answers={formAnswers}
                              onChange={handleInputChange}
                              activeTab={activeMatrixTab}
                              onTabChange={setActiveMatrixTab}
                            />
                          );
                        } else if (firstField && firstField.tipo === 'simple_checklist') {
                          return (
                            <SimpleChecklistForm
                              template={firstField}
                              answers={formAnswers}
                              onChange={handleInputChange}
                            />
                          );
                        } else {
                          return parsedCampos.map((field, idx) => (
                            <div key={idx} className="form-group">
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
                            </div>
                          ));
                        }
                      })()}
                    </div>
                  </div>
                )}

                <div className="additional-form-block card shadow-sm animate-fade-in">
                  <div className="card-header">
                    <h4>🛠️ Seguimiento y Evidencias</h4>
                  </div>
                  <div className="card-body">
                    <div className="form-group">
                      <label className="form-label" htmlFor="form-observaciones">Observaciones Generales</label>
                      <textarea
                        id="form-observaciones"
                        className="form-textarea"
                        placeholder="Observaciones adicionales, hallazgos críticos..."
                        value={formObservaciones}
                        onChange={(e) => setFormObservaciones(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="evidencias-upload-section">
                      <h5>📸 Registro de Evidencias (Fotos y Archivos)</h5>
                      <div className="upload-fields-grid">
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

      {/* Tab 5: Configure Checklist Template (Admins / Coordinadores / Jefes) */}
      {(!activeExecutionVisit && activeTab === 'templates') && (
        <div className="visitas-list-tab animate-fade-in no-print" style={{ width: '100%' }}>
          <div className="card shadow-md">
            <div className="card-header">
              <h3>⚙️ Configuración del Checklist</h3>
            </div>
            <div className="card-body">
              {/* Area selector for Admin/Coordinator. Read-only area for Jefes */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 'bold' }}>Seleccionar Checklist</label>
                {userRole === 1 || userRole === 2 ? (
                  <select
                    className="form-select"
                    value={editingTemplateId}
                    onChange={(e) => {
                      setEditingTemplateId(e.target.value);
                    }}
                  >
                    <option value="">-- Seleccionar Checklist de Área --</option>
                    {plantillas.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} ({areas.find(a => a.id === p.area_id)?.nombre || 'Área indefinida'})</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '12px 14px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)', fontWeight: 'bold', color: 'var(--color-primary-dark)' }}>
                    Checklist de Área: {plantillas.find(p => String(p.id) === editingTemplateId)?.nombre || 'Cargando...'}
                  </div>
                )}
              </div>

              {editingTemplateId ? (
                <div className="template-editor-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Warning for matrix or complex templates */}
                  {templateFields.length > 0 && (templateFields[0].tipo === 'matrix' || templateFields[0].tipo === 'simple_checklist') ? (
                    <div className="warning-alert" style={{ backgroundColor: '#FFFBEB', color: '#B45309', borderLeft: '4px solid #F59E0B', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                      <strong>💡 Diseño de Matriz Fija:</strong> Esta plantilla contiene una estructura de matriz fija. Puedes renombrar el texto de las preguntas de evaluación abajo para adaptarlas a tu área, pero la estructura de columnas y secciones se mantiene para mantener la compatibilidad con el reporte Excel y PDF.
                    </div>
                  ) : null}

                  {/* List of Fields */}
                  <div className="fields-editor-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h4 style={{ borderBottom: '1px solid var(--color-border-light)', paddingBottom: '8px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Elementos del Checklist</h4>
                    
                    {/* Matrix Row Editor */}
                    {templateFields.length > 0 && (templateFields[0].tipo === 'matrix' || templateFields[0].tipo === 'simple_checklist') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {templateFields[0].secciones.map((sec, sIdx) => (
                          <div key={sIdx} style={{ background: 'var(--color-bg-secondary)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                            <h5 style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--color-primary-dark)', fontSize: '0.88rem' }}>📁 Sección: {sec.nombre}</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {sec.filas.map((fila, rIdx) => (
                                <div key={rIdx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '25px' }}>{rIdx + 1}.</span>
                                  <input
                                    type="text"
                                    className="form-input"
                                    value={fila}
                                    onChange={(e) => handleMatrixRowChange(sIdx, rIdx, e.target.value)}
                                    placeholder="Nombre de la pregunta/tarea..."
                                    style={{ flex: 1 }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Simple checklist fields editor */
                      templateFields.map((field, idx) => (
                        <div key={field.nombre || idx} className="field-editor-row card shadow-sm" style={{ display: 'flex', flexDirection: 'column', padding: '15px', gap: '10px', backgroundColor: 'var(--color-bg-primary)', borderLeft: '4px solid var(--color-primary)' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="badge" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-primary-dark)', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>
                              {field.tipo === 'checkbox' && '☑️ Casilla de Verificación (Sí / No)'}
                              {field.tipo === 'textarea' && '📝 Observaciones / Texto Largo'}
                              {field.tipo === 'text' && '✍️ Respuesta / Texto Corto'}
                              {field.tipo === 'number' && '🔢 Número'}
                              {field.tipo === 'date' && '📅 Fecha'}
                            </span>
                            <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleMoveField(idx, 'up')} disabled={idx === 0} style={{ padding: '2px 8px' }}>▲</button>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleMoveField(idx, 'down')} disabled={idx === templateFields.length - 1} style={{ padding: '2px 8px' }}>▼</button>
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteField(idx)} style={{ padding: '2px 8px' }}>🗑️ Eliminar</button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>Etiqueta de la Pregunta / Ítem</label>
                              <input
                                type="text"
                                className="form-input"
                                value={field.label || ''}
                                onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                                placeholder="Escriba la pregunta o tarea..."
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '15px' }}>
                              <input
                                id={`field-req-${idx}`}
                                type="checkbox"
                                className="form-checkbox"
                                checked={!!field.requerido}
                                onChange={(e) => handleFieldChange(idx, 'requerido', e.target.checked)}
                              />
                              <label htmlFor={`field-req-${idx}`} style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Obligatorio</label>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    {templateFields.length === 0 && (
                      <p style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>Esta plantilla no contiene campos.</p>
                    )}
                  </div>

                  {/* Add New Field section (only for simple templates like Sistemas) */}
                  {!(templateFields.length > 0 && (templateFields[0].tipo === 'matrix' || templateFields[0].tipo === 'simple_checklist')) && (
                    <div className="card shadow-sm" style={{ padding: '20px', border: '1.5px dashed var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                      <h4 style={{ fontWeight: 'bold', color: 'var(--color-primary-dark)', marginBottom: '15px' }}>➕ Agregar Nuevo Elemento al Checklist</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '150px' }}>
                            <label className="form-label">Tipo de Campo</label>
                            <select
                              className="form-select"
                              value={newFieldType}
                              onChange={(e) => setNewFieldType(e.target.value)}
                            >
                              <option value="checkbox">☑️ Checkbox / Sí o No</option>
                              <option value="textarea">📝 Texto Largo / Observaciones</option>
                              <option value="text">✍️ Texto Corto / Respuesta</option>
                              <option value="number">🔢 Número</option>
                            </select>
                          </div>
                          <div style={{ flex: 2, minWidth: '200px' }}>
                            <label className="form-label">Etiqueta o Pregunta</label>
                            <input
                              type="text"
                              className="form-input"
                              value={newFieldLabel}
                              onChange={(e) => setNewFieldLabel(e.target.value)}
                              placeholder="Ej. ¿Limpiaste el CPU del equipo?, ¿Verificaste puertos?..."
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              id="new-field-req"
                              type="checkbox"
                              className="form-checkbox"
                              checked={newFieldRequired}
                              onChange={(e) => setNewFieldRequired(e.target.checked)}
                            />
                            <label htmlFor="new-field-req" style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Es obligatorio completar</label>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleAddField}
                          >
                            ➕ Añadir al Checklist
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save button */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--color-border-light)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-success btn-lg"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      style={{ padding: '12px 24px', fontWeight: 'bold' }}
                    >
                      {isSavingTemplate ? 'Guardando...' : '💾 Guardar Configuración de Checklist'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                  Por favor selecciona un checklist de área para comenzar a editarlo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details / Print modal & Jefe Approval actions */}
      {selectedVisit && (
        <div className="modal-backdrop">
          <div className="modal-content card animate-fade-in printable-modal">
            
            {/* Modal actions (hide on printing) */}
            <div className="card-header no-print">
              <h3>Auditoría Operativa de Punto de Venta</h3>
              <div className="modal-header-actions">
                {selectedVisit.fields && selectedVisit.fields[0] && selectedVisit.fields[0].code && (
                  <a 
                    href={`/api/visitas/export?id=${selectedVisit.id}`} 
                    className="btn btn-success btn-sm"
                    download
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}
                  >
                    📥 Exportar Excel
                  </a>
                )}
                <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                  🖨️ Imprimir / PDF
                </button>
                <button className="modal-close-btn" onClick={() => { setSelectedVisit(null); setJefeComments(''); setJefeSignature(''); setModalTab('general'); }}>×</button>
              </div>
            </div>

            {/* Modal Sub-Tabs (hide on printing) */}
            <div className="tabs-header no-print" style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-bg-secondary)', gap: '10px' }}>
              <button 
                type="button" 
                className={`tab-btn ${modalTab === 'general' ? 'active' : ''}`}
                onClick={() => setModalTab('general')}
              >
                📋 Resumen y Aprobación
              </button>
              <button 
                type="button" 
                className={`tab-btn ${modalTab === 'checklist' ? 'active' : ''}`}
                onClick={() => setModalTab('checklist')}
              >
                📊 Checklist Respuestas
              </button>
              <button 
                type="button" 
                className={`tab-btn ${modalTab === 'evidence' ? 'active' : ''}`}
                onClick={() => setModalTab('evidence')}
              >
                📸 Evidencias ({selectedVisit.evidencias ? selectedVisit.evidencias.length : 0})
              </button>
            </div>

            {/* Content to display and print */}
            <div className="card-body modal-scrollable-body print-layout">
              
              {/* Logo / Header for print */}
              {selectedVisit.area_tipo_flujo !== 'tecnico' && (
                <div className="print-only-header">
                  <h2>🥞 Crepes en Punto</h2>
                  <p>Reporte de Auditoría Operativa Interna ({selectedVisit.area_tipo_flujo === 'tecnico' ? 'Técnico' : 'Administrativo'})</p>
                  <hr className="print-divider" />
                </div>
              )}

              {/* TAB 1: GENERAL INFO & APPROVAL */}
              <div className={`tab-content-general ${modalTab === 'general' ? 'active-tab' : ''}`} style={{ width: '100%' }}>
                {selectedVisit.area_tipo_flujo === 'tecnico' ? (
                  /* Custom Visita Técnica Tecnología report sheet */
                  (() => {
                    const getVal = (keys, fallback = 'N/A') => {
                      const dataKeys = Object.keys(selectedVisit.data || {});
                      for (const key of keys) {
                        const found = dataKeys.find(k => k.toLowerCase() === key || k.toLowerCase().includes(key));
                        if (found && selectedVisit.data[found]) {
                          return String(selectedVisit.data[found]);
                        }
                      }
                      return fallback;
                    };
                    
                    const eqTipo = getVal(['tipo', 'equipo', 'elemento', 'tipo_equipo'], selectedVisit.tipo_visita_nombre || 'N/A');
                    const eqMarca = getVal(['marca', 'modelo', 'marca_equipo']);
                    const eqSerial = getVal(['serial', 'serie', 'serie_equipo', 'n/s']);
                    const eqSticker = getVal(['sticker', 'placa', 'nro_sticker']);

                    return (
                      <div className="visita-tecnica-tech-sheet" style={{ fontFamily: 'Arial, sans-serif', color: '#000', padding: '0', fontSize: '0.82rem', border: '2px solid #2C1810', width: '100%', margin: '0 auto', backgroundColor: '#fff', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        {/* Header Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '2px solid #2C1810' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '22%', borderRight: '1.5px solid #2C1810', padding: '8px', textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#faf6f2' }}>
                                <img src="/logo.png" alt="Logo" style={{ maxHeight: '42px', objectFit: 'contain', display: 'block', margin: '0 auto 4px auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                <div style={{ fontSize: '0.58rem', fontWeight: 'bold', color: '#4A2518' }}>CREPES CARIBE S.A</div>
                              </td>
                              <td style={{ width: '56%', borderRight: '1.5px solid #2C1810', padding: '8px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '1.05rem', color: '#4A2518', fontFamily: 'serif' }}>
                                VISITA TÉCNICA TECNOLOGÍA.
                              </td>
                              <td style={{ width: '22%', padding: '8px', fontSize: '0.68rem', lineHeight: '1.4', backgroundColor: '#faf6f2' }}>
                                <div><strong>Código:</strong> TEC-F-04</div>
                                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1.5px solid #2C1810' }} />
                                <div><strong>Fecha:</strong> 22 de Agosto 2022</div>
                                <div><strong>Versión:</strong> 01</div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* General Metadata */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1.5px solid #2C1810' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1.5px solid #2C1810' }}>
                              <td style={{ width: '50%', padding: '6px 10px', borderRight: '1.5px solid #2C1810' }}>
                                <strong>FECHA DE SOPORTE:</strong> <span style={{ padding: '2px 8px', border: '1px solid #2C1810', borderRadius: '3px', marginLeft: '6px', fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: '#fcfaf7' }}>{selectedVisit.fecha}</span>
                              </td>
                              <td style={{ width: '50%', padding: '6px 10px' }}>
                                <strong>HORA REGISTRADA:</strong> <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>{selectedVisit.hora_inicio || '--:--'} a {selectedVisit.hora_fin || '--:--'}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ width: '50%', padding: '6px 10px', borderRight: '1.5px solid #2C1810' }}>
                                <strong>PUNTO DE VENTA:</strong> <span style={{ marginLeft: '6px', textTransform: 'uppercase', fontWeight: 'bold', color: '#4A2518' }}>{selectedVisit.pdv_nombre}</span>
                              </td>
                              <td style={{ width: '50%', padding: '6px 10px' }}>
                                <strong>NRO. TICKET / CASO:</strong> <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>{selectedVisit.evento_id ? `EV-${selectedVisit.evento_id}` : 'Soporte Directo'}</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Applicant Info */}
                        <div style={{ backgroundColor: '#2C1810', color: '#fff', padding: '5px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px', borderBottom: '1.5px solid #2C1810', textAlign: 'center' }}>
                          INFORMACIÓN DEL SOLICITANTE (PUNTO DE VENTA)
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1.5px solid #2C1810' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '100%', padding: '8px 10px' }}>
                                <strong>NOMBRE SOLICITANTE:</strong> <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>{selectedVisit.solicitante_nombre || 'N/A'}</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Tech Staff Info */}
                        <div style={{ backgroundColor: '#2C1810', color: '#fff', padding: '5px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px', borderBottom: '1.5px solid #2C1810', textAlign: 'center' }}>
                          INFORMACIÓN FUNCIONARIO DE TECNOLOGÍA (AUXILIAR)
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1.5px solid #2C1810' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #ddd' }}>
                              <td style={{ width: '100%', padding: '6px 10px' }} colSpan="2">
                                <strong>NOMBRE AUXILIAR:</strong> <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>{selectedVisit.responsable_nombre || 'N/A'}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ width: '50%', padding: '6px 10px', borderRight: '1.5px solid #ddd' }}>
                                <strong>CARGO:</strong> <span style={{ marginLeft: '6px' }}>Auxiliar de Sistemas de Tecnología</span>
                              </td>
                              <td style={{ width: '50%', padding: '6px 10px' }}>
                                <strong>ESTADO DE REVISIÓN:</strong> <span style={{ marginLeft: '6px', textTransform: 'uppercase', fontWeight: 'bold', color: selectedVisit.estado === 'cerrada' ? 'green' : 'orange' }}>{selectedVisit.estado}</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Equipment Data */}
                        <div style={{ backgroundColor: '#2C1810', color: '#fff', padding: '5px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px', borderBottom: '1.5px solid #2C1810', textAlign: 'center' }}>
                          DATOS DEL EQUIPO
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1.5px solid #2C1810' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #ddd' }}>
                              <td style={{ width: '50%', padding: '6px 10px', borderRight: '1.5px solid #ddd' }}>
                                <strong>TIPO ELEMENTO:</strong> <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>{eqTipo}</span>
                              </td>
                              <td style={{ width: '50%', padding: '6px 10px' }}>
                                <strong>MARCA / MODELO:</strong> <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>{eqMarca}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ width: '50%', padding: '6px 10px', borderRight: '1.5px solid #ddd' }}>
                                <strong>SERIAL:</strong> <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>{eqSerial}</span>
                              </td>
                              <td style={{ width: '50%', padding: '6px 10px' }}>
                                <strong>NRO. PLACA / STICKER:</strong> <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>{eqSticker}</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Reason of Visit */}
                        <div style={{ backgroundColor: '#2C1810', color: '#fff', padding: '5px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px', borderBottom: '1.5px solid #2C1810', textAlign: 'center' }}>
                          MOTIVO DE LA VISITA / TRABAJO SOLICITADO
                        </div>
                        <div style={{ padding: '12px 15px', minHeight: '65px', borderBottom: '1.5px solid #2C1810', backgroundColor: '#fff', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                          {selectedVisit.observaciones || 'No se registraron observaciones iniciales.'}
                        </div>

                        {/* Checklist and Answers */}
                        <div style={{ backgroundColor: '#2C1810', color: '#fff', padding: '5px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px', borderBottom: '1.5px solid #2C1810', textAlign: 'center' }}>
                          TAREAS EJECUTADAS / RESULTADOS DEL SOPORTE
                        </div>
                        <div style={{ padding: '8px 12px', backgroundColor: '#fff', borderBottom: '1.5px solid #2C1810' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1.5px solid #2C1810', fontWeight: 'bold', color: '#2C1810' }}>
                                <th style={{ textAlign: 'left', padding: '6px 4px' }}>Descripción de la Tarea / Ítem</th>
                                <th style={{ width: '100px', textAlign: 'center', padding: '6px 4px' }}>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedVisit.fields && selectedVisit.fields.map((field, idx) => {
                                const val = selectedVisit.data[field.nombre];
                                return (
                                  <tr key={idx} style={{ borderBottom: '1px solid #f4f4f4' }}>
                                    <td style={{ padding: '6px 4px', color: '#333' }}>{field.label}</td>
                                    <td style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 'bold', color: val === true || val === 'SI' ? 'green' : 'red' }}>
                                      {val === true || val === 'SI' ? '✓ CUMPLIDO' : (val === false || val === 'NO' ? '✗ NO CUMPLIDO' : 'N/A')}
                                    </td>
                                  </tr>
                                );
                              })}
                              {(!selectedVisit.fields || selectedVisit.fields.length === 0) && (
                                <tr>
                                  <td colSpan="2" style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontStyle: 'italic' }}>No hay tareas registradas en esta visita.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Solutions and Materials */}
                        {selectedVisit.repuestos && (
                          <>
                            <div style={{ backgroundColor: '#2C1810', color: '#fff', padding: '5px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px', borderBottom: '1.5px solid #2C1810', textAlign: 'center' }}>
                              SOLUCIÓN APLICADA Y REPUESTOS / MATERIALES UTILIZADOS
                            </div>
                            <div style={{ padding: '12px 15px', minHeight: '55px', borderBottom: '1.5px solid #2C1810', backgroundColor: '#fff', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                              {selectedVisit.repuestos}
                            </div>
                          </>
                        )}

                        {/* 3 Signatures block */}
                        <div style={{ backgroundColor: '#2C1810', color: '#fff', padding: '5px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px', borderBottom: '1.5px solid #2C1810', textAlign: 'center' }}>
                          FIRMAS Y APROBACIONES DEL SERVICIO
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                          <tbody>
                            <tr>
                              {/* Signature 1: Funcionario Tecnologia */}
                              <td style={{ width: '33.3%', borderRight: '1.5px solid #2C1810', padding: '12px 8px', textAlign: 'center', verticalAlign: 'bottom', height: '150px', backgroundColor: '#fff' }}>
                                {selectedVisit.firma_auxiliar ? (
                                  <div style={{ maxHeight: '75px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
                                    <img src={selectedVisit.firma_auxiliar} alt="Firma Auxiliar" style={{ maxHeight: '75px', maxWidth: '90%', objectFit: 'contain' }} />
                                  </div>
                                ) : (
                                  <div style={{ height: '75px', color: '#aaa', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', marginBottom: '8px' }}>Firma pendiente</div>
                                )}
                                <hr style={{ width: '85%', border: 'none', borderTop: '1px solid #2C1810', margin: '4px auto' }} />
                                <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#4A2518' }}>FUNCIONARIO TECNOLOGÍA</div>
                                <div style={{ fontSize: '0.62rem', color: '#666', marginTop: '2px' }}>{selectedVisit.responsable_nombre}</div>
                              </td>

                              {/* Signature 2: Funcionario Punto de Venta */}
                              <td style={{ width: '33.3%', borderRight: '1.5px solid #2C1810', padding: '12px 8px', textAlign: 'center', verticalAlign: 'bottom', height: '150px', backgroundColor: '#fff' }}>
                                {selectedVisit.firma_pdv ? (
                                  <div style={{ maxHeight: '75px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
                                    <img src={selectedVisit.firma_pdv} alt="Firma PDV" style={{ maxHeight: '75px', maxWidth: '90%', objectFit: 'contain' }} />
                                  </div>
                                ) : (
                                  <div style={{ height: '75px', color: '#aaa', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', marginBottom: '8px' }}>Firma pendiente</div>
                                )}
                                <hr style={{ width: '85%', border: 'none', borderTop: '1px solid #2C1810', margin: '4px auto' }} />
                                <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#4A2518' }}>FUNCIONARIO PUNTO DE VENTA</div>
                                <div style={{ fontSize: '0.62rem', color: '#666', marginTop: '2px' }}>{selectedVisit.solicitante_nombre || 'N/A'}</div>
                              </td>

                              {/* Signature 3: Jefe Autorizador */}
                              <td style={{ width: '33.3%', padding: '12px 8px', textAlign: 'center', verticalAlign: 'bottom', height: '150px', backgroundColor: '#fff' }}>
                                {selectedVisit.firma_jefe ? (
                                  <div style={{ maxHeight: '75px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
                                    <img src={selectedVisit.firma_jefe} alt="Firma Jefe" style={{ maxHeight: '75px', maxWidth: '90%', objectFit: 'contain' }} />
                                  </div>
                                ) : (
                                  <div style={{ height: '75px', color: '#aaa', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', marginBottom: '8px' }}>Pendiente de aprobación</div>
                                )}
                                <hr style={{ width: '85%', border: 'none', borderTop: '1px solid #2C1810', margin: '4px auto' }} />
                                <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#4A2518' }}>JEFE / SUPERVISOR AUTORIZADOR</div>
                                <div style={{ fontSize: '0.62rem', color: '#666', marginTop: '2px' }}>{selectedVisit.firma_jefe ? 'AUTORIZADO ✓' : 'Esperando Autorización'}</div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                ) : (
                  <>
                    <div className="visit-meta-grid">
                      <p><strong>Punto de Venta (PDV):</strong> {selectedVisit.pdv_nombre} ({selectedVisit.ciudad_nombre})</p>
                      <p><strong>Programado por:</strong> {selectedVisit.usuario_nombre}</p>
                      <p><strong>Ejecutado por (Auxiliar):</strong> {selectedVisit.responsable_nombre || 'No asignado'}</p>
                      <p><strong>Fecha:</strong> {selectedVisit.fecha}</p>
                      <p><strong>Hora Inicio/Fin:</strong> {selectedVisit.hora_inicio || '--:--'} a {selectedVisit.hora_fin || '--:--'}</p>
                      <p><strong>Área Inspectora:</strong> {selectedVisit.area_nombre}</p>
                      <p><strong>Tipo de Visita:</strong> {selectedVisit.tipo_visita_nombre || 'Sin definir'}</p>
                      <p><strong>Estado:</strong> <span className={`status-pill ${selectedVisit.estado}`}>{selectedVisit.estado.toUpperCase()}</span></p>
                    </div>

                    {selectedVisit.observaciones && (
                      <div className="visit-obs-section">
                        <h4>📝 Observaciones Generales</h4>
                        <p className="obs-content">"{selectedVisit.observaciones}"</p>
                      </div>
                    )}

                    {/* Specific fields depending on flow */}
                    {selectedVisit.area_tipo_flujo !== 'tecnico' && (
                      <>
                        {selectedVisit.hallazgos && (
                          <div className="visit-obs-section">
                            <h4>🔎 Hallazgos Registrados</h4>
                            <p className="obs-content" style={{ borderColor: 'var(--color-warning)' }}>"{selectedVisit.hallazgos}"</p>
                          </div>
                        )}
                        {selectedVisit.acciones_correctivas && (
                          <div className="visit-obs-section">
                            <h4>🛠️ Acciones Correctivas Recomendadas</h4>
                            <p className="obs-content" style={{ borderColor: 'var(--color-primary)' }}>"{selectedVisit.acciones_correctivas}"</p>
                          </div>
                        )}
                      </>
                    )}

                    {selectedVisit.area_tipo_flujo === 'tecnico' && selectedVisit.repuestos && (
                      <div className="visit-obs-section">
                        <h4>⚙️ Materiales / Repuestos Utilizados</h4>
                        <p className="obs-content" style={{ borderColor: 'var(--color-secondary)' }}>{selectedVisit.repuestos}</p>
                      </div>
                    )}

                    {/* Display Signatures */}
                    {(selectedVisit.firma_auxiliar || selectedVisit.firma_jefe || selectedVisit.area_tipo_flujo === 'tecnico') && (
                      <div className="signatures-view-grid">
                        <div className="signature-view-card">
                          <h5>Firma Auxiliar (Ejecutor)</h5>
                          {selectedVisit.firma_auxiliar ? (
                            <div className="sig-img-container">
                              <img src={selectedVisit.firma_auxiliar} alt="Firma Auxiliar" />
                            </div>
                          ) : (
                            <p className="text-muted italic">Pendiente de firma</p>
                          )}
                        </div>
                        <div className="signature-view-card">
                          <h5>Firma Jefe de Área (Aprobador)</h5>
                          {selectedVisit.firma_jefe ? (
                            <div className="sig-img-container">
                              <img src={selectedVisit.firma_jefe} alt="Firma Jefe" />
                            </div>
                          ) : (
                            <p className="text-muted italic">Pendiente de firma</p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Comments from Jefe if returned or closed */}
                {selectedVisit.comentarios_jefe && (
                  <div className="visit-obs-section">
                    <h4>💬 Comentarios del Jefe / Supervisor</h4>
                    <p className="obs-content" style={{ borderLeftColor: '#DC2626', backgroundColor: '#FEF2F2' }}>
                      "{selectedVisit.comentarios_jefe}"
                    </p>
                  </div>
                )}

                {/* Jefe Review / Approval action panel (no-print) */}
                {(selectedVisit.estado === 'finalizada' && (isUserJefe(userRole) || userRole === 1 || userRole === 2)) && (
                  <div className="jefe-approval-panel card shadow-sm no-print" style={{ marginTop: '20px', borderTop: '2px solid var(--color-warning)' }}>
                    <div className="card-header">
                      <h4>🛠️ Panel de Aprobación de Visita</h4>
                    </div>
                    <div className="card-body">
                      <div className="form-group">
                        <label className="form-label" htmlFor="jefe-comments">Observaciones / Comentarios del Jefe</label>
                        <textarea
                          id="jefe-comments"
                          className="form-textarea"
                          placeholder="Escriba comentarios para aprobar o la razón de devolución si rechaza..."
                          value={jefeComments}
                          onChange={(e) => setJefeComments(e.target.value)}
                        ></textarea>
                      </div>

                      <SignaturePad
                        label="Firma de Aprobación y Cierre (Jefe de Área) *"
                        value={jefeSignature}
                        onSave={(base64) => setJefeSignature(base64)}
                        onClear={() => setJefeSignature('')}
                      />

                      <div className="approval-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button
                          type="button"
                          className="btn btn-success"
                          style={{ flex: 1 }}
                          onClick={() => handleApproveVisit(selectedVisit.id)}
                          disabled={isApproving}
                        >
                          ✔ Aprobar y Cerrar Visita
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ flex: 1 }}
                          onClick={() => handleReturnVisit(selectedVisit.id)}
                          disabled={isApproving}
                        >
                          ✖ Devolver para Corregir
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Signature block for PDF printing */}
                <div className="print-signature-block">
                  <div className="sig-line">
                    {selectedVisit.firma_auxiliar ? (
                      <div className="print-sig-img" style={{ height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '5px' }}>
                        <img src={selectedVisit.firma_auxiliar} alt="Firma Auxiliar" style={{ maxHeight: '100%', maxWidth: '150px', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div className="line"></div>
                    )}
                    <p>Firma Inspector / Auxiliar</p>
                  </div>
                  <div className="sig-line">
                    {selectedVisit.firma_jefe ? (
                      <div className="print-sig-img" style={{ height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '5px' }}>
                        <img src={selectedVisit.firma_jefe} alt="Firma Jefe" style={{ maxHeight: '100%', maxWidth: '150px', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div className="line"></div>
                    )}
                    <p>Firma Jefe / Aprobador</p>
                  </div>
                </div>
              </div>

              {/* TAB 2: DETAILED CHECKLIST RESPONSES */}
              <div className={`tab-content-checklist ${modalTab === 'checklist' ? 'active-tab' : ''}`}>
                <div className="visit-responses-section">
                  <h4>📋 Checklist Respuestas de Evaluación</h4>
                  <div className="responses-grid">
                    {(() => {
                      const firstField = selectedVisit.fields && selectedVisit.fields[0];
                      if (firstField && firstField.tipo === 'matrix') {
                        return (
                          <div className="matrix-results">
                            {firstField.columnas.map((col) => (
                              <div key={col} className="matrix-col-section" style={{ marginBottom: '15px' }}>
                                <h5 style={{ color: 'var(--color-primary-dark)', borderBottom: '2px solid var(--color-border-light)', paddingBottom: '3px', marginBottom: '8px', fontWeight: 'bold' }}>
                                  📍 Sub-área: {col}
                                </h5>
                                <div className="responses-grid">
                                  {firstField.secciones.flatMap(sec => sec.filas).map((fila, fIdx) => {
                                    const answer = selectedVisit.data[`${fila}__${col}`];
                                    let colorClass = 'text-muted';
                                    let emoji = '⚪';
                                    if (answer === 'SI') { colorClass = 'green-text'; emoji = '🟢'; }
                                    else if (answer === 'NO') { colorClass = 'red-text'; emoji = '❌'; }
                                    
                                    return (
                                      <div key={fIdx} className="response-row">
                                        <span className="response-label">{fila}:</span>
                                        <span className={`response-value ${colorClass}`}>
                                          {emoji} {answer || 'No responde'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } else if (firstField && firstField.tipo === 'simple_checklist') {
                        return (
                          <div className="responses-grid">
                            {firstField.secciones.flatMap(sec => sec.filas).map((fila, fIdx) => {
                              const answer = selectedVisit.data[fila];
                              const obs = selectedVisit.data[`${fila}__obs` || `${fila}_obs`];
                              let colorClass = 'text-muted';
                              let emoji = '⚪';
                              if (answer === 'SI') { colorClass = 'green-text'; emoji = '🟢'; }
                              else if (answer === 'NO') { colorClass = 'red-text'; emoji = '❌'; }
                              
                              return (
                                <div key={fIdx} className="response-row" style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border-light)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <span className="response-label">{fila}:</span>
                                    <span className={`response-value ${colorClass}`}>
                                      {emoji} {answer || 'No responde'}
                                    </span>
                                  </div>
                                  {obs && (
                                    <span className="text-muted" style={{ fontSize: '0.78rem', fontStyle: 'italic', paddingLeft: '8px' }}>
                                      ↳ Observación: {obs}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      } else {
                        return (
                          <div className="responses-grid">
                            {selectedVisit.fields.map((f, idx) => {
                              const answer = selectedVisit.data[f.nombre];
                              let displayAnswer = String(answer !== undefined && answer !== null ? answer : 'No responde');
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
                            })}
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* TAB 3: EVIDENCES */}
              <div className={`tab-content-evidence ${modalTab === 'evidence' ? 'active-tab' : ''}`}>
                {selectedVisit.evidencias && selectedVisit.evidencias.length > 0 ? (
                  <div className="visit-evidence-section">
                    <h4>📸 Evidencias Registradas</h4>
                    
                    {selectedVisit.evidencias.some(e => e.etiqueta === 'antes' || e.etiqueta === 'despues') && (
                      <div className="antes-despues-grid">
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
                ) : (
                  <div className="visit-evidence-section">
                    <h4>📸 Evidencias Registradas</h4>
                    <p className="text-muted italic" style={{ padding: '15px 0', fontSize: '0.85rem' }}>No se registraron evidencias fotográficas ni documentos de soporte para esta visita.</p>
                  </div>
                )}
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

        .status-pill.pendiente { background-color: #DBEAFE; color: #1E40AF; }
        .status-pill.en_progreso { background-color: #FEF3C7; color: #92400E; }
        .status-pill.finalizada { background-color: #F3E8FF; color: #6B21A8; }
        .status-pill.devuelta { background-color: #FEE2E2; color: #991B1B; }
        .status-pill.completada { background-color: var(--color-green-bg); color: #166534; }
        .status-pill.cerrada { background-color: #D1FAE5; color: #065F46; }

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
          background-color: rgba(44, 24, 16, 0.45);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
          overflow-y: auto;
        }

        .tab-content-general:not(.active-tab),
        .tab-content-checklist:not(.active-tab),
        .tab-content-evidence:not(.active-tab) {
          display: none !important;
        }

        .modal-content {
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
        }

        .modal-scrollable-body {
          overflow-y: auto;
          flex: 1;
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
        .visit-evidence-section h4,
        .jefe-approval-panel h4 {
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

        /* Signatures list view */
        .signatures-view-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-md);
          margin-top: var(--spacing-md);
        }

        @media (min-width: 600px) {
          .signatures-view-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .signature-view-card {
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          background-color: var(--color-bg-primary);
          text-align: center;
        }

        .signature-view-card h5 {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin-bottom: 6px;
          font-weight: 600;
        }

        .sig-img-container {
          width: 100%;
          height: 80px;
          background-color: white;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .sig-img-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .action-buttons-group {
          display: flex;
          gap: var(--spacing-xs);
        }

        .execution-header {
          border-left: 5px solid #6B3A2A;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .exec-title h3 {
          margin-bottom: 2px;
        }

        .exec-title p {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .print-only-header { display: none; }
        .print-signature-block { display: none; }

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

        /* Mobile responsive overrides for visitas */
        @media (max-width: 767px) {
          .tabs-header {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .tabs-header::-webkit-scrollbar {
            display: none;
          }

          .tab-btn {
            padding: 8px 10px;
            font-size: 0.72rem;
          }

          .visitas-table {
            font-size: 0.72rem;
            min-width: 600px;
          }

          .visitas-table th,
          .visitas-table td {
            padding: 8px;
          }

          .table-responsive {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .modal-backdrop {
            align-items: flex-start;
            padding: var(--spacing-xs);
          }

          .modal-content {
            max-width: 100% !important;
            margin: 10px 0;
            max-height: 95vh;
            display: flex;
            flex-direction: column;
          }

          .modal-scrollable-body {
            flex: 1;
            padding: var(--spacing-md);
            gap: var(--spacing-md);
          }

          .visit-meta-grid {
            grid-template-columns: 1fr;
            font-size: 0.75rem;
          }

          .upload-fields-grid {
            grid-template-columns: 1fr;
          }

          .antes-despues-grid {
            grid-template-columns: 1fr;
          }

          .response-row {
            flex-direction: column;
            gap: 2px;
          }

          .visita-form {
            gap: var(--spacing-sm);
          }

          .form-row-split {
            grid-template-columns: 1fr;
          }

          .status-pill {
            font-size: 0.62rem;
            padding: 1px 6px;
          }

          .desktop-only-table {
            display: none !important;
          }
          
          .desktop-only-inline {
            display: none !important;
          }

          .mobile-only-inline {
            display: inline !important;
          }

          .visitas-cards-grid {
            padding: 10px !important;
          }

          .visita-pending-card {
            padding: 12px !important;
          }

          .pending-card-content-row {
            flex-direction: column !important;
          }

          .pending-card-tech-row {
            flex-direction: row !important;
            gap: 10px !important;
          }

          .pending-card-actions {
            flex-direction: row !important;
            justify-content: stretch !important;
          }

          .pending-card-actions button {
            flex: 1 !important;
            text-align: center !important;
            padding: 10px 8px !important;
            font-size: 0.78rem !important;
          }
        }

        .desktop-only-inline {
          display: inline;
        }

        .mobile-only-inline {
          display: none;
        }

        .desktop-only-table {
          display: block;
        }
      `}</style>

      {/* Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(44, 24, 16, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--spacing-md)'
        }}>
          <div className="card animate-fade-in" style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md) var(--spacing-lg)' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-primary-dark)' }}>{confirmModal.title || '¿Estás seguro?'}</h3>
              <button 
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >×</button>
            </div>
            <div className="card-body" style={{ padding: 'var(--spacing-lg)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--spacing-lg) 0', lineHeight: '1.5' }}>
                {confirmModal.message}
              </p>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger btn-sm"
                  onClick={confirmModal.onConfirm}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(44, 24, 16, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--spacing-md)'
        }}>
          <div className="card animate-fade-in" style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md) var(--spacing-lg)' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-primary-dark)' }}>{alertModal.title || 'Aviso'}</h3>
              <button 
                type="button"
                onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >×</button>
            </div>
            <div className="card-body" style={{ padding: 'var(--spacing-lg)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 var(--spacing-lg) 0', lineHeight: '1.5' }}>
                {alertModal.type === 'error' && '❌ '}
                {alertModal.type === 'success' && '✅ '}
                {alertModal.message}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
