const fs = require("fs");
for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

(async () => {
  // login with admin from env if set
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  console.log("has admin env", Boolean(email), Boolean(password));

  // Try me without cookie
  let res = await fetch("http://localhost:3000/api/auth/me");
  console.log("me no cookie", res.status, await res.text());

  if (email && password) {
    res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    console.log("login", res.status, await res.text());
    console.log("set-cookie", setCookie);
    const cookie = setCookie.map(c => c.split(";")[0]).join("; ");
    const month = new Date().toISOString().slice(0, 7);
    const g = await fetch("http://localhost:3000/api/growth?month=" + month + "&member=CK", {
      headers: { cookie },
    });
    console.log("growth", g.status);
    console.log((await g.text()).slice(0, 1200));
  }
})();
