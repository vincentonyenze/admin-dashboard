import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  formatMoney,
  formatMoneyCompact,
  formatCount,
  formatPercent,
  formatDate,
  formatShortDate,
  formatTime,
} from "../js/format.js";

describe("money", () => {
  test("cents become dollars with two decimals", () => {
    assert.equal(formatMoney(1234567), "$12,345.67");
    assert.equal(formatMoney(900), "$9.00");
  });

  test("compact money is short, for cards and axes", () => {
    assert.equal(formatMoneyCompact(8395109), "$84K");
    assert.equal(formatMoneyCompact(123456789), "$1.2M");
    assert.equal(formatMoneyCompact(95000), "$950");
  });
});

describe("numbers", () => {
  test("counts get a thousands separator", () => {
    assert.equal(formatCount(2256), "2,256");
  });

  test("fractions become percentages", () => {
    assert.equal(formatPercent(0.0723), "7.2%");
    assert.equal(formatPercent(0.5, 0), "50%");
  });
});

describe("dates (always in UTC)", () => {
  const lateEvening = Date.UTC(2026, 8, 30, 23, 30);

  test("a full date", () => {
    assert.equal(formatDate(lateEvening), "Sep 30, 2026");
  });

  test("a short date", () => {
    assert.equal(formatShortDate(lateEvening), "Sep 30");
  });

  test("a time", () => {
    assert.equal(formatTime(Date.UTC(2026, 0, 5, 14, 23)), "2:23 PM");
  });
});
