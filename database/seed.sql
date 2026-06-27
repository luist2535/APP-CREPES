-- =============================================
-- CREPES EN PUNTO - Datos Iniciales (Seed)
-- =============================================

-- Roles del Sistema
INSERT INTO roles (nombre, descripcion, permisos) VALUES
  ('Administrador', 'Acceso total al sistema', '{"all": true}'),
  ('Coordinador de Operaciones', 'Gestión regional de PDV', '{"territorial": true, "modos": true, "calendario": true, "visitas": true, "bloqueos": true, "dashboard": true}'),
  ('Supervisor SST', 'Inspecciones de seguridad y salud', '{"visitas": true, "dashboard_area": true}'),
  ('Supervisor Mantenimiento', 'Mantenimiento preventivo y correctivo', '{"visitas": true, "dashboard_area": true}'),
  ('Supervisor Calidad', 'Calidad y aseo general', '{"visitas": true, "dashboard_area": true}'),
  ('VRH', 'Recursos Humanos - Acompañamiento', '{"visitas": true, "dashboard_area": true}'),
  ('Formación', 'Entrenamiento y seguimiento', '{"visitas": true, "dashboard_area": true}'),
  ('Visualizador', 'Solo lectura de dashboard y reportes', '{"dashboard": true}'),
  ('Jefe de Sistemas', 'Jefe de la división de sistemas y soporte', '{"visitas": true, "dashboard_area": true}'),
  ('Auxiliar de Operaciones', 'Auxiliar de operaciones', '{"visitas": true}'),
  ('Auxiliar SST', 'Auxiliar de seguridad y salud en el trabajo', '{"visitas": true}'),
  ('Auxiliar de Mantenimiento', 'Auxiliar de mantenimiento físico', '{"visitas": true}'),
  ('Auxiliar de Calidad', 'Auxiliar de calidad y aseo', '{"visitas": true}'),
  ('Auxiliar VRH', 'Auxiliar de recursos humanos', '{"visitas": true}'),
  ('Auxiliar Formación', 'Auxiliar de capacitación', '{"visitas": true}'),
  ('Auxiliar de Sistemas', 'Auxiliar técnico de sistemas', '{"visitas": true}');

-- Ciudades
INSERT INTO ciudades (nombre) VALUES
  ('Cartagena'),
  ('Barranquilla'),
  ('Santa Marta');

-- Estados de PDV
INSERT INTO estados_pdv (nombre, color, icono, descripcion) VALUES
  ('Trabajando en sitio', 'green', '🟢', 'PDV operando normalmente'),
  ('Provisional / Bloqueado', 'yellow', '🟡', 'PDV con restricción temporal'),
  ('Ocupado / Aseo general', 'yellow', '🟡', 'PDV en proceso de limpieza'),
  ('Fuera de servicio', 'red', '🔴', 'PDV no disponible'),
  ('Mantenimiento locativo', 'red', '🔴', 'PDV en mantenimiento de infraestructura');

-- PDV Cartagena (ciudad_id = 1)
INSERT INTO pdv (nombre, ciudad_id, hora_apertura, hora_cierre, estado_id) VALUES
  ('San Martín', 1, '08:00', '22:00', 1),
  ('Plaza Bocagrande', 1, '08:00', '22:00', 1),
  ('San Juan', 1, '08:00', '22:00', 1),
  ('San Pedro', 1, '08:00', '22:00', 1),
  ('San Diego', 1, '08:00', '22:00', 1),
  ('Serrezuela', 1, '08:00', '22:00', 1),
  ('Mall Plaza', 1, '08:00', '22:00', 1),
  ('Caribe Plaza', 1, '08:00', '22:00', 1),
  ('Oficinas Administrativas', 1, '08:00', '18:00', 1);

