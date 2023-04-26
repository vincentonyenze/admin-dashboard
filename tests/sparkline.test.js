import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { sparkPaths } from "../js/sparkline.js";

// The y of each point in a path like "M0.0,34.0 L45.0,2.0"
const ys = (path) => [...path.matchAll(/[ML][\d.]+,([\d.]+)/g)].map((m) => Number(m[1]));
const xs = (path) => [...path.matchAll(/[ML]([\d.]+),/g)].map((m) => Number(m[1]));

describe("sparkPaths", () => {
  test("spreads the points from left edge to right edge", () => {
    const { line } = sparkPaths([1, 2, 3], 90, 36);
    assert.deepEqual(xs(line), [0, 45, 90]);
  });

  test("the highest value is at the top and the lowest at the bottom", () => {
    const { line } = sparkPaths([10, 50, 30], 90, 36);
    const [low, high, middle] = ys(line);
    assert.ok(high < middle && middle < low, `ys: ${ys(line)}`);
  });

  test("all-equal values make a flat line instead of breaking", () => {
    const { line } = sparkPaths([5, 5, 5], 90, 36);
    const y = ys(line);
    assert.ok(y.every((value) => value === y[0] && Number.isFinite(value)));
  });

  test("the area is closed down to the bottom", () => {
    const { area } = sparkPaths([1, 2], 90, 36);
    assert.match(area, /L90\.0,36 L0\.0,36 Z$/);
  });

  test("no values, no paths", () => {
    assert.deepEqual(sparkPaths([], 90, 36), { line: "", area: "" });
  });
});
