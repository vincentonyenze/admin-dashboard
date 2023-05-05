import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  unitCount,
  itemsSummary,
  newestFirst,
  sortOrders,
  nextSort,
  parseSort,
  DEFAULT_SORT,
  filterOrders,
  orderDetails,
} from "../js/orders.js";

const item = (name, quantity = 1) => ({ name, quantity, unitCents: 100, category: "x" });

describe("unitCount", () => {
  test("adds up the quantities", () => {
    assert.equal(unitCount({ items: [item("Mug", 2), item("Lamp")] }), 3);
  });
});

describe("itemsSummary", () => {
  test("one product: just its name", () => {
    assert.equal(itemsSummary({ items: [item("Red Lipstick")] }), "Red Lipstick");
  });

  test("more than one of it: with the quantity", () => {
    assert.equal(itemsSummary({ items: [item("Red Lipstick", 2)] }), "Red Lipstick ×2");
  });

  test("several products: the first and how many more", () => {
    assert.equal(
      itemsSummary({ items: [item("Red Lipstick"), item("Mug"), item("Lamp")] }),
      "Red Lipstick + 2 more"
    );
  });

  test("no items doesn't break", () => {
    assert.equal(itemsSummary({ items: [] }), "No items");
  });
});

describe("newestFirst", () => {
  test("puts the newest order first", () => {
    const orders = [{ id: "a", time: 1 }, { id: "b", time: 3 }, { id: "c", time: 2 }];
    assert.deepEqual(newestFirst(orders).map((o) => o.id), ["b", "c", "a"]);
  });

  test("doesn't change the list it was given", () => {
    const orders = [{ id: "a", time: 1 }, { id: "b", time: 3 }];
    newestFirst(orders);
    assert.deepEqual(orders.map((o) => o.id), ["a", "b"]);
  });
});

describe("sortOrders", () => {
  const order = (id, time, name, status, totalCents) => ({
    id,
    time,
    customer: { name },
    status,
    totalCents,
    items: [],
  });
  const orders = [
    order("ORD-9999", 300, "Zainab", "delivered", 500),
    order("ORD-10001", 100, "Amara", "cancelled", 2500),
    order("ORD-10002", 200, "Kofi", "processing", 1000),
  ];
  const ids = (list) => list.map((o) => o.id);

  test("by order number, as numbers not text", () => {
    assert.deepEqual(ids(sortOrders(orders, { key: "id", direction: "ascending" })), [
      "ORD-9999",
      "ORD-10001",
      "ORD-10002",
    ]);
  });

  test("by date, newest first", () => {
    assert.deepEqual(ids(sortOrders(orders, { key: "date", direction: "descending" })), [
      "ORD-9999",
      "ORD-10002",
      "ORD-10001",
    ]);
  });

  test("by customer, A to Z", () => {
    assert.deepEqual(
      sortOrders(orders, { key: "customer", direction: "ascending" }).map((o) => o.customer.name),
      ["Amara", "Kofi", "Zainab"]
    );
  });

  test("by status, in the order an order goes through, not alphabetical", () => {
    assert.deepEqual(
      sortOrders(orders, { key: "status", direction: "ascending" }).map((o) => o.status),
      ["processing", "delivered", "cancelled"]
    );
  });

  test("by total, biggest first", () => {
    assert.deepEqual(
      sortOrders(orders, { key: "total", direction: "descending" }).map((o) => o.totalCents),
      [2500, 1000, 500]
    );
  });

  test("ties are broken newest first, so the order never changes", () => {
    const tied = [order("ORD-1", 1, "A", "delivered", 100), order("ORD-2", 2, "B", "delivered", 100)];
    assert.deepEqual(ids(sortOrders(tied, { key: "total", direction: "ascending" })), ["ORD-2", "ORD-1"]);
  });

  test("doesn't change the list it was given", () => {
    sortOrders(orders, { key: "total", direction: "ascending" });
    assert.equal(orders[0].id, "ORD-9999");
  });
});

