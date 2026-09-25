import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const user = await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash, role: "ADMIN", isActive: true },
    create: {
      email: "admin@pos.local",
      username: "admin",
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log(JSON.stringify({ id: user.id, username: user.username, role: user.role }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
