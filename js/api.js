// Loading the dashboard's data. Local files today; in Level 4 these become
// requests to a real server, and only this file has to change.

export class DataError extends Error {
  name = "DataError";
}

async function loadJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new DataError("Couldn't load the dashboard data. Check your connection and try again.");
  }
  if (!response.ok) throw new DataError(`Couldn't load ${url} (error ${response.status}).`);
  try {
    return await response.json();
  } catch {
    throw new DataError(`${url} is damaged.`);
  }
}

// Both files at the same time: Promise.all starts them together and waits
// for both, instead of loading one and then the other
export async function loadDashboardData() {
  const [productData, orderData] = await Promise.all([
    loadJson("data/products.json"),
    loadJson("data/orders.json"),
  ]);

  if (!Array.isArray(productData?.products) || !Array.isArray(orderData?.orders)) {
    throw new DataError("The dashboard data is damaged.");
  }
  return {
    products: productData.products,
    categories: productData.categories,
    orders: orderData.orders,
  };
}
