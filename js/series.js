// Splitting a date range into buckets (days, weeks or months) and working
// out the numbers for each: the data behind every line on the dashboard.
// Pure functions, tested in tests/series.test.js.
import { DAY, ordersInRange } from "./ranges.js";
import { computeMetrics } from "./metrics.js";

// How finely to split each range: daily points for a week or a month,
// weekly for 90 days (90 daily points would be a noisy zigzag), monthly
// for a year
export function bucketUnit(days) {
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

// Midnight UTC on the first day of the month after `time`
function nextMonthStart(time) {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

// The buckets covering a range, oldest first: [{ start, end }, ...]
// Days and weeks are counted BACK from the end, so the newest bucket is
// always complete; only the oldest week can be cut short by the range.
export function buildBuckets(range, unit) {
  const buckets = [];

  if (unit === "month") {
    let start = range.start;
    while (start < range.end) {
      const end = Math.min(nextMonthStart(start), range.end);
      buckets.push({ start, end });
      start = end;
    }
    return buckets;
  }

  const size = unit === "week" ? 7 * DAY : DAY;
  for (let end = range.end; end > range.start; end -= size) {
    buckets.unshift({ start: Math.max(range.start, end - size), end });
  }
  return buckets;
}

// Every bucket with its metrics: [{ start, end, metrics }, ...]
export function buildSeries(orders, range, unit) {
  const inRange = ordersInRange(orders, range);
  return buildBuckets(range, unit).map((bucket) => ({
    ...bucket,
    metrics: computeMetrics(ordersInRange(inRange, bucket)),
  }));
}
