@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ================================================================
:: CREPES EN PUNTO - PANEL DE CONTROL
:: Version 3.0 - Interfaz de texto plano
:: ================================================================

if /I not "%~1"=="run" (
    start "Crepes en Punto - Panel de Control" cmd /k ""%~f0" run"
    exit /b
)

title Crepes en Punto - Panel de Control v3.0
mode con: cols=92 lines=42
color 0B
cd /d "%~dp0"

set "VERSION=3.0.0"
set "PORT=3000"
set "APP_NAME=CREPES EN PUNTO"
set "DB_FILE=database\crepes.sqlite"
set "BACKUP_DIR=backups"

:: ----------------------------------------------------------------
:: Verificacion inicial
:: ----------------------------------------------------------------
call :refresh_status

:main_menu
cls
color 0B

echo.
echo  +==================================================================================+
echo  ^|                         CREPES EN PUNTO - PANEL DE CONTROL                       ^|
echo  ^|                         Sistema de Gestion del Servidor                          ^|
echo  ^|                              Version %VERSION%                                  ^|
echo  +==================================================================================+
echo.
echo  +------------------------------ ESTADO DEL SISTEMA -------------------------------+
echo  ^|  Node.js: [!S_NODE!]    NPM: [!S_NPM!]    Git: [!S_GIT!]    Deps: [!S_DEPS!]    BD: [!S_DB!]  ^|
echo  ^+----------------------------------------------------------------------------------+
echo.
echo  +-------------------------------- MENU PRINCIPAL ----------------------------------+
echo  ^|                                                                                  ^|
echo  ^|   [1]  Iniciar servidor en PRODUCCION                                           ^|
echo  ^|   [2]  Iniciar servidor en DESARROLLO                                            ^|
echo  ^|                                                                                  ^|
echo  ^|   [3]  Actualizar desde GitHub          git pull + npm install + build            ^|
echo  ^|   [4]  Guardar cambios en GitHub        git add + commit + push                   ^|
echo  ^|                                                                                  ^|
echo  ^|   [5]  Verificar entorno completo                                                 ^|
echo  ^|   [6]  Respaldar base de datos                                                   ^|
echo  ^|   [7]  Limpiar archivos temporales                                               ^|
echo  ^|                                                                                  ^|
echo  ^|   [0]  Salir                                                                      ^|
echo  ^|                                                                                  ^|
echo  +----------------------------------------------------------------------------------+
echo.
echo  Usuario : %USERNAME%
echo  Equipo  : %COMPUTERNAME%
echo  Fecha   : %DATE%
echo  Hora    : %TIME:~0,8%
echo  Puerto  : %PORT%
echo  Ruta    : %CD%
echo.
echo  ------------------------------------------------------------------------------------
set "opcion="
set /p "opcion=  Seleccione una opcion [0-7]: "

if "%opcion%"=="1" goto opt_production
if "%opcion%"=="2" goto opt_development
if "%opcion%"=="3" goto opt_git_pull
if "%opcion%"=="4" goto opt_git_push
if "%opcion%"=="5" goto opt_verify
if "%opcion%"=="6" goto opt_backup_db
if "%opcion%"=="7" goto opt_cleanup
if "%opcion%"=="0" goto opt_exit

color 0C
echo.
echo  [ERROR] Opcion no valida. Seleccione un numero entre 0 y 7.
timeout /t 2 >nul
goto main_menu


:: ================================================================
:: [1] PRODUCCION
:: ================================================================
:opt_production
cls
color 0A

echo.
echo  +==================================================================================+
echo  ^|                         MODO PRODUCCION                                          ^|
echo  ^|                         Preparando aplicacion...                                  ^|
echo  +==================================================================================+
echo.

call :free_port
if errorlevel 1 goto pause_menu

echo  [1/5] Verificando dependencias...
if not exist "node_modules" (
    echo       Instalando dependencias con npm install...
    call npm install
    if errorlevel 1 goto error_npm
)
echo       [OK] Dependencias listas.
echo.

