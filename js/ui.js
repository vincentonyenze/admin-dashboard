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
  formatTime,
} from "./format.js";
import { itemsSummary, unitCount } from "./orders.js";
import { drawSparkline } from "./sparkline.js";
import { drawLineChart } from "./line-chart.js";
import { createChartFocus } from "./chart-focus.js";
import { drawBarChart } from "./bar-chart.js";

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
  categoryChart: document.getElementById("category-chart"),
  categorySummary: document.getElementById("category-summary"),
  categoryTable: document.getElementById("category-table"),
  ordersBody: document.getElementById("orders-body"),
  ordersCount: document.getElementById("orders-count"),
  ordersEmpty: document.getElementById("orders-empty"),
  ordersHead: document.querySelector(".table thead"),
  ordersTitle: document.getElementById("orders-title"),
  ordersFilters: document.getElementById("orders-filters"),
  ordersSearch: document.getElementById("orders-search"),
  ordersStatus: document.getElementById("orders-status"),
  ordersPagination: document.getElementById("orders-pagination"),
  orderDialog: document.getElementById("order-dialog"),
  orderDialogTitle: document.getElementById("order-dialog-title"),
  orderDialogBody: document.getElementById("order-dialog-body"),
  orderDialogClose: document.getElementById("order-dialog-close"),
  topProducts: document.getElementById("top-products"),
  lowStock: document.getElementById("low-stock"),
  sidebar: document.getElementById("sidebar"),
  sidebarLinks: document.querySelectorAll(".sidebar__link"),
  menuBtn: document.getElementById("menu-btn"),
  topbar: document.querySelector(".topbar"),
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

// ===== Sales by category =====
// rows: from salesByCategory()
export function renderCategoryChart(rows) {
  drawBarChart(
    elements.categoryChart,
    rows.map((row) => ({
      label: row.name,
      value: row.salesCents,
      valueLabel: `${formatMoneyCompact(row.salesCents)} · ${formatPercent(row.share, 0)}`,
    }))
  );

  const [top] = rows;
  elements.categorySummary.textContent =
    top && top.salesCents > 0
      ? `${top.name} sold the most, with ${formatPercent(top.share, 0)} of product sales (${formatMoney(top.salesCents)}).`
      : "No product sales in this period.";

  fillTable(
    elements.categoryTable,
    ["Category", "Sales"],
    rows.map((row) => [row.name, `${formatMoney(row.salesCents)} (${formatPercent(row.share)})`])
  );
}

// ===== Orders table =====
// A cell with a main line and a small second line underneath
function twoLineCell(main, second, secondClass) {
  const td = document.createElement("td");
  td.append(main);
  const small = document.createElement("span");
  small.className = secondClass;
  small.textContent = second;
  td.append(small);
  return td;
}

function createOrderRow(order) {
  const tr = document.createElement("tr");

  // The order number is a button: Step 13 opens the order's details
  const idCell = document.createElement("td");
  const idButton = document.createElement("button");
  idButton.type = "button";
  idButton.className = "table__order";
  idButton.dataset.orderId = order.id;
  idButton.textContent = order.id;
  idCell.append(idButton);

  const date = twoLineCell(formatDate(order.time), formatTime(order.time), "table__customer-email");
  const customer = twoLineCell(order.customer.name, order.customer.email, "table__customer-email");

  const units = unitCount(order);
  const items = twoLineCell(itemsSummary(order), `${units} item${units === 1 ? "" : "s"}`, "table__customer-email");

  // The badge shows the word, not just a colour, so it works for everyone
  const statusCell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `status status--${order.status}`;
  badge.textContent = order.status;
  statusCell.append(badge);

  const total = document.createElement("td");
  total.className = "table__num";
  total.textContent = formatMoney(order.totalCents);

  // On phones each row becomes a card, and each cell shows its column name
  // in front of it ("Total $21.41"), read from data-label by the CSS
  const columnNames = ["Order", "Date", "Customer", "Items", "Status", "Total"];
  const cells = [idCell, date, customer, items, statusCell, total];
  cells.forEach((cell, i) => {
    cell.dataset.label = columnNames[i];
  });

  tr.append(...cells);
  return tr;
}

