import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../api.js";
import { socket } from "../socket.js";
import StatCard from "../components/StatCard.jsx";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [allProducts, low, pos] = await Promise.all([
      api.listProducts(),
      api.lowStock(),
      api.listPurchaseOrders()
    ]);
    setProducts(allProducts);
    setLowStock(low);
    setPurchaseOrders(pos);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refresh = () => load();
    socket.on("stock:update", refresh);
    socket.on("product:created", refresh);
    socket.on("product:deleted", refresh);
    socket.on("po:created", refresh);
    socket.on("po:updated", refresh);
    return () => {
      socket.off("stock:update", refresh);
      socket.off("product:created", refresh);
      socket.off("product:deleted", refresh);
      socket.off("po:created", refresh);
      socket.off("po:updated", refresh);
    };
  }, [load]);

  if (loading) return <p className="empty-state">Loading dashboard…</p>;

  const totalValue = products.reduce((sum, p) => sum + p.quantity * p.unit_price, 0);
  const pendingOrders = purchaseOrders.filter((po) => po.status === "ordered").length;

  const byCategory = {};
  products.forEach((p) => {
    const cat = p.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + p.quantity;
  });
  const chartData = Object.entries(byCategory).map(([category, quantity]) => ({ category, quantity }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Live view of stock levels, alerts, and incoming orders.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total SKUs" value={products.length} />
        <StatCard label="Stock value" value={`$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <StatCard label="Low stock items" value={lowStock.length} tone={lowStock.length ? "accent" : undefined} />
        <StatCard label="Purchase orders pending" value={pendingOrders} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Stock by category</h2>
        </div>
        <div className="panel-body" style={{ height: 220, paddingTop: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eae5" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: "#5b625e" }} axisLine={{ stroke: "#d9dcd5" }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#5b625e" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f3f4f1" }} />
              <Bar dataKey="quantity" fill="#1f4b43" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Low stock alerts</h2>
          <span className="badge">{lowStock.length}</span>
        </div>
        <div className="panel-body">
          {lowStock.length === 0 ? (
            <p className="empty-state">Everything is above threshold.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Threshold</th>
                  <th>Supplier</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id} className="row-low-stock">
                    <td className="cell-mono">{p.sku}</td>
                    <td>{p.name}</td>
                    <td className="cell-mono">{p.quantity}</td>
                    <td className="cell-mono">{p.low_stock_threshold}</td>
                    <td>{p.supplier_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
