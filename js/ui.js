// Drawing the dashboard. These functions take numbers and update the page;
// they never work anything out themselves.
import {
  formatMoney,
  formatMoneyCompact,
  formatCount,
  formatPercent,
  formatDate,
  formatShortDate,
  formatMonth,
  formatMonthYear,
} from "./format.js";
import { drawSparkline } from "./sparkline.js";
import { drawLineChart } from "./line-chart.js";
import { createChartFocus } from "./chart-focus.js";

export const elements = {
  main: document.getElementById("main"),
  dataNote: document.getElementById("data-note"),
  statCards: document.querySelectorAll(".stat-card"),
  rangeGroup: document.querySelector(".range"),
  rangeButtons: document.querySelectorAll(".range__btn"),
  revenueChart: document.getElementById("revenue-chart"),
  revenueSubtitle: document.getElementById("revenue-subtitle"),
  revenueSummary: document.getElementById("revenue-summary"),
  revenueTable: document.getElementById("revenue-table"),
  revenueTooltip: document.getElementById("revenue-tooltip"),
  revenueLive: document.getElementById("revenue-live"),
};

// How each stat card shows its number
const STAT_FORMATS = {
  revenue: (metrics) => formatMoney(metrics.revenueCents),
  orders: (metrics) => formatCount(metrics.orders),
  averageOrder: (metrics) => formatMoney(metrics.averageOrderCents),
  refundRate: (metrics) => formatPercent(metrics.refundRate),
};

// Which number in the metrics each card is about (for its sparkline)
const STAT_VALUES = {
  revenue: (metrics) => metrics.revenueCents,
  orders: (metrics) => metrics.orders,
  averageOrder: (metrics) => metrics.averageOrderCents,
  refundRate: (metrics) => metrics.refundRate,
};

// "▲ 12.5%" (a relative change) or "▲ 1.5 pts" (percentage points)
function changeText({ change, unit }) {
  const size = Math.abs(change);
  return unit === "points" ? `${(size * 100).toFixed(1)} pts` : formatPercent(size);
}

// The line under a number: "▲ 12.5% vs previous 30 days", coloured green
// for good news and red for bad. The arrow is decoration; screen readers
// hear "up 12.5% vs previous 30 days" instead.
function renderChange(element, comparison, label) {
  if (comparison.change === null) {
    element.textContent = "No earlier data to compare";
    return;
  }
  const up = comparison.change >= 0;
  const badge = document.createElement("span");
  badge.className = `change change--${comparison.good ? "good" : "bad"}`;

  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = up ? "▲ " : "▼ ";
  const spoken = document.createElement("span");
  spoken.className = "visually-hidden";
  spoken.textContent = up ? "up " : "down ";

  badge.append(arrow, spoken, changeText(comparison));
  element.replaceChildren(badge, ` vs ${label}`);
}

// Fill every card; each one knows which number it shows from data-metric.
// comparisons: from compareMetrics(); label: "previous 30 days"
// series: from buildSeries(), for the sparklines
export function renderStatCards(metrics, comparisons, label, series) {
  for (const card of elements.statCards) {
    const key = card.dataset.metric;
    card.querySelector(".stat-card__value").textContent = STAT_FORMATS[key](metrics);
    renderChange(card.querySelector(".stat-card__change"), comparisons[key], label);
    drawSparkline(
      card.querySelector(".stat-card__spark"),
      series.map((point) => STAT_VALUES[key](point.metrics))
    );
  }
}

// Highlight the chosen range button
export function renderRangeButtons(days) {
  for (const button of elements.rangeButtons) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.range) === days));
  }
}

// "Data up to Sep 30, 2026"
export function renderDataNote(lastOrderTime) {
  elements.dataNote.textContent = `Data up to ${formatDate(lastOrderTime)}`;
}

// The data couldn't load: replace the dashboard with a message and a retry
export function showLoadError(message, onRetry) {
  const box = document.createElement("div");
  box.className = "card load-error";
  box.setAttribute("role", "alert");

  const text = document.createElement("p");
  text.textContent = `⚠️ ${message}`;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "range__btn";
  retry.textContent = "Try again";
  retry.addEventListener("click", onRetry);

  box.append(text, retry);
  elements.main.replaceChildren(box);
}

// ===== Revenue over time =====
// How each bucket is named: on the axis (short) and in the table (full)
function bucketLabels(point, unit) {
  if (unit === "month") return { short: formatMonth(point.start), full: formatMonthYear(point.start) };
  if (unit === "week") {
    return { short: formatShortDate(point.start), full: `Week of ${formatShortDate(point.start)}` };
  }
  return { short: formatShortDate(point.start), full: formatDate(point.start) };
}

const UNIT_WORDS = { day: "Daily", week: "Weekly", month: "Monthly" };

// A table version of the chart: exact numbers for everyone, and the way
// screen-reader users explore the data
function fillTable(table, headings, rows) {
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const text of headings) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = text;
    headRow.append(th);
  }
  head.append(headRow);

  const body = document.createElement("tbody");
  for (const cells of rows) {
    const tr = document.createElement("tr");
    cells.forEach((text, i) => {
      // The first cell names the row, so it's a heading for that row
      const cell = document.createElement(i === 0 ? "th" : "td");
      if (i === 0) cell.scope = "row";
      cell.textContent = text;
      tr.append(cell);
    });
    body.append(tr);
  }
  table.replaceChildren(head, body);
}

// The tooltip and keyboard support, set up once; updated after every draw
const updateRevenueFocus = createChartFocus(
  elements.revenueChart,
  elements.revenueTooltip,
  elements.revenueLive
);

// series: from buildSeries(); unit: "day" | "week" | "month"
export function renderRevenueChart(series, unit) {
  const values = series.map((point) => point.metrics.revenueCents);
  const labels = series.map((point) => bucketLabels(point, unit));
  const total = values.reduce((a, b) => a + b, 0);

  const geometry = drawLineChart(
    elements.revenueChart,
    values,
    labels.map((label) => label.short),
    formatMoneyCompact
  );

  elements.revenueSubtitle.textContent = `${UNIT_WORDS[unit]} revenue · ${formatMoney(total)} in total`;

  // One sentence a screen reader hears for the whole chart
  if (values.length > 0) {
    const best = values.indexOf(Math.max(...values));
    const worst = values.indexOf(Math.min(...values));
    elements.revenueSummary.textContent =
      `${UNIT_WORDS[unit]} revenue, ${formatMoney(total)} in total. ` +
      `Highest: ${labels[best].full} (${formatMoney(values[best])}). ` +
      `Lowest: ${labels[worst].full} (${formatMoney(values[worst])}).`;
  }

  fillTable(
    elements.revenueTable,
    [unit === "month" ? "Month" : unit === "week" ? "Week" : "Day", "Revenue"],
    series.map((point, i) => [labels[i].full, formatMoney(values[i])])
  );

  // What the tooltip says for each point
  updateRevenueFocus(
    geometry,
    series.map((point, i) => ({
      title: labels[i].full,
      lines: [formatMoney(values[i]), `${formatCount(point.metrics.orders)} order${point.metrics.orders === 1 ? "" : "s"}`],
    }))
  );
}
