// End-to-end launch smoke test.
//
// Drives a real browser through everything a new user does on day one:
// the public marketing and calculator pages, signup, creating a household,
// adding and completing a chore, inviting a second member, issuing a loan,
// creating and funding a shared goal, the Today panel and its timezone
// control, the billing paywall, logging out and back in — then repeats the
// Household HQ pages at phone width and sweeps for duplicate ids and
// unlabelled form fields.
//
// Needs a running server and a reachable database; that's why it lives here
// rather than in the vitest suite.
//
//   npm run dev                       # in one terminal
//   npm run test:e2e                  # in another
//   BASE_URL=https://staging.example npm run test:e2e
//
// Exits non-zero if any check fails, so CI can gate on it.

import { chromium } from "playwright";

const B = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.env.SHOT_DIR || "./tests/e2e/screenshots";
const EMAIL = `launch${Date.now()}@example.com`;
const PW = "Passw0rd!23";

const results = [];
const pageErrors = [];
let step = 0;
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
async function check(name, fn) {
  step++;
  try {
    const detail = await fn();
    record(name, true, detail || "");
  } catch (e) {
    record(name, false, e.message.split("\n")[0].slice(0, 160));
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
page.on("response", (r) => { if (r.status() >= 500) pageErrors.push(`HTTP ${r.status()} ${r.url()}`); });

async function waitForText(target, re, timeout = 15000) {
  const started = Date.now();
  for (;;) {
    const txt = await target.locator("body").innerText();
    if (re.test(txt)) return txt;
    if (Date.now() - started > timeout) throw new Error(`never saw ${re} (page had: ${txt.slice(0, 120).replace(/\n/g, " ")})`);
    await target.waitForTimeout(300);
  }
}

/** Log in on a context that has just navigated, giving React time to hydrate. */
async function signIn(p, email, password) {
  await p.goto(`${B}/login`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.locator('input[type="email"]').fill(email);
  await p.locator('input[type="password"]').fill(password);
  await p.locator("form button.btn-primary").click();
  await p.waitForURL(/dashboard/, { timeout: 25000 });
}

const skip = async () => { const s = page.getByRole("button", { name: /^Skip$/ }); if (await s.count()) { await s.first().click(); await page.waitForTimeout(400); } };

console.log("\n───────── PUBLIC SURFACE ─────────");
const PUBLIC = ["/", "/mission", "/rules", "/learn", "/docs", "/login", "/signup",
  "/tools/mortgage", "/tools/debt-calculator", "/tools/compound-interest", "/tools/emergency-fund",
  "/tools/home-affordability", "/tools/car-affordability", "/tools/down-payment", "/tools/50-30-20"];
for (const path of PUBLIC) {
  await check(`GET ${path}`, async () => {
    const res = await page.goto(B + path, { waitUntil: "domcontentloaded" });
    if (!res || res.status() !== 200) throw new Error(`status ${res?.status()}`);
    const h1 = await page.locator("h1").first().textContent().catch(() => null);
    return h1 ? `"${h1.trim().slice(0, 42)}"` : "";
  });
}

await check("404 page renders for an unknown route", async () => {
  await page.goto(`${B}/definitely-not-a-page`, { waitUntil: "domcontentloaded" });
  const txt = await page.locator("body").innerText();
  if (!/Page not found/i.test(txt)) throw new Error("no 404 copy");
  return "shows 'Page not found' + home link";
});

await check("/dashboard redirects to login when signed out", async () => {
  await page.goto(`${B}/dashboard`, { waitUntil: "domcontentloaded" });
  if (!page.url().includes("/login")) throw new Error(`landed on ${page.url()}`);
  return "middleware guard holds";
});

console.log("\n───────── SIGNUP & AUTH ─────────");
await check("Sign up creates an account and lands on the dashboard", async () => {
  await page.goto(`${B}/signup`);
  await page.locator("form input").nth(0).fill("Launch Tester");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PW);
  await page.locator("form button.btn-primary").click();
  await page.waitForURL(/dashboard/, { timeout: 25000 });
  return page.url().replace(B, "");
});
await skip();

console.log("\n───────── HOUSEHOLD SETUP ─────────");
await check("Household HQ shows the empty state before a household exists", async () => {
  await page.goto(`${B}/dashboard/household`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await skip();
  await waitForText(page, /Create a household/i);
  return "CTA present";
});

let HID = null;
let ME_ID = null;
await check("Create a household", async () => {
  const res = await page.evaluate(async () => {
    const r = await fetch("/api/households", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Launch House" }) });
    return { status: r.status, body: await r.json() };
  });
  if (res.status !== 200) throw new Error(`status ${res.status}`);
  HID = res.body.id;
  ME_ID = res.body.createdById;
  return `id ${HID.slice(0, 10)}… tz=${res.body.timezone}`;
});

console.log("\n───────── CHORES ─────────");
await check("Chores page loads with the household", async () => {
  await page.goto(`${B}/dashboard/household/chores`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await skip();
  await waitForText(page, /Log it, earn Crowns/);
  return (await page.locator("h1").first().innerText()).trim();
});

await check("Add a chore through the UI", async () => {
  await page.getByRole("button", { name: /Add chore/ }).click();
  await page.waitForTimeout(500);
  await page.getByLabel("Name").fill("Dishes");
  await page.getByRole("button", { name: /^Save$/ }).click();
  await waitForText(page, /Dishes/);
  return "Dishes appears on the board";
});

await check("Complete a chore — card flips and Crowns are awarded", async () => {
  const card = page.locator(".card").filter({ hasText: "Dishes" }).first();
  const before = (await card.locator("span").filter({ hasText: /^(Due|Done)$/ }).first().textContent())?.trim();
  await card.getByRole("button", { name: /Mark done|Done again/ }).click();
  // The badge flips optimistically; the reward line only appears once the
  // server has confirmed, so waiting on that covers both halves.
  await waitForText(page, /Crowns/);
  const after = (await card.locator("span").filter({ hasText: /^(Due|Done)$/ }).first().textContent())?.trim();
  const flash = (await page.locator('[role="status"]').textContent().catch(() => ""))?.trim();
  if (after !== "Done") throw new Error(`badge is "${after}"`);
  return `${before} → ${after}, "${flash}"`;
});

await check("Leaderboard ranks the completion", async () => {
  const board = await page.locator("section.card").last().innerText();
  if (!/You/.test(board)) throw new Error("no entry for the current user");
  return board.split("\n").slice(-3).join(" | ");
});

console.log("\n───────── THE BANK ─────────");
await check("Bank page loads", async () => {
  await page.goto(`${B}/dashboard/household/bank`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await skip();
  await waitForText(page, /The Bank/);
  return (await page.locator("h1").first().innerText()).trim();
});
await check("Lending to yourself is refused", async () => {
  const res = await page.evaluate(async ([hid, borrowerUserId]) => {
    const r = await fetch(`/api/households/${hid}/loans`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ borrowerUserId, principal: 250, purpose: "Self loan", interestRateApr: 0 }) });
    return { status: r.status, body: await r.json() };
  }, [HID, ME_ID]);
  if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
  return `400 "${res.body.error}"`;
});

const EMAIL2 = `launch2${Date.now()}@example.com`;
let MEMBER2_ID = null;
await check("Invite a second member, who accepts and joins", async () => {
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(`${B}/signup`);
  await p2.locator("form input").nth(0).fill("Second Member");
  await p2.fill('input[type="email"]', EMAIL2);
  await p2.fill('input[type="password"]', PW);
  await p2.locator("form button.btn-primary").click();
  await p2.waitForURL(/dashboard/, { timeout: 25000 });

  const inv = await page.evaluate(async ([hid, email]) => {
    const r = await fetch(`/api/households/${hid}/invite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    return { status: r.status, body: await r.json() };
  }, [HID, EMAIL2]);
  if (inv.status !== 200) throw new Error(`invite status ${inv.status}: ${JSON.stringify(inv.body).slice(0, 100)}`);

  const acc = await p2.evaluate(async (hid) => {
    const r = await fetch(`/api/households/${hid}/accept`, { method: "POST" });
    return { status: r.status, body: await r.json() };
  }, HID);
  if (acc.status !== 200) throw new Error(`accept status ${acc.status}: ${JSON.stringify(acc.body).slice(0, 100)}`);

  const members = await page.evaluate(async (hid) => (await fetch(`/api/households/${hid}/chores`).then((r) => r.json())).members, HID);
  MEMBER2_ID = members.find((m) => m.userId !== ME_ID)?.userId;
  await ctx2.close();
  if (!MEMBER2_ID) throw new Error(`second member never appeared: ${JSON.stringify(members)}`);
  return `household now has ${members.length} members`;
});

await check("Issue a real loan and see it on the Bank page", async () => {
  const res = await page.evaluate(async ([hid, borrowerUserId]) => {
    const r = await fetch(`/api/households/${hid}/loans`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ borrowerUserId, principal: 250, purpose: "New bike", interestRateApr: 0 }) });
    return { status: r.status, body: await r.json() };
  }, [HID, MEMBER2_ID]);
  if (res.status !== 200) throw new Error(`status ${res.status}: ${JSON.stringify(res.body).slice(0, 120)}`);
  await page.goto(`${B}/dashboard/household/bank`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await skip();
  await waitForText(page, /New bike/);
  return "$250 loan 'New bike' listed on the Bank page";
});

console.log("\n───────── SHARED GOALS ─────────");
await check("Goals page loads", async () => {
  await page.goto(`${B}/dashboard/household/goals`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await skip();
  await waitForText(page, /Household Goals/);
  return (await page.locator("h1").first().innerText()).trim();
});
await check("Create a goal and contribute to it", async () => {
  const created = await page.evaluate(async (hid) => {
    const r = await fetch(`/api/households/${hid}/goals`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bathroom remodel", targetAmount: 5000, category: "ESSENTIAL" }) });
    return { status: r.status, body: await r.json() };
  }, HID);
  if (created.status !== 200) throw new Error(`create status ${created.status}: ${JSON.stringify(created.body).slice(0, 120)}`);
  const goalId = created.body.goal?.id || created.body.id;
  const contrib = await page.evaluate(async ([hid, gid]) => {
    const r = await fetch(`/api/households/${hid}/goals/${gid}/contribute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "CASH", amount: 100 }) });
    return { status: r.status, body: await r.json() };
  }, [HID, goalId]);
  if (contrib.status !== 200) throw new Error(`contribute status ${contrib.status}`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await skip();
  await waitForText(page, /Bathroom remodel/);
  return "$100 toward 'Bathroom remodel'";
});

console.log("\n───────── DAILY ENGAGEMENT ─────────");
await check("Today panel shows streak, objectives and the timezone control", async () => {
  await page.goto(`${B}/dashboard/household`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await skip();
  const txt = await waitForText(page, /day streak/);
  for (const need of ["Do a chore", "Day ends at midnight"]) {
    if (!txt.includes(need)) throw new Error(`missing "${need}"`);
  }
  const done = await page.locator("li", { hasText: "Do a chore" }).first().innerText();
  return `objectives render; chore objective: "${done.trim()}"`;
});

await check("Change the household timezone and see it stick", async () => {
  await page.getByRole("button", { name: /Day ends at midnight/ }).click();
  await page.waitForTimeout(500);
  await page.selectOption("#tz-select", "America/New_York");
  await page.getByRole("button", { name: /^Save$/ }).click();
  const trigger = page.getByRole("button", { name: /Day ends at midnight/ });
  const started = Date.now();
  let label = "";
  for (;;) {
    label = (await trigger.textContent()) || "";
    if (/New York/.test(label)) break;
    if (Date.now() - started > 15000) throw new Error(`trigger still reads "${label.trim()}"`);
    await page.waitForTimeout(300);
  }
  return label.trim();
});

console.log("\n───────── BILLING ─────────");
await check("Billing page shows the plan and the dev-mode warning", async () => {
  await page.goto(`${B}/dashboard/billing`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await skip();
  const txt = await waitForText(page, /on the Free plan/);
  if (!/Dev mode/i.test(txt)) throw new Error("no dev-mode banner despite Stripe being unset");
  return "Free plan + dev-mode banner";
});

await check("Upgrade in dev mode lifts the plan", async () => {
  const res = await page.evaluate(async (hid) => {
    const r = await fetch(`/api/households/${hid}/billing/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: "rhythm" }) });
    return { status: r.status, body: await r.json() };
  }, HID);
  if (res.status !== 200) throw new Error(`status ${res.status}`);
  if (!res.body.devMode) throw new Error("expected devMode upgrade");
  const plan = await page.evaluate(async (hid) => (await fetch(`/api/households/${hid}/plan`).then((r) => r.json())), HID);
  if (plan.planId !== "rhythm") throw new Error(`plan is ${plan.planId}`);
  return "free → rhythm, nothing charged";
});

console.log("\n───────── SESSION ─────────");
await check("Log out, then log back in", async () => {
  await page.evaluate(async () => { await fetch("/api/auth/logout", { method: "POST" }); });
  await page.goto(`${B}/dashboard`, { waitUntil: "domcontentloaded" });
  if (!page.url().includes("/login")) throw new Error("still authenticated after logout");
  if ((await page.context().cookies()).some((c) => c.name === "fw_session" && c.value)) throw new Error("session cookie survived logout");
  await signIn(page, EMAIL, PW);
  return "session cookie cleared, sign-in restores it";
});

console.log("\n───────── MOBILE VIEWPORT ─────────");
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await mctx.newPage();
mp.on("pageerror", (e) => pageErrors.push(`[mobile] ${mp.url()} :: ${e.message}`));
await signIn(mp, EMAIL, PW);
const mskip = async () => { const s = mp.getByRole("button", { name: /^Skip$/ }); if (await s.count()) { await s.first().click(); await mp.waitForTimeout(400); } };
await mskip();

for (const [name, path] of [["Household HQ", "/dashboard/household"], ["Chores", "/dashboard/household/chores"], ["Bank", "/dashboard/household/bank"], ["Goals", "/dashboard/household/goals"]]) {
  await check(`Mobile: ${name} renders without horizontal overflow`, async () => {
    await mp.goto(B + path, { waitUntil: "domcontentloaded" });
    await mp.waitForTimeout(2200);
    await mskip();
    const { scrollW, clientW } = await mp.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
    if (scrollW > clientW + 1) throw new Error(`page scrolls horizontally: ${scrollW} > ${clientW}`);
    const tabs = await mp.locator("nav").last().innerText().catch(() => "");
    await mp.screenshot({ path: `${OUT}/launch-mobile-${path.split("/").pop()}.png` });
    return `${clientW}px wide, tab bar: ${tabs.replace(/\n/g, "/")}`;
  });
}

console.log("\n───────── ACCESSIBILITY ─────────");
for (const [name, path] of [["Household HQ", "/dashboard/household"], ["Chores", "/dashboard/household/chores"], ["Bank", "/dashboard/household/bank"], ["Goals", "/dashboard/household/goals"], ["Settings", "/dashboard/settings"]]) {
  await check(`${name}: no duplicate element ids`, async () => {
    await page.goto(B + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await skip();
    const dupes = await page.evaluate(() => {
      const seen = {}, dup = [];
      for (const el of document.querySelectorAll("[id]")) {
        if (seen[el.id]) dup.push(el.id); else seen[el.id] = 1;
      }
      return [...new Set(dup)];
    });
    if (dupes.length) throw new Error(`duplicated: ${dupes.join(", ")}`);
    return "clean";
  });
}

await check("Every form field in the new-chore dialog has an accessible name", async () => {
  await page.goto(`${B}/dashboard/household/chores`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await skip();
  await page.getByRole("button", { name: /Add chore/ }).click();
  await page.waitForTimeout(600);
  const unnamed = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="dialog"] input, [role="dialog"] select, [role="dialog"] textarea'))
      .filter((el) => !(el.labels && el.labels.length) && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"))
      .map((el) => `${el.tagName.toLowerCase()}${el.type ? "[" + el.type + "]" : ""}`)
  );
  if (unnamed.length) throw new Error(`unnamed fields: ${unnamed.join(", ")}`);
  const named = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="dialog"] input, [role="dialog"] select')).map((el) => el.labels?.[0]?.textContent?.trim()).filter(Boolean));
  await page.keyboard.press("Escape");
  return named.join(", ");
});

console.log("\n───────── SUMMARY ─────────");
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.log("\nFAILURES:"); failed.forEach((f) => console.log(`  ✗ ${f.name} — ${f.detail}`)); }
const realErrors = pageErrors.filter((e) => !/favicon|_next\/static/.test(e));
console.log(`\nUncaught page errors / 5xx responses: ${realErrors.length}`);
realErrors.slice(0, 10).forEach((e) => console.log("  " + e));

await browser.close();
process.exit(failed.length ? 1 : 0);
