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

-- Tabla de Permisos Adicionales y Personalizados por Rol
CREATE TABLE IF NOT EXISTS roles_permisos_adicionales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rol_id INTEGER NOT NULL,
  modulo TEXT NOT NULL,
  permitido INTEGER NOT NULL DEFAULT 1,
  otorgado_por TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(rol_id, modulo),
  FOREIGN KEY (rol_id) REFERENCES roles(id)
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
  tipo_flujo TEXT DEFAULT 'administrativo',
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
  repuestos TEXT,
  firma_auxiliar TEXT,
  firma_jefe TEXT,
  comentarios_jefe TEXT,
  hallazgos TEXT,
  acciones_correctivas TEXT,
  evento_id INTEGER,
  equipo_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pdv_id) REFERENCES pdv(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (area_id) REFERENCES areas(id),
  FOREIGN KEY (tipo_visita_id) REFERENCES tipos_visita(id),
  FOREIGN KEY (plantilla_id) REFERENCES plantillas(id),
  FOREIGN KEY (responsable_id) REFERENCES users(id),
  FOREIGN KEY (equipo_id) REFERENCES equipos(id)
);

-- Evidencias de Visitas
CREATE TABLE IF NOT EXISTS evidencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visita_id INTEGER NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'foto',
  ruta_archivo TEXT NOT NULL,
  nombre_archivo TEXT,
  etiqueta TEXT DEFAULT 'soporte', -- 'antes', 'despues', 'soporte'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (visita_id) REFERENCES visitas(id)
);

-- Eventos del Calendario
CREATE TABLE IF NOT EXISTS eventos_calendario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pdv_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  area_id INTEGER,
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
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (area_id) REFERENCES areas(id)
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

-- Tabla de Equipos (Escaner QR)
CREATE TABLE IF NOT EXISTS equipos (
  id TEXT PRIMARY KEY,            -- ID del QR (Ej: EQ-1002)
  nombre TEXT NOT NULL,           -- Licuadora, Nevera, Plancha, etc.
  marca TEXT,
  modelo TEXT,
  serie TEXT,
  pdv_id INTEGER NOT NULL,
  datos_tecnicos TEXT,            -- Especificaciones técnicas (JSON)
  ultimo_mantenimiento DATE,
  proximo_mantenimiento DATE,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pdv_id) REFERENCES pdv(id)
);

CREATE INDEX IF NOT EXISTS idx_equipos_pdv ON equipos(pdv_id);

-- Repositorio Central de Archivos y Evidencias (Fotos, Excel, PDFs, Documentos)
CREATE TABLE IF NOT EXISTS archivos_repositorio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_original TEXT NOT NULL,
  nombre_guardado TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  tipo_archivo TEXT NOT NULL, -- 'excel', 'foto', 'pdf', 'documento', 'otro'
  extension TEXT,
  tamano_bytes INTEGER DEFAULT 0,
  categoria TEXT DEFAULT 'general', -- 'evidencia_visita', 'reporte_excel', 'manual_equipo', 'documento_pdv', 'general'
  referencia_id TEXT, -- Puede ser ID de visita, PDV, Equipo, etc.
  user_id INTEGER,
  observaciones TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_archivos_tipo ON archivos_repositorio(tipo_archivo);
CREATE INDEX IF NOT EXISTS idx_archivos_cat ON archivos_repositorio(categoria);
CREATE INDEX IF NOT EXISTS idx_archivos_ref ON archivos_repositorio(referencia_id);

-- =============================================
-- MÓDULO DE MANTENIMIENTO
-- =============================================

-- Preferencia de notificaciones por correo en usuarios
-- ALTER TABLE users ADD COLUMN recibir_correos INTEGER DEFAULT 1;
-- (Se aplica en la migración migrate-db-mantenimiento.js)

