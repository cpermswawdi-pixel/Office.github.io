import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "ไม่ได้รับอนุญาต" });
  }
  let payload;
  try { payload = jwt.verify(header.slice(7), process.env.JWT_SECRET); }
  catch {
    return res.status(401).json({ success: false, message: "เซสชันหมดอายุหรือไม่ถูกต้อง" });
  }
  const user = await prisma.user.findUnique({ where: { id: payload.id }, include: { role: true } });
  if (!user?.active) return res.status(401).json({ success: false, message: "บัญชีนี้ถูกปิดใช้งาน" });
  req.user = { id: user.id, name: user.name, role: user.role.name };
  return next();
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์เข้าถึง" });
    }
    return next();
  };
}
