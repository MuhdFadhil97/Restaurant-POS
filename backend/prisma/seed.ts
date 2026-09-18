import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const outlet1 = await prisma.outlet.create({
    data: { name: "Downtown Cafe", address: "123 Main St", phone: "555-0100" },
  });
  const outlet2 = await prisma.outlet.create({
    data: { name: "Uptown Branch", address: "456 High St", phone: "555-0200" },
  });

  const defaultTax = await prisma.taxRate.create({
    data: { outletId: outlet1.id, name: "Standard Tax", rate: 6, isDefault: true },
  });
  await prisma.taxRate.create({
    data: { outletId: outlet2.id, name: "Standard Tax", rate: 6, isDefault: true },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@pos.local",
      username: "admin",
      passwordHash,
      name: "Ali Admin",
      role: "ADMIN",
      outletAccess: { create: [{ outletId: outlet1.id }, { outletId: outlet2.id }] },
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@pos.local",
      username: "manager",
      passwordHash,
      name: "Maria Manager",
      role: "MANAGER",
      outletAccess: { create: [{ outletId: outlet1.id }] },
    },
  });

  const cashier = await prisma.user.create({
    data: {
      email: "cashier@pos.local",
      username: "cashier",
      passwordHash,
      name: "Chris Cashier",
      role: "CASHIER",
      outletAccess: { create: [{ outletId: outlet1.id }] },
    },
  });

  await prisma.user.create({
    data: {
      email: "kitchen@pos.local",
      username: "kitchen",
      passwordHash,
      name: "Kai Kitchen",
      role: "KITCHEN",
      outletAccess: { create: [{ outletId: outlet1.id }] },
    },
  });

  const kitchenStation = await prisma.kitchenStation.create({
    data: { outletId: outlet1.id, name: "Kitchen" },
  });
  const barStation = await prisma.kitchenStation.create({
    data: { outletId: outlet1.id, name: "Bar" },
  });

  const beverages = await prisma.productCategory.create({ data: { name: "Beverages" } });
  const food = await prisma.productCategory.create({ data: { name: "Food" } });

  const coffee = await prisma.product.create({
    data: {
      sku: "BEV-001",
      name: "Iced Coffee",
      categoryId: beverages.id,
      unitPrice: 4.5,
      costPrice: 1.2,
      taxRateId: defaultTax.id,
      unitOfMeasure: "cup",
      lowStockThreshold: 10,
      stationId: barStation.id,
      variants: {
        create: [
          { name: "Size", value: "Regular", priceAdjustment: 0 },
          { name: "Size", value: "Large", priceAdjustment: 1.0 },
        ],
      },
    },
    include: { variants: true },
  });

  const sandwich = await prisma.product.create({
    data: {
      sku: "FOOD-001",
      name: "Club Sandwich",
      categoryId: food.id,
      unitPrice: 7.9,
      costPrice: 3.1,
      taxRateId: defaultTax.id,
      unitOfMeasure: "plate",
      lowStockThreshold: 5,
      stationId: kitchenStation.id,
    },
  });

  const muffin = await prisma.product.create({
    data: {
      sku: "FOOD-002",
      name: "Blueberry Muffin",
      categoryId: food.id,
      unitPrice: 3.2,
      costPrice: 1.0,
      taxRateId: defaultTax.id,
      unitOfMeasure: "piece",
      lowStockThreshold: 8,
      stationId: kitchenStation.id,
    },
  });

  // Initial stock at outlet1 only.
  for (const variant of coffee.variants) {
    await prisma.productStock.create({
      data: { productId: coffee.id, variantId: variant.id, outletId: outlet1.id, quantity: 50 },
    });
  }
  await prisma.productStock.create({
    data: { productId: sandwich.id, outletId: outlet1.id, quantity: 20 },
  });
  await prisma.productStock.create({
    data: { productId: muffin.id, outletId: outlet1.id, quantity: 3 }, // intentionally low, for low-stock demo
  });

  await prisma.table.createMany({
    data: [
      { outletId: outlet1.id, name: "T1", capacity: 2 },
      { outletId: outlet1.id, name: "T2", capacity: 4 },
      { outletId: outlet1.id, name: "T3", capacity: 4 },
    ],
  });

  await prisma.discount.createMany({
    data: [
      { name: "Staff Discount", type: "PERCENTAGE", scope: "ORDER", value: 10 },
      { name: "RM1 Off", type: "FIXED", scope: "LINE", value: 1 },
    ],
  });

  await prisma.customer.create({
    data: { name: "Walk-in Customer", phone: "555-9999" },
  });
  await prisma.customer.create({
    data: { name: "Priya Regular", phone: "555-1234", email: "priya@example.com", pointsBalance: 250 },
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: "Acme Foodservice Co.",
      contactName: "Sam Vendor",
      email: "sam@acmefoodservice.example",
      phone: "555-7000",
      paymentTerms: "Net 30",
    },
  });

  await prisma.giftCard.create({
    data: { code: "WELCOME50", balance: 50 },
  });

  // ── Staff shift management demo data ──────────────────────────────────
  const morningShift = await prisma.staffShiftTemplate.create({
    data: { outletId: outlet1.id, name: "Morning", startTime: "08:00", endTime: "16:00", breakMinutes: 30 },
  });
  const eveningShift = await prisma.staffShiftTemplate.create({
    data: { outletId: outlet1.id, name: "Evening", startTime: "16:00", endTime: "00:00", breakMinutes: 30 },
  });
  const nightShift = await prisma.staffShiftTemplate.create({
    data: { outletId: outlet1.id, name: "Night", startTime: "22:00", endTime: "06:00", breakMinutes: 45 },
  });

  // A week of roster entries for the cashier and kitchen staff, with one
  // deliberate gap day (no rest-day-in-7 demo relies on attendance, not the
  // roster itself, but this keeps the grid realistic).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue; // gap day: nobody scheduled
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    await prisma.staffShiftSchedule.create({
      data: {
        outletId: outlet1.id,
        userId: cashier.id,
        shiftTemplateId: morningShift.id,
        date,
        createdByUserId: admin.id,
      },
    });
  }

  // A pre-computed, compliance-flagged attendance record (6h20m continuous,
  // no break) so the timesheet/compliance view has something to show
  // immediately without a live multi-hour wait.
  const flaggedClockIn = new Date(today);
  flaggedClockIn.setDate(flaggedClockIn.getDate() - 1);
  flaggedClockIn.setHours(9, 0, 0, 0);
  const flaggedClockOut = new Date(flaggedClockIn);
  flaggedClockOut.setHours(flaggedClockOut.getHours() + 6, flaggedClockOut.getMinutes() + 20);
  await prisma.staffAttendance.create({
    data: {
      outletId: outlet1.id,
      userId: cashier.id,
      status: "CLOCKED_OUT",
      clockInAt: flaggedClockIn,
      clockOutAt: flaggedClockOut,
      totalWorkedMinutes: 380,
      totalBreakMinutes: 0,
      hasComplianceIssue: true,
      complianceNotes:
        "Worked 6h20m continuously without a break (Malaysia Employment Act requires a break after 5 consecutive hours).",
    },
  });

  console.log("Seed complete:");
  console.log(`  Shift templates seeded: ${morningShift.name}, ${eveningShift.name}, ${nightShift.name} (outlet 1)`);
  console.log(`  Admin    -> username: admin    / password: password123`);
  console.log(`  Manager  -> username: manager  / password: password123`);
  console.log(`  Cashier  -> username: cashier  / password: password123`);
  console.log(`  Kitchen  -> username: kitchen  / password: password123`);
  console.log(`  Supplier seeded: ${supplier.name}`);
  console.log(`  Gift card seeded: WELCOME50 ($50 balance)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
