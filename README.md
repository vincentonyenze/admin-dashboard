# Admin Dashboard

The back office for a small online shop: key numbers with trends, **charts drawn by hand in SVG**, top products and low stock, and a **searchable, sortable, paginated orders table**. Built with plain HTML, CSS and JavaScript (no frameworks, no chart library) and covered by **127 automated tests**.

This is **Project 13** in my beginner-to-expert web development roadmap, and the last project of Level 2. It's the admin side of [Project 12, the Shopping Cart](https://github.com/vincentonyenze/shopping-cart), using the same products.

<!-- Add a screenshot: save one as screenshot.png in this folder and uncomment the line below -->
<!-- ![Admin dashboard screenshot](screenshot.png) -->

## Features

### The numbers
- **Date ranges**: last 7 days, 30 days, 90 days or 12 months, kept in the URL
- **Stat cards**: revenue, orders, average order and refunds & cancellations
- **Compared with the period before** (*▲ 12.5% vs previous 30 days*), in green for good news and red for bad, and only when the data fully covers that earlier period
- **Sparklines**: a tiny trend line on every card

### Charts (no chart library)
- **Revenue over time**: daily, weekly or monthly depending on the range, with round-number axes
- A **tooltip** that follows the mouse, and works with the **keyboard** too (Tab to the chart, then ← → Home End)
- **Sales by category**: a horizontal bar chart
- Every chart also has a **one-sentence summary** for screen readers and a **"Show as a table"** with the exact numbers

### Products
- **Top products** by revenue in the period, with photos
- **Low stock**: sold out first, each with how many sold in the period, so you can see what to re-order

