@echo off
title Remover Assinador MCI
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1" -Desinstalar
echo.
pause
