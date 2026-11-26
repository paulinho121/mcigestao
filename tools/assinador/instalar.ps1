<#
  Instala o Assinador MCI para abrir sozinho, escondido, sempre que o Windows iniciar.
  Rode UMA vez (duplo clique em Instalar-Assinador-MCI.bat). Não precisa de administrador.

    .\instalar.ps1              instala e já inicia
    .\instalar.ps1 -Desinstalar remove tudo

  No instalador de arquivo único (public/assinador/Instalar-Assinador-MCI.bat, gerado por
  gerar-instalador.mjs) o assinador.ps1 vem embutido em $AssinadorB64.
#>
param(
    [switch]$Desinstalar,
    [switch]$NaoIniciar,
    [string]$Destino = $(if ($env:ASSINADOR_DESTINO) { $env:ASSINADOR_DESTINO } else { Join-Path $env:LOCALAPPDATA 'AssinadorMCI' }),
    [string]$PastaInicializacao = $(if ($env:ASSINADOR_STARTUP) { $env:ASSINADOR_STARTUP } else { [Environment]::GetFolderPath('Startup') })
)

$ErrorActionPreference = 'Stop'
$AssinadorB64 = '##ASSINADOR_B64##'   # substituído pelo gerador; no modo desenvolvimento fica o marcador
$Porta = 47890
$atalho = Join-Path $PastaInicializacao 'Assinador MCI.vbs'

function Stop-Assinador {
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
        Where-Object { $_.CommandLine -like '*assinador.ps1*' } |
        ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch { } }
    Start-Sleep -Milliseconds 700
}

if ($Desinstalar) {
    Stop-Assinador
    if (Test-Path $atalho) { Remove-Item $atalho -Force }
    if (Test-Path $Destino) { Remove-Item $Destino -Recurse -Force -ErrorAction SilentlyContinue }
    Write-Host 'Assinador MCI removido (não abre mais com o Windows).' -ForegroundColor Green
    exit 0
}

Write-Host 'Instalando o Assinador MCI...'
Stop-Assinador

# Cópia fixa: o assinador continua funcionando mesmo que o instalador seja apagado
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$script = Join-Path $Destino 'assinador.ps1'
if ($AssinadorB64 -notlike '##*') {
    $utf8Bom = New-Object System.Text.UTF8Encoding($true)
    $texto = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($AssinadorB64)).TrimStart([char]0xFEFF)
    [System.IO.File]::WriteAllText($script, $texto, $utf8Bom)
} else {
    $origem = Split-Path -Parent $MyInvocation.MyCommand.Path
    Copy-Item (Join-Path $origem 'assinador.ps1') $script -Force
}

# Lançador invisível (sem janela preta)
$vbs = @"
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$script"" -Oculto", 0, False
"@
New-Item -ItemType Directory -Force -Path $PastaInicializacao | Out-Null
Set-Content -Path $atalho -Value $vbs -Encoding ASCII

# Desinstalador ao lado do programa
$desinstalaPs1 = @"
`$ErrorActionPreference = 'SilentlyContinue'
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { `$_.CommandLine -like '*assinador.ps1*' -and `$_.ProcessId -ne `$PID } | ForEach-Object { Stop-Process -Id `$_.ProcessId -Force }
Start-Sleep -Milliseconds 700
Remove-Item -LiteralPath '$atalho' -Force
Start-Process cmd.exe -ArgumentList '/c ping -n 3 127.0.0.1 >nul & rmdir /s /q "$Destino"' -WindowStyle Hidden
Write-Host 'Assinador MCI removido (não abre mais com o Windows).' -ForegroundColor Green
"@
[System.IO.File]::WriteAllText((Join-Path $Destino 'desinstalar.ps1'), $desinstalaPs1, (New-Object System.Text.UTF8Encoding($true)))
Set-Content -Path (Join-Path $Destino 'Desinstalar-Assinador-MCI.bat') -Encoding ASCII -Value @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0desinstalar.ps1"
timeout /t 3 >nul
"@

Write-Host "  programa : $script"
Write-Host "  abre com o Windows: $atalho"
Write-Host "  para remover: $(Join-Path $Destino 'Desinstalar-Assinador-MCI.bat')"

if (-not $NaoIniciar) {
    Start-Process 'wscript.exe' -ArgumentList ('"' + $atalho + '"')
    $ok = $false
    for ($i = 0; $i -lt 12 -and -not $ok; $i++) {
        Start-Sleep -Milliseconds 500
        try { $r = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Porta/status" -TimeoutSec 2; $ok = ($r.StatusCode -eq 200) } catch { }
    }
    if ($ok) { Write-Host 'Pronto! O Assinador MCI está rodando e abrirá sozinho nas próximas vezes.' -ForegroundColor Green }
    else { Write-Host "Instalado, mas não consegui confirmar que iniciou. Veja $Destino\assinador.log" -ForegroundColor Yellow }
}
