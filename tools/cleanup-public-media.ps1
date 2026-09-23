$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PublicDir = Join-Path $ProjectRoot "public"
$ConfigUrl = "https://brunadcarv.online/config.json?cleanup=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"

Write-Host "Verificando o config.json atual da produção..." -ForegroundColor Cyan
$config = Invoke-RestMethod -Uri $ConfigUrl -Method Get

$extensions = @('.jpg','.jpeg','.png','.webp','.gif','.avif','.mp4','.webm','.mov','.m4v','.mp3','.ogg','.wav','.m4a','.aac','.flac')
$legacy = New-Object System.Collections.Generic.List[string]

function Scan-Value($value) {
  if ($null -eq $value) { return }
  if ($value -is [string]) {
    $clean = ($value -split '\?')[0]
    $ext = [IO.Path]::GetExtension($clean).ToLowerInvariant()
    if ($clean.StartsWith('/') -and -not $clean.StartsWith('/api/media/') -and $extensions -contains $ext) {
      $legacy.Add($clean)
    }
    return
  }
  if ($value -is [System.Collections.IDictionary]) {
    foreach ($key in $value.Keys) { Scan-Value $value[$key] }
    return
  }
  if ($value -is [System.Collections.IEnumerable] -and -not ($value -is [string])) {
    foreach ($item in $value) { Scan-Value $item }
    return
  }
  foreach ($prop in $value.PSObject.Properties) { Scan-Value $prop.Value }
}

Scan-Value $config
$legacy = @($legacy | Sort-Object -Unique)

if ($legacy.Count -gt 0) {
  Write-Host "" 
  Write-Host "ABORTADO: ainda existem mídias locais sendo usadas pela LP:" -ForegroundColor Yellow
  $legacy | ForEach-Object { Write-Host "  $_" }
  Write-Host "" 
  Write-Host "Abra /panel e use 'Migrar tudo para o Blob'. Depois aguarde o redeploy e rode este script novamente." -ForegroundColor Yellow
  exit 1
}

Write-Host "Nenhuma mídia local está sendo usada pelo config de produção." -ForegroundColor Green
Write-Host "Removendo arquivos de mídia antigos de public/ ..." -ForegroundColor Cyan

$files = Get-ChildItem -Path $PublicDir -File -Recurse | Where-Object {
  $extensions -contains $_.Extension.ToLowerInvariant()
}

if (-not $files) {
  Write-Host "Nenhuma mídia antiga encontrada em public/." -ForegroundColor Green
  exit 0
}

foreach ($file in $files) {
  $relative = $file.FullName.Substring($ProjectRoot.Length + 1)
  Write-Host "Removendo $relative"
  Remove-Item -LiteralPath $file.FullName -Force
}

Write-Host "" 
Write-Host "Limpeza concluída. Agora execute:" -ForegroundColor Green
Write-Host 'git add -A'
Write-Host 'git commit -m "Remove midias legadas do GitHub"'
Write-Host 'git push origin main'
