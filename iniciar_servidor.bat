@echo off
setlocal EnableDelayedExpansion

if not "%1"=="run" (
    start "Crepes en Punto - Panel de Control" cmd /k "%~f0" run
    exit /b
)

title Crepes en Punto - Panel de Control v2.0
mode con: cols=80 lines=38
color 0B
cd /d "%~dp0"

set "VERSION=2.0.0"
set "PORT=3000"

:: Verificaciones
set "S_NODE=FALTA"
set "S_NPM=FALTA"
set "S_GIT=NO DISP."
set "S_DEPS=PENDIENTE"
set "S_DB=PENDIENTE"

where node >nul 2>nul && set "S_NODE=OK"
where npm >nul 2>nul && set "S_NPM=OK"
where git >nul 2>nul && set "S_GIT=OK"
if exist node_modules set "S_DEPS=OK"
if exist "database\crepes.db" set "S_DB=OK"

:main_menu
cls
color 0B
echo.
echo  ==============================================================
echo  #                                                            #
echo  #             CREPES EN PUNTO - PANEL DE CONTROL             #
echo  #             Sistema de Gestion del Servidor                #
echo  #                    Version %VERSION%                           #
echo  #                                                            #
echo  ==============================================================
echo.
echo                       ESTADO DEL SISTEMA
echo   ----------------------------------------------------------------------
echo    Node.js: %S_NODE%    NPM: %S_NPM%    Git: %S_GIT%    Deps: %S_DEPS%    BD: %S_DB%
echo   ----------------------------------------------------------------------
echo.
echo   MENU PRINCIPAL
echo   -----------------------------------------------------------------
echo.
echo    [1]  Iniciar Servidor - Produccion (Recomendado)
echo    [2]  Iniciar Servidor - Desarrollo (Hot Reload)
echo    [3]  Actualizar desde GitHub (git pull + build)
echo    [4]  Guardar cambios en GitHub (git push)
echo    [5]  Verificar Entorno completo
echo    [6]  Respaldar Base de Datos
echo.
echo    [0]  Salir
echo.
echo   -------------------------------------------------------------------------
echo    Usuario: %USERNAME%    Fecha: %DATE%    Hora: %TIME:~0,8%
echo   -------------------------------------------------------------------------
echo.

set /p "opcion=   Seleccione una opcion [0-6]: "

if "%opcion%"=="1" goto opt_production
if "%opcion%"=="2" goto opt_development
if "%opcion%"=="3" goto opt_git_pull
if "%opcion%"=="4" goto opt_git_push
if "%opcion%"=="5" goto opt_verify
if "%opcion%"=="6" goto opt_backup_db
if "%opcion%"=="0" goto opt_exit

echo.
echo   Opcion no valida.
timeout /t 2 >nul
goto main_menu

:: ===============================================================
:: [1] PRODUCCION
:: ===============================================================
:opt_production
cls
color 0A

set "LOGFILE=%~dp0startup_log.txt"
echo [%DATE% %TIME%] === INICIO SERVIDOR PRODUCCION === > "%LOGFILE%"

echo.
echo  ==============================================================
echo  #                                                            #
echo  #        INICIANDO SERVIDOR EN MODO PRODUCCION               #
echo  #                                                            #
echo  ==============================================================
echo.
echo   Toda la salida detallada se guarda en: startup_log.txt
echo   --------------------------------------------------------------
echo.

:: --- Paso 1: Liberar puerto ---
echo   [1/5] Liberando puerto %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%PORT%" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
echo         [OK] Puerto %PORT% liberado.
echo [%TIME%] Puerto %PORT% liberado >> "%LOGFILE%"
echo.

:: --- Paso 2: Dependencias ---
echo   [2/5] Verificando dependencias...
if not exist node_modules (
    echo         Instalando dependencias, espere...
    call npm install >> "%LOGFILE%" 2>&1
    if errorlevel 1 goto error_npm
)
echo         [OK] Dependencias listas.
echo [%TIME%] Dependencias listas >> "%LOGFILE%"
echo.

:: --- Paso 3: Migraciones ---
echo   [3/5] Ejecutando migraciones de base de datos...
if exist "run-all-migrations.js" (
    call node run-all-migrations.js >> "%LOGFILE%" 2>&1
)
echo         [OK] Base de datos actualizada.
echo [%TIME%] Migraciones completas >> "%LOGFILE%"
echo.

