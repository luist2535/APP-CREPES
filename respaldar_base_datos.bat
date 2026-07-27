@echo off
title Respaldo Automatico de Base de Datos - Crepes en Punto
color 0B

echo ========================================================================
echo         RESPALDO AUTOMATICO DE LA BASE DE DATOS
echo ========================================================================
echo.

if not exist "database_backups" mkdir "database_backups"

if exist "database\crepes.db" (
    powershell -Command "Copy-Item 'database\crepes.db' -Destination ('database_backups\crepes_backup_' + (Get-Date -Format 'yyyy-MM-dd_HH-mm') + '.db') -Force"
    color 0A
    echo [EXITO] Se ha creado una copia de seguridad segura de tus datos en la carpeta database_backups.
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
