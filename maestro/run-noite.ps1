#Requires -Version 7
<#
.SYNOPSIS
    Runner noturno para testes Maestro ADR-0012 em loop.

.DESCRIPTION
    Roda a suite de testes Maestro várias vezes sem supervisão.
    Cuida de: verificação de pré-requisitos, adb reverse, Metro, backend staging,
    execução com saída JUnit, compilação de resumo CSV/TXT.

.PARAMETER Device
    Serial do dispositivo Android (ex: RQCWC04P4VX).
    Padrão: $env:MAESTRO_DEVICE ou 'RQCWC04P4VX'.

.PARAMETER Iteracoes
    Número de vezes para rodar a suite.
    Padrão: 10.

.PARAMETER Flows
    Caminho para pasta de flows (relativo a maestro/).
    Padrão: 'flows/adr0012'.

.PARAMETER SuitaFlow
    Nome do flow suite a rodar (sem .yaml).
    Padrão: '_suite'.

.EXAMPLE
    .\maestro\run-noite.ps1 -Device RQCWC04P4VX -Iteracoes 5

.EXAMPLE
    $env:MAESTRO_DEVICE = 'RQCWC04P4VX'; .\maestro\run-noite.ps1 -Iteracoes 20
#>

param(
    [string]$Device = $env:MAESTRO_DEVICE ?? 'RQCWC04P4VX',
    [int]$Iteracoes = 10,
    [string]$Flows = 'flows/adr0012',
    [string]$SuitaFlow = '_suite'
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $PSCommandPath
$resultsDir = Join-Path $scriptDir 'results' -AdditionalChildPath (Get-Date -Format 'yyyyMMdd-HHmm')
$csvPath = Join-Path $resultsDir 'resumo.csv'
$txtPath = Join-Path $resultsDir 'resumo.txt'

# ═══════════════════════════════════════════════════════════════════════════
# Função: Verificar pré-requisitos
# ═══════════════════════════════════════════════════════════════════════════
function Test-Prerequisites {
    Write-Host "🔍 Verificando pré-requisitos..." -ForegroundColor Cyan

    # Maestro
    try {
        $maestroVersion = & maestro --version 2>&1 | Select-Object -First 1
        Write-Host "✓ Maestro: $maestroVersion" -ForegroundColor Green
    }
    catch {
        throw "❌ Maestro não encontrado. Instale com: brew install mobile-dev-tools/maestro/maestro"
    }

    # ADB
    try {
        $adbVersion = & adb version 2>&1 | Select-Object -First 1
        Write-Host "✓ ADB: $adbVersion" -ForegroundColor Green
    }
    catch {
        throw "❌ ADB não encontrado. Adicione Android SDK Platform-Tools ao PATH."
    }

    # Device conectado
    $devices = & adb devices | Select-Object -Skip 1 | Select-Object -SkipLast 1 | Where-Object { $_ -match $Device }
    if (-not $devices) {
        throw "❌ Device $Device não encontrado. Use 'adb devices' para listar."
    }
    Write-Host "✓ Device: $Device conectado" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════════════════
# Função: Configurar ADB reverse
# ═══════════════════════════════════════════════════════════════════════════
function Setup-AdbReverse {
    Write-Host "🔧 Configurando adb reverse..." -ForegroundColor Cyan
    & adb -s $Device reverse tcp:8081 tcp:8081
    Start-Sleep -Milliseconds 500
    Write-Host "✓ Metro em localhost:8081 pronto" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════════════════
# Função: Acordar backend staging
# ═══════════════════════════════════════════════════════════════════════════
function Wakeup-Backend {
    Write-Host "🌐 Acordando backend staging..." -ForegroundColor Cyan
    $backendUrl = 'https://diakonia-backend-staging.onrender.com/health'

    for ($i = 1; $i -le 3; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $backendUrl -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "✓ Backend respondendo" -ForegroundColor Green
                return
            }
        }
        catch {
            if ($i -lt 3) {
                Write-Host "  Tentativa $i falhou, aguardando..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
            }
        }
    }
    Write-Host "⚠ Backend não respondeu, continuando mesmo assim..." -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════════════════════
# Função: Verificar Metro
# ═══════════════════════════════════════════════════════════════════════════
function Test-Metro {
    Write-Host "🔄 Verificando Metro..." -ForegroundColor Cyan

    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:8081/status' -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✓ Metro respondendo" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Metro não respondendo em localhost:8081" -ForegroundColor Red
        Write-Host "   Inicie com: cd D:\artos\artos_frontend_dev && npx expo start --dev-client" -ForegroundColor Yellow
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# Função: Rodar uma iteração
# ═══════════════════════════════════════════════════════════════════════════
function Invoke-TestIteration {
    param([int]$IteracaoNum)

    $iterDir = Join-Path $resultsDir $IteracaoNum.ToString('D2')
    New-Item -ItemType Directory -Path $iterDir -Force | Out-Null

    Write-Host "▶ Iteração $IteracaoNum/$(Format-Number $Iteracoes)" -ForegroundColor Cyan

    $flowPath = Join-Path $scriptDir $Flows $("$SuitaFlow.yaml")
    $startTime = Get-Date

    try {
        & maestro --device $Device test $flowPath `
            --format junit `
            --output "$iterDir/results.xml" `
            --test-output-dir "$iterDir"

        $duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Iteração $IteracaoNum passou ($($duration)s)" -ForegroundColor Green
            return @{ Iter = $IteracaoNum; Status = 'PASSOU'; Duration = $duration; Error = $null }
        }
        else {
            Write-Host "✗ Iteração $IteracaoNum falhou ($($duration)s)" -ForegroundColor Red
            return @{ Iter = $IteracaoNum; Status = 'FALHOU'; Duration = $duration; Error = $LASTEXITCODE }
        }
    }
    catch {
        $duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)
        Write-Host "✗ Iteração $IteracaoNum erro: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Iter = $IteracaoNum; Status = 'ERRO'; Duration = $duration; Error = $_.Exception.Message }
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# Função: Compilar resumo CSV/TXT
# ═══════════════════════════════════════════════════════════════════════════
function Write-Summary {
    param([array]$Results)

    Write-Host "📊 Compilando resumo..." -ForegroundColor Cyan

    # CSV
    $csv = @('Iteracao,Status,Duracao(s),Erro')
    $results | ForEach-Object {
        $erro = if ($_.Error) { "`"$($_.Error)`"" } else { '' }
        $csv += "$($_.Iter),$($_.Status),$($_.Duration),$erro"
    }
    $csv | Out-File -Path $csvPath -Encoding UTF8
    Write-Host "✓ CSV: $csvPath" -ForegroundColor Green

    # TXT
    $txt = @(
        '═════════════════════════════════════════════════════════════'
        'Resumo Testes Maestro ADR-0012'
        '═════════════════════════════════════════════════════════════'
        ''
        "Data/Hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        "Device: $Device"
        "Suite: $SuitaFlow"
        "Total: $($results.Count) iterações"
        ''
        "Passou:  $(($results | Where-Object { $_.Status -eq 'PASSOU' }).Count)"
        "Falhou:  $(($results | Where-Object { $_.Status -eq 'FALHOU' }).Count)"
        "Erro:    $(($results | Where-Object { $_.Status -eq 'ERRO' }).Count)"
        ''
        'Detalhes:'
        '─────────────────────────────────────────────────────────────'
    )

    $results | ForEach-Object {
        $linha = "[$($_.Status.PadRight(7))] Iter $($_.Iter.ToString('D2')) | $($_.Duration)s"
        if ($_.Error) {
            $linha += " | Erro: $($_.Error)"
        }
        $txt += $linha
    }

    $txt += @(
        '═════════════════════════════════════════════════════════════'
        "Artefatos: $resultsDir"
        ''
    )

    $txt | Out-File -Path $txtPath -Encoding UTF8
    Write-Host "✓ TXT: $txtPath" -ForegroundColor Green
    Write-Host ''
    Write-Host ($txt | Out-String)
}

# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

try {
    Write-Host ''
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Maestro ADR-0012 Runner Noturno                      ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ''

    # Pré-requisitos
    Test-Prerequisites

    # Verificar Metro
    if (-not (Test-Metro)) {
        throw "Metro não disponível"
    }

    # Setup
    Setup-AdbReverse
    Wakeup-Backend

    Write-Host ''
    Write-Host "🚀 Iniciando $Iteracoes iterações da suite '$SuitaFlow'" -ForegroundColor Cyan
    Write-Host "   Resultados: $resultsDir" -ForegroundColor Gray
    Write-Host ''

    # Criar pasta de resultados
    New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null

    # Rodar iterações
    $results = @()
    for ($i = 1; $i -le $Iteracoes; $i++) {
        $result = Invoke-TestIteration -IteracaoNum $i
        $results += $result

        # Pequeno delay entre iterações (deixa app respirar)
        if ($i -lt $Iteracoes) {
            Start-Sleep -Seconds 3
        }
    }

    # Compilar resumo
    Write-Summary -Results $results

    Write-Host "✅ Suite concluída!" -ForegroundColor Green
    Write-Host "   Verifique: $resultsDir" -ForegroundColor Gray

    # Desligar tela (opcional)
    Write-Host ''
    Write-Host "💤 Desligando tela do device..." -ForegroundColor Cyan
    & adb -s $Device shell svc power stayon false
    Start-Sleep -Milliseconds 500
    Write-Host "✓ Device em standby" -ForegroundColor Green
}
catch {
    Write-Host "❌ Erro fatal: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
