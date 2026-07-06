<p align="center">
  <img src="public/logo_crepes_waffles.svg" alt="Crepes &amp; Waffles Logo" width="420" />
</p>

# Crepes en Punto — Sistema de Control y Gestión Operativa

**Crepes en Punto** es una plataforma web integral diseñada para la gestión, auditoría y control operativo en tiempo real de los Puntos de Venta (PDV) de la red. La plataforma permite coordinar actividades de mantenimiento, calidad, sistemas y seguridad y salud en el trabajo (SST), asegurando trazabilidad absoluta en cada proceso.

---

## 🛠️ Stack Tecnológico

- **Frontend & Backend API**: [Next.js](https://nextjs.org/) (App Router).
- **Base de Datos**: [SQLite](https://www.sqlite.org/) local a través de la librería ultra-rápida `better-sqlite3`.
- **Estilos**: CSS nativo (Vanilla CSS) personalizado para mantener la identidad visual corporativa de la marca (tonos marrón, crema y dorado) de forma responsiva y móvil-first.
- **Autenticación**: JSON Web Tokens (JWT) almacenados en cookies seguras `HTTP-only`.
- **Escaner QR**: Integración directa con cámaras web y dispositivos móviles mediante `html5-qrcode`.

---

## 🚀 Funcionalidades Principales

### 1. 🔑 Control de Acceso y Seguridad por Roles
- Flujo de sesión seguro basado en JWT.
- **Roles del Sistema**:
  - **Administrador**: Acceso total a variables maestras, configuraciones y reportes.
  - **Coordinador**: Gestión territorial de PDVs por ciudad, asignación de bloqueos y visualización de auditorías.
  - **Supervisor de Área (Mantenimiento, Calidad, SST, Sistemas)**: Programación y ejecución de auditorías ("Modo Visita") restringidas a su especialidad.
- **Acceso Rápido de Pruebas**: Panel de login con botones interactivos que autocompletan las credenciales de prueba preconfiguradas (contraseña única: `admin123`).

### 2. 📊 Dashboard Ejecutivo en Tiempo Real
- Indicadores numéricos del estado de la red (Activos, Alertas, Fuera de Servicio).
- Gráfico dinámico de distribución de visitas completadas por área operativa.
- Resumen porcentual de operatividad por ciudad (Cartagena, Barranquilla, Santa Marta).
- **Línea de Tiempo de Trazabilidad (Timeline)**: Registro cronológico e histórico de cada cambio de estado realizado en los PDVs, indicando fecha, responsable y justificación.

### 3. 📍 Semáforo Operativo y Gestión Territorial
- Cuadrícula interactiva de todos los puntos de venta filtrable por ciudad y estado de salud operativa.
- Modales informativos que despliegan la información detallada del PDV y su historial de novedades.
- **Cambio de Estado con Justificación Obligatoria**: Restricción para que solo los Coordinadores o Administradores puedan alternar el estado operativo del PDV, requiriendo un texto de justificación que alimenta la trazabilidad del sistema.

### 4. 📅 Calendario de Operaciones Inteligente
- Agenda visual interactiva en formato mensual, semanal y diario.
- **Validación de Cruce de Horarios**: El sistema impide programar dos visitas en el mismo rango de horas para un mismo PDV.
- **Lógica de Permisos de Área**: 
  - Todos los usuarios pueden visualizar la agenda completa.
  - El botón para ejecutar el **"Modo Visita / Auditoría"** solo se despliega si el usuario conectado pertenece al área asignada del evento, o si es un Administrador/Coordinador.

### 5. 📋 Modo Visita & Gestión de Evidencias (Checklists)
- Flujo autocompletado al presionar "Realizar Auditoría" desde el calendario (asocia automáticamente PDV, área y tipo de checklist).
- **Archivos y Fotos (Antes / Después)**: Permite cargar evidencias fotográficas y archivos PDF locales en el servidor, visualizando las fotos del "Antes" y "Después" una al lado de la otra para comparación directa.
- **Autocierre de Tareas**: Una vez finalizada y guardada la auditoría, el evento del calendario se marca automáticamente como **Completado (✓)**.
- **Exportación en PDF**: Hojas de estilos optimizadas para impresión (`@media print`) que permiten generar un reporte formal y limpio de la auditoría pulsando un botón, ideal para firmas físicas o archivo.

### 6. 📷 Fichas de Equipos y Escáner de Códigos QR
- Acceso directo a la cámara del dispositivo móvil para escanear etiquetas QR adheridas a la maquinaria física.
- Buscador manual alternativo por identificadores de equipos (ej: `EQ-1001`, `EQ-1002`).
- **Ficha Técnica Digital**: Despliegue de marca, modelo, serie y especificaciones del equipo.
- Semáforo preventivo de mantenimiento según la última fecha de servicio y alertas de expiración.
- Historial detallado de todas las intervenciones previas del área de Mantenimiento sobre el equipo consultado.

### 7. 🔒 Control de Bloqueos de Horario
- Permite programar la suspensión temporal de un PDV por eventos especiales, limpiezas profundas o fallas críticas.
- Al activarse un bloqueo, el PDV cambia automáticamente su semáforo a `Provisional / Bloqueado` y se incluye la justificación.
- Los coordinadores pueden dar de alta o finalizar el bloqueo manualmente para restaurar el estado original del PDV (`Trabajando en sitio`).

### 8. 📁 Repositorio Documental y Gestión de Archivos
- Módulo dedicado para la carga, almacenamiento, categorización y descarga de evidencias, manuales, hojas de vida de equipos y documentos corporativos.
- Organización jerárquica en carpetas dentro del proyecto y en la base de datos por área operativa y Punto de Venta (PDV).
- Soporte para adjuntar Excel, Word, PDF e imágenes fotográficas con previsualización directa en el navegador.

### 9. 📈 Reportes por Área y Trazabilidad Operativa
- Panel analítico con indicadores numéricos (KPIs) por área y filtros múltiples (Ciudad, Área, Categoría, Estado, Fechas).
- **Modal de Detalle Completo (Sin salir del reporte)**: Al hacer clic en **"👁️ Ver Detalle"** en una operación, se despliega una ventana modal con 4 pestañas:
  - 📌 **Resumen & Checklist**: Muestra todas las preguntas del formulario evaluadas, resaltando en tarjetas verdes los *SÍ*, en rojas los *NO* y en grises los *N/A*, junto con sus observaciones.
  - 🛠️ **Repuestos & Hallazgos**: Despliega la información técnica de la maquinaria intervenida, diagnóstico del técnico, acciones correctivas y repuestos utilizados.
  - 🖼️ **Evidencias Fotográficas**: Galería visual de las fotografías adjuntas a esa visita.
  - ✍️ **Firmas y Trazabilidad**: Visualización de las firmas digitales capturadas (Técnico/Auxiliar, Funcionario del PDV y Aprobación del Jefe de Área).
- **Navegación Inter-módulos**: Botón **"🔗 Ir a Gestión en Módulo Operativo"** que redirige al usuario a la pantalla de Visitas y abre automáticamente esa visita para su edición o seguimiento.
- **Vista Móvil Responsive (Mobile Cards / PWA)**: Diseño *mobile-first* optimizado para operarios con celular en campo. Al acceder desde teléfonos o pantallas menores a 768px:
  - Las tablas anchas desaparecen y se convierten automáticamente en una lista de **Tarjetas Operativas (*Mobile Cards*)** interactivas.
  - Los indicadores superiores se transforman en un **carrusel horizontal deslizable con el dedo** (`scroll-snap`) para una experiencia de usuario nativa y fluida.

### ⚙️ Panel de Control del Administrador
- Sección dedicada a la administración de variables maestras del negocio:
  - Creación, edición y suspensión de **Usuarios** (roles y ciudades).
  - Gestión de **Puntos de Venta (PDVs)** con sus horarios y ubicaciones.
  - Registro de nuevas **Ciudades**.
  - Alta y personalización visual (colores CSS hexadecimales) de **Áreas Operativas**.

---

## 📂 Estructura del Proyecto

```text
crepes-app/
├── database/            # Archivos relacionados con la Base de Datos SQLite
│   ├── crepes.db        # Base de datos activa
│   ├── schema.sql       # Estructura de tablas y triggers
│   └── seed.sql         # Datos semilla iniciales (usuarios, PDVs, equipos)
├── public/              # Recursos estáticos (Logos, archivos multimedia)
│   └── uploads/         # Carpeta física de almacenamiento de fotos subidas
├── src/
│   ├── app/             # Rutas y páginas de la aplicación Next.js
│   │   ├── (dashboard)/ # Vistas protegidas por autenticación
│   │   │   ├── archivos/ # Módulo de Repositorio Documental y carpetas
│   │   │   ├── reportes/ # Analítica, KPIs y vista de tarjetas móviles
│   │   │   └── visitas/  # Gestión y programación operativa de visitas
│   │   ├── api/         # Servicios backend (endpoints JSON)
│   │   │   ├── archivos/ # Endpoints CRUD para gestión y subida de archivos
│   │   │   └── reportes/ # Consultas SQL optimizadas para trazabilidad
│   │   ├── globals.css  # Diseño de estilos global (CSS corporativo)
│   │   └── page.js      # Pantalla de Login de acceso principal
│   └── lib/             # Helpers de base de datos y utilidades JWT
├── init-db.js           # Inicializador de Base de Datos
├── reset-passwords.js   # Script para resetear claves de prueba a Bcrypt
└── next.config.mjs      # Configuración de Next.js
```

---

## 🛠️ Instrucciones de Despliegue Local

Sigue estos pasos para levantar la aplicación en tu entorno de desarrollo local o servidor:

### 1. Prerrequisitos
Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).

### 2. Instalación de Dependencias
Descarga las librerías necesarias del proyecto:
```bash
npm install
```

### 3. Inicializar la Base de Datos
Crea el archivo de base de datos SQLite y carga las tablas iniciales con el script autoprogramado:
```bash
node init-db.js
```
*(Opcional)* Si necesitas restaurar las contraseñas de todos los usuarios semilla al formato encriptado de prueba (`admin123`), ejecuta:
```bash
node reset-passwords.js
```

### 4. Iniciar Servidor de Desarrollo
Corre el entorno local en el puerto `3000`:
```bash
npm run dev
```
Abre tu navegador en [http://localhost:3000](http://localhost:3000).

### 5. Compilación y Servidor de Producción
Para desplegar la aplicación optimizada para producción:
```bash
npm run build
npm run start
```

---

## 👥 Credenciales de Prueba Preconfiguradas
Todos los usuarios semilla comparten la contraseña genérica: **`admin123`**

| Rol | Correo Electrónico | Ciudad / Alcance |
| :--- | :--- | :--- |
| **Administrador** | `admin@crepesenpunto.com` | Global |
| **Coordinador** | `carlos@crepesenpunto.com` | Cartagena |
| **Coordinadora** | `maria@crepesenpunto.com` | Barranquilla |
| **Supervisor SST** | `ana@crepesenpunto.com` | Global |
| **Supervisor Mantenimiento** | `luis@crepesenpunto.com` | Global |
| **Supervisor Calidad** | `sandra@crepesenpunto.com` | Global |
