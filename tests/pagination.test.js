// Copied from Project 11 (the Product Catalog) along with the functions
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { paginate, pageNumbers } from "../js/pagination.js";

describe("paginate", () => {
  const items = Array.from({ length: 30 }, (_, i) => i + 1); // 1..30

  test("gives the first page", () => {
    const page = paginate(items, 1, 12);
    assert.deepEqual(page.items, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.equal(page.totalPages, 3);
    assert.equal(page.from, 1);
    assert.equal(page.to, 12);
  });

  test("gives a middle page", () => {
    const page = paginate(items, 2, 12);
    assert.equal(page.items[0], 13);
    assert.equal(page.from, 13);
    assert.equal(page.to, 24);
  });

  test("the last page can be shorter", () => {
    const page = paginate(items, 3, 12);
    assert.deepEqual(page.items, [25, 26, 27, 28, 29, 30]);
    assert.equal(page.to, 30);
  });

  test("moves a page number that's too big to the last page", () => {
    assert.equal(paginate(items, 9, 12).page, 3);
  });

  test("moves a page number that's too small, or not a number, to page 1", () => {
    assert.equal(paginate(items, 0, 12).page, 1);
    assert.equal(paginate(items, -4, 12).page, 1);
    assert.equal(paginate(items, NaN, 12).page, 1);
  });

  test("an empty list still has 1 page, showing 0–0", () => {
    const page = paginate([], 1, 12);
    assert.equal(page.totalPages, 1);
    assert.deepEqual(page.items, []);
    assert.equal(page.from, 0);
    assert.equal(page.to, 0);
  });

  test("an exact multiple doesn't make an empty extra page", () => {
    assert.equal(paginate(items.slice(0, 24), 1, 12).totalPages, 2);
  });
});

describe("pageNumbers", () => {
  test("shows every page when there are 7 or fewer", () => {
    assert.deepEqual(pageNumbers(1, 1), [1]);
    assert.deepEqual(pageNumbers(3, 7), [1, 2, 3, 4, 5, 6, 7]);
  });

  test("near the start", () => {
    assert.deepEqual(pageNumbers(1, 10), [1, 2, 3, 4, 5, "…", 10]);
    assert.deepEqual(pageNumbers(4, 10), [1, 2, 3, 4, 5, "…", 10]);
  });

  test("in the middle", () => {
    assert.deepEqual(pageNumbers(5, 10), [1, "…", 4, 5, 6, "…", 10]);
  });

  test("near the end", () => {
    assert.deepEqual(pageNumbers(10, 10), [1, "…", 6, 7, 8, 9, 10]);
    assert.deepEqual(pageNumbers(7, 10), [1, "…", 6, 7, 8, 9, 10]);
  });

  test("always includes the current page, the first and the last", () => {
    for (let current = 1; current <= 20; current++) {
      const pages = pageNumbers(current, 20);
      assert.ok(pages.includes(current), `page ${current} is missing: ${pages}`);
      assert.equal(pages[0], 1);
      assert.equal(pages.at(-1), 20);
    }
  });

  test("always shows 7 items once there are more than 7 pages", () => {
    for (let current = 1; current <= 20; current++) {
      assert.equal(pageNumbers(current, 20).length, 7);
    }
  });
});
