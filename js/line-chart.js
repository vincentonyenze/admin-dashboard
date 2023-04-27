// A line chart with axes, drawn in SVG by hand.
//
// Two halves, as in the typing test's chart:
// - niceTicks() and lineChartGeometry(): pure maths (numbers in,
//   coordinates out), tested in tests/line-chart.test.js
// - drawLineChart(): turns those coordinates into SVG elements

// Space around the plot for the axis labels
export const PADDING = { top: 12, right: 12, bottom: 28, left: 56 };

// Round numbers for the y axis: 0, 2,500, 5,000, 7,500 instead of
// 0, 2,371, 4,742... The gap between ticks is 1, 2, 2.5 or 5 times a
// power of ten, whichever gives about `count` steps up to the max.
//   niceTicks(470)   -> [0, 200, 400, 600]   (470 ÷ 4 = 117.5, so steps of 200)
//   niceTicks(8395)  -> [0, 2500, 5000, 7500, 10000]
export function niceTicks(max, count = 4) {
  if (!(max > 0)) return [0, 1];
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough);
  const ticks = [];
  for (let value = 0; value < max + step; value += step) {
    ticks.push(value);
    if (value >= max) break;
  }
  return ticks;
}

// Show at most about `max` labels along the bottom: every label for a
// week of days, every 5th for a month, so they never overlap
export function labelEvery(count, max = 7) {
  return Math.max(1, Math.ceil(count / max));
}

// values: one number per point; labels: one text per point
// -> everything needed to draw, in pixels
export function lineChartGeometry(values, labels, { width, height }) {
  const plot = {
    left: PADDING.left,
    top: PADDING.top,
    width: Math.max(0, width - PADDING.left - PADDING.right),
    height: Math.max(0, height - PADDING.top - PADDING.bottom),
  };

  const ticks = niceTicks(Math.max(0, ...values));
  const top = ticks.at(-1);

  // Scales: a point number -> x, a value -> y.
  // SVG's y grows DOWNWARDS, so a bigger value needs a SMALLER y.
  const x = (i) =>
    plot.left + (values.length === 1 ? plot.width / 2 : (i / (values.length - 1)) * plot.width);
  const y = (value) => plot.top + plot.height - (value / top) * plot.height;

  const points = values.map((value, i) => ({ x: x(i), y: y(value), value, label: labels[i] }));
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const bottom = (plot.top + plot.height).toFixed(1);
  const area = points.length
    ? `${line} L${points.at(-1).x.toFixed(1)},${bottom} L${points[0].x.toFixed(1)},${bottom} Z`
    : "";

  const every = labelEvery(values.length);
  // Labels counted back from the END, so the newest point always has one
  const xTicks = points.filter((_, i) => (values.length - 1 - i) % every === 0);

  return {
    plot,
    points,
    line,
    area,
    yTicks: ticks.map((value) => ({ value, y: y(value) })),
    xTicks: xTicks.map((p) => ({ x: p.x, label: p.label })),
  };
}

// ===== Drawing =====
const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes, text) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

// formatValue: how to write a y-axis number, e.g. cents -> "$2.5K"
// Returns the geometry, so the caller can add hover effects (Step 8).
export function drawLineChart(svg, values, labels, formatValue) {
  // Drawn at its real size on screen, so text is never stretched
  const width = svg.clientWidth || 600;
  const height = svg.clientHeight || 280;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const g = lineChartGeometry(values, labels, { width, height });
  const parts = [];

  for (const tick of g.yTicks) {
    parts.push(
      svgElement("line", {
        class: "chart__grid",
        x1: g.plot.left,
        x2: g.plot.left + g.plot.width,
        y1: tick.y,
        y2: tick.y,
      }),
      svgElement(
        "text",
        { class: "chart__label", x: g.plot.left - 10, y: tick.y + 4, "text-anchor": "end" },
        formatValue(tick.value)
      )
    );
  }

  for (const tick of g.xTicks) {
    parts.push(
      svgElement(
        "text",
        { class: "chart__label", x: tick.x, y: g.plot.top + g.plot.height + 20, "text-anchor": "middle" },
        tick.label
      )
    );
  }

  parts.push(
    svgElement("path", { class: "chart__area", d: g.area }),
    svgElement("path", { class: "chart__line", d: g.line })
  );

  svg.replaceChildren(...parts);
  return g;
}
