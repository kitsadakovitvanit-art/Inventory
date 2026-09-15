import { Fragment, useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { socket } from "../socket.js";
import Modal from "../components/Modal.jsx";
import POForm from "../components/POForm.jsx";

const STATUS_META = {
  draft: { dot: "neutral", label: "Draft" },
  ordered: { dot: "warn", label: "Ordered" },
  received: { dot: "ok", label: "Received" },
  cancelled: { dot: "danger", label: "Cancelled" }
};

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    const [poList, supplierList, productList] = await Promise.all([
      api.listPurchaseOrders(),
      api.listSuppliers(),
      api.listProducts()
    ]);
    setOrders(poList);
    setSuppliers(supplierList);
    setProducts(productList);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refresh = () => load();
    socket.on("po:created", refresh);
    socket.on("po:updated", refresh);
    socket.on("po:deleted", refresh);
    return () => {
      socket.off("po:created", refresh);
      socket.off("po:updated", refresh);
      socket.off("po:deleted", refresh);
    };
  }, [load]);

  const handleCreate = async (data) => {
    await api.createPurchaseOrder(data);
    setShowForm(false);
    load();
  };

  const handleReceive = async (po) => {
    if (!confirm(`Mark ${po.po_number} as received? This adds its items to stock.`)) return;
    await api.receivePurchaseOrder(po.id);
    load();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Purchase Orders</h1>
          <p>Create orders with suppliers and receive stock when it arrives.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} disabled={!suppliers.length || !products.length}>
          Create purchase order
        </button>
      </div>

      <div className="panel">
        <div className="panel-body">
          {loading ? (
            <p className="empty-state">Loading purchase orders…</p>
          ) : orders.length === 0 ? (
            <p className="empty-state">No purchase orders yet.</p>
          ) : (
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Order date</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => {
                  const meta = STATUS_META[po.status] || STATUS_META.draft;
                  const isOpen = expandedId === po.id;
                  return (
                    <Fragment key={po.id}>
                      <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(isOpen ? null : po.id)}>
                        <td className="cell-mono" data-label="PO Number">{po.po_number}</td>
                        <td data-label="Supplier">{po.supplier_name || "—"}</td>
                        <td data-label="Status">
                          <span className="status">
                            <span className={`status-dot ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                        <td data-label="Order date">{new Date(po.order_date).toLocaleDateString()}</td>
                        <td className="cell-mono" data-label="Total">${po.total_amount.toFixed(2)}</td>
                        <td data-label="">
                          <div className="cell-actions">
                            {po.status === "ordered" && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReceive(po);
                                }}
                              >
                                Receive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={6} className="cell-expand" style={{ background: "var(--bg)" }} data-label="">
                            <table className="responsive-table">
                              <thead>
                                <tr>
                                  <th>SKU</th>
                                  <th>Product</th>
                                  <th>Qty</th>
                                  <th>Unit cost</th>
                                  <th>Line total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {po.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="cell-mono" data-label="SKU">{item.sku}</td>
                                    <td data-label="Product">{item.product_name}</td>
                                    <td className="cell-mono" data-label="Qty">{item.quantity}</td>
                                    <td className="cell-mono" data-label="Unit cost">${item.unit_cost.toFixed(2)}</td>
                                    <td className="cell-mono" data-label="Line total">${(item.quantity * item.unit_cost).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {po.notes && <p className="helper-text" style={{ padding: "8px 10px" }}>Notes: {po.notes}</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <Modal title="Create purchase order" onClose={() => setShowForm(false)}>
          <POForm suppliers={suppliers} products={products} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  );
}
