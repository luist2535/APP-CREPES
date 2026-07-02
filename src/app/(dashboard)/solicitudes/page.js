'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SolicitudesPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [formAreaId, setFormAreaId] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formUrgencia, setFormUrgencia] = useState('revisar');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [activeMobileMenuId, setActiveMobileMenuId] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'success' });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const resSolicitudes = await fetch('/api/solicitudes');
      if (!resSolicitudes.ok) throw new Error('Error al cargar solicitudes');
      const dataSolicitudes = await resSolicitudes.json();
      setSolicitudes(dataSolicitudes.solicitudes);

      // Load areas to populate options (Sistemas & Mantenimiento)
      const resVisitas = await fetch('/api/visitas');
      if (resVisitas.ok) {
        const dataVisitas = await resVisitas.json();
        setAreas(dataVisitas.areas || []);
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
      } catch (e) {}
    }

    // Check if new query parameter is present to open creation modal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('new') === 'true') {
      setShowModal(true);
      router.replace('/solicitudes');
    }
  }, [router]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitLoading(true);

    if (!formAreaId || !formTitulo || !formDescripcion || !formUrgencia) {
      setSubmitError('Todos los campos son obligatorios.');
      setSubmitLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area_id: parseInt(formAreaId),
          titulo: formTitulo,
          descripcion: formDescripcion,
          urgencia: formUrgencia,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud');

      setSubmitSuccess(data.message || 'Solicitud de soporte enviada con éxito.');
      setFormTitulo('');
      setFormDescripcion('');
      setFormUrgencia('revisar');
      setShowModal(false);
      loadData();
      
      setTimeout(() => setSubmitSuccess(''), 2000);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleScheduleRedirect = (solicitud) => {
    // Redirect to calendar, pre-filling options to assign
    router.push(
      `/calendario?pdv_id=${solicitud.pdv_id}&area_id=${solicitud.area_id}&titulo=${encodeURIComponent(
        `Solicitud: ${solicitud.titulo}`
      )}&descripcion=${encodeURIComponent(solicitud.descripcion)}&show_form=true&solicitud_id=${solicitud.id}`
    );
  };

  const handleRejectRequest = (solicitudId) => {
    setConfirmModal({
      show: true,
      title: 'Confirmar Rechazo',
      message: '¿Está seguro de que desea rechazar esta solicitud?',
      onConfirm: async () => {
        setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
        try {
          const res = await fetch('/api/solicitudes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: solicitudId, action: 'rechazar' })
          });
          if (res.ok) {
            setAlertModal({ show: true, title: 'Éxito', message: 'Solicitud rechazada correctamente.', type: 'success' });
            loadData();
          } else {
            const data = await res.json();
            setAlertModal({ show: true, title: 'Error', message: data.error || 'No se pudo rechazar la solicitud.', type: 'error' });
          }
        } catch (err) {
          setAlertModal({ show: true, title: 'Error', message: err.message, type: 'error' });
        }
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    setConfirmModal({
      show: true,
      title: 'Confirmar Eliminación',
      message: `¿Está seguro de que desea eliminar las ${selectedIds.length} solicitudes seleccionadas? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
        try {
          const res = await fetch(`/api/solicitudes?ids=${selectedIds.join(',')}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error al eliminar');
          
          setAlertModal({ show: true, title: 'Éxito', message: 'Solicitudes eliminadas correctamente.', type: 'success' });
          setSelectedIds([]);
          loadData();
        } catch (err) {
          setAlertModal({ show: true, title: 'Error', message: err.message, type: 'error' });
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Cargando requerimientos de soporte...</p>
        <style jsx>{`
          .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; }
          .spinner { width: 40px; height: 40px; border: 4px solid var(--color-bg-secondary); border-top: 4px solid var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Filter systems & maintenance areas
  const technicalAreas = areas.filter(a => a.id === 3 || a.id === 7);

  // Live states stats calculation
  const totalCount = solicitudes.length;
  const abiertosCount = solicitudes.filter(s => s.estado === 'pendiente').length;
  const tramiteCount = solicitudes.filter(s => s.estado === 'programada').length;
  const cerradosCount = solicitudes.filter(s => s.estado === 'cerrada' || s.estado === 'completada').length;

  // Filter based on dropdown select statusFilter
  const stateFilteredSolicitudes = solicitudes.filter(s => {
    if (statusFilter === 'todos') return true;
    if (statusFilter === 'pendiente') return s.estado === 'pendiente';
    if (statusFilter === 'programada') return s.estado === 'programada';
    if (statusFilter === 'cerrada') return s.estado === 'cerrada' || s.estado === 'completada';
    if (statusFilter === 'rechazada') return s.estado === 'rechazada';
    return true;
  });

  // Client-side live search and filter for Tickets, PDVs, Fault descriptions
  const filteredSolicitudes = stateFilteredSolicitudes.filter(s => {
    const ticketCode = 'TK-' + String(s.id).padStart(5, '0');
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    
    return (
      ticketCode.toLowerCase().includes(term) ||
      String(s.id).includes(term) ||
      s.pdv_nombre.toLowerCase().includes(term) ||
      s.titulo.toLowerCase().includes(term) ||
      s.descripcion.toLowerCase().includes(term) ||
      s.area_nombre.toLowerCase().includes(term)
    );
  });

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const filteredIds = filteredSolicitudes.map(s => s.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds([...new Set([...selectedIds, ...filteredIds])]);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Ticket', 'Fecha', 'Punto de Venta', 'Area', 'Asunto', 'Detalle', 'Urgencia', 'Estado'];
    const rows = filteredSolicitudes.map(s => [
      'TK-' + String(s.id).padStart(5, '0'),
      s.fecha_solicitud.split(' ')[0],
      s.pdv_nombre,
      s.area_nombre,
      s.titulo,
      s.descripcion,
      s.urgencia,
      s.estado
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solicitudes_soporte_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="solicitudes-page-container">
      
      {/* Header and Stats Counters Row */}
      <div className="header-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: '1', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-primary-dark)', margin: 0 }}>📨 Requerimientos de Soporte Técnico</h3>
            {(userRole === 17 || userRole === 1 || userRole === 2 || userRole === 9) && (
              <button 
                className="btn btn-primary" 
                onClick={() => { setShowModal(true); setFormAreaId(technicalAreas[0]?.id || ''); }}
                style={{ padding: '6px 12px', fontSize: '0.82rem', fontWeight: 'bold' }}
              >
                ➕ Nuevo Ticket
              </button>
            )}
          </div>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Espacio para solicitar soporte en Sistemas o Mantenimiento Físico para los Puntos de Venta.</p>
        </div>
        
        {/* Stats Badges */}
        <div className="stats-badges-container" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div className="stat-badge-card" style={{ backgroundColor: '#faf6f2', border: '1px solid #e8ddd4', borderRadius: '8px', padding: '8px 16px', textAlign: 'center', minWidth: '100px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Tickets</span>
            <span className="stat-val" style={{ display: 'block', fontSize: '1.25rem', fontWeight: '800', color: '#4A2518', marginTop: '2px' }}>({totalCount})</span>
          </div>
          <div className="stat-badge-card" style={{ backgroundColor: '#f2f7fa', border: '1px solid #d4e3e8', borderRadius: '8px', padding: '8px 16px', textAlign: 'center', minWidth: '100px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Abiertos</span>
            <span className="stat-val" style={{ display: 'block', fontSize: '1.25rem', fontWeight: '800', color: '#1D4ED8', marginTop: '2px' }}>({abiertosCount})</span>
          </div>
          <div className="stat-badge-card" style={{ backgroundColor: '#f5faf2', border: '1px solid #dce8d4', borderRadius: '8px', padding: '8px 16px', textAlign: 'center', minWidth: '100px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>En Trámite</span>
            <span className="stat-val" style={{ display: 'block', fontSize: '1.25rem', fontWeight: '800', color: '#15803D', marginTop: '2px' }}>({tramiteCount})</span>
          </div>
          <div className="stat-badge-card" style={{ backgroundColor: '#fbfaf9', border: '1px solid #e8ddd4', borderRadius: '8px', padding: '8px 16px', textAlign: 'center', minWidth: '100px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Cerrados</span>
            <span className="stat-val" style={{ display: 'block', fontSize: '1.25rem', fontWeight: '800', color: '#555', marginTop: '2px' }}>({cerradosCount})</span>
          </div>
        </div>
      </div>

      {submitSuccess && <div className="success-alert">{submitSuccess}</div>}

      <div className="card shadow-md">
        {/* List Header controls */}
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', padding: '15px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
          <h4 style={{ margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📋 Listado de Solicitudes
          </h4>
          
          <div className="list-actions-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Live Search input */}
            <input
              type="text"
              className="form-input desktop-search-input"
              placeholder="🔍 Buscar Ticket, PDV o Asunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '6px 12px', minWidth: '220px', margin: 0 }}
            />

            {/* Export Excel/CSV Button */}
            <button 
              onClick={handleExportCSV}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px', border: '1px solid #ddd', backgroundColor: '#fff', cursor: 'pointer' }}
            >
              📥 Exportar a Excel
            </button>

            {/* Delete Selected Button (Admin/Coordinator only) */}
            {(userRole === 1 || userRole === 2) && (
              <button 
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
                className="btn btn-danger btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px', opacity: selectedIds.length === 0 ? 0.5 : 1, cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer' }}
              >
                🗑️ Eliminar Seleccionados
              </button>
            )}

            {/* State/Closed Filter dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.82rem', padding: '6px 12px', minWidth: '160px', width: 'auto', margin: 0 }}
            >
              <option value="todos">Estado de Todos ▾</option>
              <option value="pendiente">Pendientes</option>
              <option value="programada">En Trámite</option>
              <option value="cerrada">Cerrados</option>
              <option value="rechazada">Rechazados</option>
            </select>
          </div>
        </div>

        <div className="card-body px-0 py-0">
          
          {/* Mobile-only Search input */}
          <div className="mobile-search-wrapper" style={{ padding: '10px 15px', backgroundColor: '#fcfaf7', borderBottom: '1px solid var(--color-border-light)' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Buscar Ticket, PDV o Asunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '8px 12px', width: '100%', margin: 0 }}
            />
          </div>

          {filteredSolicitudes.length > 0 ? (
            <>
              {/* DESKTOP TABLE VIEW */}
              <div className="table-responsive desktop-only-table">
                <table className="solicitudes-table">
                  <thead>
                    <tr>
                      {/* Checkbox column for batch selection (Admin/Coordinator only) */}
                      {(userRole === 1 || userRole === 2) && (
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={filteredSolicitudes.length > 0 && filteredSolicitudes.every(s => selectedIds.includes(s.id))}
                            onChange={handleSelectAll}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </th>
                      )}
                      <th>Ticket</th>
                      <th>Fecha</th>
                      <th>Punto de Venta</th>
                      <th>Área</th>
                      <th>Requerimiento / Asunto</th>
                      <th>Detalle</th>
                      <th>Urgencia</th>
                      <th>Estado</th>
                      {(userRole === 1 || userRole === 2 || userRole === 4 || userRole === 9) && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSolicitudes.map((s) => {
                      const ticketCode = 'TK-' + String(s.id).padStart(5, '0');
                      const isSelected = selectedIds.includes(s.id);
                      return (
                        <tr key={s.id} style={{ backgroundColor: isSelected ? '#FAF6F0' : 'transparent' }}>
                          {(userRole === 1 || userRole === 2) && (
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => handleSelectOne(s.id)}
                                style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                              />
                            </td>
                          )}
                          <td style={{ fontWeight: 'bold' }}>
                            <span 
                              style={{ textDecoration: 'underline', color: 'var(--color-primary-dark)', cursor: 'pointer' }}
                              title="Ver detalles de ticket"
                            >
                              {ticketCode}
                            </span>
                          </td>
                          <td>{s.fecha_solicitud.split(' ')[0]}</td>
                          <td className="font-semibold">{s.pdv_nombre}</td>
                          <td>
                            <span className="area-color-tag" style={{ borderLeftColor: s.area_id === 7 ? '#4B0082' : '#8B6914' }}>
                              {s.area_nombre}
                            </span>
                          </td>
                          <td className="font-semibold">{s.titulo}</td>
                          <td>{s.descripcion}</td>
                          <td>
                            <span className={`urgency-badge ${s.urgencia}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {s.urgencia === 'urgente' ? '🚨 URGENTE' : '📋 REVISAR'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${s.estado}`}>
                              {s.estado === 'pendiente' && '⏳ Pendiente'}
                              {s.estado === 'programada' && '📅 Programada'}
                              {s.estado === 'rechazada' && '❌ Rechazada'}
                              {s.estado === 'cerrada' && '✓ Cerrada'}
                            </span>
                          </td>
                          {(userRole === 1 || userRole === 2 || userRole === 4 || userRole === 9) && (
                            <td>
                              {s.estado === 'pendiente' ? (
                                <div className="action-buttons-group">
                                  <button 
                                    className="btn btn-success btn-sm"
                                    onClick={() => handleScheduleRedirect(s)}
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}
                                  >
                                    Programar Visita 📅
                                  </button>
                                  <button 
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleRejectRequest(s.id)}
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}
                                  >
                                    Rechazar ❌
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted italic text-xs">Resuelta</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS LIST VIEW */}
              <div className="mobile-only-cards" style={{ display: 'none', flexDirection: 'column', gap: '12px', padding: '15px' }}>
                {filteredSolicitudes.map((s) => {
                  const ticketCode = 'TK-' + String(s.id).padStart(5, '0');
                  const isMenuOpen = activeMobileMenuId === s.id;
                  
                  return (
                    <div 
                      key={s.id} 
                      className="solicitud-card-mobile" 
                      style={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '12px', 
                        padding: '16px', 
                        border: '1.5px solid #e8ddd4', 
                        boxShadow: '0 2px 6px rgba(44, 24, 16, 0.04)',
                        position: 'relative'
                      }}
                    >
                      {/* Ticket Code and Triple Dot Menu button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--color-primary-dark)', textDecoration: 'underline' }}>
                          {ticketCode}
                        </span>
                        
                        {(userRole === 1 || userRole === 2 || userRole === 4 || userRole === 9) && (
                          <div style={{ position: 'relative' }}>
                            <button 
                              onClick={() => setActiveMobileMenuId(isMenuOpen ? null : s.id)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                fontSize: '1.3rem', 
                                color: '#777', 
                                cursor: 'pointer',
                                padding: '4px 8px'
                              }}
                            >
                              ⋮
                            </button>

                            {/* Mobile actions popover */}
                            {isMenuOpen && (
                              <div 
                                style={{ 
                                  position: 'absolute', 
                                  right: '0', 
                                  top: '25px', 
                                  backgroundColor: '#fff', 
                                  borderRadius: '8px', 
                                  border: '1px solid #e8ddd4', 
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                  zIndex: 10,
                                  minWidth: '140px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  overflow: 'hidden'
                                }}
                              >
                                {s.estado === 'pendiente' ? (
                                  <>
                                    <button 
                                      onClick={() => { setActiveMobileMenuId(null); handleScheduleRedirect(s); }}
                                      style={{ padding: '10px 14px', textAlign: 'left', border: 'none', background: 'none', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                    >
                                      Programar Visita
                                    </button>
                                    <button 
                                      onClick={() => { setActiveMobileMenuId(null); handleRejectRequest(s.id); }}
                                      style={{ padding: '10px 14px', textAlign: 'left', border: 'none', background: 'none', fontSize: '0.8rem', fontWeight: 'bold', color: 'red', cursor: 'pointer' }}
                                    >
                                      Rechazar
                                    </button>
                                  </>
                                ) : (
                                  <div style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#aaa', fontStyle: 'italic' }}>Sin acciones</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card contents details */}
                      <div style={{ fontSize: '0.85rem', color: '#555', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                        <div><strong>POS:</strong> {s.pdv_nombre}</div>
                        <div><strong>Área:</strong> {s.area_nombre}</div>
                        <div><strong>Fallo:</strong> {s.titulo}</div>
                        <div style={{ fontSize: '0.78rem', color: '#777', marginTop: '4px', fontStyle: 'italic' }}>"{s.descripcion}"</div>
                      </div>

                      {/* Badges footer */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`urgency-badge ${s.urgencia}`} style={{ padding: '4px 8px', borderRadius: '15px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {s.urgencia === 'urgente' ? '🚨 URGENTE' : '📋 REVISAR'}
                        </span>
                        <span className={`status-pill ${s.estado}`} style={{ fontSize: '0.7rem' }}>
                          {s.estado === 'pendiente' && '⏳ Pendiente'}
                          {s.estado === 'programada' && '📅 Programada'}
                          {s.estado === 'rechazada' && '❌ Rechazada'}
                          {s.estado === 'cerrada' && '✓ Cerrada'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="card text-center text-muted py-8 shadow-sm" style={{ border: 'none', margin: '20px' }}>
              <p>{searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No se registran requerimientos de soporte pendientes.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal for PDVs */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content card shadow-md animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>📝 Nuevo Requerimiento de Soporte</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="card-body modal-scrollable-body">
              
              {submitError && <div className="error-alert">{submitError}</div>}

              <form onSubmit={handleCreateRequest} className="request-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="request-area">1. Área Responsable</label>
                  <select
                    id="request-area"
                    className="form-select"
                    value={formAreaId}
                    onChange={(e) => setFormAreaId(e.target.value)}
                    required
                  >
                    {technicalAreas.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="request-title">2. Asunto / Falla</label>
                  <input
                    id="request-title"
                    type="text"
                    className="form-input"
                    placeholder="Ej: Impresora de pedidos no enciende"
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="request-desc">3. Descripción Detallada del Problema</label>
                  <textarea
                    id="request-desc"
                    className="form-textarea"
                    placeholder="Describa qué sucede, marcas de equipos si aplica y desde cuándo ocurre..."
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="request-urgencia">4. Prioridad / Urgencia</label>
                  <select
                    id="request-urgencia"
                    className="form-select"
                    value={formUrgencia}
                    onChange={(e) => setFormUrgencia(e.target.value)}
                    required
                  >
                    <option value="revisar">📋 Rutina (Para revisar pronto)</option>
                    <option value="urgente">🚨 URGENTE (Impide operación)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={submitLoading}>
                  {submitLoading ? 'Enviando requerimiento...' : 'Enviar Solicitud de Soporte'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '380px', padding: 'var(--spacing-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>❓</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-primary-dark)', margin: '10px 0' }}>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })}
                style={{ minWidth: '100px' }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={confirmModal.onConfirm}
                style={{ minWidth: '100px', backgroundColor: 'var(--color-red)' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Notification Alert Modal */}
      {alertModal.show && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '380px', padding: 'var(--spacing-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
              {alertModal.type === 'success' ? '✅' : '❌'}
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-primary-dark)', margin: '10px 0' }}>
              {alertModal.title}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
              {alertModal.message}
            </p>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => setAlertModal({ show: false, title: '', message: '', type: 'success' })}
              style={{ minWidth: '120px', alignSelf: 'center' }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .solicitudes-page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .header-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .solicitudes-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }

        .solicitudes-table th, .solicitudes-table td {
          padding: 12px var(--spacing-md);
          border-bottom: 1px solid var(--color-border-light);
        }

        .solicitudes-table th {
          background-color: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .table-responsive { overflow-x: auto; }
        .px-0 { padding-left: 0 !important; padding-right: 0 !important; }
        .py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
        .font-semibold { font-weight: 600; }
        .italic { font-style: italic; }
        .text-xs { font-size: 0.75rem; }

        .area-color-tag {
          border-left: 4px solid #6B3A2A;
          padding-left: 8px;
          font-weight: 600;
        }

        .urgency-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 700;
        }

        .urgency-badge.urgente { background-color: #FEE2E2; color: #991B1B; }
        .urgency-badge.revisar { background-color: #FEF3C7; color: #D97706; }

        .status-pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 600;
        }

        .status-pill.pendiente { background-color: #DBEAFE; color: #1E40AF; }
        .status-pill.programada { background-color: #D1FAE5; color: #065F46; }
        .status-pill.rechazada { background-color: #FEE2E2; color: #991B1B; }

        .action-buttons-group {
          display: flex;
          gap: 6px;
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

        .request-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
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

        .mobile-search-wrapper {
          display: none;
        }

        /* Mobile responsive overrides for solicitudes */
        @media (max-width: 767px) {
          .desktop-only-table {
            display: none !important;
          }
          
          .desktop-search-input {
            display: none !important;
          }

          .mobile-search-wrapper {
            display: block !important;
          }

          .mobile-only-cards {
            display: flex !important;
          }

          .header-actions-row {
            flex-direction: column;
            align-items: stretch !important;
            gap: var(--spacing-md);
          }

          .stats-badges-container {
            justify-content: space-between;
            width: 100%;
          }

          .stat-badge-card {
            flex: 1;
            min-width: 75px !important;
            padding: 6px 8px !important;
          }
          
          .stat-badge-card .stat-val {
            font-size: 1.05rem !important;
          }

          .modal-content {
            max-width: 100% !important;
            margin: 0 var(--spacing-xs);
          }

          .modal-scrollable-body {
            max-height: calc(95vh - 60px);
          }
        }
      `}</style>
    </div>
  );
}
