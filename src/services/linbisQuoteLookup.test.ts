import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractHbliFromCommodities,
  extractTrackingNumberFromQuoteFields,
  lookupTrackingFromQuoteIndex,
} from "./linbisQuoteLookup.ts";

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

describe("extractTrackingNumberFromQuoteFields", () => {
  it("lee custom field 17 Tracking Number", () => {
    assert.equal(
      extractTrackingNumberFromQuoteFields([
        { customFieldId: 14, fieldName: "Customer Service", value: "x" },
        {
          customFieldId: 17,
          fieldName: "Tracking Number",
          value: " CAIU8617731 ",
        },
      ]),
      "CAIU8617731",
    );
  });

  it("devuelve null si el campo está vacío", () => {
    assert.equal(
      extractTrackingNumberFromQuoteFields([
        { customFieldId: 17, fieldName: "Tracking Number", value: "  " },
      ]),
      null,
    );
  });
});

describe("lookupTrackingFromQuoteIndex", () => {
  it("normaliza la clave QUO", () => {
    assert.equal(
      lookupTrackingFromQuoteIndex(
        { QUO0020811: "CAIU8617731" },
        "QUO0020811-000847-006",
      ),
      "CAIU8617731",
    );
  });
});
