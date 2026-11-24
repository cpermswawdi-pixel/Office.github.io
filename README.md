# ระบบบันทึกการเบิก‑จ่ายวัสดุสำนักงาน (WMS)

ระบบบริหารคลังสินค้าแบบ React/Vite, Express, Prisma และ MySQL ข้อมูลสินค้าและธุรกรรมอ่าน/เขียนจากฐานข้อมูลจริง ไม่มีข้อมูลสินค้าตัวอย่างฝังอยู่ในแอป

## สิ่งที่มีในโครงการ

- เข้าสู่ระบบด้วย JWT, bcrypt, ตรวจสิทธิ์ตาม role จากฐานข้อมูลทุก API request และเปลี่ยนรหัสผ่าน
- บทบาท Super Admin, Admin, เจ้าหน้าที่คลัง (รองรับ Staff เดิม) และ User พร้อมตรวจสิทธิ์ฝั่ง API
- Dashboard ยอดสินค้า/มูลค่าสต็อก/คำขอเบิกรายเดือน/รายการเคลื่อนไหวและกราฟจาก MySQL
- CRUD สินค้า, หมวดหมู่, หน่วยนับ, ผู้จำหน่าย, แผนก และบัญชีผู้ใช้
- Workflow ขอเบิก → อนุมัติ/ปฏิเสธ → จ่ายวัสดุ พร้อมแจ้งเตือนและบันทึก Audit Log
- รับเข้า/จ่ายออกใน Prisma transaction, ป้องกันยอดติดลบและการจ่ายซ้ำ
- รายงานสินค้าคงเหลือ/ใกล้หมด/หมด/ความเคลื่อนไหว พร้อมส่งออก Excel, CSV และ PDF
- Audit log, อัปโหลดภาพสินค้า (จำกัดชนิด/ขนาดและตรวจ file signature), rate limit และ Helmet

## ความต้องการ

- Node.js 20 หรือใหม่กว่า และ npm
- MySQL 8.x ที่เปิดใช้งานและเข้าถึงได้จากเครื่องพัฒนา

> โครงการนี้ตั้งค่า MySQL Server 8.4.9 ในเครื่องพัฒนาแล้ว และตรวจสอบการ migrate จากฐานว่าง, seed, health check และ API เชื่อมต่อสำเร็จ ขั้นตอนด้านล่างใช้สำหรับตั้งค่าเครื่องใหม่

## อัปโหลดซอร์สขึ้น GitHub

โปรเจกต์มี `index.html` ที่โฟลเดอร์รากเป็นหน้าแนะนำแบบสแตติกสำหรับ GitHub Pages ส่วนไฟล์เริ่มต้นของแอป Frontend อยู่ที่ `frontend/index.html` การเปิดหน้าแนะนำบน GitHub Pages ไม่ได้เปิดใช้งานแอปเต็มระบบ เพราะ Backend และ MySQL ต้องติดตั้งหรือโฮสต์แยกต่างหาก

ก่อนอัปโหลด ตรวจสอบว่าไฟล์ลับและ dependencies ไม่ถูกเพิ่มเข้า Repository:

- `.env` และ `.mysql-admin` ใช้เก็บค่าลับและถูกละเว้นโดย `.gitignore`
- `node_modules/`, `frontend/dist/` และไฟล์จริงใน `backend/uploads/` ถูกละเว้น
- อัปโหลดไฟล์ `.env.example` และ `.env.production.example` ได้ เพราะใช้ค่า placeholder สำหรับตั้งค่าเครื่องใหม่

ติดตั้ง Git for Windows ก่อน จากนั้นสร้าง Repository เปล่าบน GitHub แล้วเปิด PowerShell ที่โฟลเดอร์รากของโปรเจกต์ ใช้คำสั่งต่อไปนี้โดยแทน `YOUR-USERNAME/YOUR-REPOSITORY` ด้วยชื่อบัญชีและ Repository ของคุณ:

