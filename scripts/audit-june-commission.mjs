/**
 * Auditoría portal vs CSV Commission Analysis (todos los ejecutivos).
 * Uso: node scripts/audit-june-commission.mjs [csv-path] [start] [end]
 */
import fs from "node:fs";

const CSV_PATH =
  process.argv[2] ||
  "c:/Users/elxpa/Downloads/Commision Analisys List (3).csv";
const START = process.argv[3] || "2026-06-01";
const END = process.argv[4] || "2026-06-30";

function round2(v) {
  return Math.round(v * 100) / 100;
}

function parseInputDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function parseUsDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

function isInDateRange(dateStr, start, endInclusive) {
  const parsed = parseUsDate(dateStr);
  if (!parsed) return false;
  return parsed >= start && parsed <= endInclusive;
}

function trimRep(v) {
  return (v || "").trim();
}

function buildBillToSalesRepIndex(accounts, salesReps) {
  const repNameById = new Map();
  for (const rep of salesReps) {
    const name = trimRep(rep.name);
    if (rep.id != null && name) repNameById.set(rep.id, name);
  }
  const result = new Map();
  for (const account of accounts) {
    const repId = account.salesRepId;
    if (account.id == null || repId == null) continue;
    const name = repNameById.get(repId);
    if (name) result.set(account.id, name);
  }
  return result;
}

function invoiceIncomeOnModule(moduleCharges, invoiceNumber) {
  return moduleCharges
    .filter((c) => (c.income?.invoice || "") === invoiceNumber)
    .reduce((sum, c) => sum + (c.income?.exchangeAmount || 0), 0);
}

function invoiceDirectExpenseOnModule(moduleCharges, invoiceNumber) {
  return moduleCharges
    .filter((c) => (c.income?.invoice || "") === invoiceNumber)
    .reduce((sum, c) => sum + (c.expense?.exchangeAmount || 0), 0);
}

function distributeProportional(total, weights) {
  const result = new Map();
  const entries = [...weights.entries()];
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0 || totalWeight <= 0) return result;
  let allocated = 0;
  for (let i = 0; i < entries.length; i++) {
    const [invoice, weight] = entries[i];
    const share =
      i === entries.length - 1
        ? round2(total - allocated)
        : round2((total * weight) / totalWeight);
    allocated = round2(allocated + share);
    if (share !== 0) result.set(invoice, share);
  }
  return result;
}

function reconcileModuleOrphans(moduleCharges) {
  const refToInvoice = new Map();
  const billToInvoice = new Map();
  const invoicesOnModule = new Set();

  for (const charge of moduleCharges) {
    const invoiceNumber = (charge.income?.invoice || "").trim();
    if (!invoiceNumber) continue;
    invoicesOnModule.add(invoiceNumber);
    const er = (charge.expense?.referenceNumber || "").trim();
    if (er) refToInvoice.set(er, invoiceNumber);
    const ir = (charge.income?.referenceNumber || "").trim();
    if (ir) refToInvoice.set(ir, invoiceNumber);
    const bill = (charge.expense?.bill || "").trim();
    if (bill) billToInvoice.set(bill, invoiceNumber);
  }

  const orphanAllocation = new Map();
  let unallocatedExpense = 0;

  for (const charge of moduleCharges) {
    if (charge.income?.invoice) continue;
    const expenseAmount = charge.expense?.exchangeAmount || 0;
    if (expenseAmount <= 0) continue;

    const expenseInvoice = (charge.expense?.invoice || "").trim();
    const referenceNumber = (charge.expense?.referenceNumber || "").trim();
    const billNumber = (charge.expense?.bill || "").trim();
    const recipient =
      (expenseInvoice && invoicesOnModule.has(expenseInvoice) ? expenseInvoice : undefined) ||
      (referenceNumber ? refToInvoice.get(referenceNumber) : undefined) ||
      (billNumber ? billToInvoice.get(billNumber) : undefined) ||
      null;

    if (!recipient) {
      unallocatedExpense = round2(unallocatedExpense + expenseAmount);
      continue;
    }
    orphanAllocation.set(
      recipient,
      round2((orphanAllocation.get(recipient) || 0) + expenseAmount),
    );
  }

  if (unallocatedExpense > 0 && invoicesOnModule.size > 0) {
    const directExpenseByInvoice = new Map();
    const incomeByInvoice = new Map();
    for (const invoiceNumber of invoicesOnModule) {
      directExpenseByInvoice.set(
        invoiceNumber,
        invoiceDirectExpenseOnModule(moduleCharges, invoiceNumber),
      );
      incomeByInvoice.set(invoiceNumber, invoiceIncomeOnModule(moduleCharges, invoiceNumber));
    }
    const totalDirect = [...directExpenseByInvoice.values()].reduce((s, v) => s + v, 0);
    const weights = totalDirect > 0 ? directExpenseByInvoice : incomeByInvoice;
    const proportional = distributeProportional(unallocatedExpense, weights);
    for (const [invoice, share] of proportional) {
      orphanAllocation.set(
        invoice,
        round2((orphanAllocation.get(invoice) || 0) + share),
      );
    }
    unallocatedExpense = 0;
  }

  return { orphanAllocation, unallocatedExpense, isComplete: unallocatedExpense === 0 };
}

