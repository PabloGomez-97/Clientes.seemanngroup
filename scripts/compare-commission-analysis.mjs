/**
 * Compara el reporte del portal vs CSV oficial para un ejecutivo y rango.
 * Uso: node scripts/compare-commission-analysis.mjs "Ignacio Maldonado" 2026-06-01 2026-06-30
 */
import fs from "node:fs";

const REP = process.argv[2] || "Ignacio Maldonado";
const START = process.argv[3] || "2026-06-01";
const END = process.argv[4] || "2026-06-30";
const CSV_PATH =
  process.argv[5] ||
  "c:/Users/elxpa/Downloads/Commision Analisys List (1).csv";

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

function reconcileModuleOrphans(moduleCharges) {
  const refToInvoice = new Map();
  const billToInvoice = new Map();

  for (const charge of moduleCharges) {
    const invoiceNumber = (charge.income?.invoice || "").trim();
    if (!invoiceNumber) continue;
    const referenceNumber = (charge.expense?.referenceNumber || "").trim();
    if (referenceNumber) refToInvoice.set(referenceNumber, invoiceNumber);
    const billNumber = (charge.expense?.bill || "").trim();
    if (billNumber) billToInvoice.set(billNumber, invoiceNumber);
  }

  const orphanAllocation = new Map();
  let unallocatedExpense = 0;

  for (const charge of moduleCharges) {
    if (charge.income?.invoice) continue;
    const expenseAmount = charge.expense?.exchangeAmount || 0;
    if (expenseAmount <= 0) continue;

    const referenceNumber = (charge.expense?.referenceNumber || "").trim();
    const billNumber = (charge.expense?.bill || "").trim();
    const recipient =
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

  return { orphanAllocation, unallocatedExpense, isComplete: unallocatedExpense === 0 };
}

function buildPortalRows(charges, invoices, shipments, start, endInclusive) {
  const invoiceByNumber = new Map(
    invoices.filter((i) => i.number).map((i) => [i.number, i]),
  );
  const shipmentByNumber = new Map();
  const shipmentById = new Map();
  for (const s of shipments) {
    if (s.id != null) shipmentById.set(s.id, s);
    if (s.number) shipmentByNumber.set(s.number, s);
    if (s.waybillNumber) shipmentByNumber.set(s.waybillNumber, s);
  }

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

    const rep = (invoice.salesRep || "").trim();
    const moduleId = invoiceCharges[0]?.moduleId ?? null;
    const moduleCharges =
      moduleId != null ? chargesByModule.get(moduleId) || [] : invoiceCharges;
    const shipment =
      (invoice.moduleNumber && shipmentByNumber.get(invoice.moduleNumber)) ||
      (moduleId != null ? shipmentById.get(moduleId) : null) ||
      null;
    const resolvedRep = rep || (shipment?.salesRep || "").trim() || "Sin representante";
    if (resolvedRep !== REP) continue;

    const income = round2(invoiceIncomeOnModule(moduleCharges, invoiceNumber));
    let expense = null;
    let profit = null;
    let reconciliationStatus = "incomplete";

    if (moduleId != null) {
      const recon = getRecon(moduleId);
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
      income,
      expense,
      profit,
      moduleId,
      reconciliationStatus,
      homeTotalAmount: invoice.homeTotalAmount ?? 0,
    });
  }

  return rows;
}

function buildInvoiceBasedRows(invoices, shipments, start, endInclusive) {
  const shipmentByNumber = new Map();
  for (const s of shipments) {
    if (s.number) shipmentByNumber.set(s.number, s);
    if (s.waybillNumber) shipmentByNumber.set(s.waybillNumber, s);
  }
  const rows = [];
  for (const invoice of invoices) {
    if (!invoice.number || !isInDateRange(invoice.date, start, endInclusive)) continue;
    const shipment = invoice.moduleNumber
      ? shipmentByNumber.get(invoice.moduleNumber)
      : null;
    const rep =
      (invoice.salesRep || "").trim() ||
      (shipment?.salesRep || "").trim() ||
      "Sin representante";
    if (rep !== REP) continue;
    rows.push({
      invoice: invoice.number,
      date: invoice.date,
      income: round2(invoice.homeTotalAmount ?? 0),
    });
  }
  return rows;
}

function parseCsvForRep(csvContent, repName) {
  const lines = csvContent.split(/\r?\n/);
  const invoices = [];
  let inSection = false;

  for (const line of lines) {
    if (line.match(new RegExp(`^,,${repName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`))) {
      inSection = true;
      continue;
    }
    if (inSection && line.match(/^,,[A-Za-zÁÉÍÓÚáéíóúñÑ ]+,,/) && !line.includes(repName)) {
      break;
    }
    if (!inSection) continue;

    const parts = line.split(",");
    const inv = (parts[2] || "").trim();
    const date = (parts[5] || "").trim();
    if (!inv || !/^\d{2}\/\d{2}\/\d{4}$/.test(date)) continue;

    const nums = [];
    for (const p of parts) {
      if (/^-?[\d,]+\.\d{2}$/.test(p.replace(/,/g, ""))) {
        nums.push(parseFloat(p.replace(/,/g, "")));
      }
    }
    if (nums.length < 3) continue;
    const commission = nums[nums.length - 1];
    const profit = nums[nums.length - 2];
    const expense = nums[nums.length - 3];
    const income = nums[nums.length - 4];

    invoices.push({ invoice: inv, date, income, expense, profit, commission });
  }

  const sum = (key) => round2(invoices.reduce((s, r) => s + r[key], 0));
  return { invoices, totals: { income: sum("income"), expense: sum("expense"), profit: sum("profit") } };
}