echo  [2/5] Verificando base de datos...
if exist "%DB_FILE%" (
    echo       [OK] Base de datos encontrada.
) else (
    echo       [AVISO] No se encontro %DB_FILE%.
)
echo.

echo  [3/5] Ejecutando migraciones...
if exist "run-all-migrations.js" (
    call node run-all-migrations.js
    if errorlevel 1 (
        echo       [ERROR] Fallaron las migraciones.
        goto pause_menu
    )
    echo       [OK] Migraciones completadas.
) else (
    echo       [INFO] No hay archivo de migraciones.
)
echo.

echo  [4/5] Compilando aplicacion Next.js...
echo       Este proceso puede tardar varios minutos.
echo.
call npm run build
if errorlevel 1 goto error_build
echo.
echo       [OK] Compilacion exitosa.
echo.

echo  [5/5] Iniciando servidor de produccion...
echo.
echo  +==================================================================================+
echo  ^|  SERVIDOR LISTO                                                                   ^|
echo  ^|  URL: http://localhost:%PORT%                                                     ^|
echo  ^|  Presiona CTRL+C para detener el servidor.                                        ^|
echo  +==================================================================================+
echo.
start "" "http://localhost:%PORT%"
call npm run start
goto the_end


:: ================================================================
:: [2] DESARROLLO
:: ================================================================
:opt_development
cls
color 0E

echo.
echo  +==================================================================================+
echo  ^|                         MODO DESARROLLO                                           ^|
echo  ^|                         Hot Reload activado                                       ^|
echo  +==================================================================================+
echo.

call :free_port
if errorlevel 1 goto pause_menu

echo  [1/3] Verificando dependencias...
if not exist "node_modules" (
    echo       Instalando dependencias...
    call npm install
    if errorlevel 1 goto error_npm
)
echo       [OK] Dependencias listas.
echo.

echo  [2/3] Verificando base de datos...
if exist "%DB_FILE%" (
    echo       [OK] Base de datos encontrada.
) else (
    echo       [AVISO] Base de datos no encontrada.
)
echo.

echo  [3/3] Ejecutando migraciones...
if exist "run-all-migrations.js" (
    call node run-all-migrations.js
    if errorlevel 1 goto pause_menu
    echo       [OK] Migraciones completadas.
) else (
    echo       [INFO] No hay archivo de migraciones.
)
echo.

echo  +==================================================================================+
echo  ^|  SERVIDOR DE DESARROLLO                                                           ^|
echo  ^|  URL: http://localhost:%PORT%                                                     ^|
echo  ^|  Los cambios se reflejan automaticamente.                                        ^|
echo  ^|  Presiona CTRL+C para detener.                                                    ^|
echo  +==================================================================================+
echo.
start "" "http://localhost:%PORT%"
call npm run dev
goto the_end


:: ================================================================
:: [3] GIT PULL
:: ================================================================
:opt_git_pull
cls
color 0D

echo.
echo  +==================================================================================+
echo  ^|                         ACTUALIZAR DESDE GITHUB                                   ^|
echo  ^|                         git pull + install + build                                ^|
echo  +==================================================================================+
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Git no esta instalado o no esta en PATH.
    goto pause_menu
)

echo  [1/3] Descargando cambios desde GitHub...
echo.
git pull origin main
if errorlevel 1 (
    echo.
    echo  [ERROR] No se pudieron descargar los cambios.
    goto pause_menu
)
echo.
echo       [OK] Codigo actualizado.
echo.

echo  [2/3] Actualizando dependencias...
call npm install
if errorlevel 1 goto error_npm
echo       [OK] Dependencias actualizadas.
echo.

echo  [3/3] Generando build de produccion...
echo.
call npm run build
if errorlevel 1 goto error_build

echo.
echo  +==================================================================================+
echo  ^|                         ACTUALIZACION COMPLETADA                                  ^|
echo  ^|                         El proyecto esta listo.                                   ^|
echo  +==================================================================================+
goto pause_menu


:: ================================================================
:: [4] GIT PUSH
:: ================================================================
:opt_git_push
cls
color 0D

