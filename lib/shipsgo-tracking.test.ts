import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  AirShipment,
  OceanShipment,
} from "../src/components/cliente/tracking/shipsgo/types.js";
import {
  buildAirStatusChips,
  buildOceanStatusChips,
  buildShipsGoEmbedUrl,
  computeAirStats,
  computeOceanStats,
  filterShipmentsByUsername,
  getOceanTrackingLabel,
  isAirDelayed,
  isOceanDelayed,
  mapCreateAirError,
  matchesAirFilter,
  matchesOceanFilter,
  sortShipmentsByCreatedAt,
  validateAwb,
  validateOceanIdentifier,
} from "../src/services/shipsgoTrackingLogic.js";

function airShipment(
  overrides: Partial<AirShipment> = {},
): AirShipment {
  return {
    id: 1,
    reference: "ACME",
    awb_number: "12345678901",
    airline: null,
    cargo: { pieces: null, weight: null, volume: null },
    status: "EN_ROUTE",
    status_split: false,
    route: {
      origin: {
        location: {
          iata: "SCL",
          name: "Santiago",
          timezone: "America/Santiago",
          country: { code: "CL", name: "Chile" },
        },
      },
      destination: {
        location: {
          iata: "MIA",
          name: "Miami",
          timezone: "America/New_York",
          country: { code: "US", name: "USA" },
        },
        date_of_rcf: "2099-01-01T00:00:00.000Z",
      },
      ts_count: 0,
      transit_time: 2,
      transit_percentage: 40,
    },
    creator: { name: "Test", email: "test@test.com" },
    tags: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    checked_at: "2026-01-01T00:00:00.000Z",
    discarded_at: null,
    ...overrides,
  };
}

function oceanShipment(
  overrides: Partial<OceanShipment> = {},
): OceanShipment {
  return {
    id: 2,
    reference: "ACME",
    container_number: "MSCU1234567",
    booking_number: null,
    container_count: 1,
    carrier: null,
    status: "SAILING",
    route: {
      port_of_loading: {
        location: {
          code: "CLVAP",
          name: "Valparaiso",
          country: { code: "CL", name: "Chile" },
        },
      },
      port_of_discharge: {
        location: {
          code: "USLAX",
          name: "Los Angeles",
          country: { code: "US", name: "USA" },
        },
        date_of_discharge: "2099-06-01T00:00:00.000Z",
      },
      ts_count: 0,
      transit_time: 20,
      transit_percentage: 55,
    },
    creator: { name: "Test", email: "test@test.com" },
    tags: [],
    co2_emission: null,
    created_at: "2026-02-01T00:00:00.000Z",
    updated_at: "2026-02-01T00:00:00.000Z",
    checked_at: "2026-02-01T00:00:00.000Z",
    discarded_at: null,
    ...overrides,
  };
}

describe("validateAwb", () => {
  it("acepta AWB de 11 dígitos", () => {
    const result = validateAwb("123 4567-8901");
    assert.equal(result.valid, true);
    assert.equal(result.message, "Formato válido");
  });

  it("rechaza AWB con letras", () => {
    const result = validateAwb("1234567890A");
    assert.equal(result.valid, false);
  });
});

describe("validateOceanIdentifier", () => {
  it("valida contenedor ISO", () => {
    const result = validateOceanIdentifier(
      "container_number",
      "mscu1234567",
    );
    assert.equal(result.valid, true);
  });

  it("valida booking alfanumérico", () => {
    const result = validateOceanIdentifier("booking_number", "BK-123/45");
    assert.equal(result.valid, true);
  });
});

describe("filterShipmentsByUsername", () => {
  it("filtra por referencia de cliente", () => {
    const shipments = [
      airShipment({ id: 1, reference: "ACME" }),
      airShipment({ id: 2, reference: "OTHER" }),
    ];
    const filtered = filterShipmentsByUsername(shipments, "ACME");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 1);
  });
});

