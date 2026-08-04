import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractHbliFromCommodities } from "./linbisQuoteLookup.ts";

describe("extractHbliFromCommodities", () => {
  it("lee contenedor desde trackingNumber aunque number no sea HBLI", () => {
    const result = extractHbliFromCommodities([
      {
        number: "SOG0004610-000847-001",
        trackingNumber: "CAIU8617731",
        description: "CAIU8617731\nJ1798959",
      },
    ]);
    assert.equal(result.containerNumber, "CAIU8617731");
    assert.equal(result.hbliNumber, null);
  });

  it("prioriza commodity HBLI y su description", () => {
    const result = extractHbliFromCommodities([
      {
        number: "SOG0004610-000847-002",
        trackingNumber: "OTHER1234567",
        description: "cargo",
      },
      {
        number: "HBLI0002064",
        trackingNumber: "",
        description: "MSKU1234567\nseal",
      },
    ]);
    assert.equal(result.hbliNumber, "HBLI0002064");
    assert.equal(result.containerNumber, "MSKU1234567");
  });

  it("ignora trackingNumber que no parece contenedor", () => {
    const result = extractHbliFromCommodities([
      {
        number: "SOG1",
        trackingNumber: "BOOKING-XYZ",
        description: "no container here",
      },
    ]);
    assert.equal(result.containerNumber, null);
  });
});