echo.
echo  +==================================================================================+
echo  ^|                         GUARDAR CAMBIOS EN GITHUB                                 ^|
echo  ^|                         git add + commit + push                                    ^|
echo  +==================================================================================+
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Git no esta instalado o no esta en PATH.
    goto pause_menu
)

echo  ARCHIVOS MODIFICADOS
echo  ------------------------------------------------------------------------------------
git status --short
echo  ------------------------------------------------------------------------------------
echo.

set "commit_msg="
set /p "commit_msg=  Mensaje del commit: "

if not defined commit_msg (
    set "commit_msg=Actualizacion %DATE% %TIME:~0,8%"
)

echo.
echo  [1/3] Preparando archivos...
git add -A
if errorlevel 1 (
    echo  [ERROR] No se pudieron preparar los archivos.
    goto pause_menu
)
echo       [OK] Archivos preparados.
echo.

echo  [2/3] Creando commit...
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo       [INFO] Puede que no existan cambios para confirmar.
)
echo.

echo  [3/3] Subiendo cambios a GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo  [ERROR] No se pudo ejecutar git push.
    goto pause_menu
)

echo.
echo  +==================================================================================+
echo  ^|                         CAMBIOS GUARDADOS                                         ^|
echo  ^|                         GitHub actualizado correctamente                          ^|
echo  +==================================================================================+
goto pause_menu


:: ================================================================
:: [5] VERIFICAR ENTORNO
:: ================================================================
:opt_verify
cls
color 0B

echo.
echo  +==================================================================================+
echo  ^|                         VERIFICACION DEL ENTORNO                                   ^|
echo  +==================================================================================+
echo.
echo  COMPONENTE                 ESTADO              VERSION
echo  ------------------------------------------------------------------------------------

where node >nul 2>&1
if errorlevel 1 (
    echo  Node.js                   [FALTA]              -
) else (
    for /f "tokens=*" %%v in ('node --version') do echo  Node.js                   [OK]                 %%v
)

where npm >nul 2>&1
if errorlevel 1 (
    echo  NPM                       [FALTA]              -
) else (
    for /f "tokens=*" %%v in ('npm --version') do echo  NPM                       [OK]                 v%%v
)

where git >nul 2>&1
if errorlevel 1 (
    echo  Git                       [NO DISP.]           -
) else (
    for /f "tokens=*" %%v in ('git --version') do echo  Git                       [OK]                 %%v
)

echo.
echo  ARCHIVOS DEL PROYECTO
echo  ------------------------------------------------------------------------------------
if exist "package.json"           (echo  package.json              [OK]) else (echo  package.json              [FALTA])
if exist "node_modules"           (echo  node_modules              [OK]) else (echo  node_modules              [PENDIENTE])
if exist ".next"                  (echo  .next / build             [OK]) else (echo  .next / build             [NO COMPILADO])
if exist "%DB_FILE%"              (echo  crepes.sqlite             [OK]) else (echo  crepes.sqlite             [FALTA])
if exist ".env"                   (echo  .env                      [OK]) else (echo  .env                      [FALTA])

echo.
echo  SERVIDOR
echo  ------------------------------------------------------------------------------------
netstat -aon | find ":%PORT%" | find "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo  Puerto %PORT%               [LIBRE]
) else (
    echo  Puerto %PORT%               [EN USO]
)

echo.
echo  CONFIGURACION
echo  ------------------------------------------------------------------------------------
echo  Directorio: %CD%
echo  Puerto:     %PORT%
echo  Version:    %VERSION%
echo.
goto pause_menu


:: ================================================================
:: [6] BACKUP DB
:: ================================================================
:opt_backup_db
cls
color 0E

echo.
echo  +==================================================================================+
echo  ^|                         RESPALDO DE BASE DE DATOS                                 ^|
echo  +==================================================================================+
echo.

if not exist "%DB_FILE%" (
    echo  [ERROR] No se encontro la base de datos:
    echo          %DB_FILE%
    goto pause_menu
)

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=1-3 delims=/" %%a in ("%DATE%") do (
    set "FECHA=%%c-%%b-%%a"
)

