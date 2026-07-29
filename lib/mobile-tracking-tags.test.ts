import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAddTrackTag,
  MAX_TRACK_TAG_LENGTH,
  MAX_TRACK_TAGS,
} from "../src/services/trackingTagHelpers.js";

/**
 * Replica la adaptación que usa ChipEditor en mobile (validateAdd).
 * Mantiene el contrato { ok, value } | { ok:false, error }.
 */
function adaptCanAddTrackTag(
  values: string[],
  candidate: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const result = canAddTrackTag(values, candidate);
  return result.ok
    ? { ok: true, value: result.tag }
    : { ok: false, error: result.error };
}

function filterVisibleSuggestions(
  suggestions: string[],
  selected: string[],
  maxLength = MAX_TRACK_TAG_LENGTH,
): string[] {
  const selectedSet = new Set(
    selected.map((value) => value.trim().toLowerCase()),
  );
  return Array.from(
    new Set(
      suggestions
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value) => value.length <= maxLength)
        .filter((value) => !selectedSet.has(value.toLowerCase())),
    ),
  );
}

describe("mobile ChipEditor tag adaptation", () => {
  it("adapta canAddTrackTag al contrato value", () => {
    const result = adaptCanAddTrackTag([], "REF-001");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value, "REF-001");
  });

  it("propaga error de duplicado case-insensitive", () => {
    const result = adaptCanAddTrackTag(["Ref-001"], "ref-001");
    assert.equal(result.ok, false);
  });

  it("propaga error de máximo 10", () => {
    const existing = Array.from({ length: MAX_TRACK_TAGS }, (_, i) => `T${i}`);
    const result = adaptCanAddTrackTag(existing, "EXTRA");
    assert.equal(result.ok, false);
  });
});

describe("mobile tag suggestions visibility", () => {
  it("oculta sugerencias ya seleccionadas (case-insensitive)", () => {
    const visible = filterVisibleSuggestions(
      ["PO-1", "PO-2"],
      ["po-1"],
    );
    assert.deepEqual(visible, ["PO-2"]);
  });

  it("oculta sugerencias mayores a 64 caracteres", () => {
    const longRef = "A".repeat(MAX_TRACK_TAG_LENGTH + 1);
    const visible = filterVisibleSuggestions([longRef, "OK"], []);
    assert.deepEqual(visible, ["OK"]);
  });

  it("no inventa sugerencias si no hay customerReference", () => {
    const visible = filterVisibleSuggestions(["", "   "], []);
    assert.deepEqual(visible, []);
  });
});
