// Entry point: the only script loaded by index.html.
// It connects the data (api.js), the numbers (metrics.js, ranges.js) and
// the page (ui.js).
import { loadDashboardData } from "./api.js";
import { prepareOrders, computeMetrics, salesByCategory } from "./metrics.js";
import {
  lastDays,
  previousRange,
  ordersInRange,
  compareMetrics,
  rangeLabel,
  parseRange,
  startOfDay,
  DEFAULT_RANGE,
} from "./ranges.js";
import { bucketUnit, buildSeries } from "./series.js";
import { sortOrders, nextSort, parseSort, DEFAULT_SORT } from "./orders.js";
import {
  elements,
  renderStatCards,
  renderDataNote,
  renderRangeButtons,
  renderRevenueChart,
  renderCategoryChart,
  renderOrdersTable,
  renderSortHeaders,
  showLoadError,
} from "./ui.js";

// Filled once the data arrives
let data = { products: [], categories: [], orders: [] };
// The newest order marks "today" for the dashboard, and the oldest marks
// how far back comparisons can go (the data is a fixed year, whatever the
// computer's clock says)
let today = 0;
let firstDay = 0;

// How many days the page is showing: 7, 30, 90 or 365
let rangeDays = DEFAULT_RANGE;
// How the orders table is sorted: { key: "total", direction: "descending" }
let sort = DEFAULT_SORT;
// The orders in the current range (the table works from these)
let rangeOrders = [];

// ===== Drawing =====
// Everything on the page is worked out from the orders and the range,
// every time the range changes
function render() {
  const range = lastDays(today, rangeDays);
  const before = previousRange(range);
  const inRange = ordersInRange(data.orders, range);
  const current = computeMetrics(inRange);
  const previous = computeMetrics(ordersInRange(data.orders, before));

  // Only compare with a period the data fully covers: comparing a full
  // month with half a month would make every number look like growth
  const previousHadData = before.start >= firstDay;

  // The range split into days, weeks or months: the shape of each number
  const unit = bucketUnit(rangeDays);
  const series = buildSeries(data.orders, range, unit);

  renderRangeButtons(rangeDays);
  renderStatCards(
    current,
    compareMetrics(current, previous, previousHadData),
    rangeLabel(rangeDays),
    series
  );
  renderRevenueChart(series, unit);
  renderCategoryChart(salesByCategory(inRange, data.categories));

  rangeOrders = inRange;
  renderOrders();
}

// ===== Orders table =====
// Only the table: sorting doesn't need the charts redrawn
function renderOrders() {
  const sorted = sortOrders(rangeOrders, sort);
  renderSortHeaders(sort);
  // The first 20 for now; search and pages come in Step 12
  renderOrdersTable(sorted.slice(0, 20), sorted.length);
}

// One listener for all the column headings
function handleSortClick(event) {
  const button = event.target.closest(".sort-btn");
  if (!button) return;
  sort = nextSort(sort, button.dataset.sort);
  updateUrl({ sort: sort.key, dir: sort.direction });
  renderOrders();
}

// ===== The URL =====
// Change some of the URL's settings, keeping the rest. replaceState: these
// aren't worth a Back-button step, but a refresh keeps them.
function updateUrl(changes) {
  const params = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(changes)) params.set(key, value);
  history.replaceState(null, "", `?${params}${location.hash}`);
}

// ===== Range buttons =====
function handleRangeClick(event) {
  const button = event.target.closest(".range__btn");
  if (!button) return;
  rangeDays = Number(button.dataset.range);
  // In the URL too, so a refresh or a shared link shows the same range
  updateUrl({ range: rangeDays });
  render();
}

// ===== Start =====
async function start() {
  try {
    const raw = await loadDashboardData();
    data = { ...raw, orders: prepareOrders(raw.orders) };
  } catch (error) {
    // A real reload: the error message replaced the dashboard's HTML
    showLoadError(error.message, () => location.reload());
    return;
  }

  const times = data.orders.map((order) => order.time);
  today = Math.max(...times);
  firstDay = startOfDay(Math.min(...times));
  renderDataNote(today);

  rangeDays = parseRange(location.search);
  sort = parseSort(location.search);
  render();
}

elements.rangeGroup.addEventListener("click", handleRangeClick);
elements.ordersHead.addEventListener("click", handleSortClick);
// Charts are drawn at their size on screen, so draw again when that
// changes. requestAnimationFrame: at most once per frame while dragging.
let resizeFrame = null;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    if (data.orders.length > 0) render();
  });
});

start();