-- PDV Barranquilla (ciudad_id = 2)
INSERT INTO pdv (nombre, ciudad_id, hora_apertura, hora_cierre, estado_id) VALUES
  ('Parque Alegra', 2, '08:00', '22:00', 1),
  ('Portal del Prado', 2, '08:00', '22:00', 1),
  ('Alto Prado', 2, '08:00', '22:00', 1),
  ('Le Meridiem Golf', 2, '08:00', '22:00', 1),
  ('Viva', 2, '08:00', '22:00', 1),
  ('Buenavista I', 2, '08:00', '22:00', 1),
  ('Heladería Buenavista II', 2, '08:00', '22:00', 1),
  ('Logika / Planta de producción', 2, '07:00', '19:00', 1);

-- PDV Santa Marta (ciudad_id = 3)
INSERT INTO pdv (nombre, ciudad_id, hora_apertura, hora_cierre, estado_id) VALUES
  ('Zazue', 3, '08:00', '22:00', 1),
  ('Casacentro', 3, '08:00', '22:00', 1),
  ('Buena Vista', 3, '08:00', '22:00', 1);

-- Áreas Funcionales
INSERT INTO areas (nombre, descripcion, color, tipo_flujo) VALUES
  ('Operaciones', 'Área de operaciones generales', '#8B6914', 'administrativo'),
  ('SST', 'Seguridad y Salud en el Trabajo', '#D4760A', 'administrativo'),
  ('Mantenimiento', 'Mantenimiento preventivo y correctivo', '#6B4226', 'tecnico'),
  ('Calidad', 'Control de calidad y aseo', '#A0522D', 'administrativo'),
  ('VRH', 'Vicepresidencia de Recursos Humanos', '#CD853F', 'administrativo'),
  ('Formación', 'Capacitación y entrenamiento', '#DEB887', 'administrativo'),
  ('Sistemas', 'Área de sistemas y soporte técnico', '#4B0082', 'tecnico');

-- Tipos de Visita
INSERT INTO tipos_visita (area_id, nombre) VALUES
  (1, 'Visita instructoras'),
  (2, 'Inspección'),
  (3, 'Preventivo'),
  (3, 'Correctivo'),
  (4, 'Aseo general'),
  (5, 'Acompañamiento'),
  (6, 'Entrenamiento'),
  (7, 'Soporte Técnico');

