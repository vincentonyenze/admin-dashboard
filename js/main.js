// Entry point: the only script loaded by index.html.
// It connects the data (api.js), the numbers (metrics.js, ranges.js) and
// the page (ui.js).
import { loadDashboardData } from "./api.js";
import { prepareOrders, computeMetrics } from "./metrics.js";
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
import {
  elements,
  renderStatCards,
  renderDataNote,
  renderRangeButtons,
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

// ===== Drawing =====
// Everything on the page is worked out from the orders and the range,
// every time the range changes
function render() {
  const range = lastDays(today, rangeDays);
  const before = previousRange(range);
  const current = computeMetrics(ordersInRange(data.orders, range));
  const previous = computeMetrics(ordersInRange(data.orders, before));

  // Only compare with a period the data fully covers: comparing a full
  // month with half a month would make every number look like growth
  const previousHadData = before.start >= firstDay;

  // The range split into days, weeks or months: the shape of each number
  const series = buildSeries(data.orders, range, bucketUnit(rangeDays));

  renderRangeButtons(rangeDays);
  renderStatCards(
    current,
    compareMetrics(current, previous, previousHadData),
    rangeLabel(rangeDays),
    series
  );
}

// ===== Range buttons =====
function handleRangeClick(event) {
  const button = event.target.closest(".range__btn");
  if (!button) return;
  rangeDays = Number(button.dataset.range);
  // In the URL too, so a refresh or a shared link shows the same range.
  // (replaceState: changing the range isn't worth a Back-button step here)
  const params = new URLSearchParams(location.search);
  params.set("range", rangeDays);
  history.replaceState(null, "", `?${params}`);
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
  render();
}

elements.rangeGroup.addEventListener("click", handleRangeClick);

start();
