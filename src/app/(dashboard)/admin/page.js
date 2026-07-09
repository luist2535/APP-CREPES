'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AdminContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'usuarios');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Mockup redesign states
  const [activeActionMenuUserId, setActiveActionMenuUserId] = useState(null);
  const [roleFilterDropdownOpen, setRoleFilterDropdownOpen] = useState(false);

  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setActiveActionMenuUserId(null);
      }
      if (!e.target.closest('.mobile-role-filter-container')) {
        setRoleFilterDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);
  
  // Lists
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [areas, setAreas] = useState([]);
  const [searchTermUser, setSearchTermUser] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  
  // Custom Role Permissions States
  const [rolesPermisosData, setRolesPermisosData] = useState({
    defaultPermissions: {},
    customPermissions: [],
    modules: []
  });
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState(null);
  const [savingPermissionKey, setSavingPermissionKey] = useState(null);
  
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

  // Form Toggles
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingPdv, setEditingPdv] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // SMTP Mail Server States
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSuccess, setSmtpSuccess] = useState('');
  const [smtpError, setSmtpError] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(false);

  // Form Fields - User
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('admin123');
  const [userRolId, setUserRolId] = useState('');
  const [userCiudadId, setUserCiudadId] = useState('');
  const [userPdvId, setUserPdvId] = useState('');

  // Form Fields - PDV
  const [pdvName, setPdvName] = useState('');
  const [pdvCiudadId, setPdvCiudadId] = useState('');
  const [pdvDireccion, setPdvDireccion] = useState('');
  const [pdvApertura, setPdvApertura] = useState('08:00');
  const [pdvCierre, setPdvCierre] = useState('22:00');

  // Form Fields - Ciudad
  const [ciudadName, setCiudadName] = useState('');

  // Form Fields - Area
  const [areaName, setAreaName] = useState('');
  const [areaDesc, setAreaDesc] = useState('');
  const [areaColor, setAreaColor] = useState('#8B6914');

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load users, roles, cities
      const resUsers = await fetch('/api/users');
      if (!resUsers.ok) throw new Error('Error al cargar datos administrativos');
      const dataUsers = await resUsers.json();
      setUsers(dataUsers.users);
      setRoles(dataUsers.roles);
      setCiudades(dataUsers.ciudades);
      
      if (dataUsers.roles.length > 0) setUserRolId(String(dataUsers.roles[0].id));
      if (dataUsers.ciudades.length > 0) {
        setUserCiudadId(String(dataUsers.ciudades[0].id));
        setPdvCiudadId(String(dataUsers.ciudades[0].id));
      }

      // Load PDVs
      const resPdvs = await fetch('/api/pdv');
      if (resPdvs.ok) {
        const dataPdvs = await resPdvs.json();
        setPdvs(dataPdvs.pdvs);
      }

      // Load Areas
      const resVisitas = await fetch('/api/visitas');
      if (resVisitas.ok) {
        const dataVisitas = await resVisitas.json();
        setAreas(dataVisitas.areas);
      }

      // Load Roles & Permisos Adicionales
      const resRolesPerm = await fetch('/api/roles-permisos');
      if (resRolesPerm.ok) {
        const dataRP = await resRolesPerm.json();
        setRolesPermisosData({
          defaultPermissions: dataRP.defaultPermissions || {},
          customPermissions: dataRP.customPermissions || [],
          modules: dataRP.modules || []
        });
        if (dataUsers.roles && dataUsers.roles.length > 0 && !selectedRoleForPermissions) {
          const defaultRole = dataUsers.roles.find(r => r.id !== 1) || dataUsers.roles[0];
          setSelectedRoleForPermissions(defaultRole.id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCustomPermission = async (rolId, moduloKey, newStatus) => {
    try {
      setSavingPermissionKey(`${rolId}-${moduloKey}`);
      const res = await fetch('/api/roles-permisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol_id: rolId, modulo: moduloKey, permitido: newStatus })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar permiso');
      }
      // Refresh custom permissions
      const resRolesPerm = await fetch('/api/roles-permisos');
      if (resRolesPerm.ok) {
        const dataRP = await resRolesPerm.json();
        setRolesPermisosData({
          defaultPermissions: dataRP.defaultPermissions || {},
          customPermissions: dataRP.customPermissions || [],
          modules: dataRP.modules || []
        });
      }
      setAlertModal({
        isOpen: true,
        title: '✅ Permiso actualizado',
        message: `El permiso ha sido ${newStatus ? 'habilitado' : 'desactivado'} para este rol.`,
        type: 'success'
      });
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: '❌ Error',
        message: err.message,
        type: 'error'
      });
    } finally {
      setSavingPermissionKey(null);
    }
  };


  const fetchSmtpSettings = async () => {
    try {
      const res = await fetch('/api/admin/email-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSmtpHost(data.settings.smtp_host || 'smtp.gmail.com');
          setSmtpPort(parseInt(data.settings.smtp_port) || 587);
          setSmtpUser(data.settings.smtp_user || '');
          setSmtpPass(data.settings.smtp_pass || '');
        }
      }
    } catch (e) {
      console.error('Error fetching SMTP settings:', e);
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSmtpError('');
    setSmtpSuccess('');
    setSmtpLoading(true);

    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar configuraciones');

      setSmtpSuccess('Configuración de correo guardada con éxito.');
      setTimeout(() => setSmtpSuccess(''), 3000);
    } catch (err) {
      setSmtpError(err.message);
    } finally {
      setSmtpLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    fetchSmtpSettings();
  }, []);

  const handleToggleActive = async (entity, id, currentStatus) => {
    try {
      const field = entity === 'ciudad' || entity === 'area' ? 'activa' : 'activo';
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity,
          id,
          data: { [field]: !currentStatus },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar registro');
      }

      loadAllData();
    } catch (err) {
      triggerAlert('Error', err.message, 'error');
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setEditingPdv(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('admin123');
    setUserPdvId('');
    setPdvName('');
    setPdvCiudadId(ciudades.length > 0 ? String(ciudades[0].id) : '');
    setPdvDireccion('');
    setPdvApertura('08:00');
    setPdvCierre('22:00');
    setFormError('');
    setFormSuccess('');
  };

  const handleEditUserClick = (user) => {
    setEditingUser(user);
    setUserName(user.nombre);
    setUserEmail(user.email);
    setUserRolId(String(user.rol_id));
    setUserCiudadId(user.ciudad_id ? String(user.ciudad_id) : '');
    setUserPdvId(user.pdv_id ? String(user.pdv_id) : '');
    setActiveTab('usuarios');
    setShowAddForm(true);
  };

  const handleEditPdvClick = (pdv) => {
    setEditingPdv(pdv);
    setPdvName(pdv.nombre);
    setPdvCiudadId(String(pdv.ciudad_id));
    setPdvDireccion(pdv.direccion || '');
    setPdvApertura(pdv.hora_apertura || '08:00');
    setPdvCierre(pdv.hora_cierre || '22:00');
    setActiveTab('pdvs');
    setShowAddForm(true);
  };

  const proceedDeletePdv = async (id) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin?entity=pdv&id=${id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar Punto de Venta');
      
      triggerAlert('Éxito', data.message || 'Punto de Venta eliminado con éxito', 'success');
      loadAllData();
    } catch (err) {
      triggerAlert('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePdv = (id, name) => {
    triggerConfirm(
      'Eliminar Punto de Venta',
      `¿Estás seguro de que deseas eliminar permanentemente el Punto de Venta "${name}"? Esta acción no se puede deshacer.`,
      () => proceedDeletePdv(id)
    );
  };

  const proceedDeleteUser = async (id) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin?entity=user&id=${id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario');
      
      triggerAlert('Éxito', data.message || 'Usuario eliminado con éxito', 'success');
      loadAllData();
    } catch (err) {
      triggerAlert('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (id, name) => {
    triggerConfirm(
      'Eliminar Usuario',
      `¿Estás seguro de que deseas eliminar permanentemente al usuario "${name}"? Esta acción no se puede deshacer.`,
      () => proceedDeleteUser(id)
    );
  };

  const handleCreateEntity = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      let payloadData = {};
      if (activeTab === 'usuarios') {
        if (editingUser) {
          payloadData = {
            nombre: userName,
            email: userEmail,
            rol_id: parseInt(userRolId),
            ciudad_id: userCiudadId ? parseInt(userCiudadId) : null,
            pdv_id: userPdvId ? parseInt(userPdvId) : null,
          };
        } else {
          payloadData = {
            nombre: userName,
            email: userEmail,
            password: userPassword,
            rol_id: parseInt(userRolId),
            ciudad_id: userCiudadId ? parseInt(userCiudadId) : null,
            pdv_id: userPdvId ? parseInt(userPdvId) : null,
          };
        }
      } else if (activeTab === 'pdvs') {
        payloadData = {
          nombre: pdvName,
          ciudad_id: parseInt(pdvCiudadId),
          direccion: pdvDireccion,
          hora_apertura: pdvApertura,
          hora_cierre: pdvCierre,
        };
      } else if (activeTab === 'ciudades') {
        payloadData = {
          nombre: ciudadName,
        };
      } else if (activeTab === 'areas') {
        payloadData = {
          nombre: areaName,
          descripcion: areaDesc,
          color: areaColor,
        };
      }

      const isEditing = (activeTab === 'usuarios' && editingUser) || (activeTab === 'pdvs' && editingPdv);
      const entityName = activeTab === 'pdvs' ? 'pdv' : activeTab.slice(0, -1); // 'usuarios' -> 'user', 'ciudades' -> 'ciudad'
      
      const body = {
        entity: entityName === 'usuario' ? 'user' : entityName,
        data: payloadData,
      };
      if (isEditing) {
        body.id = activeTab === 'usuarios' ? editingUser.id : editingPdv.id;
      }

      const res = await fetch('/api/admin', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Error al guardar registro');

      setFormSuccess(resData.message || 'Registro guardado exitosamente');
      
      // Reset fields
      handleCloseForm();
      loadAllData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Cargando panel de administración...</p>
        <style jsx>{`
          .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; }
          .spinner { width: 40px; height: 40px; border: 4px solid var(--color-bg-secondary); border-top: 4px solid var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.nombre || '').toLowerCase().includes(searchTermUser.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTermUser.toLowerCase());
    const matchesRole = selectedRoleFilter === 'all' || String(u.rol_id) === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const getSelectedRoleName = () => {
    if (selectedRoleFilter === 'all') return `Todos (${users.length})`;
    const activeRole = roles.find(r => String(r.id) === selectedRoleFilter);
    const count = users.filter(u => String(u.rol_id) === selectedRoleFilter).length;
    return activeRole ? `${activeRole.nombre} (${count})` : 'Filtrar por Rol';
  };

  return (
    <div className="admin-page-container">
      {error && <div className="card error-card"><div className="card-body">❌ {error}</div></div>}

      {/* Tabs */}
      <div className="tabs-header">
        <button className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => { setActiveTab('usuarios'); handleCloseForm(); }}>
          👤 Gestión Usuarios
        </button>
        <button className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => { setActiveTab('roles'); handleCloseForm(); }}>
          🛡️ Roles y Permisos
        </button>
        <button className={`tab-btn ${activeTab === 'pdvs' ? 'active' : ''}`} onClick={() => { setActiveTab('pdvs'); handleCloseForm(); }}>
          🏪 Gestión PDVs
        </button>
        <button className={`tab-btn ${activeTab === 'ciudades' ? 'active' : ''}`} onClick={() => { setActiveTab('ciudades'); handleCloseForm(); }}>
          📍 Ciudades
        </button>
        <button className={`tab-btn ${activeTab === 'areas' ? 'active' : ''}`} onClick={() => { setActiveTab('areas'); handleCloseForm(); }}>
          📂 Áreas de Inspección
        </button>
        <button className={`tab-btn ${activeTab === 'correo' ? 'active' : ''}`} onClick={() => { setActiveTab('correo'); handleCloseForm(); }}>
          📧 Configuración de Correo
        </button>
      </div>

      <div className="admin-actions-row">
        <h3>
          {activeTab === 'usuarios' && 'Lista de Usuarios'}
          {activeTab === 'roles' && 'Asignación Granular y Personalizada de Permisos por Rol'}
          {activeTab === 'pdvs' && 'Lista de Puntos de Venta (PDVs)'}
          {activeTab === 'ciudades' && 'Lista de Ciudades'}
          {activeTab === 'areas' && 'Áreas Funcionales'}
          {activeTab === 'correo' && 'Configuración de Servidor de Correo (SMTP)'}
        </h3>
        {!showAddForm && activeTab !== 'correo' && activeTab !== 'roles' && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingUser(null); setEditingPdv(null); setShowAddForm(true); }}>
            + Agregar Nuevo
          </button>
        )}
      </div>

      {activeTab !== 'correo' && (
        <div className="admin-layout-grid">
          
          {/* Left/Main Column: Data table list */}
          <div className="admin-list-col">
            <div className="card shadow-md">
              <div className="card-body px-0 py-0">
                               {activeTab === 'usuarios' && (
                  <div>
                    {/* Search & Filter Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-bg-primary)' }}>
                      <div className="search-input-wrapper">
                        <span className="search-icon-left">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          className="form-input search-input-styled"
                          placeholder="Buscar usuario por nombre o correo..."
                          value={searchTermUser}
                          onChange={(e) => setSearchTermUser(e.target.value)}
                        />
                        <span className="search-chevron-right">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </span>
                      </div>

                      {/* Desktop chips filter */}
                      <div className="desktop-role-filter" style={{ gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginRight: '4px' }}>Filtrar por Rol:</span>
                        <button
                          type="button"
                          className={`filter-chip ${selectedRoleFilter === 'all' ? 'active' : ''}`}
                          onClick={() => setSelectedRoleFilter('all')}
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          Todos ({users.length})
                        </button>
                        {roles.map(r => {
                          const count = users.filter(u => u.rol_id === r.id).length;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              className={`filter-chip ${selectedRoleFilter === String(r.id) ? 'active' : ''}`}
                              onClick={() => setSelectedRoleFilter(String(r.id))}
                              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            >
                              {r.nombre} <span className="filter-chip-count">{count}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Mobile custom role filter accordion */}
                      <div className="mobile-role-filter">
                        <div className="mobile-role-filter-container">
                          <span className="mobile-role-filter-label">Filtrar por Rol:</span>
                          <button 
                            type="button" 
                            className="mobile-role-filter-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleFilterDropdownOpen(!roleFilterDropdownOpen);
                            }}
                          >
                            <span>{getSelectedRoleName()}</span>
                            <span className="chevron-icon">
                              {roleFilterDropdownOpen ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="18 15 12 9 6 15" />
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              )}
                            </span>
                          </button>
                          {roleFilterDropdownOpen && (
                            <div className="mobile-role-filter-dropdown">
                              <button
                                type="button"
                                className={`mobile-role-filter-option ${selectedRoleFilter === 'all' ? 'active' : ''}`}
                                onClick={() => {
                                  setSelectedRoleFilter('all');
                                  setRoleFilterDropdownOpen(false);
                                }}
                              >
                                <span>Todos</span>
                                <span className="mobile-role-filter-count">{users.length}</span>
                              </button>
                              {roles.map(r => {
                                const count = users.filter(u => u.rol_id === r.id).length;
                                return (
                                  <button
                                    key={r.id}
                                    type="button"
                                    className={`mobile-role-filter-option ${selectedRoleFilter === String(r.id) ? 'active' : ''}`}
                                    onClick={() => {
                                      setSelectedRoleFilter(String(r.id));
                                      setRoleFilterDropdownOpen(false);
                                    }}
                                  >
                                    <span>{r.nombre}</span>
                                    <span className="mobile-role-filter-count">{count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop View: Table */}
                    <div className="desktop-only-table table-responsive">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Ciudad Asignada</th>
                            <th>Estado</th>
                            <th>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map((u) => (
                              <tr key={u.id} className={!u.activo ? 'row-inactive' : ''}>
                                <td className="font-semibold">{u.nombre}</td>
                                <td>{u.email}</td>
                                <td><span className="admin-role-badge">{u.rol_nombre}</span></td>
                                <td>{u.ciudad_nombre || 'Nivel Nacional'}</td>
                                <td>
                                  <span className={`status-dot-pill ${u.activo ? 'active' : 'inactive'}`}>
                                    <span className="dot"></span>
                                    {u.activo ? 'Activo' : 'Inactivo'}
                                  </span>
                                </td>
                                <td>
                                  <div className="action-menu-container">
                                    <button 
                                      type="button" 
                                      className="action-menu-trigger" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionMenuUserId(activeActionMenuUserId === u.id ? null : u.id);
                                      }}
                                    >
                                      •••
                                    </button>
                                    {activeActionMenuUserId === u.id && (
                                      <div className="action-menu-dropdown">
                                        <button 
                                          type="button" 
                                          className="action-menu-item"
                                          onClick={() => {
                                            handleEditUserClick(u);
                                            setActiveActionMenuUserId(null);
                                          }}
                                        >
                                          <svg viewBox="0 0 24 24">
                                            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                          </svg>
                                          Editar
                                        </button>
                                        <button 
                                          type="button" 
                                          className="action-menu-item"
                                          onClick={() => {
                                            handleToggleActive('user', u.id, u.activo);
                                            setActiveActionMenuUserId(null);
                                          }}
                                          disabled={u.id === 1}
                                        >
                                          <svg viewBox="0 0 24 24">
                                            {u.activo ? (
                                              <>
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="15" y1="9" x2="9" y2="15" />
                                                <line x1="9" y1="9" x2="15" y2="15" />
                                              </>
                                            ) : (
                                              <>
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                              </>
                                            )}
                                          </svg>
                                          {u.activo ? 'Desactivar' : 'Activar'}
                                        </button>
                                        <button 
                                          type="button" 
                                          className="action-menu-item danger"
                                          onClick={() => {
                                            handleDeleteUser(u.id, u.nombre);
                                            setActiveActionMenuUserId(null);
                                          }}
                                          disabled={u.id === 1}
                                        >
                                          <svg viewBox="0 0 24 24">
                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                                          </svg>
                                          Eliminar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                                No se encontraron usuarios que coincidan con la búsqueda.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="mobile-only-cards" style={{ padding: 'var(--spacing-md)' }}>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => (
                          <div key={u.id} className={`user-mobile-card ${!u.activo ? 'row-inactive' : ''}`}>
                            <div className="user-mobile-card-header">
                              <div>
                                <div className="user-mobile-card-title">{u.nombre}</div>
                                <div className="user-mobile-card-badges">
                                  <span className="admin-role-badge">{u.rol_nombre}</span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                    {u.ciudad_nombre || 'Nivel Nacional'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Actions Dropdown for Mobile Card */}
                              <div className="action-menu-container">
                                <button 
                                  type="button" 
                                  className="action-menu-trigger" 
                                  style={{ border: 'none', background: 'transparent', width: '24px', height: '24px', fontSize: '1.2rem' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenuUserId(activeActionMenuUserId === u.id ? null : u.id);
                                  }}
                                >
                                  ⋮
                                </button>
                                {activeActionMenuUserId === u.id && (
                                  <div className="action-menu-dropdown" style={{ right: 0, top: '24px' }}>
                                    <button 
                                      type="button" 
                                      className="action-menu-item"
                                      onClick={() => {
                                        handleEditUserClick(u);
                                        setActiveActionMenuUserId(null);
                                      }}
                                    >
                                      <svg viewBox="0 0 24 24">
                                        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                      </svg>
                                      Editar
                                    </button>
                                    <button 
                                      type="button" 
                                      className="action-menu-item"
                                      onClick={() => {
                                        handleToggleActive('user', u.id, u.activo);
                                        setActiveActionMenuUserId(null);
                                      }}
                                      disabled={u.id === 1}
                                    >
                                      <svg viewBox="0 0 24 24">
                                        {u.activo ? (
                                          <>
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="15" y1="9" x2="9" y2="15" />
                                            <line x1="9" y1="9" x2="15" y2="15" />
                                          </>
                                        ) : (
                                          <>
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                          </>
                                        )}
                                      </svg>
                                      {u.activo ? 'Desactivar' : 'Activar'}
                                    </button>
                                    <button 
                                      type="button" 
                                      className="action-menu-item danger"
                                      onClick={() => {
                                        handleDeleteUser(u.id, u.nombre);
                                        setActiveActionMenuUserId(null);
                                      }}
                                      disabled={u.id === 1}
                                    >
                                      <svg viewBox="0 0 24 24">
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                                      </svg>
                                      Eliminar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="user-mobile-card-info">
                              <div><strong>Email:</strong> {u.email}</div>
                            </div>
                            
                            <div className="user-mobile-card-status-row">
                              <div>Estado:</div>
                              <span className={`status-dot-pill ${u.activo ? 'active' : 'inactive'}`}>
                                <span className="dot"></span>
                                {u.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                          No se encontraron usuarios que coincidan con la búsqueda.
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'pdvs' && (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Nombre PDV</th>
                          <th>Ciudad</th>
                          <th>Dirección</th>
                          <th>Horario</th>
                          <th>Estado</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pdvs.map((p) => (
                          <tr key={p.id} className={!p.activo ? 'row-inactive' : ''}>
                            <td className="font-semibold">{p.nombre}</td>
                            <td>{p.ciudad_nombre}</td>
                            <td>{p.direccion || 'Sin dirección'}</td>
                            <td>{p.hora_apertura} - {p.hora_cierre}</td>
                            <td>
                              <span className={`status-dot-pill ${p.activo ? 'active' : 'inactive'}`}>
                                <span className="dot"></span>
                                {p.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              <button 
                                className={`btn btn-sm ${p.activo ? 'btn-danger' : 'btn-success'}`}
                                onClick={() => handleToggleActive('pdv', p.id, p.activo)}
                                title={p.activo ? 'Desactivar Punto de Venta' : 'Activar Punto de Venta'}
                              >
                                {p.activo ? 'Desactivar 🔒' : 'Activar 🔓'}
                              </button>
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => handleEditPdvClick(p)}
                                title="Editar datos del PDV"
                              >
                                Editar ✏️
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeletePdv(p.id, p.nombre)}
                                title="Eliminar permanentemente"
                              >
                                Eliminar 🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Cities Table */}
                {activeTab === 'ciudades' && (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Ciudad</th>
                          <th>Estado</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ciudades.map((c) => (
                          <tr key={c.id} className={!c.activa ? 'row-inactive' : ''}>
                            <td>{c.id}</td>
                            <td className="font-semibold">{c.nombre}</td>
                            <td>
                              <span className={`status-dot-pill ${c.activa ? 'active' : 'inactive'}`}>
                                <span className="dot"></span>
                                {c.activa ? 'Activa' : 'Inactiva'}
                              </span>
                            </td>
                            <td>
                              <button 
                                className={`btn btn-sm ${c.activa ? 'btn-danger' : 'btn-success'}`}
                                onClick={() => handleToggleActive('ciudad', c.id, c.activa)}
                              >
                                {c.activa ? 'Desactivar' : 'Activar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Areas Table */}
                {activeTab === 'areas' && (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Nombre Área</th>
                          <th>Descripción</th>
                          <th>Tipo Flujo</th>
                          <th>Estado</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {areas.map((a) => (
                          <tr key={a.id} className={!a.activa ? 'row-inactive' : ''}>
                            <td className="font-semibold">
                              <span className="area-indicator-color-dot" style={{ backgroundColor: a.color }}></span>
                              {a.nombre}
                            </td>
                            <td>{a.descripcion || 'Sin descripción'}</td>
                            <td>
                              <span className={`admin-role-badge`} style={{ backgroundColor: a.tipo_flujo === 'tecnico' ? '#E0F2FE' : '#F3E8FF' }}>
                                {a.tipo_flujo.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <span className={`status-dot-pill ${a.activa ? 'active' : 'inactive'}`}>
                                <span className="dot"></span>
                                {a.activa ? 'Activa' : 'Inactiva'}
                              </span>
                            </td>
                            <td>
                              <button 
                                className={`btn btn-sm ${a.activa ? 'btn-danger' : 'btn-success'}`}
                                onClick={() => handleToggleActive('area', a.id, a.activa)}
                              >
                                {a.activa ? 'Desactivar' : 'Activar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Right/Secondary Column: Add New Form */}
          {showAddForm && (
            <div className="admin-form-col">
              <div className="card shadow-md">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4>
                    {activeTab === 'usuarios' && editingUser ? '✏️ Editar USUARIO' : 
                     activeTab === 'pdvs' && editingPdv ? '✏️ Editar PUNTO DE VENTA' : 
                     `➕ Crear ${activeTab.slice(0, -1).toUpperCase()}`}
                  </h4>
                  <button className="modal-close-btn" style={{ fontSize: '1.2rem' }} onClick={handleCloseForm}>×</button>
                </div>
                <div className="card-body">
                  {formError && <div className="error-alert">{formError}</div>}
                  {formSuccess && <div className="success-alert">{formSuccess}</div>}

                  <form onSubmit={handleCreateEntity} className="admin-create-form">
                    
                    {/* User fields */}
                    {activeTab === 'usuarios' && (
                      <>
                        <div className="form-group">
                          <label className="form-label" htmlFor="user-name">Nombre Completo</label>
                          <input
                            id="user-name"
                            type="text"
                            className="form-input"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="user-email">Correo Electrónico</label>
                          <input
                            id="user-email"
                            type="email"
                            className="form-input"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            required
                          />
                        </div>
                        {!editingUser && (
                          <div className="form-group">
                            <label className="form-label" htmlFor="user-pass">Contraseña</label>
                            <input
                              id="user-pass"
                              type="password"
                              className="form-input"
                              value={userPassword}
                              onChange={(e) => setUserPassword(e.target.value)}
                              required
                            />
                          </div>
                        )}
                        <div className="form-group">
                          <label className="form-label" htmlFor="user-rol">Rol asignado</label>
                          <select
                            id="user-rol"
                            className="form-select"
                            value={userRolId}
                            onChange={(e) => setUserRolId(e.target.value)}
                            required
                          >
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="user-ciudad">Ciudad de Operación (Opcional)</label>
                          <select
                            id="user-ciudad"
                            className="form-select"
                            value={userCiudadId}
                            onChange={(e) => setUserCiudadId(e.target.value)}
                          >
                            <option value="">Nivel Nacional</option>
                            {ciudades.map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="user-pdv">Punto de Venta Asignado (Opcional)</label>
                          <select
                            id="user-pdv"
                            className="form-select"
                            value={userPdvId}
                            onChange={(e) => setUserPdvId(e.target.value)}
                          >
                            <option value="">Ninguno</option>
                            {pdvs.map(p => (
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {/* PDV Fields */}
                    {activeTab === 'pdvs' && (
                      <>
                        <div className="form-group">
                          <label className="form-label" htmlFor="pdv-name">Nombre del PDV</label>
                          <input
                            id="pdv-name"
                            type="text"
                            className="form-input"
                            value={pdvName}
                            onChange={(e) => setPdvName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="pdv-ciudad">Ciudad</label>
                          <select
                            id="pdv-ciudad"
                            className="form-select"
                            value={pdvCiudadId}
                            onChange={(e) => setPdvCiudadId(e.target.value)}
                            required
                          >
                            {ciudades.map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="pdv-dir">Dirección física</label>
                          <input
                            id="pdv-dir"
                            type="text"
                            className="form-input"
                            value={pdvDireccion}
                            onChange={(e) => setPdvDireccion(e.target.value)}
                          />
                        </div>
                        <div className="form-row-split">
                          <div className="form-group">
                            <label className="form-label" htmlFor="pdv-apertura">Apertura</label>
                            <input
                              id="pdv-apertura"
                              type="time"
                              className="form-input"
                              value={pdvApertura}
                              onChange={(e) => setPdvApertura(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="pdv-cierre">Cierre</label>
                            <input
                              id="pdv-cierre"
                              type="time"
                              className="form-input"
                              value={pdvCierre}
                              onChange={(e) => setPdvCierre(e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Ciudad Fields */}
                    {activeTab === 'ciudades' && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="ciudad-name">Nombre de la Ciudad</label>
                        <input
                          id="ciudad-name"
                          type="text"
                          className="form-input"
                          placeholder="Ej: Barranquilla"
                          value={ciudadName}
                          onChange={(e) => setCiudadName(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {/* Area Fields */}
                    {activeTab === 'areas' && (
                      <>
                        <div className="form-group">
                          <label className="form-label" htmlFor="area-name">Nombre del Área</label>
                          <input
                            id="area-name"
                            type="text"
                            className="form-input"
                            placeholder="Ej: Sistemas"
                            value={areaName}
                            onChange={(e) => setAreaName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="area-desc">Descripción</label>
                          <textarea
                            id="area-desc"
                            className="form-textarea"
                            placeholder="Breve descripción de las funciones..."
                            value={areaDesc}
                            onChange={(e) => setAreaDesc(e.target.value)}
                          ></textarea>
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="area-color">Color identificativo</label>
                          <input
                            id="area-color"
                            type="color"
                            className="form-input"
                            value={areaColor}
                            onChange={(e) => setAreaColor(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    <button type="submit" className="btn btn-primary btn-block" disabled={formLoading}>
                      {formLoading ? 'Guardando...' : 
                       (activeTab === 'usuarios' && editingUser ? 'Actualizar Usuario' : 
                        activeTab === 'pdvs' && editingPdv ? 'Actualizar Punto de Venta' : 
                        `Guardar ${activeTab.slice(0, -1)}`)}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SMTP Email Settings Form */}
      {activeTab === 'correo' && (
        <div className="card shadow-md animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card-header">
            <h4>📧 Servidor de Correo Saliente (SMTP)</h4>
          </div>
          <div className="card-body">
            {smtpSuccess && <div className="success-alert">{smtpSuccess}</div>}
            {smtpError && <div className="error-alert">{smtpError}</div>}

            <form onSubmit={handleSaveSmtp} className="smtp-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="smtp-host">Host Servidor SMTP</label>
                <input
                  id="smtp-host"
                  type="text"
                  className="form-input"
                  placeholder="Ej: smtp.gmail.com o smtp.office365.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-split">
                <div className="form-group">
                  <label className="form-label" htmlFor="smtp-port">Puerto SMTP</label>
                  <input
                    id="smtp-port"
                    type="number"
                    className="form-input"
                    placeholder="Ej: 587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cifrado</label>
                  <select className="form-select" disabled value={smtpPort === 465 ? 'ssl' : 'tls'}>
                    <option value="tls">TLS / STARTTLS (Recomendado - 587)</option>
                    <option value="ssl">SSL implícito (Puerto 465)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="smtp-user">Correo Emisor (Cuenta de Envío)</label>
                <input
                  id="smtp-user"
                  type="email"
                  className="form-input"
                  placeholder="Ej: notificaciones@crepesenpunto.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="smtp-pass">Contraseña o Token de Aplicación</label>
                <input
                  id="smtp-pass"
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••••••"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                />
                <span className="text-muted italic" style={{ fontSize: '0.72rem', display: 'block', marginTop: '4px' }}>
                  Nota: Si utilizas cuentas de Outlook o Gmail con doble factor de autenticación (2FA), debes configurar una <strong>Contraseña de Aplicación</strong> y no tu contraseña personal regular.
                </span>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={smtpLoading}>
                {smtpLoading ? 'Guardando...' : 'Guardar Configuración 💾'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Roles & Custom Permissions Management Section */}
      {activeTab === 'roles' && (
        <div className="roles-permissions-section animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, #FAF6F0 0%, #F5EDE4 100%)', border: '1px solid #E8DDD4', borderRadius: '14px', padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ fontSize: '1.8rem' }}>🛡️</div>
              <div>
                <h4 style={{ margin: '0 0 6px 0', color: '#4A2518', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  Roles y Permisos Personalizados
                </h4>
                <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: '1.45' }}>
                  Selecciona un rol del sistema para administrar de manera granular y flexible sus funciones. Además de los <strong>permisos predefinidos</strong> de cada cargo, puedes usar los interruptores o casillas para <strong>habilitar o retirar accesos específicos</strong> sin necesidad de crear roles nuevos. Toda modificación queda registrada con fecha, hora y el administrador responsable.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Left Column: Roles Selector */}
            <div className="card" style={{ borderRadius: '14px', border: '1px solid #E8DDD4', overflow: 'hidden' }}>
              <div className="card-header" style={{ background: '#F8F4EE', padding: '14px 18px', borderBottom: '1px solid #E8DDD4' }}>
                <h5 style={{ margin: 0, color: '#4A2518', fontWeight: 'bold', fontSize: '0.95rem' }}>👥 Seleccionar Rol</h5>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '650px', overflowY: 'auto' }}>
                {roles.map((r) => {
                  const isSelected = selectedRoleForPermissions === r.id;
                  const isAdmin = r.id === 1;
                  const activeCustomCount = rolesPermisosData.customPermissions.filter(cp => cp.rol_id === r.id && cp.permitido).length;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoleForPermissions(r.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '12px 16px',
                        background: isSelected ? '#F2ECE6' : 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #F0EAE1',
                        borderLeft: isSelected ? '4px solid #6B3A2A' : '4px solid transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span style={{ fontWeight: isSelected ? 'bold' : '600', color: isSelected ? '#4A2518' : '#333', fontSize: '0.92rem' }}>
                          {r.nombre}
                        </span>
                        {isAdmin ? (
                          <span style={{ fontSize: '0.68rem', background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>Master</span>
                        ) : activeCustomCount > 0 ? (
                          <span style={{ fontSize: '0.68rem', background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                            +{activeCustomCount} extra
                          </span>
                        ) : null}
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#777', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: '1', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {r.descripcion || 'Sin descripción'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Permission Modules List */}
            <div className="card" style={{ borderRadius: '14px', border: '1px solid #E8DDD4', overflow: 'hidden' }}>
              {(() => {
                const currentRole = roles.find(r => r.id === selectedRoleForPermissions) || roles[0];
                if (!currentRole) return <div style={{ padding: '30px', textAlign: 'center', color: '#888' }}>Selecciona un rol para ver sus permisos</div>;
                const isAdmin = currentRole.id === 1;
                const defaultModules = rolesPermisosData.defaultPermissions[currentRole.id] || [];

                return (
                  <>
                    <div className="card-header" style={{ background: '#F8F4EE', padding: '16px 20px', borderBottom: '1px solid #E8DDD4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#4A2518', fontSize: '1.1rem', fontWeight: 'bold' }}>
                          Permisos del Rol: <span style={{ color: '#8B6914' }}>{currentRole.nombre}</span>
                        </h4>
                        <span style={{ fontSize: '0.82rem', color: '#666' }}>{currentRole.descripcion}</span>
                      </div>
                      {isAdmin && (
                        <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          👑 Acceso Total del Sistema
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {rolesPermisosData.modules.map((mod) => {
                        const isDefault = defaultModules.includes(mod.key);
                        const customEntry = rolesPermisosData.customPermissions.find(cp => cp.rol_id === currentRole.id && cp.modulo === mod.key);
                        const isCustomAllowed = customEntry ? Boolean(customEntry.permitido) : null;
                        
                        // Effective permission: if custom override exists, use it. Otherwise use default.
                        const isEffectiveAllowed = isAdmin ? true : (isCustomAllowed !== null ? isCustomAllowed : isDefault);
                        const isSavingThis = savingPermissionKey === `${currentRole.id}-${mod.key}`;

                        return (
                          <div
                            key={mod.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '16px 18px',
                              borderRadius: '12px',
                              border: isEffectiveAllowed ? '1px solid #86EFAC' : '1px solid #E5E7EB',
                              background: isEffectiveAllowed ? (isDefault && isCustomAllowed === null ? '#F9FAFBF6' : '#F0FDF4') : '#FAFAFA',
                              transition: 'all 0.2s ease',
                              gap: '16px',
                              flexWrap: 'wrap'
                            }}
                          >
                            {/* Module Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 240px' }}>
                              <div style={{ fontSize: '1.6rem', background: '#FFF', width: '46px', height: '46px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E8DDD4', flexShrink: 0 }}>
                                {mod.icon}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 'bold', color: '#333', fontSize: '0.98rem' }}>{mod.nombre}</span>
                                  {isDefault && (
                                    <span style={{ fontSize: '0.7rem', background: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                                      🛡️ Predefinido
                                    </span>
                                  )}
                                  {isCustomAllowed === true && !isDefault && (
                                    <span style={{ fontSize: '0.7rem', background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                      ➕ Concedido adicional
                                    </span>
                                  )}
                                  {isCustomAllowed === false && isDefault && (
                                    <span style={{ fontSize: '0.7rem', background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                      🚫 Retirado
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginTop: '3px' }}>{mod.desc}</span>
                              </div>
                            </div>

                            {/* Audit & Switch Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {/* Audit info */}
                              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#777', minWidth: '160px' }}>
                                {customEntry ? (
                                  <>
                                    <div style={{ color: '#4A2518', fontWeight: '600' }}>👤 {customEntry.otorgado_por}</div>
                                    <div>🕒 {new Date(customEntry.updated_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</div>
                                  </>
                                ) : isDefault ? (
                                  <span style={{ fontStyle: 'italic' }}>Nativo del cargo</span>
                                ) : (
                                  <span style={{ color: '#AAA' }}>Sin acceso</span>
                                )}
                              </div>

                              {/* Toggle Switch / Checkbox */}
                              {!isAdmin ? (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isSavingThis ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
                                  <div style={{ position: 'relative', width: '48px', height: '26px' }}>
                                    <input
                                      type="checkbox"
                                      checked={isEffectiveAllowed}
                                      disabled={isSavingThis}
                                      onChange={(e) => handleToggleCustomPermission(currentRole.id, mod.key, e.target.checked)}
                                      style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                    />
                                    <div style={{
                                      position: 'absolute',
                                      top: 0, left: 0, right: 0, bottom: 0,
                                      background: isEffectiveAllowed ? '#15803D' : '#D1D5DB',
                                      borderRadius: '26px',
                                      transition: 'background 0.2s ease'
                                    }}>
                                      <div style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: isEffectiveAllowed ? '25px' : '3px',
                                        width: '20px',
                                        height: '20px',
                                        background: '#FFF',
                                        borderRadius: '50%',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                        transition: 'left 0.2s ease'
                                      }} />
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isEffectiveAllowed ? '#15803D' : '#6B7280', minWidth: '76px' }}>
                                    {isSavingThis ? '⏳...' : (isEffectiveAllowed ? 'Habilitado' : 'Desactivado')}
                                  </span>
                                </label>
                              ) : (
                                <span style={{ fontSize: '0.82rem', color: '#92400E', fontWeight: 'bold', background: '#FEF3C7', padding: '4px 12px', borderRadius: '8px' }}>
                                  Siempre activo
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .tabs-header {
          display: flex;
          background: var(--color-bg-secondary);
          border-radius: var(--radius-xl);
          padding: 6px;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .tabs-header::-webkit-scrollbar {
          display: none;
        }

        .tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          padding: 10px 18px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .tab-btn:hover {
          color: var(--color-primary-dark);
        }

        .tab-btn.active {
          background: var(--color-primary);
          color: white;
          box-shadow: 0 4px 10px rgba(107, 58, 42, 0.2);
        }

        /* Search input wrapper and custom styles */
        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .search-input-styled {
          padding-left: 38px !important;
          padding-right: 38px !important;
          height: 40px;
          font-size: 0.85rem !important;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--color-border);
          background-color: var(--color-bg-card);
          width: 100%;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .search-input-styled:focus {
          border-color: var(--color-primary);
        }

        .search-icon-left {
          position: absolute;
          left: 12px;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .search-chevron-right {
          position: absolute;
          right: 12px;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        /* View toggles */
        .desktop-only-table {
          display: block;
        }

        .mobile-only-cards {
          display: none;
        }

        .desktop-role-filter {
          display: flex;
        }

        .mobile-role-filter {
          display: none;
        }

        @media (max-width: 767px) {
          .desktop-only-table {
            display: none !important;
          }
          .mobile-only-cards {
            display: grid;
            gap: var(--spacing-sm);
          }
          .desktop-role-filter {
            display: none !important;
          }
          .mobile-role-filter {
            display: block;
          }
          .tabs-header {
            padding: 4px;
            border-radius: var(--radius-lg);
          }
          .tab-btn {
            padding: 8px 12px;
            font-size: 0.75rem;
          }
        }

        .admin-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .admin-actions-row h3 {
          color: var(--color-primary-dark);
          font-family: 'Playfair Display', serif;
        }

        .admin-layout-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-lg);
          align-items: start;
        }

        @media (min-width: 992px) {
          .admin-layout-grid {
            grid-template-columns: ${showAddForm ? '1.1fr 0.9fr' : '1fr'};
          }
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }

        .admin-table th,
        .admin-table td {
          padding: 12px var(--spacing-md);
          border-bottom: 1px solid var(--color-border-light);
        }

        .admin-table th {
          background-color: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .row-inactive {
          background-color: var(--color-bg-secondary);
          opacity: 0.6;
        }

        .admin-role-badge {
          background-color: var(--color-bg-secondary);
          color: var(--color-primary-dark);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-dot-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-dot-pill.active { color: var(--color-success); }
        .status-dot-pill.inactive { color: var(--color-error); }

        .color-strip-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 700;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }

        .table-responsive {
          overflow-x: auto;
        }

        .px-0 { padding-left: 0 !important; padding-right: 0 !important; }
        .py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
        .font-semibold { font-weight: 600; }

        /* Form styling */
        .admin-create-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .form-row-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm);
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

        /* Mobile responsive overrides for admin page */
        @media (max-width: 767px) {
          .tabs-header {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
            gap: 2px;
          }

          .tabs-header::-webkit-scrollbar {
            display: none;
          }

          .tab-btn {
            padding: 8px 10px;
            font-size: 0.72rem;
          }

          .admin-actions-row {
            flex-direction: column;
            gap: var(--spacing-sm);
            align-items: flex-start;
          }

          .admin-actions-row h3 {
            font-size: 1rem;
          }

          .admin-table {
            font-size: 0.72rem;
            min-width: 600px;
          }

          .admin-table th,
          .admin-table td {
            padding: 8px;
          }

          .admin-role-badge {
            font-size: 0.65rem;
            padding: 1px 6px;
          }

          .status-dot-pill {
            font-size: 0.65rem;
          }

          .admin-layout-grid {
            grid-template-columns: 1fr !important;
          }

          .form-row-split {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 479px) {
          .tab-btn {
            padding: 6px 8px;
            font-size: 0.68rem;
          }
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

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: 'var(--spacing-xl)', color: 'var(--color-primary-dark)', fontWeight: '600' }}>Cargando administrador...</div>}>
      <AdminContent />
    </Suspense>
  );
}
