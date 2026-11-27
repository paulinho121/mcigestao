@echo off
chcp 65001 >nul
title Preparar modelo 3D para o AR
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao esta instalado neste computador. Instale em https://nodejs.org e tente de novo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Primeira vez: instalando os componentes necessarios. Aguarde...
  call npm install --silent
  if errorlevel 1 ( echo Falha ao instalar. Verifique a internet e tente de novo. & pause & exit /b 1 )
)

set "ARQ=%~1"
if "%ARQ%"=="" set /p ARQ=Arraste o arquivo .glb para esta janela e tecle Enter:
set "ARQ=%ARQ:"=%"

echo.
echo Qual medida REAL do produto voce tem?
echo   1 = Altura (de cima a baixo)
echo   2 = Largura
echo   3 = Profundidade
echo   4 = A maior das tres
set /p OPC=Escolha 1, 2, 3 ou 4:
set "MED=--altura"
if "%OPC%"=="2" set "MED=--largura"
if "%OPC%"=="3" set "MED=--profundidade"
if "%OPC%"=="4" set "MED=--maior"

set /p VAL=Digite essa medida em centimetros (ex.: 55 ou 42,5):

echo.
node preparar-glb.mjs "%ARQ%" %MED% %VAL%
echo.
pause
