// Making a line chart explorable: a tooltip that follows the mouse, and
// the same thing from the keyboard (Tab to the chart, then ← and →).
//
// nearestIndex() and nextIndex() are pure and tested in
// tests/chart-focus.test.js; createChartFocus() wires up the page.

// Which point is closest to an x position (in the chart's own pixels)?
export function nearestIndex(points, x) {
  let best = -1;
  let bestDistance = Infinity;
  points.forEach((point, i) => {
    const distance = Math.abs(point.x - x);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

// Where a key moves the highlight to, or null for keys the chart ignores.
// Moves stop at the ends instead of wrapping round.
export function nextIndex(key, current, count) {
  if (count === 0) return null;
  switch (key) {
    case "ArrowLeft":
      return Math.max(0, current - 1);
    case "ArrowRight":
      return Math.min(count - 1, current + 1);
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

const SVG_NS = "http://www.w3.org/2000/svg";

// svg: the chart; tooltip: the box above it; live: a hidden aria-live
// element that reads the point out for screen-reader users.
// Returns update(geometry, details), to call after every redraw, where
// details[i] = { title: "Sep 12, 2026", lines: ["$412.50", "14 orders"] }.
export function createChartFocus(svg, tooltip, live) {
  let geometry = null;
  let details = [];
  let active = -1; // the highlighted point, or -1 for none

  // The dashed line and dot that mark the highlighted point
  const marker = document.createElementNS(SVG_NS, "g");
  const rule = document.createElementNS(SVG_NS, "line");
  rule.setAttribute("class", "chart__focus-line");
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("class", "chart__dot");
  dot.setAttribute("r", "5");
  marker.append(rule, dot);

  function show(index, { announce = false } = {}) {
    if (!geometry || index < 0 || index >= geometry.points.length) return;
    active = index;
    const point = geometry.points[index];
    const info = details[index];

    rule.setAttribute("x1", point.x);
    rule.setAttribute("x2", point.x);
    rule.setAttribute("y1", geometry.plot.top);
    rule.setAttribute("y2", geometry.plot.top + geometry.plot.height);
    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
    svg.append(marker); // (re)attach: a redraw replaces everything in the svg

    // "$412.50" in bold, then "Sep 12, 2026 · 14 orders". Built from
    // nodes, not innerHTML: the text is shown as text, always.
    const value = document.createElement("strong");
    value.textContent = info.lines[0];
    tooltip.replaceChildren(value, [info.title, ...info.lines.slice(1)].join(" · "));
    tooltip.hidden = false;

    // Next to the point, flipped to the left near the right edge, and
    // never above the top of the chart
    const box = tooltip.getBoundingClientRect();
    const left = point.x + 14 + box.width > svg.clientWidth ? point.x - 14 - box.width : point.x + 14;
    const top = Math.max(0, point.y - box.height - 10);
    tooltip.style.transform = `translate(${left}px, ${top}px)`;

    // Keyboard users hear each point as they move along it
    if (announce) live.textContent = `${info.title}: ${info.lines.join(", ")}`;
  }

  function hide() {
    active = -1;
    tooltip.hidden = true;
    marker.remove();
  }

  // ===== Mouse and touch =====
  svg.addEventListener("pointermove", (event) => {
    if (!geometry) return;
    // The pointer's position, measured from the svg's left edge
    const x = event.clientX - svg.getBoundingClientRect().left;
    show(nearestIndex(geometry.points, x));
  });
  svg.addEventListener("pointerleave", () => {
    // Keep it if the chart has keyboard focus
    if (document.activeElement !== svg) hide();
  });

  // ===== Keyboard =====
  svg.tabIndex = 0; // reachable with Tab
  svg.addEventListener("focus", () => {
    // Start on the newest point: usually the one people care about
    if (geometry) show(active >= 0 ? active : geometry.points.length - 1, { announce: true });
  });
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hide();
      return;
    }
    const next = nextIndex(event.key, active, geometry?.points.length ?? 0);
    if (next === null) return;
    event.preventDefault(); // arrow keys shouldn't also scroll the page
    show(next, { announce: true });
  });

  // After a redraw: new points, and keep highlighting the same position if
  // it still exists (e.g. after resizing the window)
  return function update(newGeometry, newDetails) {
    geometry = newGeometry;
    details = newDetails;
    if (active >= 0 && active < geometry.points.length) show(active);
    else hide();
  };
}