describe("computeAirStats", () => {
  it("calcula contadores por estado", () => {
    const stats = computeAirStats([
      airShipment({ status: "EN_ROUTE" }),
      airShipment({ id: 2, status: "LANDED" }),
      airShipment({ id: 3, status: "DELIVERED" }),
    ]);
    assert.equal(stats.total, 3);
    assert.equal(stats.inTransit, 1);
    assert.equal(stats.delivered, 2);
  });
});

describe("matchesAirFilter", () => {
  it("filtra en tránsito", () => {
    const shipment = airShipment({ status: "EN_ROUTE" });
    assert.equal(matchesAirFilter(shipment, "inTransit"), true);
    assert.equal(matchesAirFilter(shipment, "delivered"), false);
  });
});

describe("isAirDelayed", () => {
  it("detecta demora cuando supera ETA sin completar tránsito", () => {
    const shipment = airShipment({
      updated_at: "2026-06-01T00:00:00.000Z",
      route: {
        ...airShipment().route!,
        transit_percentage: 80,
        destination: {
          ...airShipment().route!.destination,
          date_of_rcf: "2026-01-01T00:00:00.000Z",
        },
      },
    });
    assert.equal(isAirDelayed(shipment), true);
  });
});

describe("computeOceanStats y filtros", () => {
  it("resume estados marítimos", () => {
    const stats = computeOceanStats([
      oceanShipment({ status: "SAILING" }),
      oceanShipment({ id: 3, status: "ARRIVED" }),
    ]);
    assert.equal(stats.sailing, 1);
    assert.equal(stats.arrived, 1);
    assert.equal(
      matchesOceanFilter(oceanShipment(), "sailing"),
      true,
    );
  });
});

describe("buildStatusChips", () => {
  it("arma chips aéreos", () => {
    const chips = buildAirStatusChips({
      total: 3,
      inTransit: 1,
      delivered: 1,
      delayed: 1,
    });
    assert.equal(chips.length, 3);
    assert.equal(chips[0].key, "inTransit");
  });

  it("arma chips marítimos", () => {
    const chips = buildOceanStatusChips({
      total: 2,
      sailing: 1,
      arrived: 1,
      delayed: 0,
    });
    assert.equal(chips[1].label, "Llegados");
  });
});

describe("sortShipmentsByCreatedAt", () => {
  it("ordena del más reciente al más antiguo", () => {
    const sorted = sortShipmentsByCreatedAt([
      airShipment({ id: 1, created_at: "2026-01-01T00:00:00.000Z" }),
      airShipment({ id: 2, created_at: "2026-06-01T00:00:00.000Z" }),
    ]);
    assert.equal(sorted[0].id, 2);
  });
});

describe("getOceanTrackingLabel", () => {
  it("prioriza contenedor sobre booking", () => {
    assert.equal(
      getOceanTrackingLabel(
        oceanShipment({
          container_number: "MSCU1234567",
          booking_number: "BK1",
        }),
      ),
      "MSCU1234567",
    );
  });
});

describe("buildShipsGoEmbedUrl", () => {
  it("retorna null sin token", () => {
    assert.equal(buildShipsGoEmbedUrl(undefined, "air", "123"), null);
  });

  it("construye URL de embed", () => {
    const url = buildShipsGoEmbedUrl("token-1", "ocean", "MSCU1234567");
    assert.ok(url?.includes("embed.shipsgo.com"));
    assert.ok(url?.includes("transport=ocean"));
  });
});

describe("mapCreateAirError", () => {
  it("mapea conflicto 409", () => {
    assert.match(mapCreateAirError(409), /Ya existe/);
  });
});

describe("isOceanDelayed", () => {
  it("no marca demorado si tránsito completó", () => {
    const shipment = oceanShipment({
      route: {
        ...oceanShipment().route!,
        transit_percentage: 100,
      },
    });
    assert.equal(isOceanDelayed(shipment), false);
  });
});
