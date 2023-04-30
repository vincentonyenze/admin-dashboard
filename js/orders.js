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
