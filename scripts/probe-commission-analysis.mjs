/**
 * Prototype: rebuild Commission Analysis from Linbis API and compare with CSV.
 * Usage: node scripts/probe-commission-analysis.mjs
 */
const API_BASE = "https://portalclientes.seemanngroup.com/api/linbis-token";
const LINBIS = "https://api.linbis.com";

async function getToken() {
  const res = await fetch(API_BASE);
  const data = await res.json();
  if (!data.token) throw new Error("No token: " + JSON.stringify(data));
  return data.token;
}

async function fetchLinbis(token, path) {
  const res = await fetch(`${LINBIS}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.items ?? [];
}

function parseUsDate(s) {
  if (!s) return null;
  const [mm, dd, yy] = s.split("/").map(Number);
  if (!mm || !dd || !yy) return null;
  return new Date(yy, mm - 1, dd);
}

function inRange(dateStr, start, end) {
  const d = parseUsDate(dateStr);
  if (!d) return false;
  return d >= start && d <= end;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function main() {
  const token = await getToken();
  console.log("Fetching datasets...");
  const [charges, invoices, shipments] = await Promise.all([
    fetchLinbis(token, "/shipments/allCharges"),
    fetchLinbis(token, "/invoices/all"),
    fetchLinbis(token, "/shipments/all"),
  ]);

  console.log({ charges: charges.length, invoices: invoices.length, shipments: shipments.length });

  const shipmentByNumber = new Map();
  const shipmentById = new Map();
  for (const s of shipments) {
    if (s.number) shipmentByNumber.set(s.number, s);
    if (s.id != null) shipmentById.set(s.id, s);
    if (s.waybillNumber) shipmentByNumber.set(s.waybillNumber, s);
  }

  const invoiceByNumber = new Map();
  for (const inv of invoices) {
    if (inv.number) invoiceByNumber.set(inv.number, inv);
  }

  // Aggregate charges by invoice number
  const aggByInvoice = new Map();
  for (const c of charges) {
    const invNum =
      c.income?.invoice ||
      c.expense?.invoice ||
      null;
    if (!invNum) continue;

    if (!aggByInvoice.has(invNum)) {
      aggByInvoice.set(invNum, { income: 0, expense: 0, profit: 0, moduleIds: new Set() });
    }
    const agg = aggByInvoice.get(invNum);
    agg.income += c.income?.exchangeAmount ?? 0;
    agg.expense += c.expense?.exchangeAmount ?? 0;
    agg.profit += c.profit ?? 0;
    if (c.moduleId != null) agg.moduleIds.add(c.moduleId);
  }

  const start = new Date(2026, 5, 1);
  const end = new Date(2026, 5, 5, 23, 59, 59, 999);

  const rows = [];
  for (const [invNum, agg] of aggByInvoice) {
    const inv = invoiceByNumber.get(invNum);
    if (!inv) continue;
    if (!inRange(inv.date, start, end)) continue;

    let shipment = null;
    if (inv.moduleNumber && shipmentByNumber.has(inv.moduleNumber)) {
      shipment = shipmentByNumber.get(inv.moduleNumber);
    }
    for (const modId of agg.moduleIds) {
      if (shipmentById.has(modId)) {
        shipment = shipmentById.get(modId);
        break;
      }
    }

    const salesRep = (inv.salesRep || shipment?.salesRep || "").trim() || "Sin representante";

    rows.push({
      invoice: invNum,
      date: inv.date,
      status: inv.status,
      division: inv.divisionName || shipment?.division || "House",
      type: inv.type || "House",
      hawbHbl: inv.moduleNumber || shipment?.waybillNumber || shipment?.number || "",
      billTo: inv.billToName || "",
      consignee: shipment?.consignee || inv.billToName || "",
      destination: shipment?.finalDestination || shipment?.destination || "",
      income: round2(agg.income),
      expense: round2(agg.expense),
      profit: round2(agg.profit),
      salesRep,
    });
  }

  rows.sort((a, b) => a.salesRep.localeCompare(b.salesRep) || (a.date || "").localeCompare(b.date || ""));

  const totals = rows.reduce(
    (acc, r) => {
      acc.income += r.income;
      acc.expense += r.expense;
      acc.profit += r.profit;
      return acc;
    },
    { income: 0, expense: 0, profit: 0 },
  );

  console.log("\nAPI rebuilt rows:", rows.length);
  console.log("API totals:", {
    income: round2(totals.income),
    expense: round2(totals.expense),
    profit: round2(totals.profit),
  });
  console.log("CSV/PDF expected:", {
    income: 106088160.2,
    expense: 85342607.65,
    profit: 20745552.55,
  });

  const sample = rows.find((r) => r.invoice === "INV0011937");
  console.log("\nINV0011937:", sample);
  console.log("Expected:", { income: 180089.08, expense: 105962.08, profit: 74127.0 });

  const jesus = rows.find((r) => r.invoice === "INV0011963");
  console.log("\nINV0011963:", jesus);
  console.log("Expected:", { income: 159086.4, expense: 135066.0, profit: 24020.4 });

  const byRep = new Map();
  for (const r of rows) {
    if (!byRep.has(r.salesRep)) byRep.set(r.salesRep, { income: 0, expense: 0, profit: 0, count: 0 });
    const a = byRep.get(r.salesRep);
    a.income += r.income;
    a.expense += r.expense;
    a.profit += r.profit;
    a.count += 1;
  }
  console.log("\nBy sales rep (top 5):");
  [...byRep.entries()]
    .sort((a, b) => b[1].profit - a[1].profit)
    .slice(0, 8)
    .forEach(([name, v]) =>
      console.log(name, { ...v, income: round2(v.income), expense: round2(v.expense), profit: round2(v.profit) }),
    );

  const ignacio = byRep.get("Ignacio Maldonado");
  console.log("\nIgnacio Maldonado subtotal:", ignacio ? { ...ignacio, income: round2(ignacio.income) } : "MISSING");
  console.log("Expected Ignacio:", { income: 61484360.07, expense: 49841686.75, profit: 11642673.32 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
