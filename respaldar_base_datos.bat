@echo off
title Respaldo Automatico de Base de Datos - Crepes en Punto
color 0B

echo ========================================================================
echo         RESPALDO AUTOMATICO DE LA BASE DE DATOS
echo ========================================================================
echo.

if not exist "database_backups" mkdir "database_backups"

:: Obtener fecha y hora en formato estandar seguro sin importar el idioma de Windows
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set mydate=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%
set mytime=%datetime:~8,2%-%datetime:~10,2%
set backupname=database_backups\crepes_backup_%mydate%_%mytime%.db

if exist "database\crepes.db" (
    copy /Y "database\crepes.db" "%backupname%" >nul
    color 0A
    echo [EXITO] Se ha creado una copia de seguridad segura de tus datos.
    echo Archivo guardado en: %backupname%
) else (
    color 0C
    echo [ERROR] No se encontro la base de datos principal (database\crepes.db).
)

echo.
echo ========================================================================
:: Si el script se llama desde otro .bat, no pausar
if "%1"=="silent" exit /b
echo Presiona cualquier tecla para salir...
pause >nul
