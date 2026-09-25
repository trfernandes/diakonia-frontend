<#
.SYNOPSIS
  Roda um lote de flows Maestro num emulador/device e imprime resumo PASS/FAIL.

.DESCRIPTION
  Fase 0 do Plano de Qualidade V2. Roda maestro/flows/ (ou subconjunto) contra um device,
  gera relatorio JUnit em maestro/results/ (ja no .gitignore), e imprime um resumo legivel
  no terminal. Nao instala nem builda nada — Maestro precisa do app ja instalado no device/
  emulador alvo (dev client ou APK, ver artos_frontend_dev/CLAUDE.md "Verificacao de device").

.PARAMETER Device
  UDID do emulador/device (adb devices). Default: emulator-5554 (padrao do emulador headless
  usado no setup E2E, ver memoria "E2E Maestro APK Setup").

.PARAMETER Flows
  Um ou mais arquivos/pastas de flow. Default: maestro/flows inteira.

.PARAMETER ExcludeTags
  Tags Maestro a excluir (ex: flows de bug antigo que nao fazem parte do lote de release).

.PARAMETER IncludeTags
  Tags Maestro a incluir (roda so o subconjunto marcado).

.EXAMPLE
  ./maestro/run-lote.ps1
.EXAMPLE
  ./maestro/run-lote.ps1 -Device emulator-5554 -Flows maestro/flows/escalas.yaml,maestro/flows/eventos.yaml
.EXAMPLE
  ./maestro/run-lote.ps1 -ExcludeTags bug
#>

param(
  [string]$Device = "emulator-5554",
  [string[]]$Flows = @("maestro/flows"),
  [string[]]$ExcludeTags = @(),
  [string[]]$IncludeTags = @()
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$resultsDir = Join-Path $repoRoot "maestro\results"
if (-not (Test-Path $resultsDir)) {
  New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $resultsDir "lote-$timestamp.xml"

$maestroArgs = @("test") + $Flows + @("--udid", $Device, "--format", "JUNIT", "--output", $reportPath)
if ($ExcludeTags.Count -gt 0) {
  $maestroArgs += @("--exclude-tags", ($ExcludeTags -join ","))
}
if ($IncludeTags.Count -gt 0) {
  $maestroArgs += @("--include-tags", ($IncludeTags -join ","))
}

Write-Host "Device: $Device"
Write-Host "Flows: $($Flows -join ', ')"
Write-Host "Comando: maestro $($maestroArgs -join ' ')"
Write-Host ""

& maestro @maestroArgs
$maestroExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "=== Resumo do lote ==="

if (-not (Test-Path $reportPath)) {
  Write-Host "Relatorio JUnit nao foi gerado em $reportPath — Maestro provavelmente falhou antes de rodar qualquer flow (ver output acima)."
  exit $maestroExitCode
}

[xml]$report = Get-Content $reportPath

$suites = $report.testsuites.testsuite
if (-not $suites) {
  $suites = @($report.testsuite)
}

$passed = @()
$failed = @()

foreach ($suite in $suites) {
  $name = $suite.name
  $failures = [int]($suite.failures)
  $errors = [int]($suite.errors)
  if ($failures -gt 0 -or $errors -gt 0) {
    $failed += $name
  } else {
    $passed += $name
  }
}

$total = $passed.Count + $failed.Count
Write-Host "Total: $total | PASS: $($passed.Count) | FAIL: $($failed.Count)"

if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "Flows com FAIL:"
  foreach ($f in $failed) {
    Write-Host "  - $f"
  }
}

Write-Host ""
Write-Host "Relatorio JUnit: $reportPath"

if ($failed.Count -gt 0) {
  exit 1
}
exit 0
