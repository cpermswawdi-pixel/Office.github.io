CREATE DATABASE IF NOT EXISTS wms_shadow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON wms_shadow.* TO 'wms_app'@'%';
