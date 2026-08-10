@echo off
setlocal EnableDelayedExpansion

if not "%1"=="run" (
    start "Crepes en Punto - Panel de Control" cmd /k "%~f0" run
    exit /b
)

title Crepes en Punto - Panel de Control v2.0
mode con: cols=85 lines=42
color 0A

set "VERSION=2.0.0"
set "PORT=3000"

:: Obtener versiones
set "NODE_VER=No instalado"
set "NPM_VER=No instalado"
set "GIT_VER=No instalado"
for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
for /f "tokens=*" %%v in ('npm --version 2^>nul') do set "NPM_VER=%%v"
for /f "tokens=*" %%v in ('git --version 2^>nul') do set "GIT_VER=%%v"

:: Verificaciones
set "S_CONF=OK"
set "S_DEPS=OK"
set "S_CODE=OK"
set "S_ENV=OK"
if not exist "package.json" set "S_CONF=FALTA"
if not exist "node_modules" set "S_DEPS=FALTA"
if not exist "src" set "S_CODE=FALTA"
where node >nul 2>nul
if %errorlevel% neq 0 set "S_ENV=FALTA"

:main_menu
cls
color 0A
echo.
echo  ============= CREPES EN PUNTO - PANEL DE CONTROL ================
echo  ^|                                                                ^|
echo  ^|   ####  ####  ##### ####  ##### #####                         ^|
echo  ^|  #     #    # #     #   # #     #                             ^|
echo  ^|  #     ####   ###   ####  ###    ###                          ^|
echo  ^|  #     #  #   #     #    #         #                          ^|
echo  ^|   ####  #  #  ##### #     ##### ####   APP                    ^|
echo  ^|                                                                ^|
echo  ^|  Panel de Control del Servidor                                 ^|
echo  ^|  Version %VERSION%                                                ^|
echo  ^|                                                                ^|
echo  ==================================================================
echo  ^| INFORMACION DEL SISTEMA          ^| ESTADO DEL SISTEMA          ^|
echo  ^|----------------------------------^|-----------------------------^|
echo  ^|  Usuario  : %USERNAME%                    ^|  Configuracion   [ %S_CONF% ]   ^|
echo  ^|  Fecha    : %DATE%          ^|  Dependencias    [ %S_DEPS% ]   ^|
echo  ^|  Hora     : %TIME:~0,8%              ^|  Codigo Fuente   [ %S_CODE% ]   ^|
echo  ^|  Puerto   : %PORT%                  ^|  Entorno          [ %S_ENV% ]   ^|
echo  ^|  Maquina  : %COMPUTERNAME%               ^|                             ^|
echo  ^|  Node.js  : %NODE_VER%             ^|  NPM : %NPM_VER%               ^|
echo  ==================================================================
echo  ^| MENU PRINCIPAL                   ^| DESCRIPCION                 ^|
echo  ^|----------------------------------^|-----------------------------^|
echo  ^|                                  ^|                             ^|
echo  ^|  [1] Iniciar Produccion          ^| Inicia, actualiza o guarda  ^|
echo  ^|  [2] Iniciar Desarrollo          ^| cambios del servidor.       ^|
echo  ^|  [3] Actualizar desde GitHub     ^|                             ^|
echo  ^|  [4] Guardar en GitHub           ^| - Compilacion optimizada    ^|
echo  ^|  [5] Verificar Entorno           ^| - Git pull / push           ^|
echo  ^|  [6] Respaldar Base de Datos     ^| - Respaldo de BD            ^|
echo  ^|                                  ^|                             ^|
echo  ^|  [0] Salir                       ^| Tiempo est: 2-5 minutos    ^|
echo  ^|                                  ^|                             ^|
echo  ==================================================================
echo.

set /p "opcion=  Seleccione una opcion [0-6]: "

if "%opcion%"=="1" goto opt_production
if "%opcion%"=="2" goto opt_development
if "%opcion%"=="3" goto opt_git_pull
if "%opcion%"=="4" goto opt_git_push
if "%opcion%"=="5" goto opt_verify
if "%opcion%"=="6" goto opt_backup_db
if "%opcion%"=="0" goto opt_exit

echo   [!] Opcion no valida.
timeout /t 2 >nul
goto main_menu

:: ===============================================================
:: [1] PRODUCCION
:: ===============================================================
:opt_production
cls
color 0A
echo.
echo  ============= INICIANDO EN MODO PRODUCCION ======================
echo.

