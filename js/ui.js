// Drawing the dashboard. These functions take numbers and update the page;
// they never work anything out themselves.
import { formatMoney, formatCount, formatPercent, formatDate } from "./format.js";

export const elements = {
  main: document.getElementById("main"),
  dataNote: document.getElementById("data-note"),
  statCards: document.querySelectorAll(".stat-card"),
};

// How each stat card shows its number
const STAT_FORMATS = {
  revenue: (metrics) => formatMoney(metrics.revenueCents),
  orders: (metrics) => formatCount(metrics.orders),
  averageOrder: (metrics) => formatMoney(metrics.averageOrderCents),
  refundRate: (metrics) => formatPercent(metrics.refundRate),
};

// Fill every card; each one knows which number it shows from data-metric
export function renderStatCards(metrics) {
  for (const card of elements.statCards) {
    const format = STAT_FORMATS[card.dataset.metric];
    card.querySelector(".stat-card__value").textContent = format(metrics);
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
