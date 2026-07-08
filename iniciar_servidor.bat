@echo off
if not "%1"=="run" (
    start "Servidor de Crepes en Punto" cmd /k "%~f0" run
    exit /b
)

title Servidor de Crepes en Punto - Instalador y Ejecutor Automático
color 0F

echo ========================================================================
echo   INICIANDO SERVIDOR Y VERIFICANDO ENTORNO (CREPES EN PUNTO)
echo ========================================================================
echo.

:: 0. Verificar si Node.js está instalado en el servidor
where node >nul 2>nul
if %errorlevel% neq 0 goto node_missing

:: 1. Liberar el puerto 3000 si está ocupado por una instancia previa
echo [1/5] Asegurando que el puerto 3000 este libre...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
echo Puerto 3000 liberado.
echo.

:: 2. Instalar o verificar dependencias de Node.js
if exist node_modules goto check_db
echo [2/5] Instalando dependencias del proyecto (esto puede tomar unos minutos)...
call npm install
if errorlevel 1 goto install_error
echo.

:check_db
echo [2/5] Dependencias verificadas.
echo.
:: 3. Verificar e Inicializar Base de Datos (Migraciones y Plantillas)
echo [3/5] Verificando e inicializando Base de Datos SQLite y carpetas...
call node run-all-migrations.js
if errorlevel 1 (
    color 0E
    echo [ADVERTENCIA] Revisa las notas de la base de datos arriba. Continuado...
)
echo Base de datos lista.
echo.

:: 4. Compilar el proyecto para producción
echo [4/5] Compilando la aplicacion para produccion (Next.js Build)...
call npm run build
if errorlevel 1 goto build_error
echo Aplicacion compilada con exito.
echo.

:: 5. Abrir la URL en el navegador y arrancar el servidor
echo [5/5] Levantando el servidor local de Crepes en Punto...
echo La aplicacion estara disponible en: http://localhost:3000
echo.
start http://localhost:3000 >nul 2>&1

:: Lanzar el servidor en producción
call npm run start

goto end

:node_missing
color 0C
echo ========================================================================
echo [ERROR CRITICO] NODE.JS NO ESTA INSTALADO EN ESTE SERVIDOR
echo ========================================================================
echo Para poder iniciar la aplicacion, primero debes instalar Node.js.
echo.
echo 1. Busca el archivo instalador (.msi) de Node.js que pasaste al servidor.
echo 2. Haz doble clic en el e instalalo (Next -> Next -> Install).
echo 3. Cuando finalice la instalacion, vuelve a abrir este archivo.
echo ========================================================================
goto end

:install_error
color 0C
echo ========================================================================
echo [ERROR] Hubo un problema instalando las dependencias.
echo ========================================================================
echo Si no hay internet en este servidor, asegurate de copiar la carpeta
echo 'node_modules' desde tu computadora principal al servidor.
echo ========================================================================
goto end

:build_error
color 0C
echo ========================================================================
echo [ERROR] Error durante la compilacion del proyecto (Next.js Build).
echo ========================================================================
echo Revisa los errores que aparecen arriba en la terminal.
echo ========================================================================
goto end

:end
echo.
echo ========================================================================
echo El proceso ha finalizado. Puedes revisar los mensajes arriba.
echo Presiona cualquier tecla o cierra la ventana para salir...
echo ========================================================================
pause >nul