echo   [%TIME:~0,8%]  [1/5] Liberando puerto %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%PORT%" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
echo   [OK] Puerto %PORT% liberado.
echo.

echo   [%TIME:~0,8%]  [2/5] Verificando dependencias...
if not exist node_modules (
    echo   Instalando dependencias del proyecto...
    call npm install
    if errorlevel 1 goto error_npm
)
echo   [OK] Dependencias listas.
echo.

echo   [%TIME:~0,8%]  [3/5] Ejecutando migraciones de BD...
if exist "run-all-migrations.js" (
    call node run-all-migrations.js
)
echo   [OK] Base de datos lista.
echo.

echo   [%TIME:~0,8%]  [4/5] Compilando aplicacion...
echo   (Esto puede tomar 2-5 minutos)
echo.
call npm run build
if errorlevel 1 goto error_build
echo.
echo   [OK] Compilacion exitosa.
echo.

echo   [%TIME:~0,8%]  [5/5] Levantando servidor...
echo.
echo  ==================================================================
echo  ^| SERVIDOR LISTO EN: http://localhost:%PORT%                       ^|
echo  ==================================================================
echo   Presiona Ctrl+C para detener el servidor.
echo.
start http://localhost:%PORT% >nul 2>&1
call npm run start
goto the_end

:: ===============================================================
:: [2] DESARROLLO
:: ===============================================================
:opt_development
cls
color 0E
echo.
echo  ============= INICIANDO EN MODO DESARROLLO ======================
echo.

echo   [%TIME:~0,8%]  [1/3] Liberando puerto %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%PORT%" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
echo   [OK] Puerto liberado.
echo.

echo   [%TIME:~0,8%]  [2/3] Verificando dependencias...
if not exist node_modules (
    call npm install
    if errorlevel 1 goto error_npm
)
echo   [OK] Dependencias listas.
echo.

echo   [%TIME:~0,8%]  [3/3] Migraciones de BD...
if exist "run-all-migrations.js" (
    call node run-all-migrations.js
)
echo   [OK] Base de datos lista.
echo.
echo  ==================================================================
echo  ^| SERVIDOR DEV EN: http://localhost:%PORT%                         ^|
echo  ==================================================================
echo   Cambios en el codigo se reflejan en tiempo real.
echo   Presiona Ctrl+C para detener.
echo.
start http://localhost:%PORT% >nul 2>&1
call npm run dev
goto the_end

:: ===============================================================
:: [3] ACTUALIZAR DESDE GITHUB
:: ===============================================================
:opt_git_pull
cls
color 0B
echo.
echo  ============= ACTUALIZAR DESDE GITHUB ===========================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Git no esta instalado.
    echo   Descargalo de: https://git-scm.com
    goto pause_menu
)

echo   [%TIME:~0,8%]  [1/3] Descargando cambios (git pull)...
echo.
call git pull origin main
if errorlevel 1 (
    echo.
    echo   [ERROR] No se pudieron descargar los cambios.
    goto pause_menu
)
echo.
echo   [OK] Codigo actualizado.
echo.

echo   [%TIME:~0,8%]  [2/3] Instalando dependencias...
call npm install
echo   [OK] Dependencias actualizadas.
echo.

echo   [%TIME:~0,8%]  [3/3] Recompilando aplicacion...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo   [ERROR] Error al compilar.
    goto pause_menu
)
echo.
echo  ==================================================================
echo  ^| ACTUALIZACION COMPLETADA EXITOSAMENTE                          ^|
echo  ==================================================================
echo   Inicia el servidor con opcion [1] o [2].
goto pause_menu

:: ===============================================================
:: [4] GUARDAR EN GITHUB
:: ===============================================================
:opt_git_push
cls
color 0B
echo.
echo  ============= GUARDAR CAMBIOS EN GITHUB =========================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Git no esta instalado.
    goto pause_menu
)

echo   Archivos modificados:
echo   ----------------------------------------------------------
git status --short
echo   ----------------------------------------------------------
echo.

set /p "commit_msg=   Mensaje del commit: "
if "%commit_msg%"=="" set "commit_msg=Actualizacion %DATE% %TIME:~0,8%"

echo.
echo   [%TIME:~0,8%]  [1/3] Preparando archivos (git add)...
git add -A
echo   [OK] Archivos preparados.
echo.

