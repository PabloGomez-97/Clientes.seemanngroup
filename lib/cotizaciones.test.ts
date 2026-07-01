import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getQuoteFlowLabel,
  getQuoteValidityLabel,
  isQuoteValid,
  normalizeClientQuote,
  sortQuotesByNumber,
} from "../src/services/cotizacionesLogic.ts";

describe("normalizeClientQuote", () => {
  it("normaliza número y referencia", () => {
    const quote = normalizeClientQuote({
      number: 12345,
      customerReference: 9876,
      date: "2026-01-01",
    });
    assert.equal(quote.number, "12345");
    assert.equal(quote.customerReference, "9876");
  });
});

describe("sortQuotesByNumber", () => {
  it("ordena por número descendente", () => {
    const sorted = sortQuotesByNumber([
      { number: "QUO100" },
      { number: "QUO250" },
    ]);
    assert.equal(sorted[0].number, "QUO250");
  });
});

describe("quote status helpers", () => {
  it("mapea etapa", () => {
    assert.equal(getQuoteFlowLabel("Approved"), "Aprobado");
  });

  it("detecta vigencia", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    assert.equal(isQuoteValid(future.toISOString()), true);
    assert.equal(getQuoteValidityLabel(future.toISOString()), "Vigente");
  });
});
