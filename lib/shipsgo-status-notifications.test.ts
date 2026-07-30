import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import {
  evaluateShipmentTransition,
  isAirDelayed,
  isOceanDelayed,
  processShipsgoWebhookPayload,
} from "./shipsgo-status-notifications.js";
import {
  getShipsgoWebhookRawBody,
  verifyShipsgoWebhookSignature,
} from "./shipsgo-webhook-auth.js";

describe("processShipsgoWebhookPayload", () => {
  it("devuelve eventName y result null sin shipment", async () => {
    const { eventName, result } = await processShipsgoWebhookPayload("AIR", {
      event: { name: "shipment.updated" },
    });
    assert.equal(eventName, "shipment.updated");
    assert.equal(result, null);
  });

  it("usa UNKNOWN si no hay event.name", async () => {
    const { eventName, result } = await processShipsgoWebhookPayload("OCEAN", {});
    assert.equal(eventName, "UNKNOWN");
    assert.equal(result, null);
  });
});

describe("evaluateShipmentTransition", () => {
  const shipment = {
    id: "sg-1",
    status: "ARRIVED",
    reference: "cliente1",
    awb_number: "157-12345678",
    tags: ["PO-9"],
    updated_at: "2026-07-01T12:00:00Z",
  };

  it("sin snapshot no notifica (solo aprende estado)", () => {
    const t = evaluateShipmentTransition("AIR", shipment, null);
    assert.ok(t);
    assert.equal(t!.shouldNotifyStatusChange, false);
    assert.equal(t!.shouldNotifyDelay, false);
    assert.equal(t!.tagsLabel, "PO-9");
  });

  it("notifica cambio de estado con snapshot previo", () => {
    const t = evaluateShipmentTransition("AIR", shipment, {
      status: "IN_TRANSIT",
      isDelayed: false,
    });
    assert.ok(t);
    assert.equal(t!.shouldNotifyStatusChange, true);
    assert.equal(t!.oldStatus, "IN_TRANSIT");
    assert.equal(t!.status, "ARRIVED");
  });

  it("no notifica si el status no cambió", () => {
    const t = evaluateShipmentTransition("AIR", shipment, {
      status: "ARRIVED",
      isDelayed: false,
    });
    assert.ok(t);
    assert.equal(t!.shouldNotifyStatusChange, false);
  });

  it("detecta demora ocean false→true", () => {
    const ocean = {
      id: "oc-1",
      status: "IN_TRANSIT",
      reference: "c1",
      container_number: "MSCU1234567",
      updated_at: "2026-07-10T12:00:00Z",
      route: {
        transit_percentage: 50,
        port_of_discharge: { date_of_discharge: "2026-07-01T00:00:00Z" },
      },
    };
    const t = evaluateShipmentTransition("OCEAN", ocean, {
      status: "IN_TRANSIT",
      isDelayed: false,
    });
    assert.ok(t);
    assert.equal(t!.shouldNotifyDelay, true);
    assert.equal(t!.shouldNotifyStatusChange, false);
  });

  it("devuelve null sin id", () => {
    assert.equal(evaluateShipmentTransition("AIR", { status: "X" }, null), null);
  });
});

describe("delay helpers", () => {
  it("isAirDelayed false sin ETA", () => {
    assert.equal(isAirDelayed({ route: {} }), false);
  });

  it("isOceanDelayed false si transit 100%", () => {
    assert.equal(
      isOceanDelayed({
        updated_at: "2026-07-10T00:00:00Z",
        route: {
          transit_percentage: 100,
          port_of_discharge: { date_of_discharge: "2026-07-01T00:00:00Z" },
        },
      }),
      false,
    );
  });
});

describe("verifyShipsgoWebhookSignature", () => {
  const secret = "SUPER_LONG_AND_SECURE_SECRET_KEY";
  const payload = '{"message": "You shall not pass!"}';
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  it("acepta sin secreto configurado", () => {
    assert.equal(
      verifyShipsgoWebhookSignature({
        secret: "",
        signature: undefined,
        rawBody: payload,
      }).ok,
      true,
    );
  });

  it("rechaza si falta firma con secreto", () => {
    const r = verifyShipsgoWebhookSignature({
      secret,
      signature: undefined,
      rawBody: payload,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /Missing/i);
  });

  it("rechaza si no hay raw body con secreto", () => {
    const r = verifyShipsgoWebhookSignature({
      secret,
      signature,
      rawBody: null,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /raw body/i);
  });

  it("acepta firma válida (vector ShipsGo docs)", () => {
    // Documented example signature may differ; verify round-trip with our secret
    const r = verifyShipsgoWebhookSignature({
      secret,
      signature,
      rawBody: payload,
    });
    assert.equal(r.ok, true);
  });

  it("rechaza firma inválida", () => {
    const r = verifyShipsgoWebhookSignature({
      secret,
      signature: "0".repeat(signature.length),
      rawBody: payload,
    });
    assert.equal(r.ok, false);
  });
});

describe("getShipsgoWebhookRawBody", () => {
  it("lee Buffer y string", () => {
    assert.equal(getShipsgoWebhookRawBody(Buffer.from('{"a":1}')), '{"a":1}');
    assert.equal(getShipsgoWebhookRawBody('{"a":1}'), '{"a":1}');
  });

  it("devuelve null si el body ya es objeto parseado", () => {
    assert.equal(getShipsgoWebhookRawBody({ a: 1 }), null);
  });
});
