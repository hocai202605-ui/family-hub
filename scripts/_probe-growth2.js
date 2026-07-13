const crypto = require("crypto");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}
function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "family-dashboard-dev-secret-change-me";
}
for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

(async () => {
  const p = new PrismaClient();
  try {
    console.log("has growthHabit", typeof p.growthHabit);
    const cols = await p.$queryRawUnsafe(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='growth_habits' ORDER BY ordinal_position"
    );
    console.log("cols", cols);

    const admin = await p.user.findFirst({ where: { role: "ADMIN" } });
    console.log("admin", admin && { id: admin.id, name: admin.name });

    // Simulate GET bundle query
    const month = new Date().toISOString().slice(0, 7);
    console.log("month", month);
    const habits = await p.growthHabit.findMany({
      where: { member: "CK", month },
      include: { checks: true },
    });
    console.log("habits ok", habits.length);

    const plans = await p.growthPlanItem.findMany({ where: { member: "CK", month } });
    console.log("plans ok", plans.length);

    const logs = await p.growthDailyLog.findMany({
      where: { member: "CK" },
      include: { tickNotes: true },
      take: 5,
    });
    console.log("logs ok", logs.length);

    const events = await p.growthCalendarEvent.findMany({ where: { member: "CK" }, take: 5 });
    console.log("events ok", events.length);

    // Hit API
    const payload = base64url(JSON.stringify({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    const token = payload + "." + crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
    const res = await fetch("http://localhost:3000/api/growth?month=" + month + "&member=CK", {
      headers: { cookie: "family_session=" + token },
    });
    const text = await res.text();
    console.log("api status", res.status);
    console.log("api body", text.slice(0, 1500));
  } catch (e) {
    console.error("FAIL", e);
  } finally {
    await p.$disconnect();
  }
})();
