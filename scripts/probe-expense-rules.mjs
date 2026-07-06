/**
 * Find expense aggregation rule matching Linbis Commission Analysis CSV.
 */
const API_BASE = "https://portalclientes.seemanngroup.com/api/linbis-token";
const LINBIS = "https://api.linbis.com";

async function getToken() {
  const res = await fetch(API_BASE);
  return (await res.json()).token;
}

async function fetchLinbis(token, path) {
  const res = await fetch(`${LINBIS}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json();
  return Array.isArray(data) ? data : data.items ?? [];
}

function parseUsDate(s) {
  const [mm, dd, yy] = s.split("/").map(Number);
  return new Date(yy, mm - 1, dd);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function parseCsvExpected(csvPath) {
  const fs = await import("node:fs");
  const text = fs.readFileSync(csvPath, "latin1");
  const lines = text.split(/\r?\n/);
  const expected = new Map();
  for (const line of lines) {
    const cols = line.split(",");
    const inv = (cols[2] || "").trim();
    if (!/^INV\d+|^NC |^\d{4}$/.test(inv) && !/^3\d{3}$/.test(inv)) continue;
    const income = parseFloat((cols[24] || "").trim());
    const expense = parseFloat((cols[27] || "").trim());
    const profit = parseFloat((cols[28] || "").trim());
    if (Number.isNaN(income)) continue;
    expected.set(inv, { income, expense, profit });
  }
  return expected;
}

async function main() {
  const token = await getToken();
  const [charges, invoices] = await Promise.all([
    fetchLinbis(token, "/shipments/allCharges"),
    fetchLinbis(token, "/invoices/all"),
  ]);

  const expected = await parseCsvExpected(
    "C:/Users/elxpa/Downloads/Commision Analisys List.csv",
  );

  const invoiceByNumber = new Map(invoices.map((i) => [i.number, i]));
  const chargesByModule = new Map();
  for (const c of charges) {
    const mid = c.moduleId;
    if (!chargesByModule.has(mid)) chargesByModule.set(mid, []);
    chargesByModule.get(mid).push(c);
  }

  const start = new Date(2026, 5, 1);
  const end = new Date(2026, 5, 5, 23, 59, 59, 999);

  function buildExpenseRule(allocFn) {
    let match = 0;
    let mismatch = 0;
    const diffs = [];

    for (const [invNum, exp] of expected) {
      const inv = invoiceByNumber.get(invNum);
      if (!inv) continue;
      const d = parseUsDate(inv.date);
      if (d < start || d > end) continue;

      const modCharges = [];
      for (const c of charges) {
        if ((c.income?.invoice || "") === invNum) modCharges.push(c);
      }
      if (modCharges.length === 0) continue;
      const moduleId = modCharges[0].moduleId;
      const allMod = chargesByModule.get(moduleId) || [];

      const income = round2(
        allMod
          .filter((c) => (c.income?.invoice || "") === invNum)
          .reduce((s, c) => s + (c.income?.exchangeAmount || 0), 0),
      );

      let expense = allMod
        .filter((c) => (c.income?.invoice || "") === invNum)
        .reduce((s, c) => s + (c.expense?.exchangeAmount || 0), 0);

      expense += allocFn(invNum, inv, allMod, expected);

      expense = round2(expense);
      const profit = round2(income - expense);

      const ok =
        Math.abs(income - exp.income) < 0.02 &&
        Math.abs(expense - exp.expense) < 0.02 &&
        Math.abs(profit - exp.profit) < 0.02;

      if (ok) match++;
      else {
        mismatch++;
        if (diffs.length < 8) {
          diffs.push({
            inv: invNum,
            expected: exp,
            got: { income, expense, profit },
          });
        }
      }
    }
    return { match, mismatch, diffs };
  }

  const rules = {
    incomeOnly: () => 0,
    unassignedToFirstInv: (invNum, _inv, allMod) => {
      const invoicesOnMod = [
        ...new Set(
          allMod.map((c) => c.income?.invoice).filter(Boolean),
        ),
      ].sort();
      if (invNum !== invoicesOnMod[0]) return 0;
      return allMod
        .filter((c) => !c.income?.invoice)
        .reduce((s, c) => s + (c.expense?.exchangeAmount || 0), 0);
    },
    unassignedToLastInv: (invNum, _inv, allMod) => {
      const invoicesOnMod = [
        ...new Set(
          allMod.map((c) => c.income?.invoice).filter(Boolean),
        ),
      ].sort();
      if (invNum !== invoicesOnMod[invoicesOnMod.length - 1]) return 0;
      return allMod
        .filter((c) => !c.income?.invoice)
        .reduce((s, c) => s + (c.expense?.exchangeAmount || 0), 0);
    },
    unassignedToMinInv: (invNum, _inv, allMod) => {
      const invoicesOnMod = [
        ...new Set(
          allMod.map((c) => c.income?.invoice).filter(Boolean),
        ),
      ].sort();
      if (invNum !== invoicesOnMod[0]) return 0;
      return allMod
        .filter((c) => !c.income?.invoice && (c.expense?.exchangeAmount || 0) > 0)
        .reduce((s, c) => s + (c.expense?.exchangeAmount || 0), 0);
    },
    allUnassignedToEach: (invNum, _inv, allMod) => {
      if (!allMod.some((c) => (c.income?.invoice || "") === invNum)) return 0;
      return allMod
        .filter((c) => !c.income?.invoice)
        .reduce((s, c) => s + (c.expense?.exchangeAmount || 0), 0);
    },
    expenseInvoiceMatch: (invNum, _inv, allMod) =>
      allMod
        .filter((c) => (c.expense?.invoice || "") === invNum)
        .reduce((s, c) => s + (c.expense?.exchangeAmount || 0), 0),
    incomeOrExpenseInvoice: (invNum, _inv, allMod) =>
      allMod
        .filter(
          (c) =>
            (c.income?.invoice || "") === invNum ||
            (c.expense?.invoice || "") === invNum,
        )
        .reduce((s, c) => s + (c.expense?.exchangeAmount || 0), 0),
  };

  for (const [name, fn] of Object.entries(rules)) {
    const r = buildExpenseRule(fn);
    console.log(name, r.match, "match", r.mismatch, "mismatch");
    if (r.diffs.length) console.log("  sample", r.diffs[0]);
  }
}

main().catch(console.error);