function resolveSalesRep(invoice, moduleId, ctx) {
  const direct = trimRep(invoice.salesRep);
  if (direct) return direct;
  if (invoice.billToId != null && ctx.billToSalesRep.has(invoice.billToId)) {
    return ctx.billToSalesRep.get(invoice.billToId);
  }
  const moduleRef = trimRep(invoice.moduleNumber);
  const shipment =
    (moduleRef && ctx.shipmentByNumber.get(moduleRef)) ||
    (moduleId != null ? ctx.shipmentById.get(moduleId) : null) ||
    null;
  if (shipment) {
    const sr = trimRep(shipment.salesRep) || trimRep(shipment.quoteSalesRep);
    if (sr) return sr;
  }
  return "";
}

function buildPortalRows(charges, invoices, shipments, airShipments, groundShipments, accounts, salesReps, start, endInclusive) {
  const invoiceByNumber = new Map(invoices.filter((i) => i.number).map((i) => [i.number, i]));
  const shipmentByNumber = new Map();
  const shipmentById = new Map();
  const register = (s) => {
    if (s.id != null) shipmentById.set(s.id, s);
    if (s.number) shipmentByNumber.set(s.number, s);
    if (s.waybillNumber) shipmentByNumber.set(s.waybillNumber, s);
  };
  for (const s of [...shipments, ...airShipments, ...groundShipments]) register(s);

  const billToSalesRep = buildBillToSalesRepIndex(accounts, salesReps);
  const ctx = { shipmentByNumber, shipmentById, billToSalesRep };

  const chargesByModule = new Map();
  for (const c of charges) {
    if (!chargesByModule.has(c.moduleId)) chargesByModule.set(c.moduleId, []);
    chargesByModule.get(c.moduleId).push(c);
  }

  const moduleReconciliationCache = new Map();
  const getRecon = (moduleId) => {
    if (!moduleReconciliationCache.has(moduleId)) {
      moduleReconciliationCache.set(
        moduleId,
        reconcileModuleOrphans(chargesByModule.get(moduleId) || []),
      );
    }
    return moduleReconciliationCache.get(moduleId);
  };

  const chargesByInvoice = new Map();
  for (const c of charges) {
    const inv = c.income?.invoice;
    if (!inv) continue;
    if (!chargesByInvoice.has(inv)) chargesByInvoice.set(inv, []);
    chargesByInvoice.get(inv).push(c);
  }

  const rows = [];
  for (const [invoiceNumber, invoiceCharges] of chargesByInvoice) {
    const invoice = invoiceByNumber.get(invoiceNumber);
    if (!invoice) continue;
    if (!isInDateRange(invoice.date, start, endInclusive)) continue;

    const moduleId = invoiceCharges[0]?.moduleId ?? null;
    const moduleCharges =
      moduleId != null ? chargesByModule.get(moduleId) || [] : invoiceCharges;

    const income = round2(invoiceIncomeOnModule(moduleCharges, invoiceNumber));
    let expense = null;
    let profit = null;
    let reconciliationStatus = "incomplete";
    let unallocated = 0;

    if (moduleId != null) {
      const recon = getRecon(moduleId);
      unallocated = recon.unallocatedExpense;
      if (recon.isComplete) {
        expense = round2(
          invoiceDirectExpenseOnModule(moduleCharges, invoiceNumber) +
            (recon.orphanAllocation.get(invoiceNumber) || 0),
        );
        profit = round2(income - expense);
        reconciliationStatus = "complete";
      }
    } else {
      expense = round2(invoiceDirectExpenseOnModule(moduleCharges, invoiceNumber));
      profit = round2(income - expense);
      reconciliationStatus = "complete";
    }

    rows.push({
      invoice: invoiceNumber,
      date: invoice.date,
      salesRep: resolveSalesRep(invoice, moduleId, ctx) || "Pendiente de asignación",
      moduleId,
      moduleNumber: invoice.moduleNumber || "",
      income,
      expense,
      profit,
      reconciliationStatus,
      unallocated,
      homeTotalAmount: round2(invoice.homeTotalAmount ?? 0),
    });
  }
  return rows;
}

