// Numbers and dates turned into text for people. No DOM, so it's tested in
// tests/format.test.js. Formatters are created once and reused: making one
// is slow compared with using it.

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// No cents, and short for big amounts: $84K, $1.2M (for chart axes and cards)
const moneyCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const whole = new Intl.NumberFormat("en-US");

// 1234567 cents -> "$12,345.67"
export function formatMoney(cents) {
  return money.format(cents / 100);
}

// 8395109 cents -> "$84K"
export function formatMoneyCompact(cents) {
  return moneyCompact.format(cents / 100);
}

// 2256 -> "2,256"
export function formatCount(count) {
  return whole.format(count);
}

// 0.0723 -> "7.2%"
export function formatPercent(fraction, digits = 1) {
  return `${(fraction * 100).toFixed(digits)}%`;
}

// Dates are shown in UTC, the same time zone the data is stored in. Using
// the computer's own time zone could move a late-evening order onto the
// next day, and then the day totals wouldn't match the charts.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

// ms -> "Sep 30, 2026"
export function formatDate(time) {
  return dateFormat.format(time);
}

// ms -> "Sep 30"
export function formatShortDate(time) {
  return shortDateFormat.format(time);
}

// ms -> "2:23 PM"
export function formatTime(time) {
  return timeFormat.format(time);
}
