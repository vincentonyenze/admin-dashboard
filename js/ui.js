// Drawing the dashboard. These functions take numbers and update the page;
// they never work anything out themselves.
import { formatMoney, formatCount, formatPercent, formatDate } from "./format.js";
import { drawSparkline } from "./sparkline.js";

export const elements = {
  main: document.getElementById("main"),
  dataNote: document.getElementById("data-note"),
  statCards: document.querySelectorAll(".stat-card"),
  rangeGroup: document.querySelector(".range"),
  rangeButtons: document.querySelectorAll(".range__btn"),
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