:: --- Paso 4: Build ---
echo   [4/5] Compilando aplicacion (esto puede tomar 2-5 min)...
echo         Por favor espere, no cierre esta ventana...
call npm run build >> "%LOGFILE%" 2>&1
if errorlevel 1 goto error_build
echo         [OK] Compilacion exitosa.
echo [%TIME%] Build completado >> "%LOGFILE%"
echo.

:: --- Paso 5: Levantar servidor ---
echo   [5/5] Levantando servidor en produccion...
echo         [OK] Servidor listo.
echo.
echo  ==============================================================
echo  #                                                            #
echo  #   SERVIDOR LISTO EN: http://localhost:%PORT%                #
echo  #                                                            #
echo  ==============================================================
echo.
echo   Presiona Ctrl+C para detener el servidor.
echo   Log completo en: startup_log.txt
echo   --------------------------------------------------------------
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

set "LOGFILE=%~dp0startup_log.txt"
echo [%DATE% %TIME%] === INICIO SERVIDOR DESARROLLO === > "%LOGFILE%"

echo.
echo  ==============================================================
echo  #                                                            #
echo  #        INICIANDO SERVIDOR EN MODO DESARROLLO               #
echo  #                                                            #
echo  ==============================================================
echo.
echo   Toda la salida detallada se guarda en: startup_log.txt
echo   --------------------------------------------------------------
echo.

:: --- Paso 1: Liberar puerto ---
echo   [1/3] Liberando puerto %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%PORT%" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
echo         [OK] Puerto %PORT% liberado.
echo [%TIME%] Puerto liberado >> "%LOGFILE%"
echo.

:: --- Paso 2: Dependencias ---
echo   [2/3] Verificando dependencias...
if not exist node_modules (
    echo         Instalando dependencias, espere...
    call npm install >> "%LOGFILE%" 2>&1
    if errorlevel 1 goto error_npm
)
echo         [OK] Dependencias listas.
echo [%TIME%] Dependencias listas >> "%LOGFILE%"
echo.

:: --- Paso 3: Migraciones ---
echo   [3/3] Ejecutando migraciones de base de datos...
if exist "run-all-migrations.js" (
    call node run-all-migrations.js >> "%LOGFILE%" 2>&1
)
echo         [OK] Base de datos actualizada.
echo [%TIME%] Migraciones completas >> "%LOGFILE%"
echo.

echo  ==============================================================
echo  #                                                            #
echo  #   SERVIDOR DEV EN: http://localhost:%PORT%                   #
echo  #                                                            #
echo  ==============================================================
echo.
echo   Los cambios en el codigo se reflejan en tiempo real.
echo   Presiona Ctrl+C para detener.
echo   --------------------------------------------------------------
echo.
start http://localhost:%PORT% >nul 2>&1
call npm run dev
goto the_end

:: ===============================================================
:: [3] ACTUALIZAR DESDE GITHUB
:: ===============================================================
:opt_git_pull
cls
color 0D
echo.
echo  ==============================================================
echo       ACTUALIZAR SERVIDOR DESDE GITHUB (Git Pull)
echo  ==============================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Git no esta instalado.
    echo   Descargalo de: https://git-scm.com
    goto pause_menu
)

echo   [%TIME:~0,8%] [1/3] Descargando cambios desde GitHub...
echo.
call git pull origin main
if errorlevel 1 (
    echo.
    echo   [ERROR] No se pudieron descargar los cambios.
    echo   Verifica tu conexion a internet.
    goto pause_menu
)
echo.
echo   [OK] Codigo actualizado.
echo.

echo   [%TIME:~0,8%] [2/3] Instalando nuevas dependencias...
call npm install
echo   [OK] Dependencias actualizadas.
echo.

echo   [%TIME:~0,8%] [3/3] Recompilando aplicacion...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo   [ERROR] Error al compilar. Revisa los errores arriba.
    goto pause_menu
)
echo.
echo  ==============================================================
echo   ACTUALIZACION COMPLETADA EXITOSAMENTE
echo  ==============================================================
echo   Puedes iniciar el servidor con la opcion [1] o [2].
goto pause_menu

:: ===============================================================
:: [4] GUARDAR CAMBIOS EN GITHUB
:: ===============================================================
:opt_git_push
cls
color 0D
echo.
echo  ==============================================================
echo       GUARDAR CAMBIOS EN GITHUB (Git Push)
echo  ==============================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Git no esta instalado.
    goto pause_menu
)

echo   Archivos modificados:
echo   -----------------------------------------------------------
git status --short
echo   -----------------------------------------------------------
echo.

