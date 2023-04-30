import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { unitCount, itemsSummary, newestFirst } from "../js/orders.js";

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
