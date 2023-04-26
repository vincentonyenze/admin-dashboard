import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { bucketUnit, buildBuckets, buildSeries } from "../js/series.js";
import { DAY } from "../js/ranges.js";

describe("bucketUnit", () => {
  test("days for a week or a month", () => {
    assert.equal(bucketUnit(7), "day");
    assert.equal(bucketUnit(30), "day");
  });

  test("weeks for 90 days, months for a year", () => {
    assert.equal(bucketUnit(90), "week");
    assert.equal(bucketUnit(365), "month");
  });
});

describe("buildBuckets", () => {
  test("one bucket per day", () => {
    const range = { start: Date.UTC(2026, 8, 24), end: Date.UTC(2026, 9, 1) };
    const buckets = buildBuckets(range, "day");
    assert.equal(buckets.length, 7);
    assert.equal(buckets[0].start, range.start);
    assert.equal(buckets.at(-1).end, range.end);
  });

  test("buckets touch end to end, with no gaps or overlaps", () => {
    const range = { start: Date.UTC(2026, 6, 3), end: Date.UTC(2026, 9, 1) };
    const buckets = buildBuckets(range, "week");
    for (let i = 1; i < buckets.length; i++) {
      assert.equal(buckets[i].start, buckets[i - 1].end);
    }
  });

  test("weeks are counted back from the end, so the newest is complete", () => {
    // 90 days = 12 full weeks + 6 days: only the OLDEST bucket is short
    const range = { start: Date.UTC(2026, 6, 3), end: Date.UTC(2026, 9, 1) };
    const buckets = buildBuckets(range, "week");
    assert.equal(buckets.length, 13);
    assert.equal(buckets.at(-1).end - buckets.at(-1).start, 7 * DAY);
    assert.equal(buckets[0].end - buckets[0].start, 6 * DAY);
  });

  test("months follow the calendar", () => {
    const range = { start: Date.UTC(2025, 9, 1), end: Date.UTC(2026, 9, 1) };
    const buckets = buildBuckets(range, "month");
    assert.equal(buckets.length, 12);
    assert.equal(buckets[1].start, Date.UTC(2025, 10, 1)); // Nov 1
    assert.equal(buckets[4].start, Date.UTC(2026, 1, 1)); // Feb 1 (a short month)
    assert.equal(buckets[5].start, Date.UTC(2026, 2, 1)); // Mar 1
  });
});

describe("buildSeries", () => {
  test("works out the numbers for each bucket", () => {
    const range = { start: 0, end: 2 * DAY };
    const orders = [
      { time: 1000, status: "delivered", totalCents: 500 },
      { time: DAY + 1000, status: "delivered", totalCents: 700 },
      { time: DAY + 2000, status: "cancelled", totalCents: 999 },
    ];
    const series = buildSeries(orders, range, "day");
    assert.deepEqual(series.map((point) => point.metrics.revenueCents), [500, 700]);
    assert.deepEqual(series.map((point) => point.metrics.orders), [1, 2]);
  });

  test("a day with no orders is a zero, not a missing point", () => {
    const series = buildSeries([], { start: 0, end: 3 * DAY }, "day");
    assert.equal(series.length, 3);
    assert.deepEqual(series.map((point) => point.metrics.revenueCents), [0, 0, 0]);
  });
});