function sumNullAsZero(values) {
  return round2(values.reduce((s, v) => s + (v ?? 0), 0));
}

// --- main ---
const tokenRes = await fetch("https://portalclientes.seemanngroup.com/api/linbis-token");
const { token } = await tokenRes.json();
const h = { Authorization: `Bearer ${token}`, Accept: "application/json" };

const [charges, invoices, shipments] = await Promise.all([
  fetch("https://api.linbis.com/shipments/allCharges", { headers: h }).then((r) => r.json()),
  fetch("https://api.linbis.com/invoices/all", { headers: h }).then((r) => r.json()),
  fetch("https://api.linbis.com/shipments/all", { headers: h }).then((r) => r.json()),
]);

const start = parseInputDate(START);
const endInclusive = parseInputDate(END);
endInclusive.setHours(23, 59, 59, 999);

const portalRows = buildPortalRows(charges, invoices, shipments, start, endInclusive);
const invoiceRows = buildInvoiceBasedRows(invoices, shipments, start, endInclusive);

const portalTotals = {
  income: round2(portalRows.reduce((s, r) => s + r.income, 0)),
  expense: sumNullAsZero(portalRows.map((r) => r.expense)),
  profit: sumNullAsZero(portalRows.map((r) => r.profit)),
};

const incompleteRows = portalRows.filter((r) => r.reconciliationStatus === "incomplete");
const completeRows = portalRows.filter((r) => r.reconciliationStatus === "complete");

const csv = parseCsvForRep(fs.readFileSync(CSV_PATH, "utf8"), REP);
const csvByInv = new Map(csv.invoices.map((r) => [r.invoice, r]));
const portalByInv = new Map(portalRows.map((r) => [r.invoice, r]));

const missingInPortal = csv.invoices.filter((r) => !portalByInv.has(r.invoice));
const extraInPortal = portalRows.filter((r) => !csvByInv.has(r.invoice));

let incomeDiff = 0;
let expenseDiff = 0;
let profitDiff = 0;
const mismatches = [];

for (const csvRow of csv.invoices) {
  const p = portalByInv.get(csvRow.invoice);
  if (!p) {
    incomeDiff += csvRow.income;
    expenseDiff += csvRow.expense;
    profitDiff += csvRow.profit;
    mismatches.push({ invoice: csvRow.invoice, reason: "missing_in_portal", csv: csvRow });
    continue;
  }
  const di = round2(csvRow.income - p.income);
  const de = round2(csvRow.expense - (p.expense ?? 0));
  const dp = round2(csvRow.profit - (p.profit ?? 0));
  if (Math.abs(di) > 0.01 || Math.abs(de) > 0.01 || Math.abs(dp) > 0.01) {
    incomeDiff += di;
    expenseDiff += de;
    profitDiff += dp;
    mismatches.push({
      invoice: csvRow.invoice,
      reason: p.reconciliationStatus === "incomplete" ? "incomplete_reconciliation" : "value_mismatch",
      csv: { income: csvRow.income, expense: csvRow.expense, profit: csvRow.profit },
      portal: { income: p.income, expense: p.expense, profit: p.profit },
      delta: { income: di, expense: de, profit: dp },
    });
  }
}

// Modules with incomplete reconciliation
const incompleteModules = new Set(incompleteRows.map((r) => r.moduleId).filter(Boolean));
let unallocatedByModule = 0;
for (const modId of incompleteModules) {
  const modCharges = charges.filter((c) => c.moduleId === modId);
  unallocatedByModule += reconcileModuleOrphans(modCharges).unallocatedExpense;
}

console.log("=== COMPARISON", REP, START, "to", END, "===\n");
console.log("CSV totals:    ", csv.totals);
console.log("Portal totals: ", portalTotals);
console.log("Delta:         ", {
  income: round2(csv.totals.income - portalTotals.income),
  expense: round2(csv.totals.expense - portalTotals.expense),
  profit: round2(csv.totals.profit - portalTotals.profit),
});
console.log("\nPortal row counts:", {
  total: portalRows.length,
  complete: completeRows.length,
  incomplete: incompleteRows.length,
  invoiceBasedInRange: invoiceRows.length,
});
console.log("Missing in portal (in CSV):", missingInPortal.length);
console.log("Extra in portal (not in CSV):", extraInPortal.length);
console.log("Mismatched invoices:", mismatches.length);
console.log("Explained delta from mismatches:", { income: round2(incomeDiff), expense: round2(expenseDiff), profit: round2(profitDiff) });
console.log("Incomplete modules:", incompleteModules.size, "unallocated expense:", round2(unallocatedByModule));

console.log("\n--- Top 15 mismatches by |expense delta| ---");
mismatches
  .sort((a, b) => Math.abs((b.delta?.expense ?? b.csv?.expense ?? 0)) - Math.abs((a.delta?.expense ?? a.csv?.expense ?? 0)))
  .slice(0, 15)
  .forEach((m) => console.log(JSON.stringify(m)));

console.log("\n--- Missing in portal (first 20) ---");
missingInPortal.slice(0, 20).forEach((r) =>
  console.log(r.invoice, r.date, "income", r.income, "expense", r.expense),
);
