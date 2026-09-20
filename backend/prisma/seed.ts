import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Simple flat-color SVG illustrations for demo products, written directly into
// the (gitignored) uploads folder so seeded products have a relevant image
// without depending on any external/network image source.
const PRODUCT_IMAGES: Record<string, string> = {
  "iced-coffee.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#f3ede3"/>
    <path d="M55 70h90l-10 95a12 12 0 0 1-12 11H77a12 12 0 0 1-12-11L55 70z" fill="#ffffff" stroke="#6b4a30" stroke-width="4"/>
    <rect x="60" y="95" width="80" height="40" fill="#c9955a" opacity="0.85"/>
    <path d="M145 78c18 2 24 20 12 32-8 8-20 9-27 6" fill="none" stroke="#6b4a30" stroke-width="4"/>
    <rect x="45" y="58" width="110" height="14" rx="6" fill="#6b4a30"/>
    <line x1="85" y1="70" x2="80" y2="170" stroke="#8a6a49" stroke-width="3"/>
    <line x1="115" y1="70" x2="120" y2="170" stroke="#8a6a49" stroke-width="3"/>
  </svg>`,
  "club-sandwich.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#f6efe0"/>
    <path d="M35 120h130l-15 25a10 10 0 0 1-9 5H59a10 10 0 0 1-9-5l-15-25z" fill="#e8b968"/>
    <rect x="35" y="105" width="130" height="16" rx="4" fill="#4f8a3d"/>
    <rect x="35" y="90" width="130" height="16" fill="#c1392b"/>
    <rect x="35" y="75" width="130" height="16" fill="#e8b968"/>
    <path d="M40 75l60-35 60 35z" fill="#eecb8a"/>
    <circle cx="70" cy="150" r="4" fill="#c9955a"/>
    <circle cx="100" cy="155" r="4" fill="#c9955a"/>
    <circle cx="130" cy="150" r="4" fill="#c9955a"/>
  </svg>`,
  "blueberry-muffin.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#f6efe0"/>
    <path d="M50 95c-10-25 15-40 50-40s60 15 50 40c10 5 12 18-2 20H52c-14-2-12-15-2-20z" fill="#e8c27a"/>
    <path d="M45 100h110l-8 65a12 12 0 0 1-12 11H65a12 12 0 0 1-12-11l-8-65z" fill="#c9955a"/>
    <g fill="#3d4a91">
      <circle cx="75" cy="75" r="6"/>
      <circle cx="100" cy="65" r="6"/>
      <circle cx="125" cy="78" r="6"/>
      <circle cx="88" cy="120" r="5"/>
      <circle cx="115" cy="130" r="5"/>
      <circle cx="70" cy="140" r="5"/>
    </g>
  </svg>`,
};

function seedProductImages() {
  const dir = path.join(__dirname, "..", "uploads", "products");
  fs.mkdirSync(dir, { recursive: true });
  for (const [filename, svg] of Object.entries(PRODUCT_IMAGES)) {
    fs.writeFileSync(path.join(dir, filename), svg.trim());
  }
}

async function main() {
  console.log("Seeding database...");
  seedProductImages();

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
      imageUrl: "/uploads/products/iced-coffee.svg",
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
      imageUrl: "/uploads/products/club-sandwich.svg",
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
      imageUrl: "/uploads/products/blueberry-muffin.svg",
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
