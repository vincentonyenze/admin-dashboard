import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { productSales, topProducts, lowStock, LOW_STOCK_AT } from "../js/products.js";

const product = (id, name, stock = 50) => ({ id, name, stock, image: `images/products/${id}.webp` });
const item = (productId, name, unitCents, quantity = 1) => ({ productId, name, unitCents, quantity, category: "x" });
const order = (status, items) => ({ status, items, totalCents: 0 });

const mug = product(1, "Mug");
const lamp = product(2, "Lamp", 3);
const pen = product(3, "Pen", 0);
const productsById = new Map([mug, lamp, pen].map((p) => [p.id, p]));

const orders = [
  order("delivered", [item(1, "Mug", 1000, 3), item(2, "Lamp", 4000)]),
  order("shipped", [item(1, "Mug", 1000)]),
  order("refunded", [item(3, "Pen", 99999)]), // brought in nothing
  order("delivered", [item(9, "Old Kettle", 2500)]), // no longer in the shop
];

describe("productSales", () => {
  test("adds up units and money from paid orders only", () => {
    const sales = productSales(orders);
    assert.deepEqual(sales.get(1), { unitsSold: 4, salesCents: 4000 });
    assert.equal(sales.has(3), false);
  });
});

describe("topProducts", () => {
  const top = topProducts(orders, productsById, 5);

  test("most money first", () => {
    // Mug $40 (4 units) and Lamp $40 (1 unit) tie on money: more units wins
    assert.deepEqual(top.map((row) => row.product.name), ["Mug", "Lamp", "Old Kettle"]);
  });

  test("keeps a product that's no longer in the shop, with its name from the order", () => {
    const kettle = top.find((row) => row.product.id === 9);
    assert.equal(kettle.product.name, "Old Kettle");
    assert.equal(kettle.product.image, null);
  });

  test("stops at the limit", () => {
    assert.equal(topProducts(orders, productsById, 1).length, 1);
  });

  test("no orders, no top products", () => {
    assert.deepEqual(topProducts([], productsById), []);
  });
});

describe("lowStock", () => {
  const low = lowStock([mug, lamp, pen], orders);

  test(`only lists products with ${LOW_STOCK_AT} or fewer left`, () => {
    assert.deepEqual(low.map((row) => row.product.name), ["Pen", "Lamp"]);
  });

  test("sold-out products come first", () => {
    assert.equal(low[0].product.stock, 0);
  });

  test("says how many sold in the period", () => {
    assert.equal(low.find((row) => row.product.name === "Lamp").unitsSold, 1);
    assert.equal(low.find((row) => row.product.name === "Pen").unitsSold, 0);
  });
});
