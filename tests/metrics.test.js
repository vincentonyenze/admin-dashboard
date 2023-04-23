import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { prepareOrders, computeMetrics, isPaid } from "../js/metrics.js";

const order = (totalCents, status = "delivered", createdAt = "2026-01-15T10:00:00.000Z") => ({
  id: "ORD-1",
  status,
  totalCents,
  createdAt,
});

describe("prepareOrders", () => {
  test("adds the date as a number of milliseconds", () => {
    const [prepared] = prepareOrders([order(100, "delivered", "2026-01-15T10:00:00.000Z")]);
    assert.equal(prepared.time, Date.UTC(2026, 0, 15, 10));
  });

  test("keeps everything else as it was", () => {
    const [prepared] = prepareOrders([order(100)]);
    assert.equal(prepared.totalCents, 100);
    assert.equal(prepared.createdAt, "2026-01-15T10:00:00.000Z");
  });
});

describe("isPaid", () => {
  test("processing, shipped and delivered orders brought money in", () => {
    for (const status of ["processing", "shipped", "delivered"]) {
      assert.equal(isPaid({ status }), true, status);
    }
  });

  test("refunded and cancelled orders didn't", () => {
    for (const status of ["refunded", "cancelled"]) {
      assert.equal(isPaid({ status }), false, status);
    }
  });
});

describe("computeMetrics", () => {
  test("nothing at all gives zeros, not errors", () => {
    assert.deepEqual(computeMetrics([]), {
      revenueCents: 0,
      orders: 0,
      averageOrderCents: 0,
      refundRate: 0,
    });
  });

  test("revenue only counts orders that were paid for", () => {
    const metrics = computeMetrics([
      order(1000, "delivered"),
      order(2000, "shipped"),
      order(500, "refunded"),
      order(700, "cancelled"),
    ]);
    assert.equal(metrics.revenueCents, 3000);
  });

  test("orders counts everything that was placed", () => {
    const metrics = computeMetrics([order(1000), order(500, "cancelled")]);
    assert.equal(metrics.orders, 2);
  });

  test("the average is over paid orders only, rounded to a cent", () => {
    // $10 + $20 + $10.01 = $40.01 over 3 orders = $13.3366… -> $13.34
    const metrics = computeMetrics([order(1000), order(2000), order(1001), order(9999, "refunded")]);
    assert.equal(metrics.averageOrderCents, 1334);
  });

  test("the refund rate is refunded + cancelled out of all orders", () => {
    const metrics = computeMetrics([
      order(1000),
      order(1000),
      order(1000, "refunded"),
      order(1000, "cancelled"),
    ]);
    assert.equal(metrics.refundRate, 0.5);
  });

  test("no paid orders means no average, not dividing by zero", () => {
    assert.equal(computeMetrics([order(1000, "cancelled")]).averageOrderCents, 0);
  });
});
