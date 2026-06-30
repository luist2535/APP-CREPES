'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('usuarios');
  
  // Lists
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [areas, setAreas] = useState([]);
  
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      alert(err.message);
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

  const handleDeletePdv = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el Punto de Venta "${name}"?\nEsta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`/api/admin?entity=pdv&id=${id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar Punto de Venta');
      
      alert(data.message || 'Punto de Venta eliminado con éxito');
      loadAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${name}"?\nEsta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`/api/admin?entity=user&id=${id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario');
      
      alert(data.message || 'Usuario eliminado con éxito');
      loadAllData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="admin-page-container">
      {error && <div className="card error-card"><div className="card-body">❌ {error}</div></div>}

      {/* Tabs */}
      <div className="tabs-header">
        <button className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => { setActiveTab('usuarios'); handleCloseForm(); }}>
          👤 Gestión Usuarios
        </button>
        <button className={`tab-btn ${activeTab === 'pdvs' ? 'active' : ''}`} onClick={() => { setActiveTab('pdvs'); handleCloseForm(); }}>
          🏪 Gestión PDVs
        </button>
        <button className={`tab-btn ${activeTab === 'ciudades' ? 'active' : ''}`} onClick={() => { setActiveTab('ciudades'); handleCloseForm(); }}>
          📍 Ciudades
        </button>
        <button className={`tab-btn ${activeTab === 'areas' ? 'active' : ''}`} onClick={() => { setActiveTab('areas'); handleCloseForm(); }}>
          🛡️ Áreas de Inspección
        </button>
        <button className={`tab-btn ${activeTab === 'correo' ? 'active' : ''}`} onClick={() => { setActiveTab('correo'); handleCloseForm(); }}>
          📧 Configuración de Correo
        </button>
      </div>

      <div className="admin-actions-row">
        <h3>
          {activeTab === 'usuarios' && 'Lista de Usuarios'}
          {activeTab === 'pdvs' && 'Lista de Puntos de Venta (PDVs)'}
          {activeTab === 'ciudades' && 'Lista de Ciudades'}
          {activeTab === 'areas' && 'Áreas Funcionales'}
          {activeTab === 'correo' && 'Configuración de Servidor de Correo (SMTP)'}
        </h3>
        {!showAddForm && activeTab !== 'correo' && (
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
                
                {/* Users Table */}
                {activeTab === 'usuarios' && (
                  <div className="table-responsive">
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
                        {users.map((u) => (
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
                            <td style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              <button 
                                className={`btn btn-sm ${u.activo ? 'btn-danger' : 'btn-success'}`}
                                onClick={() => handleToggleActive('user', u.id, u.activo)}
                                disabled={u.id === 1} // Prevent deactivating admin
                                title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                              >
                                {u.activo ? 'Desactivar 🔒' : 'Activar 🔓'}
                              </button>
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => handleEditUserClick(u)}
                                title="Editar datos del usuario"
                              >
                                Editar ✏️
                              </button>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteUser(u.id, u.nombre)}
                                disabled={u.id === 1} // Prevent deleting admin
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

                {/* PDVs Table */}
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

      <style jsx>{`
        .admin-page-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .tabs-header {
          display: flex;
          gap: var(--spacing-sm);
          border-bottom: 2px solid var(--color-border-light);
          padding-bottom: 2px;
          overflow-x: auto;
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
          white-space: nowrap;
        }

        .tab-btn:hover { color: var(--color-primary); }
        .tab-btn.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

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
    </div>
  );
}
