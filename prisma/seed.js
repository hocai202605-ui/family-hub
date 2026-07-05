const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const transactions = [
  { amount: 1850000, type: "expense", category: "Food", member: "VK", note: "Đi chợ cuối tuần", date: "2026-07-02" },
  { amount: 38000000, type: "income", category: "Others", member: "CK", note: "Lương tháng 7", date: "2026-07-01" },
  { amount: 920000, type: "expense", category: "Transport", member: "CK", note: "Xăng xe và gửi xe", date: "2026-07-03" },
  { amount: 2150000, type: "expense", category: "Utilities", member: "VK", note: "Tiền điện nước", date: "2026-07-01" },
  { amount: 3400000, type: "expense", category: "Shopping", member: "CON", note: "Đồ dùng học tập", date: "2026-06-28" },
  { amount: 720000, type: "expense", category: "Entertainment", member: "CON", note: "Xem phim cuối tuần", date: "2026-07-04" },
  { amount: 4500000, type: "income", category: "Others", member: "VK", note: "Freelance", date: "2026-07-03" },
];

async function main() {
  const count = await prisma.transaction.count();

  if (count > 0) {
    console.log("Seed skipped: transactions table already has data.");
    return;
  }

  await prisma.transaction.createMany({
    data: transactions.map((transaction) => ({
      ...transaction,
      date: new Date(`${transaction.date}T00:00:00.000Z`),
    })),
  });

  console.log(`Seeded ${transactions.length} transactions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
