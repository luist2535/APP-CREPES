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
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form Fields - User
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('admin123');
  const [userRolId, setUserRolId] = useState('');
  const [userCiudadId, setUserCiudadId] = useState('');

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

  useEffect(() => {
    loadAllData();
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

  const handleCreateEntity = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      let payloadData = {};
      if (activeTab === 'usuarios') {
        payloadData = {
          nombre: userName,
          email: userEmail,
          password: userPassword,
          rol_id: parseInt(userRolId),
          ciudad_id: userCiudadId ? parseInt(userCiudadId) : null,
        };
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

      const entityName = activeTab === 'pdvs' ? 'pdv' : activeTab.slice(0, -1); // 'usuarios' -> 'user', 'ciudades' -> 'ciudad'
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: entityName === 'usuario' ? 'user' : entityName,
          data: payloadData,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Error al guardar registro');

      setFormSuccess(resData.message || 'Registro guardado exitosamente');
      
      // Reset fields
      setUserName('');
      setUserEmail('');
      setUserPassword('admin123');
      setPdvName('');
      setPdvDireccion('');
      setCiudadName('');
      setAreaName('');
      setAreaDesc('');
      
      setShowAddForm(false);
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
        <button className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => { setActiveTab('usuarios'); setShowAddForm(false); }}>
          👤 Gestión Usuarios
        </button>
        <button className={`tab-btn ${activeTab === 'pdvs' ? 'active' : ''}`} onClick={() => { setActiveTab('pdvs'); setShowAddForm(false); }}>
          🏪 Gestión PDVs
        </button>
        <button className={`tab-btn ${activeTab === 'ciudades' ? 'active' : ''}`} onClick={() => { setActiveTab('ciudades'); setShowAddForm(false); }}>
          📍 Ciudades
        </button>
        <button className={`tab-btn ${activeTab === 'areas' ? 'active' : ''}`} onClick={() => { setActiveTab('areas'); setShowAddForm(false); }}>
          🛡️ Áreas de Inspección
        </button>
      </div>

      <div className="admin-actions-row">
        <h3>
          {activeTab === 'usuarios' && 'Lista de Usuarios'}
          {activeTab === 'pdvs' && 'Lista de Puntos de Venta (PDVs)'}
          {activeTab === 'ciudades' && 'Lista de Ciudades'}
          {activeTab === 'areas' && 'Áreas Funcionales'}
        </h3>
        {!showAddForm && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
            + Agregar Nuevo
          </button>
        )}
      </div>

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
                              {u.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>
                            <button
                              className={`btn btn-sm ${u.activo ? 'btn-secondary btn-danger' : 'btn-success'}`}
                              onClick={() => handleToggleActive('user', u.id, u.activo)}
                              disabled={u.id === 1} // Can't deactivate main admin
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PDV Table */}
              {activeTab === 'pdvs' && (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>PDV</th>
                        <th>Ciudad</th>
                        <th>Dirección</th>
                        <th>Horario</th>
                        <th>Estado Config</th>
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
                              {p.activo ? 'Activo' : 'Desactivado'}
                            </span>
                          </td>
                          <td>
                            <button
                              className={`btn btn-sm ${p.activo ? 'btn-secondary btn-danger' : 'btn-success'}`}
                              onClick={() => handleToggleActive('pdv', p.id, p.activo)}
                            >
                              {p.activo ? 'Desactivar' : 'Activar'}
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
                        <th>Ciudad</th>
                        <th>Estado Config</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ciudades.map((c) => (
                        <tr key={c.id} className={!c.activa ? 'row-inactive' : ''}>
                          <td className="font-semibold">{c.nombre}</td>
                          <td>
                            <span className={`status-dot-pill ${c.activa ? 'active' : 'inactive'}`}>
                              {c.activa ? 'Activa' : 'Desactivada'}
                            </span>
                          </td>
                          <td>
                            <button
                              className={`btn btn-sm ${c.activa ? 'btn-secondary btn-danger' : 'btn-success'}`}
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
                        <th>Área Inspectora</th>
                        <th>Color Identificativo</th>
                        <th>Descripción</th>
                        <th>Estado Config</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {areas.map((a) => (
                        <tr key={a.id} className={!a.activa ? 'row-inactive' : ''}>
                          <td className="font-semibold">{a.nombre}</td>
                          <td>
                            <span className="color-strip-badge" style={{ backgroundColor: a.color }}>
                              {a.color}
                            </span>
                          </td>
                          <td>{a.descripcion || 'Sin descripción'}</td>
                          <td>
                            <span className={`status-dot-pill ${a.activa ? 'active' : 'inactive'}`}>
                              {a.activa ? 'Activa' : 'Desactivada'}
                            </span>
                          </td>
                          <td>
                            <button
                              className={`btn btn-sm ${a.activa ? 'btn-secondary btn-danger' : 'btn-success'}`}
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

        {/* Right/Floating: Add new form */}
        {showAddForm && (
          <div className="admin-form-col">
            <div className="card shadow-lg animate-fade-in">
              <div className="card-header">
                <h3>
                  Agregar nuevo
                  {activeTab === 'usuarios' && ' Usuario'}
                  {activeTab === 'pdvs' && ' PDV'}
                  {activeTab === 'ciudades' && ' Ciudad'}
                  {activeTab === 'areas' && ' Área'}
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>Cerrar</button>
              </div>
              <div className="card-body">
                {formError && <div className="error-alert">{formError}</div>}
                {formSuccess && <div className="success-alert">{formSuccess}</div>}

                <form onSubmit={handleCreateEntity} className="admin-create-form">
                  
                  {/* User Form */}
                  {activeTab === 'usuarios' && (
                    <>
                      <div className="form-group">
                        <label className="form-label" htmlFor="user-name">Nombre Completo</label>
                        <input
                          id="user-name"
                          type="text"
                          className="form-input"
                          placeholder="Juan Pérez"
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
                          placeholder="juan@crepesenpunto.com"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="user-pass">Contraseña Temporal</label>
                        <input
                          id="user-pass"
                          type="password"
                          className="form-input"
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="user-rol">Rol / Perfil</label>
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
                          <option value="">-- Nivel Nacional / Administrativo --</option>
                          {ciudades.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* PDV Form */}
                  {activeTab === 'pdvs' && (
                    <>
                      <div className="form-group">
                        <label className="form-label" htmlFor="pdv-name">Nombre del PDV</label>
                        <input
                          id="pdv-name"
                          type="text"
                          className="form-input"
                          placeholder="Ej: Caribe Plaza II"
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
                        <label className="form-label" htmlFor="pdv-dir">Dirección</label>
                        <input
                          id="pdv-dir"
                          type="text"
                          className="form-input"
                          placeholder="Ej: Calle 32 #12-43"
                          value={pdvDireccion}
                          onChange={(e) => setPdvDireccion(e.target.value)}
                        />
                      </div>
                      <div className="form-row-split">
                        <div className="form-group">
                          <label className="form-label" htmlFor="pdv-apertura">Hora Apertura</label>
                          <input
                            id="pdv-apertura"
                            type="time"
                            className="form-input"
                            value={pdvApertura}
                            onChange={(e) => setPdvApertura(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="pdv-cierre">Hora Cierre</label>
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

                  {/* Ciudad Form */}
                  {activeTab === 'ciudades' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="ciudad-name">Nombre de la Ciudad</label>
                      <input
                        id="ciudad-name"
                        type="text"
                        className="form-input"
                        placeholder="Ej: Santa Marta"
                        value={ciudadName}
                        onChange={(e) => setCiudadName(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  {/* Area Form */}
                  {activeTab === 'areas' && (
                    <>
                      <div className="form-group">
                        <label className="form-label" htmlFor="area-name">Nombre de Área Inspectora</label>
                        <input
                          id="area-name"
                          type="text"
                          className="form-input"
                          placeholder="Ej: SST o Formación"
                          value={areaName}
                          onChange={(e) => setAreaName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="area-color">Color Identificativo (Código Hexadecimal)</label>
                        <input
                          id="area-color"
                          type="color"
                          className="form-input"
                          value={areaColor}
                          onChange={(e) => setAreaColor(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="area-desc">Descripción</label>
                        <textarea
                          id="area-desc"
                          className="form-textarea"
                          placeholder="Definición del propósito de esta área de inspección..."
                          value={areaDesc}
                          onChange={(e) => setAreaDesc(e.target.value)}
                        ></textarea>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-block btn-lg"
                    disabled={formLoading}
                  >
                    {formLoading ? 'Guardando...' : 'Confirmar Registro'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>

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
      `}</style>
    </div>
  );
}
