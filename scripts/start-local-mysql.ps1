$ErrorActionPreference = "Stop"

$mysqlBase = Join-Path $env:ProgramFiles "MySQL\MySQL Server 8.4"
$mysqlServer = Join-Path $mysqlBase "bin\mysqld.exe"
$dataDirectory = Join-Path $env:LOCALAPPDATA "WMS-MySQL\Data"

if (-not (Test-Path $mysqlServer)) {
  throw "MySQL Server not found at $mysqlServer. Install Oracle.MySQL 8.4 first."
}

if (-not (Test-Path (Join-Path $dataDirectory "auto.cnf"))) {
  New-Item -ItemType Directory -Force -Path $dataDirectory | Out-Null
  & $mysqlServer --initialize-insecure "--basedir=$mysqlBase" "--datadir=$dataDirectory" --console
  if ($LASTEXITCODE -ne 0) { throw "MySQL data directory initialization failed ($LASTEXITCODE)." }
}

Write-Host "Starting local-only MySQL on 127.0.0.1:3306. Press Ctrl+C to stop it."
& $mysqlServer --no-defaults "--basedir=$mysqlBase" "--datadir=$dataDirectory" --bind-address=127.0.0.1 --port=3306 --console
if ($LASTEXITCODE -ne 0) { throw "MySQL stopped with exit code $LASTEXITCODE." }
