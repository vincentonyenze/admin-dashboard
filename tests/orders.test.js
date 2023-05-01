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
