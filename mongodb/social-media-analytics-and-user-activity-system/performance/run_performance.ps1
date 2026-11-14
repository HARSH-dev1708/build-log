# run_performance.ps1
# Runs the full before/after comparison and saves the output in the results folder.
# Prerequisite: generate_data.js has already been run (social_perf has 100,000 posts).
#
# Run from PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\run_performance.ps1

$dir = $PSScriptRoot
$uri = "mongodb://localhost:27017"
$results = Join-Path $dir "results"
New-Item -ItemType Directory -Force -Path $results | Out-Null

Write-Host "1/4 Resetting to baseline (dropping indexes)..."
mongosh $uri (Join-Path $dir "drop_indexes.js") | Out-Null

Write-Host "2/4 Measuring BEFORE indexing..."
mongosh $uri (Join-Path $dir "perf_queries.js") | Out-File -Encoding utf8 (Join-Path $results "before.txt")

Write-Host "3/4 Creating indexes..."
mongosh $uri (Join-Path $dir "indexes.js") | Out-File -Encoding utf8 (Join-Path $results "indexes_created.txt")

Write-Host "4/4 Measuring AFTER indexing..."
mongosh $uri (Join-Path $dir "perf_queries.js") | Out-File -Encoding utf8 (Join-Path $results "after.txt")

Write-Host ""
Write-Host "===== BEFORE ====="
Get-Content (Join-Path $results "before.txt")
Write-Host ""
Write-Host "===== AFTER ====="
Get-Content (Join-Path $results "after.txt")
Write-Host ""
Write-Host "Saved to: $results"