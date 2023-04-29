import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { nearestIndex, nextIndex } from "../js/chart-focus.js";

describe("nearestIndex", () => {
  const points = [{ x: 0 }, { x: 100 }, { x: 200 }];

  test("finds the point closest to the pointer", () => {
    assert.equal(nearestIndex(points, 30), 0);
    assert.equal(nearestIndex(points, 70), 1);
    assert.equal(nearestIndex(points, 190), 2);
  });

  test("works off the edges of the chart too", () => {
    assert.equal(nearestIndex(points, -50), 0);
    assert.equal(nearestIndex(points, 999), 2);
  });

  test("is -1 when there are no points", () => {
    assert.equal(nearestIndex([], 50), -1);
  });
});

describe("nextIndex", () => {
  test("left and right move one point", () => {
    assert.equal(nextIndex("ArrowLeft", 5, 10), 4);
    assert.equal(nextIndex("ArrowRight", 5, 10), 6);
  });

  test("stops at the ends instead of wrapping round", () => {
    assert.equal(nextIndex("ArrowLeft", 0, 10), 0);
    assert.equal(nextIndex("ArrowRight", 9, 10), 9);
  });

  test("Home and End jump to the first and last point", () => {
    assert.equal(nextIndex("Home", 5, 10), 0);
    assert.equal(nextIndex("End", 5, 10), 9);
  });

  test("ignores other keys, so they keep working normally", () => {
    assert.equal(nextIndex("Tab", 5, 10), null);
    assert.equal(nextIndex("a", 5, 10), null);
  });

  test("does nothing with no points", () => {
    assert.equal(nextIndex("ArrowRight", 0, 0), null);
  });
});
