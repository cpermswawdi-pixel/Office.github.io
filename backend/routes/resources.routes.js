import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileTypeFromFile } from "file-type";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";

export const resourcesRouter = Router();
resourcesRouter.use(authenticate);
const admins = authorize("SUPER_ADMIN", "ADMIN");
const productManagers = authorize("SUPER_ADMIN", "ADMIN", "STAFF", "WAREHOUSE_STAFF");
const warehouseOperators = authorize("SUPER_ADMIN", "ADMIN", "STAFF", "WAREHOUSE_STAFF");
const idSchema = z.coerce.number().int().positive();
const pageParams = (query) => ({
  skip: (Math.max(1, Number(query.page) || 1) - 1) * Math.min(100, Math.max(1, Number(query.limit) || 20)),
  take: Math.min(100, Math.max(1, Number(query.limit) || 20))
});
const searchWhere = (query, fields) => {
  const search = String(query.search || "").trim();
  return search ? { OR: fields.map((field) => ({ [field]: { contains: search } })) } : {};
};

const categorySchema = z.object({ name: z.string().trim().min(1).max(100) });
resourcesRouter.get("/categories", asyncHandler(async (req, res) => {
  const { skip, take } = pageParams(req.query);
  const where = searchWhere(req.query, ["name"]);
  const [data, total] = await Promise.all([
    prisma.category.findMany({ where, skip, take, orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }),
    prisma.category.count({ where })
  ]);
  res.json({ success: true, data, pagination: { total } });
}));
resourcesRouter.post("/categories", admins, asyncHandler(async (req, res) => {
  const data = categorySchema.parse(req.body);
  const result = await prisma.category.create({ data });
  await writeAudit(req, { action: "CREATE", module: "CATEGORY", recordId: result.id, updatedValue: data });
  res.status(201).json({ success: true, data: result });
}));
resourcesRouter.put("/categories/:id", admins, asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const data = categorySchema.parse(req.body);
  const previous = await prisma.category.findUniqueOrThrow({ where: { id } });
  const result = await prisma.category.update({ where: { id }, data });
  await writeAudit(req, { action: "UPDATE", module: "CATEGORY", recordId: id, previousValue: previous, updatedValue: data });
  res.json({ success: true, data: result });
}));
resourcesRouter.delete("/categories/:id", admins, asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const category = await prisma.category.findUniqueOrThrow({ where: { id }, include: { _count: { select: { products: true } } } });
  if (category._count.products) return res.status(409).json({ success: false, message: "ไม่สามารถลบหมวดหมู่ที่มีสินค้าใช้งานอยู่" });
  await prisma.category.delete({ where: { id } });
  await writeAudit(req, { action: "DELETE", module: "CATEGORY", recordId: id, previousValue: category });
  res.json({ success: true });
}));

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(150),
  contactPerson: z.string().max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.union([z.string().email(), z.literal("")]).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});
const departmentSchema = z.object({ name: z.string().trim().min(1).max(100) });
const unitSchema = z.object({
  name: z.string().trim().min(1).max(60),
  abbreviation: z.string().trim().max(20).optional().nullable(),
  isActive: z.boolean().optional()
});

function registerSimpleResource(pathName, model, schema, fields, roles = admins) {
  resourcesRouter.get(`/${pathName}`, asyncHandler(async (req, res) => {
    const { skip, take } = pageParams(req.query);
    const where = searchWhere(req.query, fields);
    const [data, total] = await Promise.all([
      prisma[model].findMany({ where, skip, take, orderBy: { name: "asc" } }),
      prisma[model].count({ where })
    ]);
    res.json({ success: true, data, pagination: { total } });
  }));
  resourcesRouter.post(`/${pathName}`, roles, asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const result = await prisma[model].create({ data });
    await writeAudit(req, { action: "CREATE", module: pathName.toUpperCase(), recordId: result.id, updatedValue: data });
    res.status(201).json({ success: true, data: result });
  }));
  resourcesRouter.put(`/${pathName}/:id`, roles, asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const data = schema.parse(req.body);
    const previous = await prisma[model].findUniqueOrThrow({ where: { id } });
    const result = await prisma[model].update({ where: { id }, data });
    await writeAudit(req, { action: "UPDATE", module: pathName.toUpperCase(), recordId: id, previousValue: previous, updatedValue: data });
    res.json({ success: true, data: result });
  }));
  resourcesRouter.delete(`/${pathName}/:id`, roles, asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const previous = await prisma[model].findUniqueOrThrow({ where: { id } });
    try {
      await prisma[model].delete({ where: { id } });
    } catch (error) {
      if (error.code === "P2003") return res.status(409).json({ success: false, message: "รายการนี้ถูกใช้งานอยู่ จึงไม่สามารถลบได้" });
      throw error;
    }
    await writeAudit(req, { action: "DELETE", module: pathName.toUpperCase(), recordId: id, previousValue: previous });
    res.json({ success: true });
  }));
}

