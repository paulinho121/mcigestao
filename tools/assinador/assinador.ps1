<#
  Assinador local MCI

  Pequeno servidor que roda SÓ neste computador (127.0.0.1) e assina dados com o
  certificado digital instalado no Windows (token / cartão A3 do pendrive).
  O app Estoque MCI (no navegador) fala com ele para assinar os contratos em PDF.

  - A chave privada NUNCA sai do token: este script só pede ao Windows para assinar.
  - O PIN é pedido pelo próprio driver do token (janela do fabricante).
  - Só aceita pedidos vindos dos endereços do app (veja $OrigensPermitidas).

  Uso: dê duplo clique em Assinador-MCI.bat e deixe a janela aberta enquanto assina.
  Teste sem token: .\assinador.ps1 -PfxTeste caminho.pfx -SenhaTeste senha
#>
param(
    [int]$Porta = 47890,
    [string]$PfxTeste = '',
    [string]$SenhaTeste = '',
    [switch]$Oculto          # modo segundo plano (instalado): sem janela, registra em assinador.log
)

$ErrorActionPreference = 'Stop'

if ($Oculto) {
    $pastaLog = Split-Path -Parent $MyInvocation.MyCommand.Path
    $arqLog = Join-Path $pastaLog 'assinador.log'
    if ((Test-Path $arqLog) -and ((Get-Item $arqLog).Length -gt 1MB)) { Remove-Item $arqLog -Force }
    try { Start-Transcript -Path $arqLog -Append | Out-Null } catch { }
}
Add-Type -AssemblyName System.Security

$Versao = '1.0'
$OrigensPermitidas = @(
    'https://estoquemci.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173'
)

# Provedores de chave que indicam token / cartão (certificado A3)
$RegexHardware = 'smart ?card|token|safenet|etoken|gemalto|watchdata|aladdin|athena|cryptoki|pkcs|oberthur|valid|serpro'

function Get-InfoChave($cert) {
    $provedor = ''
    $hardware = $false
    try {
        $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
        if ($rsa -is [System.Security.Cryptography.RSACryptoServiceProvider]) {
            $info = $rsa.CspKeyContainerInfo
            $provedor = $info.ProviderName
            $hardware = [bool]$info.HardwareDevice -or [bool]$info.Removable
        } elseif ($rsa) {
            $provedor = $rsa.Key.Provider.Provider
        }
    } catch { }
    if (-not $hardware -and $provedor -match $RegexHardware) { $hardware = $true }
    return @{ provedor = $provedor; hardware = $hardware }
}

function Get-Certificados {
    $lista = @()
    if ($PfxTeste) {
        $c = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($PfxTeste, $SenhaTeste)
        $lista += $c
    } else {
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store('My', 'CurrentUser')
        $store.Open('ReadOnly')
        foreach ($c in $store.Certificates) { if ($c.HasPrivateKey -and $c.NotAfter -gt (Get-Date)) { $lista += $c } }
        $store.Close()
    }
    return $lista
}

function Get-CertPorThumbprint($thumb) {
    foreach ($c in (Get-Certificados)) { if ($c.Thumbprint -eq $thumb) { return $c } }
    return $null
}

# Certificado emitido por AC da ICP-Brasil (o que vale para assinar contratos)?
function Test-Icp($c) {
    try {
        $cadeia = New-Object System.Security.Cryptography.X509Certificates.X509Chain
        $cadeia.ChainPolicy.RevocationMode = 'NoCheck'
        [void]$cadeia.Build($c)
        foreach ($e in $cadeia.ChainElements) { if ($e.Certificate.Subject -match 'ICP-?\s?Brasil') { return $true } }
    } catch { }
    return ($c.Issuer -match 'Autoridade Certificadora|(^|[, ])CN=AC |Serpro|Certisign|Serasa|Soluti|Safeweb|Syngular|Valid Certificadora')
}

function ConvertTo-Resumo($c) {
    $k = Get-InfoChave $c
    return @{
        icp        = (Test-Icp $c)
        autoassinado = ($c.Subject -eq $c.Issuer)
        thumbprint = $c.Thumbprint
        nome       = $c.GetNameInfo('SimpleName', $false)
        emissor    = $c.GetNameInfo('SimpleName', $true)
        validade   = $c.NotAfter.ToString('yyyy-MM-dd')
        provedor   = $k.provedor
        hardware   = $k.hardware
    }
}

# signing-certificate-v2 (RFC 5035): exigido por PAdES para amarrar a assinatura ao certificado
function New-AtributoSigningCertV2($cert) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha.ComputeHash($cert.RawData)
    # SEQUENCE { SEQUENCE { SEQUENCE { OCTET STRING hash } } }  (hashAlgorithm padrão = sha256)
    $der = [byte[]](@(0x30, 0x26, 0x30, 0x24, 0x30, 0x22, 0x04, 0x20) + $hash)
    $oid = New-Object System.Security.Cryptography.Oid('1.2.840.113549.1.9.16.2.47')
    return New-Object System.Security.Cryptography.AsnEncodedData($oid, $der)
}

