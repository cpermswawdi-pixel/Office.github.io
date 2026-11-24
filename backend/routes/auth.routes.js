import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่" }
});

authRouter.post("/login", loginLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    include: { role: true, department: true }
  });
  if (!user || !user.active || !(await bcrypt.compare(body.password, user.passwordHash))) {
    await writeAudit(req, { action: "LOGIN_FAILED", module: "AUTH", recordId: body.email });
    return res.status(401).json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  }
  const principal = { id: user.id, name: user.name, role: user.role.name };
  await writeAudit({ ...req, user: principal }, { action: "LOGIN", module: "AUTH", recordId: user.id });
  const token = jwt.sign(principal, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "8h" });
  return res.json({
    success: true,
    data: { token, user: { ...principal, email: user.email, department: user.department } }
  });
}));

authRouter.post("/logout", authenticate, asyncHandler(async (req, res) => {
  await writeAudit(req, { action: "LOGOUT", module: "AUTH", recordId: req.user.id });
  res.json({ success: true, message: "ออกจากระบบแล้ว" });
}));

authRouter.get("/me", authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { role: true, department: true } });
  if (!user) return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้" });
  res.json({
    success: true,
    data: { id: user.id, name: user.name, email: user.email, role: user.role.name, department: user.department }
  });
}));

authRouter.put("/change-password", authenticate, asyncHandler(async (req, res) => {
  const body = z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(10).regex(/[A-Z]/).regex(/[0-9]/)
  }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
    return res.status(400).json({ success: false, message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(body.newPassword, 12) }
  });
  await writeAudit(req, { action: "CHANGE_PASSWORD", module: "AUTH", recordId: user.id });
  res.json({ success: true, message: "เปลี่ยนรหัสผ่านแล้ว" });
}));
