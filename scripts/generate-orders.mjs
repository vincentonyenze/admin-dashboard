// Generates a year of realistic shop orders from data/products.json and
// writes them to data/orders.json.   Run it with:  npm run generate
//
// It's "seeded": it uses its own repeatable random numbers, so running it
// again produces exactly the same file. That keeps the dashboard's numbers
// stable, and lets tests rely on them.
//
// The year is fixed (October 2025 to September 2026) instead of "the last
// 12 months from today", so the data doesn't depend on the computer's clock.
import { readFileSync, writeFileSync } from "node:fs";

// ===== Repeatable randomness (mulberry32, as in the typing test) =====
let seed = 13;
function random() {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => min + Math.floor(random() * (max - min + 1));

// ===== Settings =====
export const START = Date.UTC(2025, 9, 1); // 1 October 2025
export const END = Date.UTC(2026, 8, 30, 23, 59, 59); // 30 September 2026
const DAY = 24 * 60 * 60 * 1000;

const SHIPPING_CENTS = 599;
const FREE_SHIPPING_FROM_CENTS = 5000;
const TAX_RATE = 0.08;

const FIRST_NAMES = [
  "Amara", "Liam", "Chidi", "Sofia", "Kwame", "Mia", "Tunde", "Emma", "Yusuf", "Olivia",
  "Zainab", "Noah", "Ifeoma", "Lucas", "Fatima", "Ethan", "Ngozi", "Ava", "Kofi", "Isla",
  "Aisha", "Leo", "Chioma", "Grace", "Emeka", "Hannah", "Sade", "Daniel", "Musa", "Chloe",
];
const LAST_NAMES = [
  "Okafor", "Smith", "Mensah", "Garcia", "Adeyemi", "Brown", "Nwosu", "Wilson", "Bello",
  "Taylor", "Eze", "Martin", "Danjuma", "Clark", "Owusu", "Lewis", "Obi", "Walker", "Abubakar",
  "Hall", "Ibrahim", "Young", "Okeke", "King", "Afolabi", "Wright",
];

// ===== Customers =====
// 320 regular customers, some of whom order many times
const customers = Array.from({ length: 320 }, (_, i) => {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  return {
    id: `C${String(i + 1).padStart(4, "0")}`,
    name: `${first} ${last}`,
    // example.com is reserved for examples: these can never reach a real person
    email: `${first}.${last}${i + 1}`.toLowerCase() + "@example.com",
  };
});

// ===== Products =====
const { products } = JSON.parse(readFileSync("data/products.json", "utf8"));
// Cheaper things sell more often, so each product's chance is weighted by
// its price. Vehicles are made much rarer still: one $30,000 car would
// otherwise outweigh a thousand small orders and swamp the monthly charts.
const weights = products.map(
  (p) => (1 / Math.pow(p.priceCents, 0.85)) * (p.category === "vehicles" ? 0.01 : 1)
);
const totalWeight = weights.reduce((a, b) => a + b, 0);
function pickProduct() {
  let r = random() * totalWeight;
  for (let i = 0; i < products.length; i++) {
    r -= weights[i];
    if (r <= 0) return products[i];
  }
  return products.at(-1);
}

const finalPrice = (p) => Math.round((p.priceCents * (100 - p.discountPercent)) / 100);

// ===== How busy each day is =====
// A shop that's slowly growing, busier at weekends, with a big November
// (Black Friday) and December (holidays), and a quiet January
function ordersOnDay(time) {
  const date = new Date(time);
  const monthsIn = (time - START) / (30 * DAY);
  let expected = 3 + monthsIn * 0.35; // growth
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) expected *= 1.35;
  const month = date.getUTCMonth();
  if (month === 10) expected *= 1.6;
  if (month === 11) expected *= 1.8;
  if (month === 0) expected *= 0.75;
  // Black Friday 2025: 28 November
  if (date.getUTCMonth() === 10 && date.getUTCDate() === 28) expected *= 3;
  // Randomness either side
  return Math.max(0, Math.round(expected * (0.6 + random() * 0.8)));
}

// ===== Order status depends on how old the order is =====
function statusFor(createdAt) {
  const daysOld = (END - createdAt) / DAY;
  const r = random();
  if (r < 0.04) return "cancelled";
  if (r < 0.08 && daysOld > 7) return "refunded";
  if (daysOld < 2) return "processing";
  if (daysOld < 6) return random() < 0.7 ? "shipped" : "delivered";
  return "delivered";
}

// ===== Make the orders =====
const orders = [];
let number = 10001;

for (let day = START; day <= END; day += DAY) {
  const count = ordersOnDay(day);
  for (let n = 0; n < count; n++) {
    // A time during the day, mostly afternoons and evenings
    const hour = Math.min(23, Math.floor(8 + random() * 16 * (0.7 + random() * 0.3)));
    const createdAt = day + hour * 60 * 60 * 1000 + between(0, 59) * 60 * 1000;

    const lineCount = random() < 0.55 ? 1 : random() < 0.7 ? 2 : between(3, 4);
    const items = [];
    for (let i = 0; i < lineCount; i++) {
      const product = pickProduct();
      if (items.some((item) => item.productId === product.id)) continue;
      items.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        // Nobody buys three laptops at once; cheap things sometimes come in twos and threes
        quantity: product.priceCents > 20000 || random() < 0.8 ? 1 : between(2, 3),
        unitCents: finalPrice(product),
      });
    }

    const subtotalCents = items.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
    const shippingCents = subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS;
    const taxCents = Math.round(subtotalCents * TAX_RATE);

    orders.push({
      id: `ORD-${number++}`,
      customer: pick(customers),
      createdAt: new Date(createdAt).toISOString(),
      status: statusFor(createdAt),
      items,
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents: subtotalCents + shippingCents + taxCents,
    });
  }
}

writeFileSync(
  "data/orders.json",
  JSON.stringify({ generatedFor: { from: new Date(START).toISOString(), to: new Date(END).toISOString() }, orders }) + "\n"
);

const revenue = orders.reduce((sum, o) => sum + o.totalCents, 0);
console.log(`Wrote ${orders.length} orders, revenue $${(revenue / 100).toLocaleString("en-US")}`);
