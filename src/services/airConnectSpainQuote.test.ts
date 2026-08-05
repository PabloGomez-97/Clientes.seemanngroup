import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAirConnectFcaCalculateInput,
  buildAirConnectParcels,
  buildAirConnectPricedOffers,
  matchAirConnectTotalAmount,
  resolveAirConnectQuotationTotal,
  volumeM3ToCubeSidesCm,
  type AirConnectAirFreightOffer,
  type AirConnectQuotationResponse,
} from "./airConnectSpainQuote.ts";
import { normalizeAirConnectQuotationInput } from "../../api/airConnectSpainQuotationProxy.ts";

const sampleTotals: AirConnectQuotationResponse["totalAmount"] = [
  { airline: "Air Europa", total: 579.47 },
  { airline: "Azul", total: 573.57 },
  { airline: "Azul (vía LIS/OPO)", total: 699.57 },
  { airline: "LATAM Airlines", total: 466.27 },
  { airline: "LATAM Airlines (via LIM/GRU)", total: 466.27 },
];

function offer(
  partial: Partial<AirConnectAirFreightOffer> &
    Pick<AirConnectAirFreightOffer, "airline">,
): AirConnectAirFreightOffer {
  return {
    freight: "+45 kg",
    rate: 5,
    price: 100,
    total: 200,
    via: null,
    ...partial,
  };
}

describe("matchAirConnectTotalAmount", () => {
  it("matchea aerolínea directa", () => {
    assert.equal(
      matchAirConnectTotalAmount(offer({ airline: "Air Europa" }), sampleTotals),
      579.47,
    );
  });

  it("matchea vía con acento en totalAmount", () => {
    assert.equal(
      matchAirConnectTotalAmount(
        offer({ airline: "Azul", via: "LIS/OPO" }),
        sampleTotals,
      ),
      699.57,
    );
  });

  it("no confunde directa con fila que tiene vía", () => {
    assert.equal(
      matchAirConnectTotalAmount(offer({ airline: "Azul" }), sampleTotals),
      573.57,
    );
  });

  it("matchea vía sin acento", () => {
    assert.equal(
      matchAirConnectTotalAmount(
        offer({ airline: "LATAM Airlines", via: "LIM/GRU" }),
        sampleTotals,
      ),
      466.27,
    );
  });
});

describe("resolveAirConnectQuotationTotal + profit", () => {
  it("usa Total de cotización y aplica 15%", () => {
    const quote: AirConnectQuotationResponse = {
      origin: "MAD",
      destination: "SCL",
      totalLand: 287.82,
      airFreight: [
        offer({
          airline: "Air Europa",
          freight: "Min",
          rate: 52,
          price: 260,
          total: 291.65,
          fuelSurcharge: 1.5,
          fees: 30.15,
        }),
      ],
      totalAmount: sampleTotals,
    };

    const priced = buildAirConnectPricedOffers(quote, 5, 15);
    assert.equal(priced[0].apiWithLand, 579.47);
    assert.equal(priced[0].incomeWithLand, 666.39);
  });

  it("fallback a offer.total + totalLand si no hay match", () => {
    const total = resolveAirConnectQuotationTotal(
      offer({ airline: "Unknown Carrier", total: 100 }),
      { totalAmount: sampleTotals, totalLand: 50 },
    );
    assert.equal(total, 150);
  });
});

describe("dimensiones de bultos AirConnect", () => {
  it("volumeM3ToCubeSidesCm devuelve lados enteros", () => {
    const sides = volumeM3ToCubeSidesCm(1.5);
    assert.equal(sides.length, 115);
    assert.ok(Number.isInteger(sides.length));
    assert.ok(Number.isInteger(sides.width));
    assert.ok(Number.isInteger(sides.height));
  });

  it("buildAirConnectParcels no emite decimales en length/width/height", () => {
    const [parcel] = buildAirConnectParcels({
      overallDimsAndWeight: true,
      manualWeight: 150.5,
      manualVolume: 0.734,
      pieces: [],
    });
    assert.ok(Number.isInteger(parcel.qty));
    assert.ok(Number.isInteger(parcel.length));
    assert.ok(Number.isInteger(parcel.width));
    assert.ok(Number.isInteger(parcel.height));
  });

  it("mantiene un solo bulto mientras el cubo entra en los límites", () => {
    const [parcel] = buildAirConnectParcels({
      overallDimsAndWeight: true,
      manualWeight: 600,
      manualVolume: 4,
      pieces: [],
    });
    assert.equal(parcel.qty, 1);
    assert.equal(parcel.height, 159);
  });

  it("reparte el volumen en varios bultos cuando el cubo excede 160 cm", () => {
    const [parcel] = buildAirConnectParcels({
      overallDimsAndWeight: true,
      manualWeight: 600,
      manualVolume: 10,
      pieces: [],
    });
    assert.equal(parcel.qty, 3);
    assert.ok(parcel.height <= 160);
    assert.ok(parcel.width <= 240);
    assert.ok(parcel.length <= 315);
    // El volumen enviado nunca queda por debajo del declarado
    assert.ok((parcel.qty * parcel.length ** 3) / 1e6 >= 10);
  });

  it("respeta el límite de altura en el volumen frontera de 4,096 m³", () => {
    const [parcel] = buildAirConnectParcels({
      overallDimsAndWeight: true,
      manualWeight: 600,
      manualVolume: 4.096,
      pieces: [],
    });
    assert.ok(parcel.height <= 160);
  });

  it("envía el peso total en parcelsInput, no por bulto", () => {
    const input = buildAirConnectFcaCalculateInput({
      airportOrigin: "BCN",
      contactCompanyName: "Seemann Group",
      overallDimsAndWeight: true,
      manualWeight: 600.4,
      manualVolume: 10,
      pieces: [],
    });
    assert.equal(input.parcelsInput.weight, 600.4);
    assert.equal(input.parcelsInput.parcels[0].qty, 3);
  });

  it("volumen sin datos deja el bulto en cero", () => {
    const [parcel] = buildAirConnectParcels({
      overallDimsAndWeight: true,
      manualWeight: 0,
      manualVolume: 0,
      pieces: [],
    });
    assert.equal(parcel.length, 0);
    assert.equal(parcel.width, 0);
    assert.equal(parcel.height, 0);
  });

  it("el proxy normaliza decimales que lleguen de clientes antiguos", () => {
    const normalized = normalizeAirConnectQuotationInput({
      airportOrigin: "BCN",
      parcelsInput: {
        incoterm: "FCA",
        parcels: [
          { qty: 1, width: 90.2, height: 90.2, length: 90.2, weight: 120.4 },
        ],
      },
    }) as {
      parcelsInput: {
        parcels: { width: number; height: number; length: number; weight: number }[];
      };
    };

    const [parcel] = normalized.parcelsInput.parcels;
    assert.deepEqual(parcel, {
      qty: 1,
      width: 91,
      height: 91,
      length: 91,
      weight: 120.4,
    });
  });
});