function Invoke-Assinar($thumb, [byte[]]$dados) {
    $cert = Get-CertPorThumbprint $thumb
    if (-not $cert) { throw 'Certificado não encontrado (o token está conectado?).' }

    $conteudo = New-Object System.Security.Cryptography.Pkcs.ContentInfo(, $dados)
    $cms = New-Object System.Security.Cryptography.Pkcs.SignedCms($conteudo, $true)   # destacada (PDF)
    $assinante = New-Object System.Security.Cryptography.Pkcs.CmsSigner($cert)
    $assinante.IncludeOption = [System.Security.Cryptography.X509Certificates.X509IncludeOption]::WholeChain
    $assinante.DigestAlgorithm = New-Object System.Security.Cryptography.Oid('2.16.840.1.101.3.4.2.1')   # SHA-256
    [void]$assinante.SignedAttributes.Add((New-Object System.Security.Cryptography.Pkcs.Pkcs9SigningTime))
    [void]$assinante.SignedAttributes.Add((New-AtributoSigningCertV2 $cert))
    $cms.ComputeSignature($assinante, $false)   # $false = permite a janela de PIN do token
    return $cms.Encode()
}

# ---------- servidor HTTP ----------
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Porta/")
try { $listener.Start() } catch {
    Write-Host "Não foi possível abrir a porta $Porta. Já existe um Assinador aberto?" -ForegroundColor Red
    exit 1
}

Write-Host "Assinador MCI $Versao rodando em http://127.0.0.1:$Porta" -ForegroundColor Green
if ($PfxTeste) { Write-Host 'MODO TESTE: usando certificado de arquivo.' -ForegroundColor Yellow }
Write-Host 'Deixe esta janela aberta enquanto estiver assinando contratos. Ctrl+C para encerrar.'
Write-Host ''

function Send-Json($ctx, $status, $obj) {
    $json = ($obj | ConvertTo-Json -Depth 6 -Compress)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $ctx.Response.StatusCode = $status
    $ctx.Response.ContentType = 'application/json; charset=utf-8'
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.OutputStream.Close()
}

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
        $req = $ctx.Request
        $origem = $req.Headers['Origin']

        if ($origem -and ($OrigensPermitidas -notcontains $origem)) {
            Write-Host "Pedido recusado (origem não permitida): $origem" -ForegroundColor Red
            Send-Json $ctx 403 @{ erro = 'Origem não permitida.' }
            continue
        }
        if ($origem) {
            $ctx.Response.Headers['Access-Control-Allow-Origin'] = $origem
            $ctx.Response.Headers['Vary'] = 'Origin'
            $ctx.Response.Headers['Access-Control-Allow-Headers'] = 'content-type'
            $ctx.Response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            $ctx.Response.Headers['Access-Control-Allow-Private-Network'] = 'true'
        }
        if ($req.HttpMethod -eq 'OPTIONS') { $ctx.Response.StatusCode = 204; $ctx.Response.Close(); continue }

        $rota = $req.Url.AbsolutePath
        if ($req.HttpMethod -eq 'GET' -and $rota -eq '/status') {
            Send-Json $ctx 200 @{ ok = $true; versao = $Versao; teste = [bool]$PfxTeste }
        }
        elseif ($req.HttpMethod -eq 'GET' -and $rota -eq '/certificados') {
            $resumos = @(Get-Certificados | ForEach-Object { ConvertTo-Resumo $_ })
            Send-Json $ctx 200 @{ certificados = $resumos }
        }
        elseif ($req.HttpMethod -eq 'POST' -and $rota -eq '/assinar') {
            $leitor = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $corpo = $leitor.ReadToEnd() | ConvertFrom-Json
            $dados = [Convert]::FromBase64String($corpo.dados)
            Write-Host ("[{0}] Assinando {1:N0} bytes (origem: {2})..." -f (Get-Date -Format 'HH:mm:ss'), $dados.Length, $origem)
            $der = Invoke-Assinar $corpo.thumbprint $dados
            Write-Host '    assinado.' -ForegroundColor Green
            Send-Json $ctx 200 @{ assinatura = [Convert]::ToBase64String($der) }
        }
        else {
            Send-Json $ctx 404 @{ erro = 'Rota não encontrada.' }
        }
    } catch {
        Write-Host ("    erro: " + $_.Exception.Message) -ForegroundColor Red
        try { Send-Json $ctx 500 @{ erro = $_.Exception.Message } } catch { }
    }
}
