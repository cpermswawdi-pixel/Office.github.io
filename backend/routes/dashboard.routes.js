import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get("/", asyncHandler(async (req, res) => {
  const now = new Date();
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const [totalProducts, stock, outOfStock, products, stockIn, stockOut, recent,
    currentIn, previousIn, currentOut, previousOut, productsCurrent, productsPrevious, requestsCurrent, requestsPrevious] = await Promise.all([
    prisma.product.count(),
    prisma.product.aggregate({ _sum: { stockQuantity: true } }),
    prisma.product.count({ where: { stockQuantity: 0 } }),
    prisma.product.findMany({ select: { id: true, name: true, sku: true, unit: true, stockQuantity: true, minimumStock: true, costPrice: true } }),
    prisma.stockMovement.count({ where: { type: "STOCK_IN" } }),
    prisma.stockMovement.count({ where: { type: "STOCK_OUT" } }),
    prisma.stockMovement.findMany({
      where: req.user.role === "STAFF" ? { createdById: req.user.id } : {},
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, sku: true } }, createdBy: { select: { name: true } } }
    }),
    prisma.stockMovement.count({ where: { type: "STOCK_IN", movementDate: { gte: currentStart, lte: now } } }),
    prisma.stockMovement.count({ where: { type: "STOCK_IN", movementDate: { gte: previousStart, lt: currentStart } } }),
    prisma.stockMovement.count({ where: { type: "STOCK_OUT", movementDate: { gte: currentStart, lte: now } } }),
    prisma.stockMovement.count({ where: { type: "STOCK_OUT", movementDate: { gte: previousStart, lt: currentStart } } }),
    prisma.product.count({ where: { createdAt: { gte: currentStart, lte: now } } }),
    prisma.product.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } }),
    prisma.requisition.count({ where: { createdAt: { gte: currentStart, lte: now } } }),
    prisma.requisition.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } })
  ]);
  const lowStock = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.minimumStock).length;
  const inventoryValue = products.reduce((sum, p) => sum + Number(p.costPrice) * p.stockQuantity, 0);
  const lowStockItems = products
    .filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.minimumStock)
    .sort((a, b) => a.stockQuantity - b.stockQuantity)
    .slice(0, 5)
    .map(({ id, name, sku, unit, stockQuantity, minimumStock }) => ({ id, name, sku, unit, stockQuantity, minimumStock }));
  const percentage = (current, previous) => previous === 0 ? (current === 0 ? 0 : null) : Math.round(((current - previous) / previous) * 100);
  const chart = await prisma.$queryRaw`
    SELECT DATE_FORMAT(movementDate, '%Y-%m') AS month,
      SUM(CASE WHEN type = 'STOCK_IN' THEN quantity ELSE 0 END) AS stockIn,
      SUM(CASE WHEN type = 'STOCK_OUT' THEN quantity ELSE 0 END) AS stockOut
    FROM stock_movements
    WHERE movementDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 11 MONTH)
    GROUP BY DATE_FORMAT(movementDate, '%Y-%m')
    ORDER BY month
  `;
  res.json({
    success: true,
    data: {
      cards: {
        totalProducts,
        totalStock: stock._sum.stockQuantity || 0,
        lowStock,
        outOfStock,
        monthlyRequests: requestsCurrent,
        inventoryValue,
        stockIn,
        stockOut
      },
      trends: {
        productsAdded: { current: productsCurrent, previous: productsPrevious, percent: percentage(productsCurrent, productsPrevious) },
        stockIn: { current: currentIn, previous: previousIn, percent: percentage(currentIn, previousIn) },
        stockOut: { current: currentOut, previous: previousOut, percent: percentage(currentOut, previousOut) },
        requests: { current: requestsCurrent, previous: requestsPrevious, percent: percentage(requestsCurrent, requestsPrevious) }
      },
      stockStatus: [
        { name: "ปกติ", value: products.filter((p) => p.stockQuantity > p.minimumStock).length, color: "#16A36A" },
        { name: "ใกล้หมด", value: lowStock, color: "#F59E0B" },
        { name: "หมด", value: outOfStock, color: "#EF4444" }
      ],
      lowStockItems,
      chart: chart.map((row) => ({ month: row.month, stockIn: Number(row.stockIn), stockOut: Number(row.stockOut) })),
      recent
    }
  });
}));