// page: from paginate(); inRange: how many orders the date range has
// before searching or filtering
export function renderOrdersTable(page, inRange) {
  elements.ordersBody.replaceChildren(...page.items.map(createOrderRow));
  elements.ordersEmpty.hidden = page.total > 0;

  const filtered = page.total !== inRange;
  const noun = `${filtered ? "matching " : ""}order${page.total === 1 ? "" : "s"}`;
  let text =
    page.totalPages > 1
      ? `Showing ${formatCount(page.from)}–${formatCount(page.to)} of ${formatCount(page.total)} ${noun}`
      : `${formatCount(page.total)} ${noun}`;
  if (filtered) text += ` (${formatCount(inRange)} in total)`;
  elements.ordersCount.textContent = text;
}

// ‹ 1 … 4 5 6 … 16 ›  (pages: from pageNumbers())
function pageButton(label, page, { current = false, disabled = false, ariaLabel } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "page-btn";
  button.textContent = label;
  button.dataset.page = page;
  button.disabled = disabled;
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  if (current) button.setAttribute("aria-current", "page");
  return button;
}

export function renderPagination(current, totalPages, pages) {
  elements.ordersPagination.hidden = totalPages <= 1;
  if (totalPages <= 1) {
    elements.ordersPagination.replaceChildren();
    return;
  }
  const buttons = pages.map((page) => {
    if (page === "…") {
      const gap = document.createElement("span");
      gap.className = "page-gap";
      gap.setAttribute("aria-hidden", "true");
      gap.textContent = "…";
      return gap;
    }
    return pageButton(page, page, { current: page === current, ariaLabel: `Page ${page}` });
  });
  elements.ordersPagination.replaceChildren(
    pageButton("‹", current - 1, { disabled: current === 1, ariaLabel: "Previous page" }),
    ...buttons,
    pageButton("›", current + 1, { disabled: current === totalPages, ariaLabel: "Next page" })
  );
}

// Mark the sorted column. aria-sort tells screen readers ("Total, sorted
// descending") and the CSS draws the ↑ / ↓ arrow from the same attribute.
export function renderSortHeaders(sort) {
  for (const button of elements.ordersHead.querySelectorAll(".sort-btn")) {
    const th = button.closest("th");
    th.setAttribute("aria-sort", button.dataset.sort === sort.key ? sort.direction : "none");
  }
}

// ===== Order details dialog =====
// A small helper: an element with a class and some text
function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function statusBadge(status) {
  return make("span", `status status--${status}`, status);
}

// One product line: photo, name, "2 × $10.00", and the line total
function orderLine(line) {
  const item = make("li", "order-line");
  if (line.image) {
    const photo = make("img", "order-line__photo");
    photo.src = line.image;
    photo.alt = ""; // the name is right next to it
    photo.width = 48;
    photo.height = 48;
    item.append(photo);
  } else {
    // The product isn't in the shop any more: keep the space, no broken image
    item.append(make("span", "order-line__photo order-line__photo--missing", "📦"));
  }
  const info = make("div", "order-line__info");
  info.append(
    make("p", "order-line__name", line.name),
    make("p", "order-line__qty", `${line.quantity} × ${formatMoney(line.unitCents)}`)
  );
  item.append(info, make("p", "order-line__total", formatMoney(line.lineCents)));
  return item;
}

// A <dl> of names and amounts: Subtotal $40.00, Shipping Free, ...
function summaryList(rows) {
  const list = make("dl", "order-summary");
  for (const [name, value, className] of rows) {
    const row = make("div", `order-summary__row ${className ?? ""}`.trim());
    row.append(make("dt", "", name), make("dd", "", value));
    list.append(row);
  }
  return list;
}

