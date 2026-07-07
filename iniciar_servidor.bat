@echo off
title Servidor de Crepes en Punto - Instalador y Ejecutor Automático
color 0A

echo ========================================================================
echo   INICIANDO SERVIDOR Y VERIFICANDO ENTORNO (CREPES EN PUNTO)
echo ========================================================================
echo.

:: 0. Verificar si Node.js está instalado en el servidor
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR CRITICO] Node.js no esta instalado en este servidor/computador.
    echo.
    echo Para que la aplicacion funcione, debes descargar e instalar Node.js:
    echo https://nodejs.org/
    echo.
    echo Descargando/Abriendo pagina oficial en tu navegador...
    start https://nodejs.org/
    pause
    exit /b
)

:: 1. Liberar el puerto 3000 si está ocupado por una instancia previa
echo [1/5] Asegurando que el puerto 3000 este libre...
call npx --yes kill-port 3000 > nul 2>&1
echo Puerto 3000 liberado.
echo.

:: 2. Instalar o verificar dependencias de Node.js
if not exist node_modules (
    echo [2/5] Instalando dependencias del proyecto (esto puede tomar unos minutos)...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Hubo un problema instalando las dependencias. Verifica tu conexion a internet.
        pause
        exit /b
    )
) else (
    echo [2/5] Dependencias de Node.js verificadas.
)
echo.

:: 3. Verificar e Inicializar Base de Datos (Migraciones y Plantillas)
echo [3/5] Verificando e inicializando Base de Datos SQLite y carpetas...
call node run-all-migrations.js
if %errorlevel% neq 0 (
    color 0E
    echo [ADVERTENCIA] Revisa las notas de la base de datos arriba. Continuado...
)
echo Base de datos lista.
echo.

:: 4. Compilar el proyecto para producción
echo [4/5] Compilando la aplicacion para produccion (Next.js Build)...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Error durante la compilacion del proyecto.
    pause
    exit /b
)
echo Aplicacion compilada con exito.
echo.

:: 5. Abrir la URL en el navegador y arrancar el servidor
echo [5/5] Levantando el servidor local de Crepes en Punto...
echo La aplicacion estara disponible en: http://localhost:3000
echo.
echo Abriendo el navegador web automaticamente...
start http://localhost:3000

:: Lanzar el servidor en producción
call npm run start

pause
