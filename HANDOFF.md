# ส่งต่อโปรเจกต์ WMS

## สิ่งที่อยู่ในชุดนี้

- ซอร์ส Frontend และ Backend
- Prisma schema และ migrations สำหรับสร้างโครงสร้างฐานข้อมูล
- ตัวอย่างการตั้งค่า `.env.example` และ `.env.production.example`
- คู่มือฉบับเต็มใน [README.md](./README.md)

## เริ่มระบบบน Windows

ต้องติดตั้ง Node.js 20 ขึ้นไปและ MySQL 8 ก่อน จากนั้นแตก ZIP แล้วเปิด PowerShell ที่โฟลเดอร์โปรเจกต์ ทำตามลำดับ:

```powershell
npm.cmd install
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local-mysql.ps1
```

เปิด PowerShell อีกหน้าต่างที่โฟลเดอร์โปรเจกต์ แล้วรัน:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-local-db.ps1
npm.cmd run prisma:generate --workspace backend
npm.cmd run prisma:migrate --workspace backend
npm.cmd run prisma:seed --workspace backend
npm.cmd run dev
```

เปิด Frontend ที่ <http://localhost:5173> และตรวจสถานะ API/ฐานข้อมูลได้ที่ <http://localhost:4000/api/health>

## ข้อควรรู้ก่อนรับช่วงต่อ

- ZIP ไม่มีไฟล์ `.env`, `.mysql-admin`, รหัสผ่าน, ฐานข้อมูลจริง, `node_modules` หรือไฟล์ build ผู้รับต้องสร้างค่าตั้งค่าและฐานข้อมูลของตนเอง
- migrations ใช้สร้างโครงสร้างฐานข้อมูลใหม่ แต่ไม่ได้ย้ายข้อมูลจริงจากเครื่องผู้ส่ง
- อย่าส่งรหัสผ่านหรือไฟล์ฐานข้อมูลผ่าน Repository สาธารณะ
- หากต้องการเผยแพร่ source บน GitHub ให้แตก ZIP ก่อน แล้วทำตามหัวข้ออัปโหลดใน README
