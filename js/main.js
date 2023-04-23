// Entry point: the only script loaded by index.html.
// It connects the data (api.js), the numbers (metrics.js) and the page (ui.js).
import { loadDashboardData } from "./api.js";
import { prepareOrders, computeMetrics } from "./metrics.js";
import { renderStatCards, renderDataNote, showLoadError } from "./ui.js";

// Filled once the data arrives
let data = { products: [], categories: [], orders: [] };

async function start() {
  try {
    const raw = await loadDashboardData();
    data = { ...raw, orders: prepareOrders(raw.orders) };
  } catch (error) {
    // A real reload: the error message replaced the dashboard's HTML
    showLoadError(error.message, () => location.reload());
    return;
  }

  // The newest order marks "today" for the dashboard (the data is a fixed
  // year, whatever the computer's clock says)
  const lastOrderTime = Math.max(...data.orders.map((order) => order.time));
  renderDataNote(lastOrderTime);

  // All orders for now; Step 5 adds the date range
  renderStatCards(computeMetrics(data.orders));
}

start();