function parseCsvAll(csvContent) {
  const lines = csvContent.split(/\r?\n/);
  const invoices = [];
  let currentRep = "";

  for (const line of lines) {
    const repMatch = line.match(/^,,([A-Za-zÁÉÍÓÚáéíóúñÑ ]+),,,,,,,,,,,,,,,,,,,,,,,,,,,,,,$/);
    if (repMatch && !line.includes("INVOICE") && !line.includes("Printed")) {
      currentRep = repMatch[1].trim();
      continue;
    }

    const parts = line.split(",");
    const inv = (parts[2] || "").trim();
    const date = (parts[5] || "").trim();
    if (!inv || !/^\d{2}\/\d{2}\/\d{4}$/.test(date)) continue;

    const nums = [];
    for (const p of parts) {
      const cleaned = p.replace(/,/g, "");
      if (/^-?[\d]+\.\d{2}$/.test(cleaned)) nums.push(parseFloat(cleaned));
    }
    if (nums.length < 3) continue;

    invoices.push({
      invoice: inv,
      date,
      salesRep: currentRep,
      income: nums[nums.length - 4],
      expense: nums[nums.length - 3],
      profit: nums[nums.length - 2],
    });
  }

  return invoices;
}

function sumNullAsZero(values) {
  return round2(values.reduce((s, v) => s + (v ?? 0), 0));
}

// --- main ---
const tokenRes = await fetch("https://portalclientes.seemanngroup.com/api/linbis-token");
const { token } = await tokenRes.json();
const h = { Authorization: `Bearer ${token}`, Accept: "application/json" };

const [charges, invoices, shipments, airShipments, groundShipments, accounts, salesReps] =
  await Promise.all([
    fetch("https://api.linbis.com/shipments/allCharges", { headers: h }).then((r) => r.json()),
    fetch("https://api.linbis.com/invoices/all", { headers: h }).then((r) => r.json()),
    fetch("https://api.linbis.com/shipments/all", { headers: h }).then((r) => r.json()),
    fetch("https://api.linbis.com/air-shipments/all", { headers: h }).then((r) => r.json()),
    fetch("https://api.linbis.com/ground-shipments/all", { headers: h }).then((r) => r.json()),
    fetch("https://api.linbis.com/accounts/list?take=10000", { headers: h }).then((r) => r.json()),
    fetch("https://api.linbis.com/salesreps/list?take=100", { headers: h }).then((r) => r.json()),
  ]);

