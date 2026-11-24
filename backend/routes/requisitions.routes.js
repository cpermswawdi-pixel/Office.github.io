import { Router } from "express";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";

export const requisitionsRouter = Router();
requisitionsRouter.use(authenticate);

const managers = authorize("SUPER_ADMIN", "ADMIN");
const warehouseStaff = authorize("SUPER_ADMIN", "ADMIN", "STAFF", "WAREHOUSE_STAFF");
const requestItemsSchema = z.array(z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive()
})).min(1).max(30).superRefine((items, context) => {
  const productIds = items.map((item) => item.productId);
  if (new Set(productIds).size !== productIds.length) {
    context.addIssue({ code: "custom", message: "ห้ามเลือกวัสดุซ้ำในคำขอเดียว" });
  }
});

const includeRequisition = {
  requester: { select: { id: true, name: true, email: true } },
  department: true,
  decidedBy: { select: { id: true, name: true } },
  items: { include: { product: { include: { category: true, catalogUnit: true } }, movement: true } }
};

async function notifyUsers(db, userIds, data) {
  const uniqueIds = [...new Set(userIds)];
  if (!uniqueIds.length) return;
  await db.notification.createMany({
    data: uniqueIds.map((userId) => ({ userId, ...data }))
  });
}

async function lockProducts(db, productIds) {
  if (!productIds.length) return;
  const ids = [...new Set(productIds)].sort((a, b) => a - b);
  await db.$queryRaw`SELECT id FROM products WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
}

requisitionsRouter.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const take = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const status = req.query.status ? z.enum(["PENDING", "APPROVED", "REJECTED", "FULFILLED"]).parse(req.query.status) : undefined;
  const where = {
    ...(req.user.role === "USER" ? { requesterId: req.user.id } : {}),
    ...(status ? { status } : {}),
    ...(req.query.search ? { requestNumber: { contains: String(req.query.search).trim() } } : {})
  };
  const [data, total] = await Promise.all([
    prisma.requisition.findMany({
      where, skip: (page - 1) * take, take,
      orderBy: { createdAt: "desc" }, include: includeRequisition
    }),
    prisma.requisition.count({ where })
  ]);
  res.json({ success: true, data, pagination: { total, page, limit: take } });
}));

requisitionsRouter.post("/", authorize("USER"), asyncHandler(async (req, res) => {
  const body = z.object({
    departmentId: z.coerce.number().int().positive(),
    purpose: z.string().trim().min(1).max(500),
    items: requestItemsSchema
  }).parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const requester = await tx.user.findUnique({ where: { id: req.user.id }, select: { departmentId: true } });
    if (!requester?.departmentId || requester.departmentId !== body.departmentId) {
      throw Object.assign(new Error("คำขอเบิกต้องใช้แผนกที่กำหนดให้บัญชีของคุณ"), { status: 403 });
    }
    const requestNumber = `REQ-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const requisition = await tx.requisition.create({
      data: {
        requestNumber,
        requesterId: req.user.id,
        departmentId: body.departmentId,
        purpose: body.purpose,
        items: { create: body.items }
      },
      include: includeRequisition
    });
    const approvers = await tx.user.findMany({
      where: { active: true, role: { name: { in: ["SUPER_ADMIN", "ADMIN"] } } },
      select: { id: true }
    });
    await notifyUsers(tx, approvers.map(({ id }) => id), {
      requisitionId: requisition.id,
      type: "REQUISITION_CREATED",
      title: "มีคำขอเบิกรอพิจารณา",
      message: `${requisition.requestNumber} จาก ${req.user.name}`
    });
    await writeAudit(req, { action: "CREATE", module: "REQUISITION", recordId: requisition.id, updatedValue: requisition }, tx);
    return requisition;
  });

  res.status(201).json({ success: true, data: result });
}));