registerSimpleResource("suppliers", "supplier", supplierSchema, ["name", "contactPerson", "email"]);
registerSimpleResource("departments", "department", departmentSchema, ["name"]);
registerSimpleResource("units", "unit", unitSchema, ["name", "abbreviation"]);

const productSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  barcode: z.string().trim().max(100).optional().nullable(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  categoryId: z.coerce.number().int().positive(),
  unit: z.string().trim().min(1).max(30).default("ชิ้น"),
  unitCatalogId: z.coerce.number().int().positive().optional().nullable(),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  stockQuantity: z.coerce.number().int().min(0).optional(),
  minimumStock: z.coerce.number().int().min(0),
  imageUrl: z.string().max(500).optional().nullable()
});
resourcesRouter.get("/products", asyncHandler(async (req, res) => {
  const { skip, take } = pageParams(req.query);
  const search = String(req.query.search || "").trim();
  const where = {
    ...(search ? { OR: ["sku", "barcode", "name"].map((field) => ({ [field]: { contains: search } })) } : {}),
    ...(req.query.categoryId ? { categoryId: idSchema.parse(req.query.categoryId) } : {}),
    ...(req.query.stock === "out" ? { stockQuantity: 0 } : {})
  };
  if (req.query.stock === "low") {
    const candidates = await prisma.product.findMany({
      where: { ...where, stockQuantity: { gt: 0 }, minimumStock: { gt: 0 } },
      select: { id: true, stockQuantity: true, minimumStock: true }
    });
    where.id = { in: candidates.filter((product) => product.stockQuantity <= product.minimumStock).map((product) => product.id) };
  }
  const [data, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take, orderBy: { updatedAt: "desc" }, include: { category: true, catalogUnit: true } }),
    prisma.product.count({ where })
  ]);
  res.json({ success: true, data, pagination: { total, page: Math.floor(skip / take) + 1, limit: take } });
}));
resourcesRouter.get("/products/:id", asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true, catalogUnit: true, movements: { take: 20, orderBy: { movementDate: "desc" }, include: { createdBy: { select: { name: true } } } } } });
  if (!product) return res.status(404).json({ success: false, message: "ไม่พบสินค้า" });
  res.json({ success: true, data: product });
}));
resourcesRouter.post("/products", productManagers, asyncHandler(async (req, res) => {
  const data = productSchema.parse(req.body);
  const selectedUnit = data.unitCatalogId
    ? await prisma.unit.findUniqueOrThrow({ where: { id: data.unitCatalogId } })
    : null;
  if (selectedUnit && !selectedUnit.isActive) return res.status(400).json({ success: false, message: "หน่วยนับนี้ถูกปิดใช้งาน" });
  const result = await prisma.product.create({
    data: { ...data, ...(selectedUnit ? { unit: selectedUnit.name } : {}), barcode: data.barcode || null }
  });
  await writeAudit(req, { action: "CREATE", module: "PRODUCT", recordId: result.id, updatedValue: result });
  res.status(201).json({ success: true, data: result });
}));
resourcesRouter.put("/products/:id", productManagers, asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const data = productSchema.partial().parse(req.body);
  if (Object.hasOwn(data, "stockQuantity")) return res.status(400).json({ success: false, message: "แก้ไขจำนวนคงเหลือผ่านรายการรับเข้าหรือเบิกออกเท่านั้น" });
  if (data.unitCatalogId) {
    const selectedUnit = await prisma.unit.findUniqueOrThrow({ where: { id: data.unitCatalogId } });
    if (!selectedUnit.isActive) return res.status(400).json({ success: false, message: "หน่วยนับนี้ถูกปิดใช้งาน" });
    data.unit = selectedUnit.name;
  }
  const previous = await prisma.product.findUniqueOrThrow({ where: { id } });
  const result = await prisma.product.update({ where: { id }, data: { ...data, ...(data.barcode !== undefined ? { barcode: data.barcode || null } : {}) } });
  await writeAudit(req, { action: "UPDATE", module: "PRODUCT", recordId: id, previousValue: previous, updatedValue: result });
  res.json({ success: true, data: result });
}));
resourcesRouter.delete("/products/:id", productManagers, asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });
  if (product.stockQuantity !== 0) return res.status(409).json({ success: false, message: "ลบสินค้าได้เมื่อยอดคงเหลือเป็นศูนย์เท่านั้น" });
  try { await prisma.product.delete({ where: { id } }); }
  catch (error) {
    if (error.code === "P2003") return res.status(409).json({ success: false, message: "สินค้ามีประวัติการเคลื่อนไหว ไม่สามารถลบได้" });
    throw error;
  }
  await writeAudit(req, { action: "DELETE", module: "PRODUCT", recordId: id, previousValue: product });
  res.json({ success: true });
}));

