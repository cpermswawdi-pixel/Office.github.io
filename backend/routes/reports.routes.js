import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "node:fs";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const reportsRouter = Router();
reportsRouter.use(authenticate);

function movementWhere(query) {
  const date = z.iso.date();
  const from = query.from ? new Date(`${date.parse(query.from)}T00:00:00.000Z`) : undefined;
  const to = query.to ? new Date(`${date.parse(query.to)}T23:59:59.999Z`) : undefined;
  if (from && to && from > to) throw Object.assign(new Error("วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด"), { status: 400 });
  const search = String(query.search || "").trim();
  return {
    ...(query.type ? { type: z.enum(["STOCK_IN", "STOCK_OUT"]).parse(query.type) } : {}),
    ...(query.productId ? { productId: z.coerce.number().int().positive().parse(query.productId) } : {}),
    ...(search ? { product: { is: { OR: ["sku", "barcode", "name"].map((field) => ({ [field]: { contains: search } })) } } } : {}),
    ...(from || to ? { movementDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
  };
}

async function stockRows(query) {
  const where = {
    ...(query.categoryId ? { categoryId: z.coerce.number().int().positive().parse(query.categoryId) } : {}),
    ...(query.search ? { OR: ["sku", "barcode", "name"].map((field) => ({ [field]: { contains: String(query.search) } })) } : {}),
    ...(query.stock === "out" ? { stockQuantity: 0 } : {})
  };
  const products = await prisma.product.findMany({ where, include: { category: true }, orderBy: { name: "asc" } });
  const filtered = query.stock === "low"
    ? products.filter((p) => p.minimumStock > 0 && p.stockQuantity > 0 && p.stockQuantity <= p.minimumStock)
    : products;
  return filtered.map((p) => ({ ...p, inventoryValue: Number(p.costPrice) * p.stockQuantity }));
}

reportsRouter.get("/stock", asyncHandler(async (req, res) => {
  res.json({ success: true, data: await stockRows(req.query) });
}));

reportsRouter.get("/movements", asyncHandler(async (req, res) => {
  const where = {
    ...movementWhere(req.query),
    ...(req.user.role === "STAFF" ? { createdById: req.user.id } : {})
  };
  const data = await prisma.stockMovement.findMany({
    where,
    include: {
      product: { include: { category: true } },
      supplier: true,
      department: true,
      createdBy: { select: { name: true } }
    },
    orderBy: { movementDate: "desc" },
    take: 5000
  });
  res.json({ success: true, data });
}));

reportsRouter.get("/export/:format", authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  const format = z.enum(["xlsx", "pdf", "csv"]).parse(req.params.format);
  const reportType = z.enum(["stock", "movements"]).parse(String(req.query.report || req.query.type || "stock"));
  const movementFilters = { ...req.query, type: req.query.movementType };
  const data = reportType === "stock"
    ? await stockRows(req.query)
    : await prisma.stockMovement.findMany({
      where: movementWhere(movementFilters),
      include: { product: true, supplier: true, department: true, createdBy: true },
      orderBy: { movementDate: "desc" },
      take: 5000
    });
  const filename = `wms-${reportType}-${new Date().toISOString().slice(0, 10)}`;
  if (format === "csv") {
    const escapeCell = (value) => {
      const text = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
      const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = reportType === "stock"
      ? [
        ["SKU", "สินค้า", "หมวดหมู่", "คงเหลือ", "ขั้นต่ำ", "ราคาทุน", "มูลค่าคงคลัง"],
        ...data.map((p) => [p.sku, p.name, p.category.name, p.stockQuantity, p.minimumStock, Number(p.costPrice), Number(p.costPrice) * p.stockQuantity])
      ]
      : [
        ["วันที่", "ประเภท", "SKU", "สินค้า", "จำนวน", "ราคาทุนต่อหน่วย", "เอกสาร", "ผู้ทำรายการ"],
        ...data.map((m) => [m.movementDate, m.type, m.product.sku, m.product.name, m.quantity, m.unitCost, m.documentNumber, m.createdBy.name])
      ];
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(",")).join("\r\n")}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  }
  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(reportType === "stock" ? "สินค้าคงคลัง" : "ความเคลื่อนไหว");
    if (reportType === "stock") {
      sheet.columns = [
        { header: "SKU", key: "sku", width: 18 }, { header: "สินค้า", key: "name", width: 30 },
        { header: "หมวดหมู่", key: "category", width: 22 }, { header: "คงเหลือ", key: "stock", width: 14 },
        { header: "ขั้นต่ำ", key: "minimum", width: 14 }, { header: "ราคาทุน", key: "cost", width: 16 },
        { header: "มูลค่าคงคลัง", key: "value", width: 18 }
      ];
      data.forEach((p) => sheet.addRow({ sku: p.sku, name: p.name, category: p.category.name, stock: p.stockQuantity, minimum: p.minimumStock, cost: Number(p.costPrice), value: Number(p.costPrice) * p.stockQuantity }));
    } else {
      sheet.columns = [
        { header: "วันที่", key: "date", width: 22 }, { header: "ประเภท", key: "type", width: 18 },
        { header: "SKU", key: "sku", width: 18 }, { header: "สินค้า", key: "name", width: 30 },
        { header: "จำนวน", key: "quantity", width: 14 }, { header: "เอกสาร", key: "document", width: 22 },
        { header: "ผู้ทำรายการ", key: "user", width: 22 }
      ];
      data.forEach((m) => sheet.addRow({ date: m.movementDate, type: m.type, sku: m.product.sku, name: m.product.name, quantity: m.quantity, document: m.documentNumber || "", user: m.createdBy.name }));
    }
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF153A5B" } };
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    await workbook.xlsx.write(res);
    return res.end();
  }

  const fontPath = process.env.PDF_FONT_PATH || "C:\\Windows\\Fonts\\tahoma.ttf";
  if (!fs.existsSync(fontPath)) {
    return res.status(503).json({ success: false, message: "กรุณากำหนด PDF_FONT_PATH ไปยังไฟล์ TrueType ที่รองรับภาษาไทย" });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
  const pdf = new PDFDocument({ size: "A4", margin: 40, layout: "landscape" });
  pdf.pipe(res);
  pdf.font(fontPath);
  pdf.fontSize(18).fillColor("#153A5B").text(reportType === "stock" ? "Warehouse stock report" : "Warehouse movement report");
  pdf.moveDown().fontSize(9).fillColor("#222");
  const rows = reportType === "stock"
    ? [["SKU", "Product", "Category", "Stock", "Minimum", "Cost", "Value"], ...data.map((p) => [p.sku, p.name, p.category.name, p.stockQuantity, p.minimumStock, Number(p.costPrice).toFixed(2), (Number(p.costPrice) * p.stockQuantity).toFixed(2)])]
    : [["Date", "Type", "SKU", "Product", "Qty", "Document", "User"], ...data.map((m) => [m.movementDate.toISOString().slice(0, 10), m.type, m.product.sku, m.product.name, m.quantity, m.documentNumber || "-", m.createdBy.name])];
  for (const row of rows) {
    pdf.text(row.map((v) => String(v)).join("    |    "), { width: 760, lineBreak: true });
    pdf.moveDown(0.35);
  }
  pdf.end();
}));

reportsRouter.get("/audit-logs", authorize("SUPER_ADMIN", "ADMIN"), asyncHandler(async (req, res) => {
  const take = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const data = await prisma.auditLog.findMany({ take, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } });
  res.json({ success: true, data });
}));