describe("nextSort", () => {
  test("clicking the sorted column flips its direction", () => {
    assert.deepEqual(nextSort({ key: "total", direction: "descending" }, "total"), {
      key: "total",
      direction: "ascending",
    });
  });

  test("a new column starts in its natural direction", () => {
    assert.equal(nextSort(DEFAULT_SORT, "total").direction, "descending");
    assert.equal(nextSort(DEFAULT_SORT, "customer").direction, "ascending");
  });
});

describe("parseSort", () => {
  test("reads the sort from the URL", () => {
    assert.deepEqual(parseSort("?sort=total&dir=ascending"), { key: "total", direction: "ascending" });
  });

  test("falls back to newest first for anything odd", () => {
    assert.deepEqual(parseSort("?sort=price&dir=up"), DEFAULT_SORT);
    assert.deepEqual(parseSort(""), DEFAULT_SORT);
  });
});

describe("filterOrders", () => {
  const order = (id, name, email, status) => ({ id, customer: { name, email }, status, items: [] });
  const orders = [
    order("ORD-12149", "Amara Okafor", "amara.okafor1@example.com", "delivered"),
    order("ORD-12150", "Amara Smith", "amara.smith2@example.com", "refunded"),
    order("ORD-12151", "Kofi Mensah", "kofi.mensah3@example.com", "refunded"),
  ];
  const ids = (list) => list.map((o) => o.id);

  test("no filters: everything", () => {
    assert.equal(filterOrders(orders, {}).length, 3);
  });

  test("finds an order by its number, even without ORD-", () => {
    assert.deepEqual(ids(filterOrders(orders, { search: "12149" })), ["ORD-12149"]);
  });

  test("finds a customer by name, ignoring capitals", () => {
    assert.deepEqual(ids(filterOrders(orders, { search: "AMARA" })), ["ORD-12149", "ORD-12150"]);
  });

  test("needs every word: first and last name together", () => {
    assert.deepEqual(ids(filterOrders(orders, { search: "amara okafor" })), ["ORD-12149"]);
  });

  test("finds an email", () => {
    assert.deepEqual(ids(filterOrders(orders, { search: "kofi.mensah" })), ["ORD-12151"]);
  });

  test("filters by status", () => {
    assert.deepEqual(ids(filterOrders(orders, { status: "refunded" })), ["ORD-12150", "ORD-12151"]);
  });

  test("search and status together", () => {
    assert.deepEqual(ids(filterOrders(orders, { search: "amara", status: "refunded" })), ["ORD-12150"]);
  });

  test("ignores extra spaces", () => {
    assert.equal(filterOrders(orders, { search: "   " }).length, 3);
  });
});

describe("orderDetails", () => {
  // The same rule as metrics.js: these statuses brought money in
  const isPaid = (o) => ["processing", "shipped", "delivered"].includes(o.status);
  const customer = (id) => ({ id, name: `Customer ${id}`, email: `${id}@example.com` });
  const products = new Map([[7, { id: 7, image: "images/products/7.webp" }]]);

  const order = {
    id: "ORD-1",
    customer: customer("C1"),
    status: "delivered",
    totalCents: 3000,
    items: [
      { productId: 7, name: "Lipstick", quantity: 2, unitCents: 1000 },
      { productId: 99, name: "Old product", quantity: 1, unitCents: 500 },
    ],
  };
  const others = [
    order,
    { id: "ORD-2", customer: customer("C1"), status: "delivered", totalCents: 2000, items: [] },
    { id: "ORD-3", customer: customer("C1"), status: "refunded", totalCents: 9999, items: [] },
    { id: "ORD-4", customer: customer("C2"), status: "delivered", totalCents: 5000, items: [] },
  ];
  const details = orderDetails(order, products, others, isPaid);

  test("each line has its quantity and line total", () => {
    assert.deepEqual(
      details.lines.map((line) => [line.name, line.quantity, line.lineCents]),
      [["Lipstick", 2, 2000], ["Old product", 1, 500]]
    );
  });

  test("finds the product's photo, or null if the product is gone", () => {
    assert.equal(details.lines[0].image, "images/products/7.webp");
    assert.equal(details.lines[1].image, null);
  });

  test("counts every order this customer placed", () => {
    assert.equal(details.customerOrderCount, 3);
  });

  test("their spending only counts paid orders", () => {
    assert.equal(details.customerSpentCents, 5000);
  });
});