echo   [%TIME:~0,8%]  [2/3] Creando commit...
git commit -m "%commit_msg%"
echo   [OK] Commit creado.
echo.

echo   [%TIME:~0,8%]  [3/3] Subiendo a GitHub (git push)...
echo.
git push origin main
if errorlevel 1 (
    echo.
    echo   [ERROR] No se pudo subir a GitHub.
    goto pause_menu
)
echo.
echo  ==================================================================
echo  ^| CAMBIOS GUARDADOS EN GITHUB EXITOSAMENTE                       ^|
echo  ==================================================================
goto pause_menu

:: ===============================================================
:: [5] VERIFICAR ENTORNO
:: ===============================================================
:opt_verify
cls
color 0B
echo.
echo  ============= VERIFICACION DEL ENTORNO ==========================
echo.
echo   Componente              Estado         Version
echo   ----------------------------------------------------------

where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node --version') do echo   Node.js                 [ OK ]         %%v
) else (
    echo   Node.js                 [FALTA]
)

where npm >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('npm --version') do echo   NPM                     [ OK ]         v%%v
) else (
    echo   NPM                     [FALTA]
)

where git >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('git --version') do echo   Git                     [ OK ]         %%v
) else (
    echo   Git                     [NO DISP.]
)

echo   ----------------------------------------------------------
echo.
echo   Archivos del Proyecto
echo   ----------------------------------------------------------
if exist "package.json"            (echo   package.json            [ OK ]) else (echo   package.json            [FALTA])
if exist "node_modules"            (echo   node_modules            [ OK ]) else (echo   node_modules            [PEND.])
if exist ".next"                   (echo   .next [build]           [ OK ]) else (echo   .next [build]           [PEND.])
if exist "database\crepes.sqlite"  (echo   crepes.sqlite           [ OK ]) else (echo   crepes.sqlite           [PEND.])
if exist ".env"                    (echo   .env                    [ OK ]) else (echo   .env                    [FALTA])
echo   ----------------------------------------------------------
echo.
echo   Puerto %PORT%
echo   ----------------------------------------------------------
netstat -aon | find ":%PORT%" | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo   Estado: EN USO
) else (
    echo   Estado: LIBRE
)
echo   ----------------------------------------------------------
goto pause_menu

:: ===============================================================
:: [6] RESPALDAR BD
:: ===============================================================
:opt_backup_db
cls
color 0E
echo.
echo  ============= RESPALDO DE BASE DE DATOS =========================
echo.

if not exist "database\crepes.sqlite" (
    echo   [ERROR] No se encontro la base de datos.
    goto pause_menu
)

set "BACKUP_DIR=backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=1-3 delims=/" %%a in ("%DATE%") do set "FECHA=%%c-%%b-%%a"
set "BFILE=%BACKUP_DIR%\crepes_%FECHA%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%.sqlite"
set "BFILE=%BFILE: =0%"

echo   Copiando base de datos...
copy "database\crepes.sqlite" "%BFILE%" >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] No se pudo crear el respaldo.
    goto pause_menu
)
echo.
echo  ==================================================================
echo  ^| RESPALDO CREADO: %BFILE%
echo  ==================================================================
echo.
echo   Respaldos disponibles:
echo   ----------------------------------------------------------
dir /b "%BACKUP_DIR%\*.sqlite" 2>nul
echo   ----------------------------------------------------------
goto pause_menu

:: ===============================================================
:: [0] SALIR
:: ===============================================================
:opt_exit
cls
echo.
echo   Hasta luego - Crepes en Punto
echo.
timeout /t 1 >nul
exit /b

:: ===============================================================
:: ERRORES
:: ===============================================================
:error_npm
color 0C
echo.
echo   [ERROR] No se pudieron instalar las dependencias.
echo   Si no hay internet, copia 'node_modules' manualmente.
goto pause_menu

:error_build
color 0C
echo.
echo   [ERROR] Fallo la compilacion del proyecto.
echo   Revisa los errores arriba en la consola.
goto pause_menu

:pause_menu
echo.
echo   ----------------------------------------------------------
echo   Presiona cualquier tecla para volver al menu...
echo   ----------------------------------------------------------
pause >nul
goto main_menu

:the_end
echo.
echo   El servidor se ha detenido.
echo   Presiona cualquier tecla para salir...
pause >nul
