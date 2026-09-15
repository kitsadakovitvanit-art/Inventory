// In dev, VITE_API_URL is unset and requests go to the relative "/api" path,
// which Vite's dev server proxies to the local backend (see vite.config.js).
// In production, set VITE_API_URL to your deployed backend's URL, e.g.
// https://your-backend.onrender.com
<<<<<<< HEAD
export const API_ROOT = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
=======
const API_ROOT = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
>>>>>>> f9ccc0d289b7bc5ca12fefe348e752eabaf795b5
const BASE = `${API_ROOT}/api`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  // Products
  listProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  getProductByBarcode: (barcode) => request(`/products/barcode/${barcode}`),
  createProduct: (body) => request("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  adjustStock: (id, body) => request(`/products/${id}/stock`, { method: "POST", body: JSON.stringify(body) }),
  getMovements: (id) => request(`/products/${id}/movements`),
  lowStock: () => request("/products/alerts/low-stock"),

  // Suppliers
  listSuppliers: () => request("/suppliers"),
  getSupplier: (id) => request(`/suppliers/${id}`),
  createSupplier: (body) => request("/suppliers", { method: "POST", body: JSON.stringify(body) }),
  updateSupplier: (id, body) => request(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: "DELETE" }),

  // Purchase orders
  listPurchaseOrders: () => request("/purchase-orders"),
  getPurchaseOrder: (id) => request(`/purchase-orders/${id}`),
  createPurchaseOrder: (body) => request("/purchase-orders", { method: "POST", body: JSON.stringify(body) }),
  updatePurchaseOrder: (id, body) => request(`/purchase-orders/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  receivePurchaseOrder: (id) => request(`/purchase-orders/${id}/receive`, { method: "POST" }),
  deletePurchaseOrder: (id) => request(`/purchase-orders/${id}`, { method: "DELETE" })
};
