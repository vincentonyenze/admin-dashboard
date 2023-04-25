// Date ranges ("the last 30 days") and comparing with the period before.
// Pure functions, tested in tests/ranges.test.js.
//
// A range is { start, end } in milliseconds, with start INCLUDED and end
// NOT included: start <= time < end. That way two ranges side by side
// (this month, last month) never both count the same moment.

export const DAY = 24 * 60 * 60 * 1000;

// The choices on the page, in days
export const RANGE_OPTIONS = [7, 30, 90, 365];
export const DEFAULT_RANGE = 30;

// Midnight (UTC) at the start of the day `time` falls on
export function startOfDay(time) {
  return Math.floor(time / DAY) * DAY;
}

// The last `days` whole days, up to and including the day of `today`.
// 30 days ending on Sep 30 = Sep 1 00:00 up to (not including) Oct 1 00:00.
export function lastDays(today, days) {
  const end = startOfDay(today) + DAY;
  return { start: end - days * DAY, end };
}

// The same length of time, just before it: what the range is compared with
export function previousRange(range) {
  const length = range.end - range.start;
  return { start: range.start - length, end: range.start };
}

export function isInRange(time, range) {
  return time >= range.start && time < range.end;
}

export function ordersInRange(orders, range) {
  return orders.filter((order) => isInRange(order.time, range));
}

// How much a number changed, as a fraction: 100 -> 125 is 0.25 (+25%).
// null when there's nothing to compare with: "up 100% from nothing" means
// nothing, and dividing by zero would give Infinity.
export function percentChange(current, previous) {
  if (!previous) return null;
  return (current - previous) / previous;
}

// For each metric: how it changed, and whether that's good news.
// Revenue going up is good; refunds going up is bad.
//
// The refund RATE is already a percentage, so its change is measured in
// percentage POINTS: 7.0% -> 8.5% is "+1.5 points". Saying "+21%" (the
// relative change) would be correct but very confusing.
export function compareMetrics(current, previous, previousHadData) {
  const relative = (key, higherIsGood = true) => {
    const change = previousHadData ? percentChange(current[key], previous[key]) : null;
    return { change, unit: "percent", good: change === null ? null : (change >= 0) === higherIsGood };
  };

  const points = previousHadData ? current.refundRate - previous.refundRate : null;
  return {
    revenue: relative("revenueCents"),
    orders: relative("orders"),
    averageOrder: relative("averageOrderCents"),
    refundRate: { change: points, unit: "points", good: points === null ? null : points <= 0 },
  };
}

// "previous 30 days", "previous 12 months"
export function rangeLabel(days) {
  return days === 365 ? "previous 12 months" : `previous ${days} days`;
}

// ?range=90 in the URL -> 90. Anything not offered falls back to the default.
export function parseRange(search) {
  const days = Number(new URLSearchParams(search).get("range"));
  return RANGE_OPTIONS.includes(days) ? days : DEFAULT_RANGE;
}