set "HORA=%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "HORA=%HORA: =0%"
set "BFILE=%BACKUP_DIR%\crepes_%FECHA%_%HORA%.sqlite"

echo  Creando respaldo...
copy /Y "%DB_FILE%" "%BFILE%" >nul
if errorlevel 1 (
    echo  [ERROR] No se pudo crear el respaldo.
    goto pause_menu
)

echo.
echo  +==================================================================================+
echo  ^|                         RESPALDO CREADO                                          ^|
echo  ^|  Archivo: %BFILE%
echo  +==================================================================================+
echo.
echo  ULTIMOS RESPALDOS
echo  ------------------------------------------------------------------------------------
dir /b /o-d "%BACKUP_DIR%\*.sqlite" 2>nul
echo  ------------------------------------------------------------------------------------
goto pause_menu


:: ================================================================
:: [7] LIMPIEZA
:: ================================================================
:opt_cleanup
cls
color 0E

echo.
echo  +==================================================================================+
echo  ^|                         LIMPIEZA DEL PROYECTO                                     ^|
echo  +==================================================================================+
echo.
echo  Esta opcion elimina archivos temporales de Next.js.
echo  No elimina node_modules ni la base de datos.
echo.
set "confirm="
set /p "confirm=  Deseas continuar? [S/N]: "

if /I not "%confirm%"=="S" goto main_menu

echo.
echo  [1/2] Eliminando carpeta .next...
if exist ".next" (
    rmdir /s /q ".next"
    echo       [OK] .next eliminada.
) else (
    echo       [INFO] .next no existe.
)

echo.
echo  [2/2] Limpiando archivos temporales de npm...
call npm cache verify >nul 2>&1
echo       [OK] Cache verificada.

echo.
echo  Limpieza completada.
goto pause_menu


:: ================================================================
:: UTILIDADES
:: ================================================================
:refresh_status
set "S_NODE=FALTA"
set "S_NPM=FALTA"
set "S_GIT=NO"
set "S_DEPS=PEND"
set "S_DB=PEND"

where node >nul 2>&1 && set "S_NODE=OK"
where npm >nul 2>&1 && set "S_NPM=OK"
where git >nul 2>&1 && set "S_GIT=OK"
if exist "node_modules" set "S_DEPS=OK"
if exist "%DB_FILE%" set "S_DB=OK"
exit /b

:free_port
echo  [0/5] Verificando puerto %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%PORT%" ^| find "LISTENING"') do (
    echo       Puerto ocupado por PID %%a. Cerrando proceso...
    taskkill /f /pid %%a >nul 2>&1
)
echo       [OK] Puerto %PORT% disponible.
echo.
exit /b

:error_npm
color 0C
echo.
echo  +==================================================================================+
echo  ^|  [ERROR] NO SE PUDIERON INSTALAR LAS DEPENDENCIAS                                ^|
echo  +==================================================================================+
echo  Revisa tu conexion a internet y el mensaje de npm mostrado arriba.
goto pause_menu

:error_build
color 0C
echo.
echo  +==================================================================================+
echo  ^|  [ERROR] FALLO LA COMPILACION                                                    ^|
echo  +==================================================================================+
echo  Revisa el error de Next.js mostrado arriba.
goto pause_menu

:pause_menu
echo.
echo  ------------------------------------------------------------------------------------
echo  Presiona cualquier tecla para volver al menu...
pause >nul
call :refresh_status
goto main_menu

:opt_exit
cls
color 0B
echo.
echo  +==================================================================================+
echo  ^|                         CREPES EN PUNTO                                           ^|
echo  ^|                                                                                  ^|
echo  ^|                         Panel cerrado correctamente.                             ^|
echo  ^|                         Hasta luego.                                              ^|
echo  +==================================================================================+
echo.
timeout /t 2 >nul
exit /b

:the_end
echo.
echo  Servidor detenido.
echo  Presiona cualquier tecla para salir...
pause >nul
