// The dashboard's numbers. Pure functions: orders in, numbers out.
// Tested in tests/metrics.test.js.
//
// The definitions matter as much as the code, so here they are:
// - Revenue: money from orders that went through (processing, shipped or
//   delivered). Refunded and cancelled orders brought in nothing.
// - Orders: every order placed, including ones later cancelled.
// - Average order: revenue ÷ the orders that brought it in.
// - Refunds & cancellations: the share of placed orders that were
//   refunded or cancelled.

// Orders that count as money in the bank
export const PAID_STATUSES = ["processing", "shipped", "delivered"];

export const isPaid = (order) => PAID_STATUSES.includes(order.status);

// The raw JSON has dates as text ("2025-10-01T14:23:00.000Z"). Turn each
// into a number of milliseconds ONCE, when the data loads, instead of on
// every comparison later. The original fields are kept as they were.
export function prepareOrders(rawOrders) {
  return rawOrders.map((order) => ({ ...order, time: Date.parse(order.createdAt) }));
}

export function computeMetrics(orders) {
  const paid = orders.filter(isPaid);
  const revenueCents = paid.reduce((sum, order) => sum + order.totalCents, 0);
  const lost = orders.length - paid.length;

  return {
    revenueCents,
    orders: orders.length,
    // Round to a whole cent; with no paid orders there's no average
    averageOrderCents: paid.length > 0 ? Math.round(revenueCents / paid.length) : 0,
    // A fraction from 0 to 1 (0.072 = 7.2%)
    refundRate: orders.length > 0 ? lost / orders.length : 0,
  };
}