-- Tabla principal de Tickets de Mantenimiento (MT-XXXX y ST-XXXX)
CREATE TABLE IF NOT EXISTS mantenimientos (
  id TEXT PRIMARY KEY,                  -- Ej: MT-1001 o ST-1001
  prefijo TEXT NOT NULL DEFAULT 'MT',   -- 'MT' (Mantenimiento/Calidad) | 'ST' (Sistemas)
  numero_correlativo INTEGER NOT NULL,  -- Número correlativo por prefijo
  tipo_mantenimiento TEXT NOT NULL,     -- 'Preventivo' | 'Correctivo' | 'Locativo'
  area_registro TEXT NOT NULL,          -- 'Calidad' | 'Mantenimiento' | 'Sistemas'
  area_hallazgo TEXT,                   -- Área donde se detectó el hallazgo
  equipo_id TEXT,                       -- NULL para mantenimientos locativos
  pdv_id INTEGER,                       -- PDV o lugar específico donde está el hallazgo
  descripcion TEXT NOT NULL,            -- Descripción del hallazgo o problema
  fecha_evidencia DATE NOT NULL,        -- Fecha en que se evidenció el problema
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  prioridad TEXT NOT NULL DEFAULT 'Media', -- 'Baja' | 'Media' | 'Alta' | 'Crítica'
  fecha_programada DATE,                -- Asignada por el Jefe de Mantenimiento
  responsable_asignacion_id INTEGER,    -- Usuario que asignó el ticket
  tecnico_id INTEGER,                   -- Técnico responsable de ejecutar
  estado TEXT NOT NULL DEFAULT 'Pendiente', -- 'Pendiente' | 'Asignado' | 'En proceso' | 'Finalizado' | 'Cancelado'
  solucion_aplicada TEXT,               -- Solución implementada
  evidencias TEXT DEFAULT '[]',         -- JSON array de IDs en archivos_repositorio
  observaciones TEXT,
  observaciones_asignacion TEXT,        -- Observaciones del jefe al asignar
  fecha_inicio_ejecucion DATETIME,      -- Cuando el técnico inicia
  fecha_real_finalizacion DATETIME,     -- Cuando se finaliza realmente
  tiempo_atencion_minutos INTEGER DEFAULT 0,   -- Desde registro hasta asignación
  tiempo_ejecucion_minutos INTEGER DEFAULT 0,  -- Desde inicio hasta finalización
  user_id_registro INTEGER NOT NULL,    -- Usuario que registró el hallazgo
  inspeccion_id INTEGER,                -- Si proviene de una inspección
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id),
  FOREIGN KEY (responsable_asignacion_id) REFERENCES users(id),
  FOREIGN KEY (tecnico_id) REFERENCES users(id),
  FOREIGN KEY (user_id_registro) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_mantenimientos_estado ON mantenimientos(estado);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_prefijo ON mantenimientos(prefijo);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_tipo ON mantenimientos(tipo_mantenimiento);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_equipo ON mantenimientos(equipo_id);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha ON mantenimientos(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_tecnico ON mantenimientos(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_prioridad ON mantenimientos(prioridad);

-- Contador de correlativos para MT y ST
CREATE TABLE IF NOT EXISTS mantenimientos_correlativos (
  prefijo TEXT PRIMARY KEY,             -- 'MT' o 'ST'
  ultimo_numero INTEGER DEFAULT 1000
);

INSERT OR IGNORE INTO mantenimientos_correlativos (prefijo, ultimo_numero) VALUES ('MT', 1000);
INSERT OR IGNORE INTO mantenimientos_correlativos (prefijo, ultimo_numero) VALUES ('ST', 1000);

-- Tabla de Inspecciones
CREATE TABLE IF NOT EXISTS inspecciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_inspeccion TEXT NOT NULL,        -- 'Calidad' | 'Mantenimiento' | 'Sistemas'
  area_id INTEGER,
  pdv_id INTEGER,
  user_id INTEGER NOT NULL,            -- Inspector
  fecha_inspeccion DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  observaciones_generales TEXT,
  estado TEXT DEFAULT 'Completada',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (area_id) REFERENCES areas(id),
  FOREIGN KEY (pdv_id) REFERENCES pdv(id)
);

CREATE INDEX IF NOT EXISTS idx_inspecciones_fecha ON inspecciones(fecha_inspeccion);
CREATE INDEX IF NOT EXISTS idx_inspecciones_user ON inspecciones(user_id);

-- Hallazgos por Inspección (relaciona inspección -> ticket de mantenimiento)
CREATE TABLE IF NOT EXISTS inspecciones_hallazgos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspeccion_id INTEGER NOT NULL,
  mantenimiento_id TEXT NOT NULL,      -- El ticket MT-XXXX o ST-XXXX generado
  descripcion TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id),
  FOREIGN KEY (mantenimiento_id) REFERENCES mantenimientos(id)
);

-- Historial de Cambios (Trazabilidad y Auditoría completa)
CREATE TABLE IF NOT EXISTS historial_mantenimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mantenimiento_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  accion TEXT NOT NULL,                -- 'CREACION' | 'ASIGNACION' | 'INICIO' | 'CAMBIO_ESTADO' | 'SOLUCION' | 'EVIDENCIA' | 'MODIFICACION' | 'CANCELACION'
  estado_anterior TEXT,
  estado_nuevo TEXT,
  detalles_cambio TEXT,               -- JSON con campos modificados
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mantenimiento_id) REFERENCES mantenimientos(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_hist_mant_id ON historial_mantenimientos(mantenimiento_id);
CREATE INDEX IF NOT EXISTS idx_hist_mant_fecha ON historial_mantenimientos(created_at);


