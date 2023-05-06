// Product lists for the dashboard: the best sellers, and what's running
// out. Pure functions, tested in tests/products.test.js.
import { isPaid } from "./metrics.js";

// Fewer than this many left counts as "low stock"
export const LOW_STOCK_AT = 5;

// How many of each product were sold in paid orders, and for how much:
//   Map(productId -> { unitsSold, salesCents })
export function productSales(orders) {
  const sales = new Map();
  for (const order of orders) {
    if (!isPaid(order)) continue;
    for (const item of order.items) {
      const entry = sales.get(item.productId) ?? { unitsSold: 0, salesCents: 0 };
      entry.unitsSold += item.quantity;
      entry.salesCents += item.unitCents * item.quantity;
      sales.set(item.productId, entry);
    }
  }
  return sales;
}

// The `limit` products that brought in the most money:
//   [{ product, unitsSold, salesCents }, ...]
// A product that's no longer in the shop still counts (its sales really
// happened); it gets a stand-in with the name from the order.
export function topProducts(orders, productsById, limit = 5) {
  const sales = productSales(orders);
  const names = new Map();
  for (const order of orders) {
    for (const item of order.items) names.set(item.productId, item.name);
  }

  return [...sales]
    .map(([productId, totals]) => ({
      product: productsById.get(productId) ?? { id: productId, name: names.get(productId), image: null },
      ...totals,
    }))
    // Most money first; then most units; then A to Z, so it never shuffles
    .sort(
      (a, b) =>
        b.salesCents - a.salesCents ||
        b.unitsSold - a.unitsSold ||
        a.product.name.localeCompare(b.product.name)
    )
    .slice(0, limit);
}

// Products at or below LOW_STOCK_AT, most urgent first (sold out at the
// top), each with how many sold in the period, so you can see which ones
// will run out soonest:   [{ product, unitsSold }, ...]
export function lowStock(products, orders) {
  const sales = productSales(orders);
  return products
    .filter((product) => product.stock <= LOW_STOCK_AT)
    .map((product) => ({ product, unitsSold: sales.get(product.id)?.unitsSold ?? 0 }))
    .sort(
      (a, b) =>
        a.product.stock - b.product.stock ||
        b.unitsSold - a.unitsSold ||
        a.product.name.localeCompare(b.product.name)
    );
}
