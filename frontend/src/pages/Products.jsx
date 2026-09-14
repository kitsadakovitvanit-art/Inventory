import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { socket } from "../socket.js";
import Modal from "../components/Modal.jsx";
import ProductForm from "../components/ProductForm.jsx";
import BarcodeScanner from "../components/BarcodeScanner.jsx";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { found: product|null, code }
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState("");

  const load = useCallback(async (q) => {
    const [productList, supplierList] = await Promise.all([api.listProducts(q ? { q } : {}), api.listSuppliers()]);
    setProducts(productList);
    setSuppliers(supplierList);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refresh = () => load(query);
    socket.on("stock:update", refresh);
    socket.on("product:created", refresh);
    socket.on("product:updated", refresh);
    socket.on("product:deleted", refresh);
    return () => {
      socket.off("stock:update", refresh);
      socket.off("product:created", refresh);
      socket.off("product:updated", refresh);
      socket.off("product:deleted", refresh);
    };
  }, [load, query]);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setQuery(q);
    load(q);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSubmit = async (data) => {
    if (editingProduct) {
      await api.updateProduct(editingProduct.id, data);
    } else {
      await api.createProduct(data);
    }
    setShowForm(false);
    load(query);
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    await api.deleteProduct(product.id);
    load(query);
  };

  const handleScanDetected = useCallback(async (code) => {
    setScanResult((prev) => (prev?.code === code ? prev : null));
    try {
      const found = await api.getProductByBarcode(code);
      setScanResult({ code, found });
    } catch {
      setScanResult({ code, found: null });
    }
  }, []);

  const handleScanAction = () => {
    setShowScanner(false);
    if (scanResult?.found) {
      openEdit(scanResult.found);
    } else if (scanResult?.code) {
      setEditingProduct({ barcode: scanResult.code });
      setShowForm(true);
    }
    setScanResult(null);
  };

  const submitAdjustment = async (e) => {
    e.preventDefault();
    const delta = Number(adjustAmount);
    if (!delta) return;
    await api.adjustStock(adjustingProduct.id, { change: delta, reason: delta > 0 ? "restock" : "sale" });
    setAdjustingProduct(null);
    setAdjustAmount("");
    load(query);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Search, edit, and track stock for every item in inventory.</p>
        </div>
      </div>

      <div className="toolbar">
        <input className="search" placeholder="Search by name, SKU, or barcode…" value={query} onChange={handleSearch} />
        <button className="btn" onClick={() => setShowScanner(true)}>
          Scan barcode
        </button>
        <button className="btn btn-primary" onClick={openCreate}>
          Add product
        </button>
      </div>

      <div className="panel">
        <div className="panel-body">
          {loading ? (
            <p className="empty-state">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="empty-state">No products match that search.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                  <th>Supplier</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={p.quantity <= p.low_stock_threshold ? "row-low-stock" : ""}>
                    <td className="cell-mono">{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.category || "—"}</td>
                    <td className="cell-mono">{p.quantity}</td>
                    <td className="cell-mono">${p.unit_price.toFixed(2)}</td>
                    <td>{p.supplier_name || "—"}</td>
                    <td>
                      <div className="cell-actions">
                        <button className="btn btn-sm" onClick={() => setAdjustingProduct(p)}>
                          Adjust
                        </button>
                        <button className="btn btn-sm" onClick={() => openEdit(p)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <Modal title={editingProduct?.id ? "Edit product" : "Add product"} onClose={() => setShowForm(false)}>
          <ProductForm
            initial={editingProduct}
            suppliers={suppliers}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            submitLabel={editingProduct?.id ? "Save changes" : "Add product"}
          />
        </Modal>
      )}

      {showScanner && (
        <Modal
          title="Scan barcode"
          onClose={() => {
            setShowScanner(false);
            setScanResult(null);
          }}
          footer={
            <>
              <button
                className="btn"
                onClick={() => {
                  setShowScanner(false);
                  setScanResult(null);
                }}
              >
                Close
              </button>
              <button className="btn btn-primary" disabled={!scanResult} onClick={handleScanAction}>
                {scanResult?.found ? "Edit matched product" : "Add as new product"}
              </button>
            </>
          }
        >
          <BarcodeScanner onDetected={handleScanDetected} />
          {scanResult && (
            <p className="helper-text">
              {scanResult.found ? `Matched: ${scanResult.found.name} (${scanResult.found.sku})` : `No product found for ${scanResult.code}.`}
            </p>
          )}
        </Modal>
      )}

      {adjustingProduct && (
        <Modal title={`Adjust stock — ${adjustingProduct.name}`} onClose={() => setAdjustingProduct(null)}>
          <form onSubmit={submitAdjustment}>
            <p className="helper-text">Current quantity: {adjustingProduct.quantity}</p>
            <div className="field">
              <label htmlFor="adjust">Change (use a negative number to remove stock)</label>
              <input id="adjust" type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} autoFocus />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: 6 }}>
              <button type="button" className="btn" onClick={() => setAdjustingProduct(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Apply
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
