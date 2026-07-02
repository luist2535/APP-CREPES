# Guía de Despliegue: Configurar Next.js como Servicio de Windows (NSSM)

Esta guía detalla el proceso paso a paso para configurar la aplicación **Crepes en Punto** como un Servicio de Windows en el servidor de producción. Esto permite que la aplicación corra de forma invisible en segundo plano, se inicie sola al arrancar el servidor físico y no requiera mantener abierta ninguna ventana de CMD.

---

## 🛠️ Requisitos Previos

1. Tener instalado **Node.js** y **NPM** en el servidor de producción.
2. Contar con permisos de **Administrador** en el servidor de Windows.
3. Haber clonado o descargado el proyecto en una ruta permanente (ej: `C:\Proyectos\App Crepes 2.0`).

---

## 📥 Paso 1: Descargar y Ubicar NSSM

**NSSM** (Non-Sucking Service Manager) es un gestor de servicios gratuito que convierte cualquier programa en un servicio nativo de Windows.

1. Ve a la página oficial de descarga: [https://nssm.cc/download](https://nssm.cc/download)
2. Descarga la última versión estable (archivo `.zip`).
3. Descomprime el archivo.
4. Entra a la carpeta `win64/` (o `win32/` si tu sistema operativo es de 32 bits).
5. Copia el archivo ejecutable **`nssm.exe`**.
6. Pégalo directamente dentro de la carpeta raíz de tu aplicación:
   `C:\Users\p.tecbqa\Documents\App Crepes 2.0\crepes-app`

---

## ⚙️ Paso 2: Crear el Servicio de Windows

1. Presiona el botón de **Inicio** de Windows.
2. Escribe **`cmd`** o **`Símbolo del sistema`**.
3. Haz clic derecho sobre él y selecciona **Ejecutar como Administrador** (Obligatorio).
4. En la consola, navega a la carpeta de la aplicación:
   ```cmd
   cd "C:\Users\p.tecbqa\Documents\App Crepes 2.0\crepes-app"
   ```
5. Ejecuta el instalador de NSSM:
   ```cmd
   nssm install CrepesApp
   ```
6. Se abrirá una interfaz gráfica sencilla. Completa los siguientes campos:
   * **Path:** Haz clic en los tres puntos (`...`) y busca el ejecutable de NPM. Por defecto en Windows se encuentra en:
     `C:\Program Files\nodejs\npm.cmd`
   * **Startup directory:** Debe ser la ruta de la carpeta de la app (se autocompleta):
     `C:\Users\p.tecbqa\Documents\App Crepes 2.0\crepes-app`
   * **Arguments:** Escribe las palabras para arrancar el servidor:
     `run start`

7. Ve a la pestaña **Details** (Detalles) en la parte superior y configura:
   * **Display name:** `Servidor Crepes en Punto`
   * **Description:** `Servidor de produccion para la aplicacion Crepes en Punto en el puerto 3000.`
   * **Startup type:** Asegúrate de seleccionar **`Automatic`**.

8. Haz clic en el botón **Install service**. Verás un mensaje de confirmación exitoso.

---

## 🚀 Paso 3: Arrancar el Servicio de Windows

1. En tu teclado presiona las teclas `Windows + R`.
2. Escribe **`services.msc`** y presiona **Enter**.
3. Busca en la lista el servicio llamado **`Servidor Crepes en Punto`**.
4. Haz clic derecho sobre él y presiona **`Iniciar`** (o *Start*).
5. Abre tu navegador y ve a `http://localhost:3000` para comprobar que está activo.

---

## 🔄 ¿Cómo Aplicar Cambios si Editas el Código?

Cuando hagas modificaciones o bajes actualizaciones desde GitHub, sigue estos pasos en el servidor para actualizar el servicio:

### 1. Compilar los Nuevos Cambios:
Abre una consola normal en la carpeta de la aplicación (`crepes-app`) y escribe:
```bash
npm run build
```
*(Esto genera los archivos optimizados dentro de la carpeta oculta `.next`).*

### 2. Reiniciar el Servicio para Cargar el Código Nuevo:
* **Desde el Panel Visual:** Abre `services.msc`, busca **Servidor Crepes en Punto**, haz clic derecho y presiona **Reiniciar**.
* **Desde el CMD (Modo Administrador):** Escribe el comando:
  ```cmd
  nssm restart CrepesApp
  ```

---

## 🛑 Comandos Útiles de Administración

Si deseas gestionar el servicio rápidamente desde una consola de Administrador, puedes usar:

* **Iniciar el servicio:** `nssm start CrepesApp`
* **Detener el servicio:** `nssm stop CrepesApp`
* **Reiniciar el servicio:** `nssm restart CrepesApp`
* **Editar la configuración del servicio:** `nssm edit CrepesApp`
* **Eliminar el servicio por completo:** `nssm remove CrepesApp`
