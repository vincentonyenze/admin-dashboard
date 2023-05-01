// The orders table's logic: describing an order in a few words, and (in
// the next steps) sorting, searching and paging. Pure functions, tested
// in tests/orders.test.js.

// Every unit in an order: 2 mugs + 1 lamp = 3
export function unitCount(order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

// A short description for a table cell:
//   one product           -> "Red Lipstick"
//   two of one product    -> "Red Lipstick ×2"
//   several products      -> "Red Lipstick + 2 more"
export function itemsSummary(order) {
  const [first, ...rest] = order.items;
  if (!first) return "No items";
  const name = first.quantity > 1 ? `${first.name} ×${first.quantity}` : first.name;
  return rest.length === 0 ? name : `${name} + ${rest.length} more`;
}

// Newest first: what an admin usually wants to see first
export function newestFirst(orders) {
  return [...orders].sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
}

// ===== Sorting =====
// The order statuses go through, from new to finished. Sorting by status
// follows this, not the alphabet ("cancelled" before "delivered" would
// mean nothing).
export const STATUS_ORDER = ["processing", "shipped", "delivered", "refunded", "cancelled"];

// "ORD-10042" -> 10042, so ORD-9999 would come before ORD-10000
// (as text, "ORD-1..." sorts before "ORD-9...")
const orderNumber = (order) => Number(order.id.replace(/\D/g, ""));

// One compare function per column, all in ASCENDING order (a before b)
const COMPARE = {
  id: (a, b) => orderNumber(a) - orderNumber(b),
  date: (a, b) => a.time - b.time,
  customer: (a, b) => a.customer.name.localeCompare(b.customer.name),
  status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  total: (a, b) => a.totalCents - b.totalCents,
};

export const SORT_KEYS = Object.keys(COMPARE);
export const DEFAULT_SORT = { key: "date", direction: "descending" };

// A new, sorted list. sort: { key, direction: "ascending" | "descending" }.
// Ties are broken by date (newest first) and then order number, so the
// order is always the same, which matters once there are pages.
export function sortOrders(orders, sort) {
  const compare = COMPARE[sort.key] ?? COMPARE.date;
  const flip = sort.direction === "descending" ? -1 : 1;
  return [...orders].sort(
    (a, b) => flip * compare(a, b) || b.time - a.time || orderNumber(a) - orderNumber(b)
  );
}

// What clicking a column heading does:
// - the column already sorted: flip the direction
// - another column: sort by it, in the direction people usually want first
//   (biggest totals and newest dates first, names A to Z)
export function nextSort(current, key) {
  if (current.key === key) {
    return { key, direction: current.direction === "ascending" ? "descending" : "ascending" };
  }
  const startsDescending = key === "date" || key === "total";
  return { key, direction: startsDescending ? "descending" : "ascending" };
}

// ?sort=total&dir=ascending in the URL -> a sort; anything odd -> the default
export function parseSort(search) {
  const params = new URLSearchParams(search);
  const key = params.get("sort");
  const direction = params.get("dir");
  if (!SORT_KEYS.includes(key) || !["ascending", "descending"].includes(direction)) {
    return DEFAULT_SORT;
  }
  return { key, direction };
}
