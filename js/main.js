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
import {
  sortOrders,
  nextSort,
  parseSort,
  filterOrders,
  DEFAULT_SORT,
  STATUS_ORDER,
} from "./orders.js";
import { paginate, pageNumbers } from "./pagination.js";
import { debounce } from "./utils.js";
import {
  elements,
  renderStatCards,
  renderDataNote,
  renderRangeButtons,
  renderRevenueChart,
  renderCategoryChart,
  renderOrdersTable,
  renderSortHeaders,
  renderPagination,
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
// The table's search box and status dropdown ("" = any), and its page
let filters = { search: "", status: "" };
let page = 1;

// Wait for a short pause in typing before searching
const SEARCH_DELAY_MS = 200;

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
// Only the table: searching, sorting and paging don't need the charts
// redrawn. range -> search/status -> sort -> one page
function renderOrders() {
  const sorted = sortOrders(filterOrders(rangeOrders, filters), sort);
  const current = paginate(sorted, page);
  page = current.page; // a page that no longer exists was moved to a real one

  renderSortHeaders(sort);
  renderOrdersTable(current, rangeOrders.length);
  renderPagination(current.page, current.totalPages, pageNumbers(current.page, current.totalPages));
  updateUrl({ q: filters.search, status: filters.status, page: page > 1 ? page : "" });
}

// Anything that changes WHICH orders are shown goes back to page 1:
// page 7 of the old list means nothing for the new one
function showFromFirstPage() {
  page = 1;
  renderOrders();
}

function readFilters() {
  filters = {
    search: elements.ordersSearch.value.trim(),
    status: elements.ordersStatus.value,
  };
  showFromFirstPage();
}

const readFiltersSoon = debounce(readFilters, SEARCH_DELAY_MS);

// One listener for the search box and the dropdown: typing waits for a
// pause; choosing a status applies straight away
function handleFiltersInput(event) {
  if (event.target === elements.ordersSearch) readFiltersSoon();
  else readFilters();
}

function handlePageClick(event) {
  const button = event.target.closest(".page-btn");
  if (!button || button.disabled) return;
  page = Number(button.dataset.page);
  renderOrders();
  // Back to the top of the table, and focus there too, so keyboard and
  // screen reader users are not left at the bottom of a changed page
  elements.ordersTitle.focus({ preventScroll: true });
  document.getElementById("orders").scrollIntoView({ behavior: "smooth", block: "start" });
}

// One listener for all the column headings
function handleSortClick(event) {
  const button = event.target.closest(".sort-btn");
  if (!button) return;
  sort = nextSort(sort, button.dataset.sort);
  updateUrl({ sort: sort.key, dir: sort.direction });
  showFromFirstPage();
}

// ===== The URL =====
// Change some of the URL's settings, keeping the rest. An empty value is
// left out, so the URL only holds what's actually chosen. replaceState:
// these aren't worth a Back-button step, but a refresh keeps them.
function updateUrl(changes) {
  const params = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === "" || value === null) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  history.replaceState(null, "", `${query ? `?${query}` : location.pathname}${location.hash}`);
}

// The table's settings from the URL, each checked: anyone can edit a URL
function readTableFromUrl() {
  const params = new URLSearchParams(location.search);
  const status = params.get("status") ?? "";
  filters = {
    search: (params.get("q") ?? "").trim(),
    status: STATUS_ORDER.includes(status) ? status : "",
  };
  page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
  // Show them in the controls too
  elements.ordersSearch.value = filters.search;
  elements.ordersStatus.value = filters.status;
}

// ===== Range buttons =====
function handleRangeClick(event) {
  const button = event.target.closest(".range__btn");
  if (!button) return;
  rangeDays = Number(button.dataset.range);
  // In the URL too, so a refresh or a shared link shows the same range
  updateUrl({ range: rangeDays });
  page = 1; // a different set of orders
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
  readTableFromUrl();
  render();
}

elements.rangeGroup.addEventListener("click", handleRangeClick);
elements.ordersHead.addEventListener("click", handleSortClick);
elements.ordersFilters.addEventListener("input", handleFiltersInput);
// Enter in the search box: search now, and don't reload the page
elements.ordersFilters.addEventListener("submit", (event) => {
  event.preventDefault();
  readFiltersSoon.flush();
});
elements.ordersPagination.addEventListener("click", handlePageClick);
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