const start = parseInputDate(START);
const endInclusive = parseInputDate(END);
endInclusive.setHours(23, 59, 59, 999);

const portalRows = buildPortalRows(
  charges,
  invoices,
  shipments,
  airShipments,
  groundShipments,
  accounts,
  salesReps,
  start,
  endInclusive,
);

const csvRows = parseCsvAll(fs.readFileSync(CSV_PATH, "utf8"));
const csvByInv = new Map(csvRows.map((r) => [r.invoice, r]));
const portalByInv = new Map(portalRows.map((r) => [r.invoice, r]));

const portalTotals = {
  income: round2(portalRows.reduce((s, r) => s + r.income, 0)),
  expense: sumNullAsZero(portalRows.map((r) => r.expense)),
  profit: sumNullAsZero(portalRows.map((r) => r.profit)),
};
const csvTotals = {
  income: round2(csvRows.reduce((s, r) => s + r.income, 0)),
  expense: round2(csvRows.reduce((s, r) => s + r.expense, 0)),
  profit: round2(csvRows.reduce((s, r) => s + r.profit, 0)),
};

const mismatches = [];
const categories = {
  missing_in_portal: [],
  extra_in_portal: [],
  incomplete: [],
  expense_mismatch: [],
  profit_mismatch: [],
  income_mismatch: [],
  rep_mismatch: [],
  perfect: 0,
};

for (const csvRow of csvRows) {
  const p = portalByInv.get(csvRow.invoice);
  if (!p) {
    categories.missing_in_portal.push(csvRow);
    mismatches.push({ invoice: csvRow.invoice, category: "missing_in_portal", csv: csvRow });
    continue;
  }

  const di = round2(csvRow.income - p.income);
  const de = round2(csvRow.expense - (p.expense ?? 0));
  const dp = round2(csvRow.profit - (p.profit ?? 0));
  const repOk = csvRow.salesRep === p.salesRep;

  if (p.reconciliationStatus === "incomplete") {
    categories.incomplete.push({ csv: csvRow, portal: p });
    mismatches.push({ invoice: csvRow.invoice, category: "incomplete", csv: csvRow, portal: p });
    continue;
  }

  if (Math.abs(di) > 0.02) {
    categories.income_mismatch.push({ csv: csvRow, portal: p, delta: di });
    mismatches.push({ invoice: csvRow.invoice, category: "income_mismatch", delta: { income: di, expense: de, profit: dp }, csv: csvRow, portal: p });
  } else if (Math.abs(de) > 0.02) {
    categories.expense_mismatch.push({ csv: csvRow, portal: p, delta: de });
    mismatches.push({ invoice: csvRow.invoice, category: "expense_mismatch", delta: { income: di, expense: de, profit: dp }, csv: csvRow, portal: p });
  } else if (Math.abs(dp) > 0.02) {
    categories.profit_mismatch.push({ csv: csvRow, portal: p, delta: dp });
    mismatches.push({ invoice: csvRow.invoice, category: "profit_mismatch", delta: { income: di, expense: de, profit: dp }, csv: csvRow, portal: p });
  } else {
    categories.perfect++;
    if (!repOk) categories.rep_mismatch.push({ csv: csvRow, portal: p });
  }
}

for (const p of portalRows) {
  if (!csvByInv.has(p.invoice)) categories.extra_in_portal.push(p);
}

// Aggregate expense delta by category
function sumDelta(items, key) {
  return round2(items.reduce((s, m) => s + Math.abs(m.delta?.[key] ?? m.delta ?? 0), 0));
}

console.log("=== AUDITORÍA JUNIO", START, "→", END, "===\n");
console.log("CSV facturas:", csvRows.length, "| Portal facturas:", portalRows.length);
console.log("\nTotales CSV:   ", csvTotals);
console.log("Totales portal:", portalTotals);
console.log("Delta:         ", {
  income: round2(csvTotals.income - portalTotals.income),
  expense: round2(csvTotals.expense - portalTotals.expense),
  profit: round2(csvTotals.profit - portalTotals.profit),
});

