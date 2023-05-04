// Splitting a list into pages. Copied from Project 11 (the Product
// Catalog), where these functions were written and tested; only the page
// size is different. Tested in tests/pagination.test.js.

// 15 rows: enough to scan, short enough to not scroll forever
export const PAGE_SIZE = 15;

// One page of the results, plus what's needed to show "16–30 of 236".
// A page number that's too big or too small (e.g. page 9 after a filter
// left only 2 pages) is moved to the nearest real page.
export function paginate(items, page, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const startIndex = (current - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  return {
    items: pageItems,
    page: current,
    totalPages,
    total: items.length,
    // 1-based positions for people: "Showing 16–30"
    from: pageItems.length > 0 ? startIndex + 1 : 0,
    to: startIndex + pageItems.length,
  };
}

// Which page buttons to show. All of them if there are only a few;
// otherwise the first, the last, and the current page with its neighbours,
// with "…" for the gaps:
//   pageNumbers(1, 10) -> [1, 2, 3, 4, 5, "…", 10]
//   pageNumbers(5, 10) -> [1, "…", 4, 5, 6, "…", 10]
// It always returns the same number of items once there are more than 7
// pages, so the buttons don't jump around as you click through them.
export function pageNumbers(current, totalPages) {
  const MAX_BUTTONS = 7;
  if (totalPages <= MAX_BUTTONS) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Near the start or the end, show 5 in a row instead of 3
  if (current <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
  if (current >= totalPages - 3) {
    return [1, "…", ...Array.from({ length: 5 }, (_, i) => totalPages - 4 + i)];
  }
  return [1, "…", current - 1, current, current + 1, "…", totalPages];
}
