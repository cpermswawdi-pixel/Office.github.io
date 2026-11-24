import { prisma } from "../config/prisma.js";

export async function writeAudit(req, values, db = prisma) {
  const toJson = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  await db.auditLog.create({
    data: {
      userId: req.user?.id ?? null,
      username: req.user?.name ?? null,
      action: values.action,
      module: values.module,
      recordId: values.recordId == null ? null : String(values.recordId),
      previousValue: toJson(values.previousValue),
      updatedValue: toJson(values.updatedValue),
      ipAddress: req.ip
    }
  });
}
