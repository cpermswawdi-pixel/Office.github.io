$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"
$adminPath = Join-Path $projectRoot ".mysql-admin"
$mysqlClient = Join-Path $env:ProgramFiles "MySQL\MySQL Server 8.4\bin\mysql.exe"

if (Test-Path $envPath) {
  throw ".env already exists. Refusing to overwrite credentials or database configuration."
}
if (Test-Path $adminPath) {
  throw ".mysql-admin already exists. Refusing to overwrite local administrator credentials."
}
if (-not (Test-Path $mysqlClient)) {
  throw "MySQL client not found at $mysqlClient."
}

$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 36
$rng.GetBytes($bytes)
$token = [Convert]::ToBase64String($bytes).Replace("+", "-").Replace("/", "_").TrimEnd("=")
$databasePassword = "Db9-$token"
$rootPassword = "Root9-$token"
$jwtSecret = "Jwt9-$token"
$adminPassword = "Wms9-$token"

$sql = @"
CREATE DATABASE IF NOT EXISTS wms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS wms_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'wms_user'@'localhost' IDENTIFIED BY '$databasePassword';
ALTER USER 'wms_user'@'localhost' IDENTIFIED BY '$databasePassword';
CREATE USER IF NOT EXISTS 'wms_user'@'127.0.0.1' IDENTIFIED BY '$databasePassword';
ALTER USER 'wms_user'@'127.0.0.1' IDENTIFIED BY '$databasePassword';
GRANT ALL PRIVILEGES ON wms.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms.* TO 'wms_user'@'127.0.0.1';
GRANT ALL PRIVILEGES ON wms_shadow.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_shadow.* TO 'wms_user'@'127.0.0.1';
ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootPassword';
"@

Push-Location $projectRoot
try {
  $sql | & $mysqlClient --protocol=TCP --host=127.0.0.1 --port=3306 --user=root
  if ($LASTEXITCODE -ne 0) {
    throw "Local MySQL provisioning failed ($LASTEXITCODE). This helper expects a fresh server initialized with an empty root password."
  }

  $config = @"
DATABASE_URL="mysql://wms_user:$databasePassword@127.0.0.1:3306/wms"
SHADOW_DATABASE_URL="mysql://wms_user:$databasePassword@127.0.0.1:3306/wms_shadow"
JWT_SECRET="$jwtSecret"
JWT_EXPIRES_IN="8h"
PORT=4000
CORS_ORIGIN="http://localhost:5173,http://127.0.0.1:5173"
SUPER_ADMIN_NAME="System Administrator"
SUPER_ADMIN_EMAIL="admin@wms.local"
SUPER_ADMIN_PASSWORD="$adminPassword"
VITE_API_URL="http://localhost:4000/api"
PDF_FONT_PATH="C:\Windows\Fonts\tahoma.ttf"
"@
  $admin = "MYSQL_ROOT_PASSWORD=$rootPassword`r`n"
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($envPath, $config, $utf8)
  [IO.File]::WriteAllText($adminPath, $admin, $utf8)
  Write-Host "Database wms and shadow database are configured."
  Write-Host "Generated application and Super Admin credentials are in .env (ignored by Git)."
  Write-Host "Local MySQL root password is stored in .mysql-admin (ignored by Git)."
} finally {
  Pop-Location
}