-- Plantillas de Visita
INSERT INTO plantillas (area_id, tipo_visita_id, nombre, campos) VALUES
  (1, 1, 'Check list seguimiento', '[{"nombre":"item","tipo":"checkbox","label":"Presentación personal","requerido":true},{"nombre":"item2","tipo":"checkbox","label":"Uso de uniforme completo","requerido":true},{"nombre":"item3","tipo":"checkbox","label":"Limpieza del área de trabajo","requerido":true},{"nombre":"item4","tipo":"checkbox","label":"Manejo de productos","requerido":true},{"nombre":"item5","tipo":"checkbox","label":"Atención al cliente","requerido":true},{"nombre":"observaciones","tipo":"textarea","label":"Observaciones generales","requerido":false}]'),
  (2, 2, 'Check list botiquín', '[{"nombre":"item","tipo":"checkbox","label":"Botiquín completo","requerido":true},{"nombre":"item2","tipo":"checkbox","label":"Medicamentos vigentes","requerido":true},{"nombre":"item3","tipo":"checkbox","label":"Extintor cargado","requerido":true},{"nombre":"item4","tipo":"checkbox","label":"Señalización visible","requerido":true},{"nombre":"item5","tipo":"checkbox","label":"Rutas de evacuación despejadas","requerido":true},{"nombre":"observaciones","tipo":"textarea","label":"Hallazgos","requerido":false}]'),
  (3, 3, 'Check list equipo', '[{"nombre":"item","tipo":"checkbox","label":"Estado de equipos de cocina","requerido":true},{"nombre":"item2","tipo":"checkbox","label":"Refrigeración funcionando","requerido":true},{"nombre":"item3","tipo":"checkbox","label":"Conexiones eléctricas seguras","requerido":true},{"nombre":"item4","tipo":"checkbox","label":"Sistema de agua funcional","requerido":true},{"nombre":"observaciones","tipo":"textarea","label":"Observaciones","requerido":false}]'),
  (3, 4, 'Cuadro acción correctiva', '[{"nombre":"hallazgo","tipo":"textarea","label":"Descripción del hallazgo","requerido":true},{"nombre":"causa","tipo":"textarea","label":"Causa raíz","requerido":true},{"nombre":"accion","tipo":"textarea","label":"Acción correctiva","requerido":true},{"nombre":"responsable","tipo":"text","label":"Responsable","requerido":true},{"nombre":"fecha_cierre","tipo":"date","label":"Fecha de cierre","requerido":true}]'),
  (4, 5, 'Cuadro hallazgos', '[{"nombre":"area_inspeccionada","tipo":"text","label":"Área inspeccionada","requerido":true},{"nombre":"item","tipo":"checkbox","label":"Pisos limpios","requerido":true},{"nombre":"item2","tipo":"checkbox","label":"Superficies desinfectadas","requerido":true},{"nombre":"item3","tipo":"checkbox","label":"Baños limpios","requerido":true},{"nombre":"item4","tipo":"checkbox","label":"Cocina en orden","requerido":true},{"nombre":"hallazgos","tipo":"textarea","label":"Hallazgos","requerido":false}]'),
  (5, 6, 'Check list visita', '[{"nombre":"item","tipo":"checkbox","label":"Ambiente laboral adecuado","requerido":true},{"nombre":"item2","tipo":"checkbox","label":"Personal completo","requerido":true},{"nombre":"item3","tipo":"checkbox","label":"Dotación entregada","requerido":true},{"nombre":"item4","tipo":"checkbox","label":"Documentación al día","requerido":true},{"nombre":"observaciones","tipo":"textarea","label":"Observaciones","requerido":false}]'),
  (6, 7, 'Seguimiento', '[{"nombre":"tema","tipo":"text","label":"Tema de entrenamiento","requerido":true},{"nombre":"asistentes","tipo":"number","label":"Número de asistentes","requerido":true},{"nombre":"duracion","tipo":"text","label":"Duración","requerido":true},{"nombre":"evaluacion","tipo":"select","label":"Evaluación general","opciones":["Excelente","Bueno","Regular","Deficiente"],"requerido":true},{"nombre":"observaciones","tipo":"textarea","label":"Observaciones","requerido":false}]'),
  (7, 8, 'Check list Sistemas', '[{"nombre":"hardware","tipo":"checkbox","label":"Revisión de hardware (CPU, Disco Duro, RAM)","requerido":true},{"nombre":"software","tipo":"checkbox","label":"Actualización de software y antivirus","requerido":true},{"nombre":"redes","tipo":"checkbox","label":"Prueba de conectividad de red y cableado","requerido":true},{"nombre":"backup","tipo":"checkbox","label":"Respaldo de información local realizado","requerido":true},{"nombre":"detalles_trabajo","tipo":"textarea","label":"Detalles del soporte realizado","requerido":true}]');

-- Motivos de Bloqueo
INSERT INTO motivos_bloqueo (nombre) VALUES
  ('Mantenimiento'),
  ('Aseo general'),
  ('Evento especial'),
  ('Otro');

-- Usuario Administrador por defecto (password: admin123)
-- Hash generado con bcrypt
INSERT INTO users (nombre, email, password_hash, rol_id, ciudad_id) VALUES
  ('Administrador', 'admin@crepesenpunto.com', '$2b$10$placeholder_hash_will_be_set_on_init', 1, NULL);

