const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const categories = [
  {
    id: "Food",
    label: "Ăn uống",
    icon: "utensils",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    chart: "#10b981",
    type: "EXPENSE",
  },
  {
    id: "Utilities",
    label: "Điện nước",
    icon: "home",
    badge: "bg-sky-50 text-sky-700 ring-sky-100",
    chart: "#0ea5e9",
    type: "EXPENSE",
  },
  {
    id: "Transport",
    label: "Di chuyển",
    icon: "trendingUp",
    badge: "bg-amber-50 text-amber-700 ring-amber-100",
    chart: "#f59e0b",
    type: "EXPENSE",
  },
  {
    id: "Shopping",
    label: "Mua sắm",
    icon: "wallet",
    badge: "bg-rose-50 text-rose-700 ring-rose-100",
    chart: "#f43f5e",
    type: "EXPENSE",
  },
  {
    id: "Entertainment",
    label: "Giải trí",
    icon: "sparkles",
    badge: "bg-violet-50 text-violet-700 ring-violet-100",
    chart: "#8b5cf6",
    type: "EXPENSE",
  },
  {
    id: "Others",
    label: "Khác",
    icon: "banknote",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    chart: "#64748b",
    type: "EXPENSE",
  },
  {
    id: "Salary",
    label: "Lương",
    icon: "briefcase",
    badge: "bg-blue-50 text-blue-700 ring-blue-100",
    chart: "#3b82f6",
    type: "INCOME",
  },
  {
    id: "Freelance",
    label: "Làm thêm",
    icon: "sparkles",
    badge: "bg-violet-50 text-violet-700 ring-violet-100",
    chart: "#8b5cf6",
    type: "INCOME",
  },
  {
    id: "Bonus",
    label: "Thưởng",
    icon: "gift",
    badge: "bg-rose-50 text-rose-700 ring-rose-100",
    chart: "#f43f5e",
    type: "INCOME",
  },
  {
    id: "Investment",
    label: "Đầu tư",
    icon: "barChart",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    chart: "#10b981",
    type: "INCOME",
  },
  {
    id: "Gift",
    label: "Biếu tặng",
    icon: "heart",
    badge: "bg-amber-50 text-amber-700 ring-amber-100",
    chart: "#f59e0b",
    type: "INCOME",
  },
  {
    id: "Income_Others",
    label: "Khác",
    icon: "banknote",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    chart: "#64748b",
    type: "INCOME",
  },
];

const expenses = [
  { amount: 1850000, category: "Food", member: "VK", note: "Đi chợ cuối tuần", date: "2026-07-02" },
  { amount: 920000, category: "Transport", member: "CK", note: "Xăng xe và gửi xe", date: "2026-07-03" },
  { amount: 2150000, category: "Utilities", member: "VK", note: "Tiền điện nước", date: "2026-07-01" },
  { amount: 3400000, category: "Shopping", member: "CON", note: "Đồ dùng học tập", date: "2026-06-28" },
  { amount: 720000, category: "Entertainment", member: "CON", note: "Xem phim cuối tuần", date: "2026-07-04" },
];

const incomes = [
  { amount: 38000000, category: "Salary", member: "CK", note: "Lương tháng 7", date: "2026-07-01" },
  { amount: 4500000, category: "Freelance", member: "VK", note: "Freelance", date: "2026-07-03" },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      create: category,
      update: category,
    });
  }

  const expenseCount = await prisma.expense.count();
  const incomeCount = await prisma.income.count();

  if (expenseCount === 0) {
    await prisma.expense.createMany({
      data: expenses.map((item) => ({
        ...item,
        date: new Date(`${item.date}T00:00:00.000Z`),
      })),
    });
    console.log(`Seeded ${expenses.length} expenses.`);
  } else {
    console.log("Seed skipped: expenses table already has data.");
  }

  if (incomeCount === 0) {
    await prisma.income.createMany({
      data: incomes.map((item) => ({
        ...item,
        date: new Date(`${item.date}T00:00:00.000Z`),
      })),
    });
    console.log(`Seeded ${incomes.length} incomes.`);
  } else {
    console.log("Seed skipped: incomes table already has data.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
