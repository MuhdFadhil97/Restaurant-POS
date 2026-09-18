import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { MAX_SINGLE_SHIFT_HOURS, shiftDurationHours } from "../staffAttendance/complianceRules";
import { CreateShiftTemplateInput, UpdateShiftTemplateInput } from "./validation";

function assertDurationValid(startTime: string, endTime: string) {
  if (shiftDurationHours(startTime, endTime) > MAX_SINGLE_SHIFT_HOURS) {
    throw ApiError.badRequest(`A single shift cannot exceed ${MAX_SINGLE_SHIFT_HOURS} hours`);
  }
}

export async function listShiftTemplates(outletId: string) {
  return prisma.staffShiftTemplate.findMany({
    where: { outletId, deletedAt: null },
    orderBy: { startTime: "asc" },
  });
}

export async function getShiftTemplate(id: string) {
  const template = await prisma.staffShiftTemplate.findFirst({ where: { id, deletedAt: null } });
  if (!template) throw ApiError.notFound("Shift template not found");
  return template;
}

export async function createShiftTemplate(input: CreateShiftTemplateInput) {
  assertDurationValid(input.startTime, input.endTime);
  return prisma.staffShiftTemplate.create({ data: input });
}

export async function updateShiftTemplate(id: string, input: UpdateShiftTemplateInput) {
  const existing = await getShiftTemplate(id);
  const startTime = input.startTime ?? existing.startTime;
  const endTime = input.endTime ?? existing.endTime;
  assertDurationValid(startTime, endTime);
  return prisma.staffShiftTemplate.update({ where: { id }, data: input });
}

export async function deleteShiftTemplate(id: string) {
  await getShiftTemplate(id);
  await prisma.staffShiftTemplate.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}