set /p "commit_msg=   Describe los cambios: "
if "%commit_msg%"=="" set "commit_msg=Actualizacion %DATE% %TIME:~0,8%"

echo.
echo   [%TIME:~0,8%] [1/3] Preparando archivos (git add)...
git add -A
echo   [OK] Archivos preparados.
echo.

echo   [%TIME:~0,8%] [2/3] Creando commit...
git commit -m "%commit_msg%"
echo   [OK] Commit creado.
echo.

echo   [%TIME:~0,8%] [3/3] Subiendo a GitHub (git push)...
echo.
git push origin main
if errorlevel 1 (
    echo.
    echo   [ERROR] No se pudo subir. Verifica conexion y credenciales.
    goto pause_menu
)
echo.
echo  ==============================================================
echo   CAMBIOS GUARDADOS EN GITHUB EXITOSAMENTE
echo  ==============================================================
goto pause_menu

:: ===============================================================
:: [5] VERIFICAR ENTORNO
:: ===============================================================
:opt_verify
cls
color 0B
echo.
echo  ==============================================================
echo       VERIFICACION DEL ENTORNO
echo  ==============================================================
echo.
echo   Componente              Estado        Version
echo   -----------------------------------------------------------

where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node --version') do echo   Node.js                 [OK]          %%v
) else (
    echo   Node.js                 [FALTA]
)

where npm >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('npm --version') do echo   NPM                     [OK]          v%%v
) else (
    echo   NPM                     [FALTA]
)

where git >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('git --version') do echo   Git                     [OK]          %%v
) else (
    echo   Git                     [NO DISP.]
)

echo   -----------------------------------------------------------
echo.
echo   Archivos del Proyecto
echo   -----------------------------------------------------------
if exist "package.json"            (echo   package.json            [OK]) else (echo   package.json            [FALTA])
if exist "node_modules"            (echo   node_modules            [OK]) else (echo   node_modules            [PENDIENTE])
if exist ".next"                   (echo   .next [build]           [OK]) else (echo   .next [build]           [NO COMPILADO])
if exist "database\crepes.db"  (echo   crepes.db               [OK]) else (echo   crepes.db           [PENDIENTE])
if exist ".env"                    (echo   .env                    [OK]) else (echo   .env                    [FALTA])
echo   -----------------------------------------------------------
echo.
echo   Estado de Red
echo   -----------------------------------------------------------
netstat -aon | find ":%PORT%" | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo   Puerto %PORT%              [EN USO]
) else (
    echo   Puerto %PORT%              [LIBRE]
)
echo   -----------------------------------------------------------
goto pause_menu

:: ===============================================================
:: [6] RESPALDAR BASE DE DATOS
:: ===============================================================
:opt_backup_db
cls
color 0E
echo.
echo  ==============================================================
echo       RESPALDO DE BASE DE DATOS
echo  ==============================================================
echo.

if not exist "database\crepes.db" (
    echo   [ERROR] No se encontro la base de datos.
    goto pause_menu
)

set "BACKUP_DIR=backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=1-3 delims=/" %%a in ("%DATE%") do set "FECHA=%%c-%%b-%%a"
set "BFILE=%BACKUP_DIR%\crepes_%FECHA%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%.sqlite"
set "BFILE=%BFILE: =0%"

echo   Copiando base de datos...
copy "database\crepes.db" "%BFILE%" >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] No se pudo crear el respaldo.
    goto pause_menu
)
echo.
echo  ==============================================================
echo   RESPALDO CREADO: %BFILE%
echo  ==============================================================
echo.
echo   Respaldos disponibles:
echo   -----------------------------------------------------------
dir /b "%BACKUP_DIR%\*.sqlite" 2>nul
echo   -----------------------------------------------------------
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
echo  ==============================================================
echo   [ERROR] No se pudieron instalar las dependencias.
echo  ==============================================================
echo   Si no hay internet, copia 'node_modules' manualmente.
goto pause_menu

:error_build
color 0C
echo.
echo  ==============================================================
echo   [ERROR] Fallo la compilacion del proyecto.
echo  ==============================================================
echo   Revisa los errores arriba en la consola.
goto pause_menu

:pause_menu
echo.
echo   -----------------------------------------------------------
echo   Presiona cualquier tecla para volver al menu...
echo   -----------------------------------------------------------
pause >nul
goto main_menu

:the_end
echo.
echo   El servidor se ha detenido.
echo   Presiona cualquier tecla para salir...
pause >nul
