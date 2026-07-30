import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTrackingPushMessage,
  formatTrackingTagsLabel,
  resolveTrackingPushRef,
} from "./expo-push.js";

describe("formatTrackingTagsLabel", () => {
  it("une strings con ·", () => {
    assert.equal(
      formatTrackingTagsLabel(["PO-1", " PO-2 ", ""]),
      "PO-1 · PO-2",
    );
  });

  it("acepta objetos { name }", () => {
    assert.equal(
      formatTrackingTagsLabel([{ name: "REF-A" }, { name: " REF-B " }]),
      "REF-A · REF-B",
    );
  });

  it("devuelve undefined sin tags útiles", () => {
    assert.equal(formatTrackingTagsLabel([]), undefined);
    assert.equal(formatTrackingTagsLabel(null), undefined);
    assert.equal(formatTrackingTagsLabel(["  ", { name: "" }]), undefined);
  });
});

describe("resolveTrackingPushRef", () => {
  it("prioriza tags sobre AWB", () => {
    assert.equal(
      resolveTrackingPushRef({
        shipmentMode: "AIR",
        tagsLabel: "PO-99",
        awbNumber: "157-12345678",
        reference: "cliente",
      }),
      "PO-99",
    );
  });

  it("usa AWB si no hay tags", () => {
    assert.equal(
      resolveTrackingPushRef({
        shipmentMode: "AIR",
        awbNumber: "157-12345678",
        reference: "cliente",
      }),
      "157-12345678",
    );
  });

  it("usa contenedor si no hay tags (ocean)", () => {
    assert.equal(
      resolveTrackingPushRef({
        shipmentMode: "OCEAN",
        containerNumber: "MSCU1234567",
        bookingNumber: "BK001",
        reference: "cliente",
      }),
      "MSCU1234567",
    );
  });

  it("usa booking si no hay contenedor ni tags", () => {
    assert.equal(
      resolveTrackingPushRef({
        shipmentMode: "OCEAN",
        bookingNumber: "BK001",
        reference: "cliente",
      }),
      "BK001",
    );
  });
});

describe("buildTrackingPushMessage", () => {
  it("incluye tags en el body de cambio de estado", () => {
    const msg = buildTrackingPushMessage({
      type: "TRACKING_STATUS_CHANGED",
      shipmentMode: "AIR",
      tagsLabel: "PO-1 · PO-2",
      awbNumber: "157-1",
      oldStatus: "IN_TRANSIT",
      newStatus: "ARRIVED",
      shipmentId: "abc",
    });
    assert.match(msg.body, /^PO-1 · PO-2:/);
    assert.doesNotMatch(msg.body, /157-1/);
  });

  it("hace fallback a contenedor sin tags", () => {
    const msg = buildTrackingPushMessage({
      type: "TRACKING_CREATED",
      shipmentMode: "OCEAN",
      containerNumber: "MSCU1234567",
      shipmentId: "xyz",
    });
    assert.match(msg.body, /MSCU1234567/);
  });
});
