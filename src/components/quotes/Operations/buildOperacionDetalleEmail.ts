import type { RutaAerea } from "@/components/quotes/Handlers/Air/HandlerQuoteAir";
import type { RutaFCL } from "@/components/quotes/Handlers/FCL/HandlerQuoteFCL";
import type { RutaLCL } from "@/components/quotes/Handlers/LCL/HandlerQuoteLCL";
import type { OperacionDetallePayload } from "@/services/operaciones";

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const s = String(value).trim();
  return s || "—";
}

function money(currency: string, amount: number): string {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

export function buildAirOperacionDetalle(opts: {
  ruta: RutaAerea;
  description?: string;
  chargeableWeight: number;
  expenseAmount: number;
  expenseRate: number;
  ventaTotal: string;
}): OperacionDetallePayload {
  const { ruta, description, chargeableWeight, expenseAmount, expenseRate, ventaTotal } =
    opts;
  const currency = ruta.currency || "USD";
  const remarks = [ruta.remark1, ruta.remark2].filter(Boolean).join(" · ");

  return {
    origen: ruta.origin,
    destino: ruta.destination,
    viaTransporte: "Aéreo",
    agente: ruta.company || undefined,
    carrierLabel: "Aerolínea",
    carrierValue: ruta.carrier || undefined,
    detalleCarga: [
      description || "Cargamento Aéreo",
      `${chargeableWeight.toFixed(2)} kg chargeable`,
    ].join(" · "),
    sheetRow: {
      title: "Tarifa seleccionada · fila del sheet aéreo",
      cells: [
        {
          label: "+45 / +100 / +300",
          value: `${dash(ruta.kg45)} · ${dash(ruta.kg100)} · ${dash(ruta.kg300)}`,
        },
        {
          label: "+500 / +1000",
          value: `${dash(ruta.kg500)} · ${dash(ruta.kg1000)}`,
        },
        {
          label: "Frecuencia · TT · Routing",
          value: `${dash(ruta.frequency)} · ${dash(ruta.transitTime)} · ${dash(ruta.routing)}`,
        },
      ],
      footerLabel: "Remarks · Validez · Moneda · Min. AF",
      footerValue: [
        remarks || "—",
        ruta.validUntil ? `Válida hasta ${ruta.validUntil}` : null,
        currency,
        ruta.minAirFreight > 0
          ? `Mín. AF ${money(currency, ruta.minAirFreight)}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    freightCostLabel: "Airfreight sin profit",
    freightCostAmount: money(currency, expenseAmount),
    freightCostDetail: `${money(currency, expenseRate)} / kg × ${chargeableWeight.toFixed(2)} kg`,
    ventaTotalAmount: ventaTotal,
  };
}

export function buildFclOperacionDetalle(opts: {
  ruta: RutaFCL;
  containerType?: string;
  cantidadContenedores: number;
  expenseAmount: number;
  expenseRate: number;
  ventaTotal: string;
}): OperacionDetallePayload {
  const {
    ruta,
    containerType,
    cantidadContenedores,
    expenseAmount,
    expenseRate,
    ventaTotal,
  } = opts;
  const currency = ruta.currency || "USD";

  return {
    origen: ruta.pol,
    destino: ruta.pod,
    viaTransporte: "Marítimo FCL",
    agente: ruta.company || undefined,
    carrierLabel: "Naviera",
    carrierValue: ruta.carrier || undefined,
    detalleCarga:
      containerType && cantidadContenedores
        ? `${cantidadContenedores} × ${containerType}`
        : undefined,
    sheetRow: {
      title: "Tarifa seleccionada · fila del sheet FCL",
      cells: [
        {
          label: "20GP / 40HQ / 40NOR",
          value: `${dash(ruta.gp20)} · ${dash(ruta.hq40)} · ${dash(ruta.nor40)}`,
        },
        {
          label: "TT · Free time",
          value: `${dash(ruta.tt)} · ${dash(ruta.freeTime)}`,
        },
        {
          label: "Remarks · Validez",
          value: `${dash(ruta.remarks)} · ${dash(ruta.validUntil)}`,
        },
      ],
    },
    freightCostLabel: "Contenedor(es) sin profit",
    freightCostAmount: money(currency, expenseAmount),
    freightCostDetail: `${money(currency, expenseRate)} × ${cantidadContenedores} cont.`,
    ventaTotalAmount: ventaTotal,
  };
}

export function buildLclOperacionDetalle(opts: {
  ruta: RutaLCL;
  chargeableVolume: number;
  expenseAmount: number;
  expenseRate: number;
  ventaTotal: string;
  description?: string;
}): OperacionDetallePayload {
  const {
    ruta,
    chargeableVolume,
    expenseAmount,
    expenseRate,
    ventaTotal,
    description,
  } = opts;
  const currency = ruta.currency || "USD";

  return {
    origen: ruta.pol,
    destino: ruta.pod,
    viaTransporte: "Marítimo LCL",
    agente: ruta.agente || undefined,
    carrierLabel: "Operador / Naviera",
    carrierValue: ruta.operador || undefined,
    detalleCarga: [
      description,
      `${chargeableVolume.toFixed(2)} W/M billable`,
    ]
      .filter(Boolean)
      .join(" · "),
    sheetRow: {
      title: "Tarifa seleccionada · fila del sheet LCL",
      cells: [
        {
          label: "OF W/M",
          value: money(currency, ruta.ofWM || expenseRate),
        },
        {
          label: "Servicio · Frecuencia · TT",
          value: `${dash(ruta.servicio)} · ${dash(ruta.frecuencia)} · ${dash(ruta.ttAprox)}`,
        },
        {
          label: "Validez",
          value: dash(ruta.validUntil),
        },
      ],
    },
    freightCostLabel: "Oceanfreight sin profit",
    freightCostAmount: money(currency, expenseAmount),
    freightCostDetail: `${money(currency, expenseRate)} / WM × ${chargeableVolume.toFixed(2)}`,
    ventaTotalAmount: ventaTotal,
  };
}