-- Usuarios de ejemplo por rol
INSERT INTO users (nombre, email, password_hash, rol_id, ciudad_id) VALUES
  ('Carlos Coordinador CTG', 'carlos@crepesenpunto.com', '$2b$10$placeholder_hash', 2, 1),
  ('María Coordinadora BAQ', 'maria@crepesenpunto.com', '$2b$10$placeholder_hash', 2, 2),
  ('Pedro Coordinador SM', 'pedro@crepesenpunto.com', '$2b$10$placeholder_hash', 2, 3),
  ('Ana SST', 'ana@crepesenpunto.com', '$2b$10$placeholder_hash', 3, NULL),
  ('Luis Mantenimiento', 'luis@crepesenpunto.com', '$2b$10$placeholder_hash', 4, NULL),
  ('Sandra Calidad', 'sandra@crepesenpunto.com', '$2b$10$placeholder_hash', 5, NULL),
  ('Jorge VRH', 'jorge@crepesenpunto.com', '$2b$10$placeholder_hash', 6, NULL),
  ('Diana Formación', 'diana@crepesenpunto.com', '$2b$10$placeholder_hash', 7, NULL),
  ('Visualizador', 'viewer@crepesenpunto.com', '$2b$10$placeholder_hash', 8, NULL),
  ('Jefe de Sistemas', 'jefe_sistemas@crepesenpunto.com', '$2b$10$placeholder_hash', 9, NULL),
  ('Auxiliar de Sistemas', 'aux_sistemas@crepesenpunto.com', '$2b$10$placeholder_hash', 16, NULL),
  ('Auxiliar Mantenimiento', 'aux_mante@crepesenpunto.com', '$2b$10$placeholder_hash', 12, NULL),
  ('Auxiliar Calidad', 'aux_calidad@crepesenpunto.com', '$2b$10$placeholder_hash', 13, NULL),
  ('Auxiliar SST', 'aux_sst@crepesenpunto.com', '$2b$10$placeholder_hash', 11, NULL);

-- Equipos de ejemplo para Escáner QR
INSERT INTO equipos (id, nombre, marca, modelo, serie, pdv_id, datos_tecnicos, ultimo_mantenimiento, proximo_mantenimiento) VALUES
  ('EQ-1001', 'Licuadora Industrial', 'Vitamix', 'The Quiet One', 'VTX-908234-A', 1, '{"potencia":"1800W","voltaje":"110V","capacidad":"2.0 L","velocidades":"Control variable","certificacion":"NSF/SST"}', '2026-05-15', '2026-08-15'),
  ('EQ-1002', 'Congelador Vertical', 'Imbera', 'EV-25-CONG', 'IMB-88374-B', 1, '{"capacidad":"25 CFT","refrigerante":"R290","temperatura":"-18°C a -22°C","voltaje":"115V","corriente":"6.2 A"}', '2026-04-10', '2026-07-10'),
  ('EQ-1003', 'Crepera Eléctrica Doble', 'Krampouz', 'CEBIV4-D', 'KRP-49281-C', 1, '{"diametro_placas":"40 cm x 2","potencia":"3000W x 2","voltaje":"220V Bifásico","termostato":"50°C a 300°C"}', '2026-06-01', '2026-09-01'),
  ('EQ-1004', 'Aire Acondicionado Cocina', 'Carrier', 'Split inverter 24k', 'CAR-10293-D', 1, '{"capacidad":"24000 BTU","eficiencia":"SEER 18","refrigerante":"R410A","corriente":"11.5 A"}', '2026-03-20', '2026-09-20'),
  ('EQ-2001', 'Crepera Eléctrica Doble', 'Krampouz', 'CEBIV4-D', 'KRP-50121-Z', 10, '{"diametro_placas":"40 cm x 2","potencia":"3000W x 2","voltaje":"220V Bifásico","termostato":"50°C a 300°C"}', '2026-05-20', '2026-08-20'),
  ('EQ-3001', 'Licuadora Industrial', 'Vitamix', 'The Quiet One', 'VTX-909543-F', 18, '{"potencia":"1800W","voltaje":"110V","capacidad":"2.0 L","velocidades":"Control variable","certificacion":"NSF/SST"}', '2026-06-10', '2026-09-10');