const uploadsDirectory = path.resolve("uploads");
const storage = multer.diskStorage({
  destination: uploadsDirectory,
  filename: (_req, _file, callback) => callback(null, `${crypto.randomUUID()}.upload`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return callback(Object.assign(new Error("รองรับไฟล์ JPG, PNG หรือ WEBP เท่านั้น"), { status: 400 }));
    }
    callback(null, true);
  }
});
resourcesRouter.post("/uploads/product-image", productManagers, upload.single("image"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "กรุณาเลือกไฟล์ภาพ" });
  const detected = await fileTypeFromFile(req.file.path);
  if (!detected || !["image/jpeg", "image/png", "image/webp"].includes(detected.mime)) {
    await fs.unlink(req.file.path);
    return res.status(400).json({ success: false, message: "เนื้อหาไฟล์ไม่ใช่ภาพ JPG, PNG หรือ WEBP ที่รองรับ" });
  }
  const filename = `${path.parse(req.file.filename).name}.${detected.ext}`;
  await fs.rename(req.file.path, path.join(uploadsDirectory, filename));
  res.status(201).json({ success: true, data: { imageUrl: `/uploads/${filename}` } });
}));

const userSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).regex(/[A-Z]/).regex(/[0-9]/),
  role: z.enum(["ADMIN", "STAFF", "WAREHOUSE_STAFF", "USER"]),
  departmentId: z.coerce.number().int().positive().optional().nullable(),
  active: z.boolean().optional()
}).superRefine((data, context) => {
  if (data.role === "USER" && !data.departmentId) {
    context.addIssue({ code: "custom", path: ["departmentId"], message: "ผู้ใช้ต้องสังกัดแผนกเพื่อส่งคำขอเบิก" });
  }
});
resourcesRouter.get("/users", admins, asyncHandler(async (req, res) => {
  const { skip, take } = pageParams(req.query);
  const where = searchWhere(req.query, ["name", "email"]);
  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take, select: { id: true, name: true, email: true, active: true, createdAt: true, role: true, department: true }, orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where })
  ]);
  res.json({ success: true, data, pagination: { total } });
}));
resourcesRouter.post("/users", admins, asyncHandler(async (req, res) => {
  const data = userSchema.parse(req.body);
  const role = await prisma.role.findUniqueOrThrow({ where: { name: data.role } });
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
      roleId: role.id,
      departmentId: data.departmentId || null
    },
    select: { id: true, name: true, email: true, active: true }
  });
  await writeAudit(req, { action: "CREATE", module: "USER", recordId: user.id, updatedValue: user });
  res.status(201).json({ success: true, data: user });
}));
resourcesRouter.patch("/users/:id/status", admins, asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { active } = z.object({ active: z.boolean() }).parse(req.body);
  if (id === req.user.id && !active) return res.status(400).json({ success: false, message: "ไม่สามารถปิดใช้งานบัญชีตัวเองได้" });
  const target = await prisma.user.findUniqueOrThrow({ where: { id }, include: { role: true } });
  if (target.role.name === "SUPER_ADMIN" && req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์เปลี่ยนสถานะบัญชี Super Admin" });
  }
  const user = await prisma.user.update({ where: { id }, data: { active }, select: { id: true, name: true, active: true } });
  await writeAudit(req, { action: active ? "ACTIVATE" : "DEACTIVATE", module: "USER", recordId: id, updatedValue: user });
  res.json({ success: true, data: user });
}));
resourcesRouter.put("/users/:id", admins, asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const data = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().email().transform((value) => value.toLowerCase()).optional(),
    role: z.enum(["ADMIN", "STAFF", "WAREHOUSE_STAFF", "USER"]).optional(),
    departmentId: z.coerce.number().int().positive().nullable().optional()
  }).refine((value) => Object.keys(value).length > 0).parse(req.body);
  if (id === req.user.id && data.role) return res.status(400).json({ success: false, message: "ไม่สามารถเปลี่ยนสิทธิ์บัญชีตัวเองได้" });
  const target = await prisma.user.findUniqueOrThrow({ where: { id }, include: { role: true } });
  if (target.role.name === "SUPER_ADMIN") return res.status(403).json({ success: false, message: "ไม่สามารถแก้ไขบัญชี Super Admin ได้" });
  const departmentId = Object.hasOwn(data, "departmentId") ? data.departmentId : target.departmentId;
  const role = data.role || target.role.name;
  if (role === "USER" && !departmentId) {
    return res.status(400).json({ success: false, message: "ผู้ใช้ต้องสังกัดแผนกเพื่อส่งคำขอเบิก" });
  }
  const previous = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { id: true, name: true, email: true, active: true, role: true, departmentId: true, createdAt: true }
  });
  const updateData = { name: data.name, email: data.email, departmentId: data.departmentId };
  if (data.role) updateData.role = { connect: { name: data.role } };
  const result = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, active: true, role: true, department: true }
  });
  await writeAudit(req, { action: "UPDATE", module: "USER", recordId: id, previousValue: previous, updatedValue: result });
  res.json({ success: true, data: result });
}));

const movementSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().min(0).optional().nullable(),
  movementDate: z.coerce.date().default(() => new Date()),
  documentNumber: z.string().max(100).optional().nullable(),
  supplierId: z.coerce.number().int().positive().optional().nullable(),
  departmentId: z.coerce.number().int().positive().optional().nullable(),
  requesterName: z.string().max(120).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  referenceKey: z.string().min(8).max(120)
});
resourcesRouter.get("/movements", asyncHandler(async (req, res) => {
  const { skip, take } = pageParams(req.query);
  const where = {
    ...(req.query.type ? { type: z.enum(["STOCK_IN", "STOCK_OUT"]).parse(req.query.type) } : {}),
    ...(req.query.productId ? { productId: idSchema.parse(req.query.productId) } : {}),
    ...(req.query.from || req.query.to ? { movementDate: { ...(req.query.from ? { gte: new Date(req.query.from) } : {}), ...(req.query.to ? { lte: new Date(req.query.to) } : {}) } } : {}),
    ...(req.user.role === "STAFF" ? { createdById: req.user.id } : {})
  };
  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({ where, skip, take, orderBy: { movementDate: "desc" }, include: { product: true, supplier: true, department: true, createdBy: { select: { id: true, name: true } } } }),
    prisma.stockMovement.count({ where })
  ]);
  res.json({ success: true, data, pagination: { total, page: Math.floor(skip / take) + 1, limit: take } });
}));
resourcesRouter.post("/movements/:type", warehouseOperators, asyncHandler(async (req, res) => {
  const type = z.enum(["in", "out"]).parse(req.params.type) === "in" ? "STOCK_IN" : "STOCK_OUT";
  if (type === "STOCK_OUT") {
    return res.status(409).json({ success: false, message: "การจ่ายวัสดุต้องดำเนินการจากคำขอเบิกที่ได้รับอนุมัติแล้ว" });
  }
  const body = movementSchema.parse(req.body);
  if (type === "STOCK_IN" && !body.supplierId) return res.status(400).json({ success: false, message: "กรุณาระบุผู้จำหน่าย" });
  if (type === "STOCK_OUT" && (!body.requesterName || !body.purpose || !body.departmentId)) {
    return res.status(400).json({ success: false, message: "กรุณาระบุผู้เบิก แผนก และวัตถุประสงค์" });
  }
  const movement = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.stockMovement.findUnique({ where: { referenceKey: body.referenceKey } });
    if (duplicate) {
      const error = new Error("รายการซ้ำ");
      error.status = 409;
      throw error;
    }
    const product = await tx.product.findUnique({ where: { id: body.productId } });
    if (!product) {
      const error = new Error("ไม่พบสินค้า");
      error.status = 404;
      throw error;
    }
    const changed = await tx.product.updateMany({
      where: {
        id: product.id,
        ...(type === "STOCK_OUT" ? { stockQuantity: { gte: body.quantity } } : {})
      },
      data: {
        stockQuantity: { [type === "STOCK_IN" ? "increment" : "decrement"]: body.quantity },
        ...(type === "STOCK_IN" && body.unitCost != null ? { costPrice: body.unitCost } : {})
      }
    });
    if (!changed.count) {
      const error = new Error("จำนวนสินค้าไม่เพียงพอ");
      error.status = 409;
      throw error;
    }
    const result = await tx.stockMovement.create({
      data: {
        type,
        productId: body.productId,
        quantity: body.quantity,
        unitCost: body.unitCost,
        movementDate: body.movementDate,
        documentNumber: body.documentNumber,
        supplierId: body.supplierId,
        departmentId: body.departmentId,
        requesterName: body.requesterName,
        purpose: body.purpose,
        notes: body.notes,
        referenceKey: body.referenceKey,
        createdById: req.user.id
      },
      include: { product: true }
    });
    await writeAudit(req, { action: type, module: "STOCK_MOVEMENT", recordId: result.id, updatedValue: result }, tx);
    return result;
  });
  res.status(201).json({ success: true, data: movement });
}));