// order: the order; details: from orderDetails()
export function showOrderDialog(order, details) {
  elements.orderDialogTitle.textContent = `Order ${order.id}`;

  const meta = make("p", "order-meta");
  meta.append(statusBadge(order.status), ` Placed ${formatDate(order.time)} at ${formatTime(order.time)}`);

  const customer = make("section", "order-customer");
  const orders = details.customerOrderCount;
  customer.append(
    make("h3", "order-section-title", "Customer"),
    make("p", "order-customer__name", order.customer.name),
    make("p", "order-customer__email", order.customer.email),
    make(
      "p",
      "order-customer__history",
      `${formatCount(orders)} order${orders === 1 ? "" : "s"} in total · ${formatMoney(details.customerSpentCents)} spent`
    )
  );

  const items = make("section", "order-items");
  const list = make("ul", "order-lines");
  list.append(...details.lines.map(orderLine));
  items.append(make("h3", "order-section-title", "Items"), list);

  const summary = summaryList([
    ["Subtotal", formatMoney(order.subtotalCents)],
    ["Shipping", order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents)],
    ["Tax", formatMoney(order.taxCents)],
    ["Total", formatMoney(order.totalCents), "order-summary__row--total"],
  ]);

  elements.orderDialogBody.replaceChildren(meta, customer, items, summary);
  // showModal(): Esc closes it, the page behind is blocked, and focus
  // goes back to the order number that opened it when it closes
  elements.orderDialog.showModal();
}

export function closeOrderDialog() {
  elements.orderDialog.close();
}

// ===== Product lists =====
// One row, used by BOTH lists: (rank) photo, name, a line under it, and a
// value on the right. Writing it once means the two lists can't drift apart.
//   rank: 1, 2, 3... or null for no number
function productRow({ rank = null, product, meta, value, valueClass = "" }) {
  const item = make("li", "product-row");
  // Without a rank the grid still has 4 columns, so keep an empty cell
  item.append(make("span", "product-row__rank", rank === null ? "" : String(rank)));

  if (product.image) {
    const photo = make("img", "product-row__photo");
    photo.src = product.image;
    photo.alt = "";
    photo.width = 44;
    photo.height = 44;
    photo.loading = "lazy";
    item.append(photo);
  } else {
    item.append(make("span", "product-row__photo order-line__photo--missing", "📦"));
  }

  const info = make("div", "");
  info.append(make("p", "product-row__name", product.name), make("p", "product-row__meta", meta));
  item.append(info, make("p", `product-row__value ${valueClass}`.trim(), value));
  return item;
}

// A friendly line instead of an empty box
function emptyRow(text) {
  return make("li", "product-row__empty", text);
}

// rows: from topProducts()
export function renderTopProducts(rows) {
  elements.topProducts.replaceChildren(
    ...(rows.length > 0
      ? rows.map((row, i) =>
          productRow({
            rank: i + 1,
            product: row.product,
            meta: `${formatCount(row.unitsSold)} sold`,
            value: formatMoney(row.salesCents),
          })
        )
      : [emptyRow("No sales in this period.")])
  );
}

// rows: from lowStock()
export function renderLowStock(rows) {
  elements.lowStock.replaceChildren(
    ...(rows.length > 0
      ? rows.map((row) =>
          productRow({
            product: row.product,
            meta:
              row.unitsSold > 0
                ? `${formatCount(row.unitsSold)} sold in this period`
                : "No sales in this period",
            value: row.product.stock === 0 ? "Sold out" : `${row.product.stock} left`,
            valueClass: "product-row__value--low",
          })
        )
      : [emptyRow("Everything is well stocked.")])
  );
}

// ===== Sidebar menu (small screens) =====
// While it's open it acts like a dialog: the rest of the page is made
// inert (no clicks, no Tab, not read out), so focus can't wander behind it.
export function setMenuOpen(isOpen) {
  elements.sidebar.classList.toggle("sidebar--open", isOpen);
  elements.menuBtn.setAttribute("aria-expanded", String(isOpen));
  elements.menuBtn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  elements.topbar.inert = isOpen;
  elements.main.inert = isOpen;
  document.body.classList.toggle("no-scroll", isOpen);
}

// Highlight the sidebar link for the section you're looking at
export function setCurrentLink(sectionId) {
  for (const link of elements.sidebarLinks) {
    if (link.getAttribute("href") === `#${sectionId}`) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}