requisitionsRouter.patch("/:id/decision", managers, asyncHandler(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const body = z.object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    decisionNote: z.string().trim().max(500).optional().nullable()
  }).refine((value) => value.decision !== "REJECTED" || Boolean(value.decisionNote), {
    message: "กรุณาระบุเหตุผลในการปฏิเสธ",
    path: ["decisionNote"]
  }).parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM requisitions WHERE id = ${id} FOR UPDATE`;
    const existing = await tx.requisition.findUnique({ where: { id }, include: includeRequisition });
    if (!existing) throw Object.assign(new Error("ไม่พบคำขอเบิก"), { status: 404 });
    if (existing.status !== "PENDING") throw Object.assign(new Error("คำขอนี้ได้รับการพิจารณาแล้ว"), { status: 409 });

    if (body.decision === "APPROVED") {
      const productIds = existing.items.map(({ productId }) => productId);
      await lockProducts(tx, productIds);
      const reservations = await tx.$queryRaw`
        SELECT ri.productId, ri.quantity
        FROM requisition_items ri
        INNER JOIN requisitions r ON r.id = ri.requisitionId
        WHERE r.status = 'APPROVED' AND ri.productId IN (${Prisma.join(productIds)})
        FOR UPDATE
      `;
      const reservedByProduct = new Map();
      reservations.forEach(({ productId, quantity }) => reservedByProduct.set(productId, (reservedByProduct.get(productId) || 0) + quantity));
      const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, stockQuantity: true } });
      const productById = new Map(products.map((product) => [product.id, product]));
      const unavailable = existing.items.find((item) => {
        const product = productById.get(item.productId);
        return !product || product.stockQuantity - (reservedByProduct.get(item.productId) || 0) < item.quantity;
      });
      if (unavailable) {
        const product = productById.get(unavailable.productId);
        throw Object.assign(new Error(`สต็อกที่พร้อมจ่ายไม่เพียงพอสำหรับ ${product?.name || "วัสดุ"}`), { status: 409 });
      }
    }

    const updated = await tx.requisition.update({
      where: { id },
      data: { status: body.decision, decisionNote: body.decisionNote || null, decidedById: req.user.id, decidedAt: new Date() },
      include: includeRequisition
    });
    const notificationType = body.decision === "APPROVED" ? "REQUISITION_APPROVED" : "REQUISITION_REJECTED";
    await notifyUsers(tx, [existing.requesterId], {
      requisitionId: id,
      type: notificationType,
      title: body.decision === "APPROVED" ? "คำขอเบิกได้รับอนุมัติ" : "คำขอเบิกถูกปฏิเสธ",
      message: `${existing.requestNumber}${body.decisionNote ? ` · ${body.decisionNote}` : ""}`
    });
    if (body.decision === "APPROVED") {
      const staff = await tx.user.findMany({
        where: { active: true, role: { name: { in: ["STAFF", "WAREHOUSE_STAFF"] } } },
        select: { id: true }
      });
      await notifyUsers(tx, staff.map(({ id: userId }) => userId), {
        requisitionId: id,
        type: "REQUISITION_APPROVED",
        title: "คำขอเบิกพร้อมจ่าย",
        message: `${existing.requestNumber} รอเจ้าหน้าที่คลังดำเนินการ`
      });
    }
    await writeAudit(req, { action: body.decision, module: "REQUISITION", recordId: id, previousValue: existing, updatedValue: updated }, tx);
    return updated;
  });
  res.json({ success: true, data: result });
}));

requisitionsRouter.post("/:id/fulfill", warehouseStaff, asyncHandler(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM requisitions WHERE id = ${id} FOR UPDATE`;
    const requisition = await tx.requisition.findUnique({ where: { id }, include: includeRequisition });
    if (!requisition) throw Object.assign(new Error("ไม่พบคำขอเบิก"), { status: 404 });
    if (requisition.status !== "APPROVED") throw Object.assign(new Error("จ่ายได้เฉพาะคำขอที่ได้รับอนุมัติ"), { status: 409 });

    await lockProducts(tx, requisition.items.map(({ productId }) => productId));
    for (const item of requisition.items) {
      const changed = await tx.product.updateMany({
        where: { id: item.productId, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } }
      });
      if (!changed.count) throw Object.assign(new Error(`สต็อกของ ${item.product.name} ไม่เพียงพอ`), { status: 409 });
      await tx.stockMovement.create({
        data: {
          type: "STOCK_OUT",
          productId: item.productId,
          quantity: item.quantity,
          movementDate: new Date(),
          departmentId: requisition.departmentId,
          requesterName: requisition.requester.name,
          purpose: requisition.purpose,
          documentNumber: requisition.requestNumber,
          referenceKey: `requisition-item-${item.id}`,
          requisitionItemId: item.id,
          createdById: req.user.id
        }
      });
    }
    const updated = await tx.requisition.update({
      where: { id },
      data: { status: "FULFILLED" },
      include: includeRequisition
    });
    await notifyUsers(tx, [requisition.requesterId], {
      requisitionId: id,
      type: "REQUISITION_FULFILLED",
      title: "จ่ายวัสดุตามคำขอแล้ว",
      message: `${requisition.requestNumber} ดำเนินการจ่ายวัสดุเรียบร้อย`
    });
    await writeAudit(req, { action: "FULFILL", module: "REQUISITION", recordId: id, previousValue: requisition, updatedValue: updated }, tx);
    return updated;
  });
  res.json({ success: true, data: result });
}));

requisitionsRouter.get("/notifications", asyncHandler(async (req, res) => {
  const take = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const data = await prisma.notification.findMany({
    where: { userId: req.user.id },
    take,
    orderBy: { createdAt: "desc" }
  });
  const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, readAt: null } });
  res.json({ success: true, data, unreadCount });
}));

requisitionsRouter.patch("/notifications/read-all", asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() }
  });
  res.json({ success: true, data: { updated: result.count } });
}));

requisitionsRouter.patch("/notifications/:id/read", asyncHandler(async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const result = await prisma.notification.updateMany({
    where: { id, userId: req.user.id, readAt: null },
    data: { readAt: new Date() }
  });
  res.json({ success: true, data: { updated: result.count } });
}));
