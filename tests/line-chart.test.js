import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { niceTicks, labelEvery, lineChartGeometry, PADDING } from "../js/line-chart.js";

describe("niceTicks", () => {
  test("uses round steps that reach past the biggest value", () => {
    // 470 ÷ 4 steps = 117.5: the first nice step at least that big is 200
    assert.deepEqual(niceTicks(470), [0, 200, 400, 600]);
    assert.deepEqual(niceTicks(8395), [0, 2500, 5000, 7500, 10000]);
  });

  test("stops exactly at the max when it's already round", () => {
    assert.deepEqual(niceTicks(400), [0, 100, 200, 300, 400]);
  });

  test("always starts at 0 and covers the max", () => {
    for (const max of [3, 17, 99, 1234, 50000, 987654]) {
      const ticks = niceTicks(max);
      assert.equal(ticks[0], 0);
      assert.ok(ticks.at(-1) >= max, `${max}: ${ticks}`);
      assert.ok(ticks.length <= 7, `${max}: too many ticks (${ticks.length})`);
    }
  });

  test("copes with nothing to show", () => {
    assert.deepEqual(niceTicks(0), [0, 1]);
  });
});

describe("labelEvery", () => {
  test("labels every point when there are few", () => {
    assert.equal(labelEvery(7), 1);
  });

  test("skips points to keep about 7 labels", () => {
    assert.equal(labelEvery(30), 5);
    assert.equal(labelEvery(12), 2);
  });
});

describe("lineChartGeometry", () => {
  const size = { width: 568, height: 240 };
  const g = lineChartGeometry([100, 300, 200], ["a", "b", "c"], size);

  test("the first point is at the left of the plot, the last at the right", () => {
    assert.equal(g.points[0].x, PADDING.left);
    assert.equal(g.points.at(-1).x, size.width - PADDING.right);
  });

  test("a bigger value is drawn higher up (a smaller y)", () => {
    const [a, b, c] = g.points.map((p) => p.y);
    assert.ok(b < c && c < a, `ys: ${a}, ${b}, ${c}`);
  });

  test("0 is at the bottom of the plot and the top tick at the top", () => {
    assert.equal(g.yTicks[0].y, g.plot.top + g.plot.height);
    assert.equal(g.yTicks.at(-1).y, g.plot.top);
  });

  test("the newest point always gets a label", () => {
    const many = lineChartGeometry(Array(30).fill(1), Array.from({ length: 30 }, (_, i) => `d${i}`), size);
    assert.equal(many.xTicks.at(-1).label, "d29");
  });

  test("a single point sits in the middle", () => {
    const one = lineChartGeometry([5], ["only"], size);
    assert.equal(one.points[0].x, PADDING.left + one.plot.width / 2);
  });

  test("no points: no line, no area", () => {
    const none = lineChartGeometry([], [], size);
    assert.equal(none.line, "");
    assert.equal(none.area, "");
  });
});