```powershell
git init
git add .
git status --short
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

ตรวจผล `git status --short` ก่อน commit และอย่าเพิ่ม `.env`, `.mysql-admin`, รหัสผ่าน หรือไฟล์ข้อมูลจริงเข้า GitHub การอัปโหลดซอร์สอย่างเดียวไม่ได้ทำให้ระบบออนไลน์; หากต้องการเปิดใช้งานทั้งระบบ ให้ทำตามหัวข้อ Deploy บน VPS ด้วย Docker Compose ด้านล่าง

หากต้องการเผยแพร่หน้าแนะนำผ่าน GitHub Pages หลัง push แล้ว ให้เปิด **Settings → Pages** ของ Repository เลือก **Deploy from a branch**, เลือก branch `main` และโฟลเดอร์ `/(root)` แล้วกด **Save** หน้า `index.html` ที่โฟลเดอร์รากจะแสดงเป็นหน้าแนะนำเท่านั้น ไม่ใช่ระบบ WMS ที่เชื่อมต่อฐานข้อมูล

## ติดตั้ง MySQL และสร้างฐานข้อมูล

ติดตั้ง/เริ่ม MySQL Server ก่อน จาก PowerShell ที่มี `mysql` อยู่ใน PATH เข้าสู่ MySQL:

```powershell
mysql -u root -p
```

จากนั้นสร้าง database และผู้ใช้เฉพาะแอป (เปลี่ยนรหัสผ่านก่อนใช้งาน):

```sql
CREATE DATABASE wms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE wms_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wms_user'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
CREATE USER 'wms_user'@'127.0.0.1' IDENTIFIED BY 'replace-with-a-strong-password';
GRANT ALL PRIVILEGES ON wms.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms.* TO 'wms_user'@'127.0.0.1';
GRANT ALL PRIVILEGES ON wms_shadow.* TO 'wms_user'@'localhost';
GRANT ALL PRIVILEGES ON wms_shadow.* TO 'wms_user'@'127.0.0.1';
FLUSH PRIVILEGES;
```

ห้ามใช้บัญชี root ของ MySQL ในแอปจริง

## ติดตั้งและเริ่มระบบ (PowerShell)

เปิด Terminal ที่โฟลเดอร์รากโครงการ:

```powershell
winget install --id Oracle.MySQL --exact --source winget
npm.cmd install
```

ถ้าติดตั้ง MySQL แบบไม่สร้าง Windows service ให้เปิด Terminal แรกค้างไว้เพื่อรัน server ในเครื่อง:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local-mysql.ps1
```

สคริปต์จะผูก MySQL กับ `127.0.0.1` เท่านั้น และเก็บ data directory ใน `%LOCALAPPDATA%\WMS-MySQL\Data`; การเริ่มครั้งแรกจะ initialize ข้อมูลสำหรับ development เท่านั้น จาก Terminal ที่สอง provision ฐานข้อมูลและสร้าง secrets แบบสุ่มโดยไม่พิมพ์รหัสผ่านออกหน้าจอ:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-local-db.ps1
npm.cmd run prisma:generate --workspace backend
npm.cmd run prisma:migrate --workspace backend
npm.cmd run prisma:seed --workspace backend
npm.cmd run dev
```

เปิด Terminal แรกค้างไว้ขณะใช้แอป และกด Ctrl+C เพื่อหยุด MySQL สคริปต์ setup สร้าง `.env` และ `.mysql-admin` แบบไม่เขียนทับไฟล์เดิม; ทั้งสองไฟล์ถูก ignore โดย Git

ถ้าใช้ MySQL ที่มีอยู่แล้ว ไม่ต้องรัน `setup-local-db.ps1`; สร้าง database/user ตาม SQL ด้านบน แล้วเตรียม config ด้วย:

```powershell
Copy-Item .env.example .env
notepad .env
```

จากนั้นกำหนด:

- `DATABASE_URL` ให้ตรง host/port/user/password/database ของ MySQL
- `SHADOW_DATABASE_URL` ใช้ฐาน `wms_shadow` แยกสำหรับ Prisma migrate dev
- `JWT_SECRET` เป็น secret แบบสุ่มอย่างน้อย 32 ตัวอักษร และเก็บเป็นความลับ
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (อย่างน้อย 12 ตัวอักษร) และ `SUPER_ADMIN_NAME` สำหรับ seed ครั้งแรก
- `CORS_ORIGIN` และ `VITE_API_URL` หากไม่ได้ใช้พอร์ตเริ่มต้น
- `PDF_FONT_PATH` เป็น path ของไฟล์ TrueType ที่รองรับภาษาไทย (บน Windows ใช้ Tahoma ตามค่าเริ่มต้น; บน Linux ให้ตั้งเป็นฟอนต์ไทยที่ติดตั้งไว้)

เปิดใช้งานแล้ว:

- Frontend: <http://localhost:5173>
- API health/database check: <http://localhost:4000/api/health>

### เข้าใช้งานจากมือถือและอุปกรณ์ในเครือข่ายเดียวกัน

- เชื่อมมือถือ/แท็บเล็ตกับ Wi-Fi เดียวกับเครื่องที่รัน WMS แล้วเปิด `http://<LAN-IP-ของเครื่อง>:5173`; IP ปัจจุบันของเครื่องพัฒนาในตัวอย่างนี้คือ `192.168.0.127` (อาจเปลี่ยนเมื่อเราเตอร์แจก IP ใหม่)
- ต้องเปิด Frontend และ Backend ค้างไว้; Frontend เลือก API URL จาก hostname ของลิงก์โดยอัตโนมัติ และ Backend อนุญาต CORS เฉพาะ localhost ที่ตั้งค่าไว้หรือ private IPv4 บนพอร์ต `5173`
- Windows Firewall อาจปิดการเชื่อมต่อจากอุปกรณ์อื่น ให้เปิดเฉพาะ TCP ports `5173` และ `4000` จากเครือข่ายที่เชื่อถือได้เท่านั้น อย่าปิด Firewall; หากเครือข่ายถูกจัดเป็น Public อย่าเปิดพอร์ตให้ทั้ง subnet ที่ไม่รู้จัก
- การเข้าจากนอก Wi-Fi ยังต้อง deploy production ด้วย HTTPS/reverse proxy และฐานข้อมูลที่โฮสต์อย่างปลอดภัย ห้ามเปิด Vite development server หรือ MySQL สู่ Internet โดยตรง

