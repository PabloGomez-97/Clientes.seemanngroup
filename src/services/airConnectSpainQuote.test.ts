import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAirConnectPricedOffers,
  matchAirConnectTotalAmount,
  resolveAirConnectQuotationTotal,
  type AirConnectAirFreightOffer,
  type AirConnectQuotationResponse,
} from "./airConnectSpainQuote.ts";

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
