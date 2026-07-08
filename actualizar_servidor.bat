@echo off
if not "%1"=="run" (
    start "Actualizador Automático de Crepes en Punto (Git)" cmd /k "%~f0" run
    exit /b
)

title Actualizador Automático de Crepes en Punto (Git Pull)
color 0F

echo ========================================================================
echo       ACTUALIZANDO SERVIDOR CREPES EN PUNTO DESDE GITHUB (GIT PULL)
echo ========================================================================
echo.
echo [INFO] Este script descargará los últimos cambios subidos a GitHub
echo        y recompilará la aplicación automáticamente.
echo.

:: 0. Verificar si Git está instalado
where git >nul 2>nul
if %errorlevel% neq 0 goto git_missing

:: 1. Verificar conexión y descargar cambios de Git
echo [1/3] Descargando últimas modificaciones desde GitHub (git pull)...
git status >nul 2>&1
if %errorlevel% neq 0 goto not_git_repo

call git pull origin main
if errorlevel 1 goto pull_error
echo Cambios descargados correctamente.
echo.

:: 2. Instalar nuevas dependencias si las hubiera
echo [2/3] Verificando e instalando nuevas dependencias de Node.js...
where npm >nul 2>nul
if %errorlevel% neq 0 goto npm_missing

call npm install
if errorlevel 1 goto npm_error
echo Dependencias actualizadas.
echo.

:: 3. Recompilar la aplicación Next.js con los nuevos cambios
echo [3/3] Recompilando la aplicación para producción (Next.js Build)...
call npm run build
if errorlevel 1 goto build_error
echo.

color 0A
echo ========================================================================
echo   ¡SERVIDOR ACTUALIZADO Y COMPILADO CON ÉXITO!
echo ========================================================================
echo Todos los cambios nuevos del equipo ya están listos en este servidor.
echo Ahora puedes abrir 'iniciar_servidor.bat' para arrancar la aplicación.
echo ========================================================================
goto end

:git_missing
color 0C
echo ========================================================================
echo [ERROR CRITICO] GIT NO ESTA INSTALADO EN ESTE SERVIDOR
echo ========================================================================
echo Para poder actualizar automáticamente desde la nube, debes instalar Git:
echo https://git-scm.com/download/win
echo.
echo Si el servidor no tiene internet ni Git, recuerda que para actualizarlo
echo debes copiar la carpeta del proyecto desde tu computadora principal.
echo ========================================================================
goto end

:not_git_repo
color 0C
echo ========================================================================
echo [ERROR] Esta carpeta no está configurada como un repositorio de Git.
echo ========================================================================
goto end

:pull_error
color 0C
echo ========================================================================
echo [ERROR] No se pudieron descargar los cambios de GitHub (git pull).
echo ========================================================================
echo Posibles causas:
echo 1. El servidor no tiene conexión a internet.
echo 2. Hay conflictos de archivos locales que no se han guardado.
echo ========================================================================
goto end

:npm_missing
color 0C
echo ========================================================================
echo [ERROR] Node.js / NPM no está instalado o en el PATH de este servidor.
echo ========================================================================
goto end

:npm_error
color 0C
echo ========================================================================
echo [ERROR] Hubo un problema al ejecutar npm install.
echo ========================================================================
goto end

:build_error
color 0C
echo ========================================================================
echo [ERROR] Error al compilar la aplicación (npm run build).
echo ========================================================================
echo Revisa los mensajes de error arriba en la consola.
echo ========================================================================
goto end

:end
echo.
echo ========================================================================
echo Presiona cualquier tecla o cierra la ventana para salir...
echo ========================================================================
pause >nul
