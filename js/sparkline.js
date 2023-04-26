// Sparklines: tiny charts with no axes or labels, just the shape of a
// trend. The maths (sparkPaths) is pure and tested in tests/sparkline.test.js;
// drawSparkline() puts it on the page.

// Values -> two SVG paths fitted into a width × height box:
//   line: the trend line
//   area: the same line closed down to the bottom, for a soft fill
// The lowest value sits at the bottom and the highest at the top, so even
// small changes are visible (a sparkline shows SHAPE, not size).
export function sparkPaths(values, width, height) {
  if (values.length === 0) return { line: "", area: "" };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1; // all the same: a flat line, not 0 ÷ 0
  const padding = 2; // keeps the stroke from being cut off at the edges

  const points = values.map((value, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    // In SVG y grows DOWNWARDS, so a big value needs a small y
    const y = padding + (1 - (value - min) / span) * (height - padding * 2);
    return [x, y];
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const first = points[0][0].toFixed(1);
  const last = points.at(-1)[0].toFixed(1);
  const area = `${line} L${last},${height} L${first},${height} Z`;
  return { line, area };
}

const SVG_NS = "http://www.w3.org/2000/svg";

export function drawSparkline(svg, values) {
  const width = 90;
  const height = 36;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const { line, area } = sparkPaths(values, width, height);

  const fill = document.createElementNS(SVG_NS, "path");
  fill.setAttribute("class", "spark-fill");
  fill.setAttribute("d", area);

  const stroke = document.createElementNS(SVG_NS, "path");
  stroke.setAttribute("class", "spark-line");
  stroke.setAttribute("d", line);

  svg.replaceChildren(fill, stroke);
}