## Deploy บน VPS ด้วย Docker Compose

ชุด deploy production ใช้ Docker Compose, MySQL 8.4, Nginx สำหรับไฟล์ Frontend และ Caddy สำหรับ HTTPS อัตโนมัติ ต้องมี VPS ที่ติดตั้ง Docker Compose v2, Domain ที่ชี้ DNS มายัง VPS และเปิด inbound TCP ports `80`/`443` (รวม UDP `443` หากต้องการ HTTP/3) เปิด SSH ตามนโยบายของผู้ให้บริการเท่านั้น ไม่เปิด MySQL `3306` หรือ Backend `4000` สู่ Internet

บน VPS ให้คัดลอก source code ของโครงการไปไว้ในโฟลเดอร์หนึ่ง แล้วเตรียม config:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
openssl rand -hex 32
```

สร้างค่า hex แบบสุ่มแยกกันสำหรับ `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `JWT_SECRET` และ `SUPER_ADMIN_PASSWORD` (ค่า Admin ต้องยาวอย่างน้อย 12 ตัวอักษร) แล้วแก้ `.env.production` ตั้ง `DOMAIN` เป็น Domain จริงที่ DNS ชี้มายัง VPS และตั้งอีเมล Admin ที่ใช้งานได้ ห้าม commit หรือส่งไฟล์นี้ให้ผู้อื่น

ตรวจ config แล้วเริ่มระบบ:

```bash
docker compose --env-file .env.production config
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f caddy backend
```

เมื่อ DNS และพอร์ตพร้อม Caddy จะขอใบรับรอง TLS แล้วเข้าใช้งานที่ `https://<DOMAIN>`; Compose จะรอ MySQL, รัน Prisma migrations และ seed role/บัญชี Super Admin ก่อนเปิด Backend ข้อมูล MySQL, รูปสินค้า และใบรับรอง TLS เก็บใน named volumes ส่วน MySQL/Backend ไม่ได้ publish host ports ชุด deploy ตั้ง `trust proxy` ไว้หนึ่ง hop สำหรับ Caddy และปิดการยอมรับ CORS จาก private LAN ใน production

หลัง Login ครั้งแรกให้เปลี่ยนรหัสผ่าน Admin ทันทีและเก็บข้อมูลใน `.env.production` ไว้ในที่ปลอดภัย สำรอง MySQL และไฟล์ `uploads_data` อย่างสม่ำเสมอ การอัปเดตใช้ `docker compose --env-file .env.production up -d --build`; ห้ามใช้ `docker compose down -v` เพราะจะลบฐานข้อมูล รูปสินค้า และใบรับรองที่เก็บใน volumes

