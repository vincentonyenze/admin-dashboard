// A horizontal bar chart: one row per category, its name above a bar.
// Horizontal because category names are long ("Watches & Accessories"):
// they fit easily beside a horizontal bar, but not under a vertical one.
//
// barGeometry() is pure and tested in tests/bar-chart.test.js.

export const ROW_HEIGHT = 44;
const BAR_HEIGHT = 10;

// rows: [{ label, value, valueLabel }] -> where everything goes.
// The biggest value fills the whole width; the rest are in proportion.
export function barGeometry(rows, width) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  return {
    height: rows.length * ROW_HEIGHT,
    bars: rows.map((row, i) => {
      const top = i * ROW_HEIGHT;
      return {
        ...row,
        labelY: top + 16,
        barY: top + 24,
        barHeight: BAR_HEIGHT,
        width: max > 0 ? (row.value / max) * width : 0,
        trackWidth: width,
      };
    }),
  };
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes, text) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

export function drawBarChart(svg, rows) {
  const width = svg.clientWidth || 300;
  const g = barGeometry(rows, width);
  // The chart is as tall as its rows need
  svg.style.height = `${g.height}px`;
  svg.setAttribute("viewBox", `0 0 ${width} ${g.height}`);

  const parts = [];
  for (const bar of g.bars) {
    parts.push(
      svgElement("text", { class: "bar__label", x: 0, y: bar.labelY }, bar.label),
      svgElement(
        "text",
        { class: "bar__value", x: width, y: bar.labelY, "text-anchor": "end" },
        bar.valueLabel
      ),
      // A light full-width track behind each bar makes the proportions easy to judge
      svgElement("rect", {
        class: "bar-track",
        x: 0,
        y: bar.barY,
        width: bar.trackWidth,
        height: bar.barHeight,
        rx: bar.barHeight / 2,
      }),
      svgElement("rect", {
        class: "bar",
        x: 0,
        y: bar.barY,
        width: bar.width,
        height: bar.barHeight,
        rx: bar.barHeight / 2,
      })
    );
  }
  svg.replaceChildren(...parts);
}
