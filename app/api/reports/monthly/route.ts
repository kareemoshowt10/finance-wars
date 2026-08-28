import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad } from "@/lib/api";
import { Document, Page, Text, View, StyleSheet, renderToStream } from "@react-pdf/renderer";
import React from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  h1: { fontSize: 22, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  sub: { color: "#666", marginBottom: 16, fontSize: 10 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#333" },
  tilesRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tile: { flex: 1, border: "1px solid #ddd", borderRadius: 6, padding: 8 },
  tileLabel: { color: "#666", fontSize: 8 },
  tileValue: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 },
  row: { flexDirection: "row", borderBottom: "1px solid #eee", paddingVertical: 4 },
  rowHead: { flexDirection: "row", borderBottom: "1px solid #aaa", paddingBottom: 3, marginBottom: 2 },
  cell: { flex: 1 },
  cellRight: { flex: 1, textAlign: "right" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, color: "#999", fontSize: 8, borderTop: "1px solid #eee", paddingTop: 6 },
});

function fmt(n: number, currency: string) {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n); }
  catch { return `$${Math.round(n)}`; }
}

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const monthStr = searchParams.get("month") || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return bad("Invalid month, use YYYY-MM");
  const [year, m] = monthStr.split("-").map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 1);

  const [txs, accounts, snaps] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: r.user.id, date: { gte: start, lt: end } },
      include: { account: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.account.findMany({ where: { userId: r.user.id } }),
    prisma.netWorthSnapshot.findMany({
      where: { userId: r.user.id, date: { lt: end } },
      orderBy: { date: "desc" },
      take: 1,
    }),
  ]);

  let income = 0, expense = 0;
  const byCat: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else { expense += t.amount; byCat[t.category] = (byCat[t.category] || 0) + t.amount; }
  }
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const monthEndNW = snaps[0]?.value ?? accounts.reduce((s, a) => s + (a.type === "credit" ? -a.balance : a.balance), 0);
  const topTx = [...txs].sort((a, b) => b.amount - a.amount).slice(0, 10);
  const currency = r.user.currency;
  const monthLabel = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      React.createElement(Text, { style: styles.h1 }, "Debt Sucker Monthly Statement"),
      React.createElement(Text, { style: styles.sub }, `${r.user.name} • ${monthLabel} • ${currency}`),

      React.createElement(
        View,
        { style: styles.tilesRow },
        tile("Net Worth", fmt(monthEndNW, currency)),
        tile("Income", fmt(income, currency)),
        tile("Expenses", fmt(expense, currency)),
        tile("Savings Rate", `${Math.round(savingsRate)}%`)
      ),

      sectionTable(
        "Accounts",
        ["Name", "Type", "Balance"],
        accounts.map((a) => [a.name, a.type, fmt(a.balance, currency)])
      ),

      sectionTable(
        "Top 10 transactions",
        ["Date", "Description", "Category", "Amount"],
        topTx.map((t) => [
          t.date.toISOString().slice(0, 10),
          t.description,
          t.category,
          `${t.type === "income" ? "+" : "-"}${fmt(t.amount, currency)}`,
        ])
      ),

      sectionTable(
        "Category breakdown",
        ["Category", "Spent"],
        Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => [c, fmt(v, currency)])
      ),

      React.createElement(
        Text,
        { style: styles.footer },
        `Generated ${new Date().toLocaleString("en-US")} • Debt Sucker`
      )
    )
  );

  const stream = await renderToStream(doc);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="debt-sucker-${monthStr}.pdf"`,
    },
  });
}

function tile(label: string, value: string) {
  return React.createElement(
    View,
    { style: styles.tile },
    React.createElement(Text, { style: styles.tileLabel }, label),
    React.createElement(Text, { style: styles.tileValue }, value)
  );
}

function sectionTable(title: string, cols: string[], rows: string[][]) {
  return React.createElement(
    View,
    { style: styles.section },
    React.createElement(Text, { style: styles.sectionTitle }, title),
    React.createElement(
      View,
      { style: styles.rowHead },
      ...cols.map((c, i) =>
        React.createElement(
          Text,
          { key: i, style: i === cols.length - 1 ? styles.cellRight : styles.cell },
          c
        )
      )
    ),
    ...rows.map((row, i) =>
      React.createElement(
        View,
        { key: i, style: styles.row },
        ...row.map((v, j) =>
          React.createElement(
            Text,
            { key: j, style: j === row.length - 1 ? styles.cellRight : styles.cell },
            v
          )
        )
      )
    )
  );
}