Seed สร้าง role ที่ระบบรองรับและหน่วยนับเริ่มต้น พร้อมเชื่อมหน่วยนับให้สินค้าเดิม และสร้าง Super Admin เมื่อยังไม่มีอีเมลนั้นอยู่ โดย hash รหัสผ่านด้วย bcrypt; ไม่สร้างบัญชี/รหัสผ่าน production แบบ hard-coded

## คำสั่งพัฒนา/ดูแล

```powershell
# สร้าง Prisma Client หลังแก้ schema
npm.cmd run prisma:generate --workspace backend

# สร้าง migration ใหม่และนำไปใช้กับฐานข้อมูลพัฒนา
npm.cmd run prisma:migrate --workspace backend

# ตรวจ Prisma schema
npx.cmd prisma validate --schema backend/prisma/schema.prisma

# build frontend
npm.cmd run build

# รันทดสอบ backend ที่ไม่ต้องพึ่งฐานข้อมูล
npm.cmd test
```

ระบบปฏิบัติการ Linux/macOS ให้เปลี่ยน syntax คัดลอกไฟล์และแก้ `.env` ตาม shell ที่ใช้ แต่คำสั่ง npm เหมือนเดิม

## API หลัก

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/change-password`
- `GET/POST/PUT/DELETE /api/products` และ `POST /api/uploads/product-image`
- `GET/POST/PUT/DELETE /api/categories`, `/api/suppliers`, `/api/departments`
- `GET/POST/PUT/DELETE /api/units`
- `POST /api/movements/in`, `GET /api/movements`; การจ่ายออกโดยตรงถูกปิดเพื่อบังคับ workflow ที่อนุมัติแล้ว
- `GET/POST /api/requisitions`, `PATCH /api/requisitions/:id/decision`, `POST /api/requisitions/:id/fulfill`
- `GET /api/requisitions/notifications`, `PATCH /api/requisitions/notifications/:id/read`, `PATCH /api/requisitions/notifications/read-all`
- `GET /api/dashboard`
- `GET /api/reports/stock`, `/api/reports/movements`, `/api/reports/export/xlsx`, `/api/reports/export/csv`, `/api/reports/export/pdf`
- `/api/users` และ `/api/reports/audit-logs` สำหรับ Admin และ Super Admin

## สิทธิ์

- **Super Admin / Admin:** จัดการข้อมูลหลัก/ผู้ใช้/รายงาน; Admin พิจารณาอนุมัติหรือปฏิเสธคำขอ
- **เจ้าหน้าที่คลัง (`WAREHOUSE_STAFF`, `STAFF` เดิม):** จัดการสินค้า รับเข้า และจ่ายตามคำขอที่อนุมัติแล้ว
- **User:** ดูข้อมูลสินค้า สร้างคำขอเบิก และติดตามสถานะ/การแจ้งเตือนของตนเอง

ทุก API ที่ต้องเข้าสู่ระบบตรวจ JWT และสถานะ/role ปัจจุบันจาก MySQL; การซ่อนเมนูใน UI เป็นเพียง UX ไม่ใช่ขอบเขตความปลอดภัย

## หมายเหตุการใช้งานจริง

- การแก้ยอดคงเหลือโดยตรงและการจ่ายออกที่ไม่ผ่านการอนุมัติถูกปิดไว้; รับผ่านรายการรับเข้าและจ่ายจากคำขอที่อนุมัติแล้ว
- สินค้าที่มียอดคงเหลือหรือมีประวัติ movement ลบไม่ได้
- การส่ง stock movement ต้องมี `referenceKey` ที่ไม่ซ้ำ; frontend สร้าง key ให้ในแต่ละรายการ
- จำกัดภาพ JPG/PNG/WEBP สูงสุด 5 MB และไม่รับไฟล์ที่ signature ไม่ตรง
- ไฟล์ `.env`, uploads และ build output ถูกละเว้นจาก Git
- ก่อนใช้งาน production ให้ตั้ง HTTPS/reverse proxy, สำรอง MySQL, จำกัด CORS, ตั้ง secrets/ฟอนต์ตามระบบ deploy และจัดการนโยบาย retention ของ audit log
- `npm audit` ใน dependency set ปัจจุบันรายงาน advisories จาก Prisma CLI v6 และ UUID dependency ของ ExcelJS; ไม่ใช้ `npm audit fix --force` เพราะจะเปลี่ยน Prisma major version/ลดรุ่น ExcelJS โดยอัตโนมัติ ควรตรวจ compatibility และอัปเกรดด้วยชุดทดสอบก่อน deploy production
