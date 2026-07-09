<p align="center">
  <img src="public/logo_crepes_waffles.svg" alt="Crepes &amp; Waffles Logo" width="420" />
</p>

# Crepes en Punto — Sistema de Control y Gestión Operativa (v2.0)

**Crepes en Punto** es una plataforma web integral de nivel corporativo diseñada para la gestión, auditoría, control operativo y trazabilidad en tiempo real de toda la red de Puntos de Venta (PDV). La plataforma centraliza las operaciones de Mantenimiento, Sistemas, Calidad, Seguridad y Salud en el Trabajo (SST), Talento Humano (VRH) y Formación, garantizando un control riguroso de cada procedimiento e intervención técnico-administrativa en los establecimientos de la marca.

---

## 🛠️ Stack Tecnológico & Arquitectura

- **Frontend & Backend API**: [Next.js](https://nextjs.org/) (App Router & API Routes).
- **Base de Datos**: [SQLite](https://www.sqlite.org/) local a través de `better-sqlite3`, con motor de migraciones evolutivas e índices de alta velocidad para consulta histórica.
- **Estilos & Diseño Visual**: Vanilla CSS personalizado y responsivo, manteniendo la identidad visual corporativa (marrón, crema y dorado). Arquitectura *Mobile-First / PWA* que transforma vistas complejas en **Tarjetas Operativas (*Mobile Cards*)** con navegación por gestos (`scroll-snap`) para operarios en campo con dispositivos móviles.
- **Autenticación & Seguridad**: JSON Web Tokens (JWT) almacenados en cookies seguras `HTTP-only` con control de acceso por roles (RBAC).
- **Escáner QR & Hardware**: Integración directa con cámaras web y dispositivos móviles mediante `html5-qrcode` para lectura instantánea de etiquetas en maquinaria y activos físicos.
- **Infraestructura & Despliegue**: Soporte nativo para despliegue en servidor de red con scripts por lotes (`.bat`) automatizados, instalación como Servicio de Windows y túneles seguros hacia internet mediante `cloudflared`.

---

## 🚀 Funcionalidades Principales

### 1. 🔑 Control de Acceso y Seguridad por Roles (17 Roles Estructurados)
- Flujo de autenticación cifrado con Bcrypt y JWT.
- **Jerarquía y Roles del Sistema**:
  - **Administrador**: Acceso total a configuraciones globales, variables maestras, usuarios, ciudades, áreas y auditorías globales.
  - **Coordinador**: Gestión territorial por ciudades asignadas (Cartagena, Barranquilla, Santa Marta), supervisión del semáforo operativo y gestión de bloqueos temporales.
  - **Jefes de Área (Sistemas, Mantenimiento, etc.)**: Aprobación de auditorías, gestión y supervisión analítica de todas las intervenciones de su especialidad.
  - **Supervisores y Auxiliares Operativos (Sistemas, Mantenimiento, Calidad, SST, VRH, Formación)**: Ejecución en sitio de visitas técnicas y auditorías específicas para su división o especialidad.
  - **Puntos de Venta (PDVs)**: Cuentas específicas para cada restaurante o módulo de atención, permitiendo al personal en sitio reportar novedades y generar tickets o solicitudes de asistencia técnica en tiempo real.
- **Login Rápido para Pruebas**: Panel de autenticación con botones de autocompletado rápido para facilitar las pruebas en entornos de desarrollo (contraseña maestra de prueba: `admin123`).

### 2. 📊 Dashboard Ejecutivo en Tiempo Real & Trazabilidad Histórica
- Indicadores numéricos consolidados del estado general de la red (Puntos Activos, Con Alertas, Fuera de Servicio y Bloqueados).
- Gráficos interactivos de distribución de auditorías por área operativa y porcentaje de operatividad por ciudad.
- **Línea de Tiempo de Trazabilidad (Timeline)**: Registro cronológico, inmutable y auditable de cada cambio de estado o intervención en los PDVs, identificando fecha, usuario responsable, ciudad y texto de justificación.

### 3. 📍 Semáforo Operativo y Gestión Territorial
- Cuadrícula interactiva y filtrable por ciudad, zona y estado de salud operativa (`Trabajando en sitio`, `Alerta de Servicio`, `Fuera de Servicio`, `Provisional / Bloqueado`).
- **Justificación Obligatoria y Auditoría**: El cambio del estado de salud de un Punto de Venta es un proceso controlado para Administradores y Coordinadores, que exige la redacción detallada del motivo o falla técnica que origina la novedad, alimentando el historial general del sistema.

### 4. 🎫 Módulo de Solicitudes y Tickets de Asistencia Técnica (PDVs → Mantenimiento / Sistemas)
- Canal directo donde los **Puntos de Venta (PDVs)** o supervisores abren requerimientos técnicos o reportan incidencias en maquinaria, software, POS o infraestructura.
- **Clasificación por Urgencia y Área**: El ticket se clasifica según su urgencia (`Urgente` vs `Revisar`) y se direcciona directamente al área competente (Mantenimiento, Sistemas, etc.).
- **Ciclo de Vida y Gestión Operativa**: Los supervisores y jefes de área gestionan las solicitudes alternando sus estados (`Pendiente`, `Programada`, `Rechazada`). Con un solo clic se permite **programar una visita o auditoría correctiva en el calendario** directamente asociada a la solicitud y al PDV afectado.

### 5. 📅 Calendario de Operaciones Inteligente y Prevención de Cruces
- Agenda visual multinivel con vistas por Mes, Semana y Día para coordinar el despliegue del personal técnico y administrativo.
- **Validación Anti-cruce de Horarios**: El motor del calendario valida y bloquea automáticamente la superposición de dos visitas en el mismo intervalo de tiempo para un mismo Punto de Venta.
- **Control Contextual de Ejecución**: La visibilidad de la agenda es global para una correcta coordinación, pero el botón de acción **"Ejecutar Auditoría / Modo Visita"** solo se habilita si el usuario pertenece al área asignada de la visita o es Administrador/Coordinador.

### 6. 📋 Modo Visita, Checklists Dinámicos (BPM) y Flujos Específicos por Área
- **Flujos Inteligentes por Área (`Técnico` vs `Administrativo`)**:
  - *Flujo Técnico (Mantenimiento y Sistemas)*: Habilita el registro de diagnósticos de falla, selección del equipo intervenido (`equipo_id`), repuestos utilizados, hallazgos técnicos detectados y acciones correctivas aplicadas.
  - *Flujo Administrativo (Calidad, SST, VRH, Formación)*: Optimizado para inspección de cumplimiento de protocolos, normativas corporativas e higiene.
- **Categorización Jerárquica por Subcategorías**: Cada visita permite seleccionar categorías en dos niveles (Padre → Subcategoría). Por ejemplo, en Mantenimiento se estructuran categorías como `SOPORTE GAS` (`Estufa`, `Plancha`, `Horno Rational`), `LINEA REFRIGERACION`, `INYECCION Y EXTRACCION`, `SOPORTE ELECTRICO`; en Sistemas se segrega por `POS`, `Hardware`, `Redes y Conectividad`, etc.
- **Plantillas Dinámicas y Listas de Chequeo BPM**: Soporte nativo para formularios estandarizados corporativos (ejemplo: *DCM-F-DPR-25 Lista de chequeo BPM* con secciones como *Instalaciones y Edificaciones*, *Equipos y Utensilios*, *Personal Manipulador*). Cada pregunta permite evaluación visual por semáforo (`SÍ` en verde, `NO` en rojo, `N/A` en gris) junto con sus respectivas observaciones de hallazgo.
- **Evidencias Comparativas (Antes / Después)**: Carga y comparación visual paralela de fotografías previas y posteriores a la intervención técnica, así como adjuntos documentales.
- **Triple Firma Digital de Trazabilidad**: El cierre formal de la auditoría o visita técnica captura e integra firmas dibujadas en pantalla:
  1. *Firma del Técnico o Auxiliar* responsable de la labor.
  2. *Firma del Funcionario / Gerente del PDV* que recibe y valida el trabajo en el restaurante.
  3. *Aprobación y Firma del Jefe de Área* con sus comentarios formales de revisión.
- **Autocierre de Agenda y Exportación en PDF**: Al firmar y finalizar una visita, la cita vinculada en el calendario se marca automáticamente con visto bueno (`✓`). Pulsando **"Exportar PDF"**, el sistema genera un documento formateado para impresión y archivo corporativo con todas las respuestas, fotos y firmas.

### 7. 📷 Fichas de Equipos, Mantenimiento Preventivo y Escáner QR
- Escáner QR integrado que activa la cámara del celular o tablet para identificar al instante cualquier máquina o equipo en cocina, barra o cuarto frío.
- Buscador manual y catálogo digital por código interno (ej: `EQ-1001`, `EQ-1002`) con ficha técnica (marca, modelo, serie y fecha de instalación).
- Semáforo de mantenimiento preventivo y registro histórico completo del ciclo de vida e intervenciones sufridas por el equipo.

### 8. 🔒 Control de Bloqueos de Horario y Suspensión de Puntos
- Herramienta para programar bloqueos y paradas operativas programadas por mantenimiento mayor, fumigación, remodelación o emergencias.
- Al activarse un bloqueo, el PDV cambia a estado `Provisional / Bloqueado` y se previene la agendación de auditorías estándar hasta que los coordinadores liberen el bloqueo.

### 9. 📁 Repositorio Documental Clasificado por Carpetas Físicas y BD
- Módulo de almacenamiento digital estructurado por categorías (`evidencia_visita`, `reporte_excel`, `manual_equipo`, `documento_pdv`, `general`).
- Sistema de sincronización híbrida que organiza los archivos físicamente en el servidor en carpetas especializadas (`public/archivos/excel`, `public/archivos/fotos`, `public/archivos/pdf`, `public/archivos/documentos`) respaldado con registros indexados e historiales de descarga en SQLite.

### 10. 📈 Reportes Analíticos por Área, KPIs y Tarjetas Móviles (*Mobile Cards*)
- Centro analítico multi-filtro (por Ciudad, Área Operativa, Categoría, Estado de Visita y Rangos de Fechas) con indicadores cuantitativos (KPIs) de cumplimiento y resolución.
- **Modal de Expediente Completo (Sin salir de la pantalla)**: Al hacer clic en **"👁️ Ver Detalle"**, se abre un expediente estructurado en 4 pestañas interactivas (*Resumen & Checklist*, *Repuestos & Hallazgos*, *Evidencias Fotográficas*, *Firmas y Trazabilidad*).
- **Enlace Inter-módulos**: Botón **"🔗 Ir a Gestión en Módulo Operativo"** que redirige instantáneamente a la auditoría seleccionada dentro del módulo de Visitas para su edición o seguimiento.
- **Experiencia de Usuario PWA / Mobile-First**: En pantallas móviles de campo (< 768px), las tablas de datos se convierten en **Tarjetas Operativas (*Mobile Cards*)** con carruseles de indicadores táctiles (`scroll-snap`), garantizando agilidad para el personal técnico sin necesidad de hacer zoom ni scroll horizontal en sus celulares.

### 11. ⚙️ Panel de Control del Administrador (Variables Maestras)
- Gestión completa de usuarios (asignación de roles de 1 a 17, vinculación de ciudades y asociación de Puntos de Venta PDV).
- Catálogo y administración de Puntos de Venta (PDV), sus direcciones, ubicaciones y semáforos iniciales.
- Mantenimiento del maestro de Ciudades y configuración de Áreas Operativas con personalización de paletas de color en formato hexadecimal y tipología de flujo.

---

## 📂 Estructura del Proyecto

```text
crepes-app/
├── database/                   # Archivos relacionados con la Base de Datos SQLite
│   ├── crepes.db               # Base de datos activa y en producción
│   ├── schema.sql              # Estructura relacional de tablas y triggers
│   └── seed.sql                # Datos semilla iniciales
├── public/                     # Recursos estáticos de la plataforma web
│   ├── archivos/               # Repositorio Documental estructurado por tipología
│   │   ├── documentos/         # Archivos Word, TXT, PPT
│   │   ├── excel/              # Hojas de cálculo y reportes exportados (.xls, .xlsx, .csv)
│   │   ├── fotos/              # Evidencias fotográficas e imágenes de auditoría (.webp, .jpg, .png)
│   │   ├── general/            # Documentación general y misceláneos
│   │   └── pdf/                # Manuales de equipos y reportes PDF (.pdf)
│   ├── uploads/                # Carpeta del sistema de carga Legacy / transitorio
│   ├── cloudflared.exe         # Ejecutable para túneles de exposición exterior segura
│   └── logo_crepes_waffles.svg # Identidad visual corporativa
├── src/
│   ├── app/                    # Rutas y páginas de la aplicación (Next.js 14 App Router)
│   │   ├── (dashboard)/        # Vistas operativas protegidas por autenticación (Layout corporativo)
│   │   │   ├── admin/          # Panel de administración de variables maestras (Usuarios, PDVs, Áreas, Ciudades)
│   │   │   ├── archivos/       # Gestor web del Repositorio Documental
│   │   │   ├── bloqueos/       # Control y programación de bloqueos de horario por PDV
│   │   │   ├── calendario/     # Calendario general operativo inteligente (Mes/Semana/Día)
│   │   │   ├── dashboard/      # Dashboard principal interactivo con Timeline de trazabilidad
│   │   │   ├── equipos/        # Fichas técnicas de maquinaria, mantención y escáner QR en vivo
│   │   │   ├── reportes/       # Analítica por área, KPIs, filtros y vista Mobile Cards
│   │   │   ├── solicitudes/    # Gestión de tickets y solicitudes de asistencia técnica (PDV → Mantenimiento/Sistemas)
│   │   │   ├── territorial/    # Semáforo de salud operativa y matriz territorial por ciudad
│   │   │   └── visitas/        # Programación, ejecución y checklists dinámicos de auditorías
│   │   ├── api/                # Endpoints JSON y servicios REST del Backend
│   │   │   ├── admin/          # CRUD de gestión administrativa
│   │   │   ├── archivos/       # Gestión de descargas y borrado del repositorio
│   │   │   ├── auth/           # Login, logout y validación de tokens JWT
│   │   │   ├── bloqueos/       # API para suspensión y reactivación temporal de PDVs
│   │   │   ├── calendario/     # Consulta combinada de visitas, solicitudes y cruces
│   │   │   ├── dashboard/      # Métricas resumidas y registros del Timeline de trazabilidad
│   │   │   ├── equipos/        # Gestión de fichas de activos y consulta por código QR
│   │   │   ├── historial/      # Registro histórico por equipo e intervenciones
│   │   │   ├── pdv/            # Gestión del semáforo, ubicaciones y justificaciones de cambio
│   │   │   ├── plantillas/     # Consulta de plantillas de evaluación (Checklists y BPM)
│   │   │   ├── reportes/       # Consultas SQL con agregaciones y filtros multicriterio
│   │   │   ├── roles-permisos/ # Gestión de permisos por rol
│   │   │   ├── solicitudes/    # CRUD para creación, cambio de estado y programación de tickets
│   │   │   ├── uploads/        # Motor de procesamiento de subida de archivos y fotos al servidor
│   │   │   ├── users/          # Gestión de cuentas de usuario y contraseñas
│   │   │   └── visitas/        # Guardado del Modo Visita, firmas digitales y completado
│   │   ├── globals.css         # Sistema de diseño global corporativo y responsive en Vanilla CSS
│   │   ├── layout.js           # Layout raíz de la aplicación web
│   │   └── page.js             # Pantalla principal de acceso / Login
│   └── lib/                    # Helpers de base de datos (`db.js`) y utilidades de sesión
├── add-bpm-checklist.js        # Script instalador de la plantilla corporativa Lista de Chequeo BPM
├── init-db.js                  # Inicializador y generador de tablas en SQLite
├── migrate-db-2.js a 8.js      # Scripts del motor de migración evolutiva de base de datos
├── reset-passwords.js          # Utilidad para restaurar contraseñas de prueba a Bcrypt
├── run-all-migrations.js       # Ejecutor general en orden de todas las migraciones (1 a 8)
├── iniciar_servidor.bat        # Script por lotes para encendido rápido del servidor en Windows
├── actualizar_servidor.bat     # Script de actualización de repositorio y dependencias
├── compartir_en_internet.bat   # Script para iniciar túnel seguro local hacia internet con Cloudflare
└── next.config.mjs             # Configuración del servidor Next.js
```

---

## 🛠️ Instrucciones de Instalación, Migración y Despliegue

### 1. Prerrequisitos del Sistema
- [Node.js](https://nodejs.org/) v18.x o superior.
- Sistema Operativo Windows, Linux o macOS (optimizado para servidores Windows y entornos locales de red).

### 2. Instalación de Dependencias
Abre la consola en el directorio `crepes-app` e instala los paquetes:
```bash
npm install
```

### 3. Inicialización y Migraciones de Base de Datos
Para generar la base de datos desde cero o actualizar una instalación existente con todas las nuevas tablas (repositorio por carpetas, plantillas BPM, categorización por equipos, solicitudes de asistencia y roles de Puntos de Venta):
```bash
# 1. Inicializar estructura base
node init-db.js

# 2. Ejecutar todas las migraciones evolutivas (v2 hasta v8)
node run-all-migrations.js

# 3. Instalar/verificar la plantilla corporativa de Lista de Chequeo BPM
node add-bpm-checklist.js
```
*(Opcional)* Si deseas restablecer las contraseñas de todas las cuentas preconfiguradas a la clave maestra de prueba (`admin123`), ejecuta:
```bash
node reset-passwords.js
```

### 4. Iniciar en Entorno de Desarrollo o Red Local
Para levantar el servidor web en el puerto `3000`:
```bash
npm run dev
```
O de forma automática en Windows haciendo doble clic en **`iniciar_servidor.bat`**. La aplicación estará disponible en [http://localhost:3000](http://localhost:3000) o en la dirección IP del computador en la red de área local (`http://IP-LOCAL:3000`).

### 5. Compilación y Despliegue en Producción
Para compilar la aplicación y maximizar su velocidad de respuesta en un servidor productivo:
```bash
npm run build
npm run start
```
> [!TIP]
> **Acceso exterior y Servicio de Windows:** Consulta el documento interno `guia_despliegue_windows_service.md` para configurar la aplicación para que se inicie automáticamente como Servicio en segundo plano en Windows Server y para activar el túnel de internet seguro con **`compartir_en_internet.bat`** (vía Cloudflare Tunnel).

---

## 👥 Credenciales de Prueba Preconfiguradas

Para facilitar la exploración de cada uno de los 17 roles y módulos del sistema en entornos de evaluación, todas las cuentas preconfiguradas comparten la contraseña maestra: **`admin123`**

| Rol / Perfil | Correo Electrónico | Ciudad / Alcance | Módulos y Permisos Principales |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@crepesenpunto.com` | Global | Control total, administración de variables maestras, usuarios, ciudades y PDVs. |
| **Coordinador** | `carlos@crepesenpunto.com` | Cartagena | Gestión del Semáforo Territorial, bloqueos de horario y supervisión de auditorías. |
| **Coordinadora** | `maria@crepesenpunto.com` | Barranquilla | Gestión del Semáforo Territorial en su zona, bloqueos y reportes. |
| **Jefe de Sistemas** | `jefe_sistemas@crepesenpunto.com` | Global | Flujo técnico, diagnóstico, aprobación de visitas de sistemas y gestión de tickets. |
| **Auxiliar de Sistemas** | `aux_sistemas@crepesenpunto.com` | Global | Ejecución en sitio de soporte técnico en hardware, redes, POS e impresoras. |
| **Supervisor Mantenimiento** | `luis@crepesenpunto.com` | Global | Flujo técnico de mantenimiento (gas, inyección, refrigeración, locativo), repuestos y QR. |
| **Auxiliar Mantenimiento** | `aux_mante@crepesenpunto.com` | Global | Auditoría e intervención física de maquinaria y reporte correctivo. |
| **Supervisor Calidad** | `sandra@crepesenpunto.com` | Global | Flujo administrativo, listas de chequeo BPM, higiene e inspección de manipulación. |
| **Auxiliar Calidad** | `aux_calidad@crepesenpunto.com` | Global | Inspección en sitio de BPM, sanidad y registro de evidencias de limpieza. |
| **Supervisor SST** | `ana@crepesenpunto.com` | Global | Flujo administrativo, inspección de extintores, botiquines, camillas y seguridad de personal. |
| **Auxiliar SST** | `aux_sst@crepesenpunto.com` | Global | Auditoría operativa de condiciones de trabajo seguras y elementos de protección. |
| **Punto de Venta (PDV)** | `pdv_[nombre]@crepesenpunto.com`<br>*(ej: `pdv_altoprado@crepesenpunto.com`)* | Específico al PDV | Creación y seguimiento de **Solicitudes y Tickets de Asistencia Técnica**, firma de visitas recibidas y consulta de agenda. |