console.log("\n--- Clasificación ---");
console.log("Coinciden (income+expense+profit):", categories.perfect);
console.log("Faltan en portal:", categories.missing_in_portal.length);
console.log("Sobran en portal:", categories.extra_in_portal.length);
console.log("Incompletos (—):", categories.incomplete.length);
console.log("Income distinto:", categories.income_mismatch.length);
console.log("Expense distinto:", categories.expense_mismatch.length);
console.log("Profit distinto (solo):", categories.profit_mismatch.length);
console.log("Rep distinto (números OK):", categories.rep_mismatch.length);

if (categories.missing_in_portal.length) {
  console.log("\n--- Faltan en portal ---");
  for (const r of categories.missing_in_portal.slice(0, 15)) {
    console.log(r.invoice, r.date, r.salesRep, "inc", r.income, "exp", r.expense);
  }
}

if (categories.incomplete.length) {
  console.log("\n--- Incompletos (primeros 15) ---");
  for (const { csv, portal } of categories.incomplete.slice(0, 15)) {
    console.log(
      csv.invoice,
      "csv exp", csv.expense,
      "portal income", portal.income,
      "module", portal.moduleId,
    );
  }
}

if (categories.expense_mismatch.length) {
  console.log("\n--- Expense mismatch (top 20 por |delta|) ---");
  categories.expense_mismatch
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 20)
    .forEach(({ csv, portal, delta }) => {
      console.log(
        csv.invoice,
        "| csv exp", csv.expense,
        "portal exp", portal.expense,
        "Δ", delta,
        "| csv profit", csv.profit,
        "portal profit", portal.profit,
        "| mod", portal.moduleNumber,
      );
    });
}

if (categories.extra_in_portal.length) {
  console.log("\n--- Extra en portal (primeros 15) ---");
  for (const p of categories.extra_in_portal.slice(0, 15)) {
    console.log(p.invoice, p.date, p.salesRep, "inc", p.income, "exp", p.expense);
  }
}

// By rep summary
const byRep = new Map();
for (const csvRow of csvRows) {
  if (!byRep.has(csvRow.salesRep)) byRep.set(csvRow.salesRep, { csv: { i: 0, e: 0, p: 0 }, portal: { i: 0, e: 0, p: 0 }, count: 0, mismatches: 0 });
  const bucket = byRep.get(csvRow.salesRep);
  bucket.count++;
  bucket.csv.i += csvRow.income;
  bucket.csv.e += csvRow.expense;
  bucket.csv.p += csvRow.profit;
  const p = portalByInv.get(csvRow.invoice);
  if (p) {
    bucket.portal.i += p.income;
    bucket.portal.e += p.expense ?? 0;
    bucket.portal.p += p.profit ?? 0;
    const de = round2(csvRow.expense - (p.expense ?? 0));
    if (p.reconciliationStatus === "incomplete" || Math.abs(de) > 0.02) bucket.mismatches++;
  } else {
    bucket.mismatches++;
  }
}

console.log("\n--- Por ejecutivo (delta expense) ---");
for (const [rep, b] of [...byRep.entries()].sort((a, b) =>
  Math.abs(b[1].csv.e - b[1].portal.e) - Math.abs(a[1].csv.e - a[1].portal.e),
)) {
  console.log(
    rep.padEnd(22),
    "facturas", b.count,
    "| Δexp", round2(b.csv.e - b.portal.e).toLocaleString("es-CL"),
    "| mismatches", b.mismatches,
  );
}

if (process.env.AUDIT_JSON) {
  fs.writeFileSync(
    process.env.AUDIT_JSON,
    JSON.stringify({ mismatches, categories, csvTotals, portalTotals }, null, 2),
  );
  console.log("\nJSON escrito en", process.env.AUDIT_JSON);
}
