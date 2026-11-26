<#
  Instala o Assinador MCI para abrir sozinho, escondido, sempre que o Windows iniciar.
  Rode UMA vez (duplo clique em Instalar-Assinador-MCI.bat). Não precisa de administrador.

    .\instalar.ps1              instala e já inicia
    .\instalar.ps1 -Desinstalar remove tudo
#>
param(
    [switch]$Desinstalar,
    [switch]$NaoIniciar,
    [string]$Destino = (Join-Path $env:LOCALAPPDATA 'AssinadorMCI'),
    [string]$PastaInicializacao = [Environment]::GetFolderPath('Startup')
)

$ErrorActionPreference = 'Stop'
$Porta = 47890
$origem = Split-Path -Parent $MyInvocation.MyCommand.Path
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
    if (Test-Path $Destino) { Remove-Item $Destino -Recurse -Force }
    Write-Host 'Assinador MCI removido (não abre mais com o Windows).' -ForegroundColor Green
    exit 0
}

Write-Host 'Instalando o Assinador MCI...'
Stop-Assinador

# Cópia fixa: o assinador continua funcionando mesmo que a pasta do projeto seja movida ou apagada
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
Copy-Item (Join-Path $origem 'assinador.ps1') (Join-Path $Destino 'assinador.ps1') -Force

# Lançador invisível (sem janela preta)
$script = Join-Path $Destino 'assinador.ps1'
$vbs = @"
CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$script"" -Oculto", 0, False
"@
New-Item -ItemType Directory -Force -Path $PastaInicializacao | Out-Null
Set-Content -Path $atalho -Value $vbs -Encoding ASCII
Copy-Item $atalho (Join-Path $Destino 'iniciar-oculto.vbs') -Force

Write-Host "  programa : $script"
Write-Host "  abre com o Windows: $atalho"

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
