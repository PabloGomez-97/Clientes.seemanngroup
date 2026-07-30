import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import {
  getShipsgoWebhookRawBody,
  verifyShipsgoWebhookSignature,
} from "./shipsgo-webhook-auth.js";

describe("shipsgo webhook auth (HMAC)", () => {
  const secret = "test-secret-key";
  const payload = '{"event":{"name":"shipment.updated"},"shipment":{"id":"1"}}';

  it("round-trip Buffer → verify", () => {
    const raw = getShipsgoWebhookRawBody(Buffer.from(payload, "utf8"));
    assert.equal(raw, payload);
    const signature = crypto
      .createHmac("sha256", secret)
      .update(raw!)
      .digest("hex");
    assert.equal(
      verifyShipsgoWebhookSignature({ secret, signature, rawBody: raw }).ok,
      true,
    );
  });

  it("objeto parseado no se puede firmar (regresión express.json)", () => {
    assert.equal(getShipsgoWebhookRawBody(JSON.parse(payload)), null);
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const r = verifyShipsgoWebhookSignature({
      secret,
      signature,
      rawBody: null,
    });
    assert.equal(r.ok, false);
  });
});