### Orders
- Search by **order number, customer or email**, and filter by **status**
- **Sort** by any column (status sorts by an order's journey, not alphabetically)
- **Pages** of 15, with *"Showing 16–30 of 236 matching orders (2,256 in total)"*
- Search, filter, sort and page are all **kept in the URL**
- **Order details** dialog: items with photos, totals, and the customer's history

### Everywhere
- Works on **phones**: the sidebar becomes a menu, and the table becomes cards
- **Keyboard and screen-reader friendly**: skip link, labelled controls, `aria-sort`, focus management, announcements
- **Light and dark** themes, following your system

## How the numbers are defined

These are written at the top of `js/metrics.js`, and each one has tests:

| Number | Definition |
|---|---|
| **Revenue** | Order totals of **paid** orders (processing, shipped, delivered). Refunded and cancelled orders brought in nothing. |
| **Orders** | Every order placed, including ones later cancelled |
| **Average order** | Revenue ÷ paid orders |
| **Refunds & cancellations** | Refunded + cancelled, out of all orders. Its change is shown in **percentage points** (7.0% → 8.5% is *+1.5 pts*). |
| **Sales by category** | Price × quantity of products in paid orders, so **before shipping and tax**. That's why the categories add up to less than revenue. |

- **"Today" is the newest order**, not the computer's clock, so the dashboard works the same on any date.
- Ranges include their start but not their end, so periods side by side never count the same moment twice.
- Dates are shown in **UTC**, the time zone the data is stored in, so day totals always match.

## The data

`data/orders.json` holds **2,256 orders** for a fixed year (October 2025 to September 2026), made by `scripts/generate-orders.mjs` from the shop's 194 products. The script is **seeded**, so it creates exactly the same file every time:

```bash
npm run generate
```

It's shaped to look like a real, growing shop: busier at weekends, a big November and December, a quiet January, and mostly small orders with the occasional big one. Customer emails use `@example.com`, a domain reserved for examples.

## Built with

- HTML5 (`<dialog>`, `<details>`, `<dl>`, `aria-sort`, `aria-current`, `aria-live`, `inert`)
- CSS3 (Grid with `grid-template-areas`, `auto-fit`, sticky sidebar and top bar, a table that becomes cards on phones, `scroll-margin-top`)
- Vanilla JavaScript (ES6+) in ES modules
- SVG charts built with `createElementNS`
- `Intl.NumberFormat` and `Intl.DateTimeFormat`, `IntersectionObserver`, `matchMedia`, `URLSearchParams`, `history.replaceState`
- **Node's built-in test runner** (`node --test`)

## What I learned

- **Defining metrics** before calculating them, and why two "revenue" numbers can both be right
- **Date ranges**, comparing with the previous period, and **percent vs percentage points**
- **Grouping data** into days, weeks and months (aggregation)
- **Drawing charts by hand:** scales, "nice" axis numbers, SVG paths, horizontal bars, sparklines
- **Making charts accessible:** keyboard exploration, live announcements, summaries and data tables
- **Sorting** by meaning (an order's journey), numbers hidden in text, and tie-breakers
- **A list pipeline:** range → search/filter → sort → one page
- **Reusing tested code** from an earlier project (pagination)
- **Components without a framework:** one `productRow()` for two lists
- **Responsive tables** that become cards, and a sidebar that becomes a menu
- **Debugging focus:** why an animated `visibility` stopped focus from moving into the menu
- **Generating realistic, repeatable test data** with a seeded script

## How to run

1. Clone the repository:
   ```bash
   git clone https://github.com/vincentonyenze/admin-dashboard.git
   cd admin-dashboard
   ```
2. Open the folder in VS Code and start **Live Server** (right-click `index.html` → *Open with Live Server*).

A local server is needed because browsers block ES modules, and `fetch()` of local files, on pages opened straight from a file (`file://`).

## Running the tests

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm test             # run all tests once
npm run test:watch   # re-run them every time a file is saved
```

| File | Tests | Covers |
|---|---|---|
| `tests/orders.test.js` | 30 | describing orders, sorting, search & status filter, order details |
| `tests/ranges.test.js` | 16 | date ranges, the previous period, % change, good/bad news, URL ranges |
| `tests/pagination.test.js` | 13 | pages and page buttons (from Project 11) |
| `tests/line-chart.test.js` | 12 | nice axis numbers, labels, line chart geometry |
| `tests/bar-chart.test.js` | 10 | sales by category, bar sizes |
| `tests/metrics.test.js` | 10 | revenue, orders, average order, refund rate |
| `tests/chart-focus.test.js` | 8 | nearest point to the mouse, keyboard moves |
| `tests/products.test.js` | 8 | top products, low stock |
| `tests/series.test.js` | 8 | days / weeks / months buckets |
| `tests/format.test.js` | 7 | money, percentages, dates in UTC |
| `tests/sparkline.test.js` | 5 | sparkline shapes |

## Project structure

```
admin-dashboard/
├── index.html              # Sidebar, top bar, cards, charts, lists, table, dialog
├── style.css               # Dashboard grid, cards, charts, table, phones, themes
├── package.json            # npm scripts: test, generate
├── scripts/
│   └── generate-orders.mjs # Makes data/orders.json (seeded, repeatable)
├── data/
│   ├── products.json       # 194 products (from the shop)
│   └── orders.json         # 2,256 generated orders
├── images/products/        # Product photos
├── js/
│   ├── main.js             # Connects everything: range, render, table state, menu, URL
│   ├── metrics.js          # The numbers and their definitions, sales by category
│   ├── ranges.js           # Date ranges and comparing with the period before
│   ├── series.js           # Splitting a range into days, weeks or months
│   ├── line-chart.js       # Line chart maths and drawing
│   ├── chart-focus.js      # Tooltip, mouse and keyboard for the line chart
│   ├── bar-chart.js        # Bar chart maths and drawing
│   ├── sparkline.js        # Sparklines
│   ├── orders.js           # Order summaries, search, filter, sort, details
│   ├── products.js         # Top products and low stock
│   ├── pagination.js       # Pages (from Project 11)
│   ├── format.js           # Money, numbers and dates for display
│   ├── api.js              # Loading the data
│   ├── ui.js               # Drawing everything on the page
│   └── utils.js            # debounce
├── tests/                  # Automated tests (node --test)
└── README.md
```

## Known limitations

- The data is generated and fixed: nothing updates live, and stock doesn't change as orders come in.
- Everything is calculated in the browser. With millions of orders, a server would do the maths and send only the results.
- The sidebar links jump within one page; there are no separate pages for products or customers yet.
- No login: in a real shop, an admin dashboard must be protected (Level 4 of my roadmap covers authentication).

## Possible improvements

- Compare two ranges side by side on the chart (this period vs last)
- Export the orders table as CSV
- Change an order's status from the details dialog (needs a backend)
- Rebuild in React with a chart library, and compare the two approaches (Level 3)
