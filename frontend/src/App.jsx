import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import PurchaseOrders from "./pages/PurchaseOrders.jsx";
import Reports from "./pages/Reports.jsx";
import { socket } from "./socket.js";

export default function App() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleLowStock = (product) => {
      setToast(`${product.name} is low on stock — ${product.quantity} left`);
    };
    socket.on("alert:low-stock", handleLowStock);
    return () => socket.off("alert:low-stock", handleLowStock);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
      {toast && (
        <div className="toast">
          <strong>Low stock. </strong>
          {toast}
        </div>
      )}
    </div>
  );
}
