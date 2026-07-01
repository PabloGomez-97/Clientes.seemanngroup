import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAirOperacionesFilters,
  applyGroundOperacionesFilters,
  applyOceanOperacionesFilters,
  countActiveAirOceanFilters,
  oceanShipmentMatchesNumberFilter,
  sortAirOperaciones,
} from "../src/services/operacionesFiltersLogic.ts";
import { paginateList } from "../src/services/operacionesPagination.ts";
import {
  getAirOperacionTrackingStatus,
  getOceanOperacionTrackingStatus,
  isAirOperacionTracked,
} from "../src/services/operacionesTrackingLink.ts";

describe("oceanShipmentMatchesNumberFilter", () => {
  it("encuentra por SOG", () => {
    assert.equal(
      oceanShipmentMatchesNumberFilter({ number: "SOG12345" }, "sog12"),
      true,
    );
  });

  it("encuentra por HBLI en charges", () => {
    assert.equal(
      oceanShipmentMatchesNumberFilter(
        {
          number: "SOG999",
          charges: [{ income: { reference: "HBLI7788" } }],
        },
        "hbli77",
      ),
      true,
    );
  });
});

describe("applyAirOperacionesFilters", () => {
  const shipments = [
    {
      number: "SOG100",
      waybillNumber: "AWB111",
      customerReference: "PO-1",
      carrier: { name: "LATAM" },
      departure: { date: "2026-01-10T00:00:00.000Z" },
      arrival: { date: "2026-01-15T00:00:00.000Z" },
    },
    {
      number: "SOG200",
      waybillNumber: "AWB222",
      customerReference: "PO-2",
      carrier: { name: "IBERIA" },
      departure: { date: "2026-02-01T00:00:00.000Z" },
      arrival: { date: "2026-02-05T00:00:00.000Z" },
    },
  ];

  it("filtra por carrier", () => {
    const result = applyAirOperacionesFilters(shipments, { carrier: "latam" });
    assert.equal(result.length, 1);
    assert.equal(result[0].number, "SOG100");
  });

  it("cuenta filtros activos", () => {
    assert.equal(
      countActiveAirOceanFilters({
        number: "SOG",
        carrier: "X",
      }),
      2,
    );
  });
});

describe("applyOceanOperacionesFilters", () => {
  it("filtra por referencia cliente", () => {
    const result = applyOceanOperacionesFilters(
      [
        { number: "SOG1", customerReference: "REF-A" },
        { number: "SOG2", customerReference: "REF-B" },
      ],
      { clientReference: "ref-b" },
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].number, "SOG2");
  });
});

describe("applyGroundOperacionesFilters", () => {
  it("filtra por origen y destino", () => {
    const result = applyGroundOperacionesFilters(
      [
        { number: "G1", from: "Santiago", to: "Valparaíso" },
        { number: "G2", from: "Antofagasta", to: "Calama" },
      ],
      { origin: "santiago", destination: "valpa" },
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].number, "G1");
  });
});

describe("sortAirOperaciones", () => {
  it("ordena por salida más reciente primero", () => {
    const sorted = sortAirOperaciones([
      { departure: { date: "2026-01-01" } },
      { departure: { date: "2026-03-01" } },
    ]);
    assert.equal(sorted[0].departure?.date, "2026-03-01");
  });
});

describe("operacionesTrackingLink", () => {
  it("detecta operación aérea con seguimiento activo", () => {
    const tracked = new Set(["12345678901"]);
    const shipment = { number: "SOG1", trackingNumber: "123-45678901" };
    assert.equal(
      isAirOperacionTracked(shipment, {}, tracked),
      true,
    );
    const status = getAirOperacionTrackingStatus(shipment, {}, tracked);
    assert.equal(status.isTracked, true);
    assert.equal(status.openTarget?.mode, "air");
  });

  it("arma target marítimo con contenedor", () => {
    const tracked = new Set(["ABCD1234567"]);
    const shipment = {
      number: "SOG55",
      bookingNumber: "BK99",
      trackingNumber: "ABCD1234567",
      commodities: [],
      charges: [],
    };
    const status = getOceanOperacionTrackingStatus(shipment, {}, tracked);
    assert.equal(status.isTracked, true);
    assert.equal(status.openTarget?.containerNumber, "ABCD1234567");
  });
});

describe("paginateList", () => {
  it("devuelve 4 ítems por página", () => {
    const items = Array.from({ length: 10 }, (_, index) => index + 1);
    const page = paginateList(items, 2, 4);
    assert.deepEqual(page.items, [5, 6, 7, 8]);
    assert.equal(page.totalPages, 3);
    assert.equal(page.hasNext, true);
    assert.equal(page.hasPrevious, true);
  });
});
