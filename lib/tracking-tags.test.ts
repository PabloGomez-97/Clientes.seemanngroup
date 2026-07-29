import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAddTrackTag,
  MAX_TRACK_TAG_LENGTH,
  MAX_TRACK_TAGS,
} from "../src/services/trackingTagHelpers.js";

describe("canAddTrackTag", () => {
  it("acepta una etiqueta válida", () => {
    const result = canAddTrackTag([], "PO-12345");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.tag, "PO-12345");
  });

  it("rechaza vacías", () => {
    const result = canAddTrackTag([], "   ");
    assert.equal(result.ok, false);
  });

  it("rechaza duplicados case-insensitive", () => {
    const result = canAddTrackTag(["Po-12345"], "po-12345");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /ya fue agregada/i);
    }
  });

  it("rechaza más de 10 etiquetas", () => {
    const existing = Array.from({ length: MAX_TRACK_TAGS }, (_, i) => `T${i}`);
    const result = canAddTrackTag(existing, "EXTRA");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Máximo 10/i);
    }
  });

  it("rechaza etiquetas mayores a 64 caracteres", () => {
    const longTag = "A".repeat(MAX_TRACK_TAG_LENGTH + 1);
    const result = canAddTrackTag([], longTag);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /64 caracteres/i);
    }
  });
});
