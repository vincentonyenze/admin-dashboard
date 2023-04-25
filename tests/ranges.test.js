import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DAY,
  startOfDay,
  lastDays,
  previousRange,
  isInRange,
  ordersInRange,
  percentChange,
  compareMetrics,
  parseRange,
} from "../js/ranges.js";

const sep30Evening = Date.UTC(2026, 8, 30, 21, 15);

describe("startOfDay", () => {
  test("goes back to midnight UTC", () => {
    assert.equal(startOfDay(sep30Evening), Date.UTC(2026, 8, 30));
  });
});

describe("lastDays", () => {
  test("30 days ending Sep 30 runs from Sep 1 to the start of Oct 1", () => {
    assert.deepEqual(lastDays(sep30Evening, 30), {
      start: Date.UTC(2026, 8, 1),
      end: Date.UTC(2026, 9, 1),
    });
  });

  test("is exactly that many days long", () => {
    const range = lastDays(sep30Evening, 7);
    assert.equal(range.end - range.start, 7 * DAY);
  });
});

describe("previousRange", () => {
  test("is the same length, ending where the range starts", () => {
    const range = lastDays(sep30Evening, 30);
    assert.deepEqual(previousRange(range), {
      start: Date.UTC(2026, 7, 2),
      end: Date.UTC(2026, 8, 1),
    });
  });
});

describe("isInRange", () => {
  const range = { start: 100, end: 200 };

  test("includes the start", () => {
    assert.equal(isInRange(100, range), true);
  });

  test("does NOT include the end, so ranges side by side never overlap", () => {
    assert.equal(isInRange(200, range), false);
    assert.equal(isInRange(200, previousRange({ start: 200, end: 300 })), false);
  });
});

describe("ordersInRange", () => {
  test("keeps only the orders in the range", () => {
    const orders = [{ id: "a", time: 50 }, { id: "b", time: 150 }, { id: "c", time: 250 }];
    assert.deepEqual(ordersInRange(orders, { start: 100, end: 200 }).map((o) => o.id), ["b"]);
  });
});

describe("percentChange", () => {
  test("up", () => {
    assert.equal(percentChange(125, 100), 0.25);
  });

  test("down", () => {
    assert.equal(percentChange(75, 100), -0.25);
  });

  test("is null when there's nothing to compare with", () => {
    assert.equal(percentChange(50, 0), null);
  });
});

describe("compareMetrics", () => {
  const previous = { revenueCents: 10000, orders: 100, averageOrderCents: 100, refundRate: 0.07 };
  const current = { revenueCents: 12500, orders: 90, averageOrderCents: 139, refundRate: 0.085 };
  const result = compareMetrics(current, previous, true);

  test("more revenue is good news", () => {
    assert.equal(result.revenue.change, 0.25);
    assert.equal(result.revenue.good, true);
  });

  test("fewer orders is bad news", () => {
    assert.equal(result.orders.good, false);
  });

  test("the refund rate changes in percentage points, and up is bad", () => {
    assert.equal(result.refundRate.unit, "points");
    assert.ok(Math.abs(result.refundRate.change - 0.015) < 1e-12);
    assert.equal(result.refundRate.good, false);
  });

  test("with no earlier data there's no comparison at all", () => {
    const none = compareMetrics(current, previous, false);
    for (const key of ["revenue", "orders", "averageOrder", "refundRate"]) {
      assert.equal(none[key].change, null, key);
      assert.equal(none[key].good, null, key);
    }
  });
});

describe("parseRange", () => {
  test("reads a range from the URL", () => {
    assert.equal(parseRange("?range=90"), 90);
  });

  test("falls back to 30 days for anything else", () => {
    for (const search of ["", "?range=12", "?range=abc"]) {
      assert.equal(parseRange(search), 30, search);
    }
  });
});
