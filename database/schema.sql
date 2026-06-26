-- =============================================
-- CREPES EN PUNTO - Esquema de Base de Datos
-- SQLite Database Schema
-- =============================================

-- Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  permisos TEXT DEFAULT '{}',
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Ciudades
CREATE TABLE IF NOT EXISTS ciudades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  activa INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Puntos de Venta (PDV)
CREATE TABLE IF NOT EXISTS pdv (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  ciudad_id INTEGER NOT NULL,
  direccion TEXT,
  hora_apertura TEXT DEFAULT '08:00',
  hora_cierre TEXT DEFAULT '22:00',
  estado_id INTEGER DEFAULT 1,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ciudad_id) REFERENCES ciudades(id),
  FOREIGN KEY (estado_id) REFERENCES estados_pdv(id)
);

-- Estados de PDV
CREATE TABLE IF NOT EXISTS estados_pdv (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'green',
  icono TEXT,
  descripcion TEXT,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol_id INTEGER NOT NULL,
  ciudad_id INTEGER,
  avatar TEXT,
  activo INTEGER DEFAULT 1,
  ultimo_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id),
  FOREIGN KEY (ciudad_id) REFERENCES ciudades(id)
);

-- Sesiones de Usuario
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Historial de Cambios de Estado PDV
CREATE TABLE IF NOT EXISTS historial_estados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pdv_id INTEGER NOT NULL,
  estado_anterior_id INTEGER,
  estado_nuevo_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  observacion TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pdv_id) REFERENCES pdv(id),
  FOREIGN KEY (estado_anterior_id) REFERENCES estados_pdv(id),
  FOREIGN KEY (estado_nuevo_id) REFERENCES estados_pdv(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Áreas Funcionales
CREATE TABLE IF NOT EXISTS areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  color TEXT DEFAULT '#8B6914',
  activa INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tipos de Visita
CREATE TABLE IF NOT EXISTS tipos_visita (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (area_id) REFERENCES areas(id)
);

-- Plantillas de Visita
CREATE TABLE IF NOT EXISTS plantillas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_id INTEGER NOT NULL,
  tipo_visita_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  campos TEXT NOT NULL DEFAULT '[]',
  version INTEGER DEFAULT 1,
  activa INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (area_id) REFERENCES areas(id),
  FOREIGN KEY (tipo_visita_id) REFERENCES tipos_visita(id)
);

-- Visitas Registradas
CREATE TABLE IF NOT EXISTS visitas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pdv_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  area_id INTEGER NOT NULL,
  tipo_visita_id INTEGER NOT NULL,
  plantilla_id INTEGER,
  fecha DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  datos_formulario TEXT DEFAULT '{}',
  responsable_id INTEGER,
  fecha_compromiso DATE,
  estado TEXT DEFAULT 'pendiente',
  observaciones TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pdv_id) REFERENCES pdv(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (area_id) REFERENCES areas(id),
  FOREIGN KEY (tipo_visita_id) REFERENCES tipos_visita(id),
  FOREIGN KEY (plantilla_id) REFERENCES plantillas(id),
  FOREIGN KEY (responsable_id) REFERENCES users(id)
);

-- Evidencias de Visitas
CREATE TABLE IF NOT EXISTS evidencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visita_id INTEGER NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'foto',
  ruta_archivo TEXT NOT NULL,
  nombre_archivo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (visita_id) REFERENCES visitas(id)
);

-- Eventos del Calendario
CREATE TABLE IF NOT EXISTS eventos_calendario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pdv_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  tipo_evento TEXT DEFAULT 'visita',
  estado TEXT DEFAULT 'programado',
  outlook_id TEXT,
  confirmado INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pdv_id) REFERENCES pdv(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bloqueos de Horario
CREATE TABLE IF NOT EXISTS bloqueos_horario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pdv_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  motivo_id INTEGER NOT NULL,
  observacion TEXT,
  user_id INTEGER NOT NULL,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pdv_id) REFERENCES pdv(id),
  FOREIGN KEY (motivo_id) REFERENCES motivos_bloqueo(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Motivos de Bloqueo
CREATE TABLE IF NOT EXISTS motivos_bloqueo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Historial de Visitas (Auditoría)
CREATE TABLE IF NOT EXISTS historial_visitas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visita_id INTEGER NOT NULL,
  accion TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  detalle TEXT,
  FOREIGN KEY (visita_id) REFERENCES visitas(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_pdv_ciudad ON pdv(ciudad_id);
CREATE INDEX IF NOT EXISTS idx_pdv_estado ON pdv(estado_id);
CREATE INDEX IF NOT EXISTS idx_historial_pdv ON historial_estados(pdv_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_estados(fecha);
CREATE INDEX IF NOT EXISTS idx_visitas_pdv ON visitas(pdv_id);
CREATE INDEX IF NOT EXISTS idx_visitas_fecha ON visitas(fecha);
CREATE INDEX IF NOT EXISTS idx_visitas_area ON visitas(area_id);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos_calendario(fecha);
CREATE INDEX IF NOT EXISTS idx_eventos_pdv ON eventos_calendario(pdv_id);
CREATE INDEX IF NOT EXISTS idx_bloqueos_pdv ON bloqueos_horario(pdv_id);
CREATE INDEX IF NOT EXISTS idx_bloqueos_fecha ON bloqueos_horario(fecha);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_rol ON users(rol_id);
