import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { isIP } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./config/prisma.js";
import { authRouter } from "./routes/auth.routes.js";
import { resourcesRouter } from "./routes/resources.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { requisitionsRouter } from "./routes/requisitions.routes.js";

const app = express();
const dirname = path.dirname(fileURLToPath(import.meta.url));
const configuredOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim());

function isPrivateLanOrigin(origin) {
  const match = /^http:\/\/(\d{1,3}(?:\.\d{1,3}){3}):5173$/.exec(origin);
  if (!match || isIP(match[1]) !== 4) return false;
  const [first, second] = match[1].split(".").map(Number);
  return first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET ต้องมีความยาวอย่างน้อย 32 ตัวอักษร");
}

app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const developmentLanOrigin = process.env.NODE_ENV !== "production" && isPrivateLanOrigin(origin);
    callback(null, !origin || configuredOrigins.includes(origin) || developmentLanOrigin);
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(dirname, "uploads"), { dotfiles: "deny", index: false }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: "draft-8", legacyHeaders: false }));
app.get("/api/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: "ok", database: "connected" } });
  } catch (error) { next(error); }
});
app.use("/api/auth", authRouter);
app.use("/api/requisitions", requisitionsRouter);
app.use("/api", resourcesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportsRouter);
app.use((req, res) => res.status(404).json({ success: false, message: "ไม่พบ API ที่ร้องขอ" }));
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ success: false, message: "JSON ไม่ถูกต้อง" });
  if (error.name === "ZodError") return res.status(400).json({ success: false, message: "ข้อมูลไม่ถูกต้อง", errors: error.issues });
  if (error.code === "P2002") return res.status(409).json({ success: false, message: "ข้อมูลซ้ำกับรายการที่มีอยู่แล้ว" });
  if (error.code === "P2025") return res.status(404).json({ success: false, message: "ไม่พบข้อมูล" });
  if (error.code === "P2003") return res.status(409).json({ success: false, message: "ข้อมูลนี้ถูกใช้งานอยู่" });
  if (error.code?.startsWith("LIMIT_")) return res.status(400).json({ success: false, message: "ไฟล์มีขนาดใหญ่หรือจำนวนฟิลด์เกินกำหนด" });
  if (error.status) return res.status(error.status).json({ success: false, message: error.message });
  console.error(error);
  return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" });
});

const port = Number(process.env.PORT) || 4000;
const server = app.listen(port, () => console.log(`WMS API listening on http://localhost:${port}`));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}
