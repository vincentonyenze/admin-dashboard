import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { barGeometry, ROW_HEIGHT } from "../js/bar-chart.js";
import { salesByCategory } from "../js/metrics.js";

const categories = [
  { slug: "books", name: "Books" },
  { slug: "shoes", name: "Shoes" },
  { slug: "toys", name: "Toys" },
];

const order = (status, items) => ({ status, totalCents: 0, items });
const item = (category, unitCents, quantity = 1) => ({ category, unitCents, quantity });

describe("salesByCategory", () => {
  const orders = [
    order("delivered", [item("shoes", 3000), item("books", 1000, 2)]),
    order("shipped", [item("shoes", 2000)]),
    order("refunded", [item("books", 9999)]), // brought in nothing
  ];
  const rows = salesByCategory(orders, categories);

  test("adds up price × quantity for paid orders only", () => {
    const shoes = rows.find((row) => row.slug === "shoes");
    const books = rows.find((row) => row.slug === "books");
    assert.equal(shoes.salesCents, 5000);
    assert.equal(books.salesCents, 2000);
  });

  test("puts the biggest category first", () => {
    assert.deepEqual(rows.map((row) => row.slug), ["shoes", "books", "toys"]);
  });

  test("lists a category with no sales instead of leaving it out", () => {
    assert.equal(rows.at(-1).slug, "toys");
    assert.equal(rows.at(-1).salesCents, 0);
  });

  test("the shares add up to the whole", () => {
    const total = rows.reduce((sum, row) => sum + row.share, 0);
    assert.ok(Math.abs(total - 1) < 1e-12);
    assert.equal(rows[0].share, 5000 / 7000);
  });

  test("uses the category's name", () => {
    assert.equal(rows[0].name, "Shoes");
  });

  test("no sales at all: every share is 0, not NaN", () => {
    const empty = salesByCategory([], categories);
    assert.ok(empty.every((row) => row.share === 0));
  });
});

describe("barGeometry", () => {
  const rows = [
    { label: "Shoes", value: 500, valueLabel: "$5" },
    { label: "Books", value: 250, valueLabel: "$2.50" },
    { label: "Toys", value: 0, valueLabel: "$0" },
  ];
  const g = barGeometry(rows, 300);

  test("the biggest bar fills the whole width", () => {
    assert.equal(g.bars[0].width, 300);
  });

  test("the others are in proportion", () => {
    assert.equal(g.bars[1].width, 150);
    assert.equal(g.bars[2].width, 0);
  });

  test("one row per bar, top to bottom", () => {
    assert.equal(g.height, 3 * ROW_HEIGHT);
    assert.ok(g.bars[0].barY < g.bars[1].barY);
  });

  test("all zeros: no bars, and no dividing by zero", () => {
    const zeros = barGeometry([{ label: "A", value: 0 }], 300);
    assert.equal(zeros.bars[0].width, 0);
  });
});
