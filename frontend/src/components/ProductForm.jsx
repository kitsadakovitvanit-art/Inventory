import { useState } from "react";

const CATEGORIES = ["Electronics", "Hardware", "Packaging", "Other"];

export default function ProductForm({ initial, suppliers, onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState({
    sku: initial?.sku || "",
    barcode: initial?.barcode || "",
    name: initial?.name || "",
    description: initial?.description || "",
    category: initial?.category || CATEGORIES[0],
    quantity: initial?.quantity ?? 0,
    low_stock_threshold: initial?.low_stock_threshold ?? 10,
    unit_price: initial?.unit_price ?? 0,
    supplier_id: initial?.supplier_id || ""
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        quantity: Number(form.quantity),
        low_stock_threshold: Number(form.low_stock_threshold),
        unit_price: Number(form.unit_price),
        supplier_id: form.supplier_id || null
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} id="product-form">
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="field-row">
        <div className="field">
          <label htmlFor="sku">SKU</label>
          <input id="sku" required value={form.sku} onChange={update("sku")} />
        </div>
        <div className="field">
          <label htmlFor="barcode">Barcode</label>
          <input id="barcode" value={form.barcode} onChange={update("barcode")} placeholder="Scan or type" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" required value={form.name} onChange={update("name")} />
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" rows={2} value={form.description} onChange={update("description")} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" value={form.category} onChange={update("category")}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="supplier">Supplier</label>
          <select id="supplier" value={form.supplier_id} onChange={update("supplier_id")}>
            <option value="">None</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        {!initial?.id && (
          <div className="field">
            <label htmlFor="quantity">Starting quantity</label>
            <input id="quantity" type="number" min="0" value={form.quantity} onChange={update("quantity")} />
          </div>
        )}
        <div className="field">
          <label htmlFor="threshold">Low stock threshold</label>
          <input id="threshold" type="number" min="0" value={form.low_stock_threshold} onChange={update("low_stock_threshold")} />
        </div>
        <div className="field">
          <label htmlFor="price">Unit price ($)</label>
          <input id="price" type="number" min="0" step="0.01" value={form.unit_price} onChange={update("unit_price")} />
        </div>
      </div>
      <div className="modal-footer" style={{ padding: 0, marginTop: 6 }}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : submitLabel || "Save product"}
        </button>
      </div>
    </form>
  );
}
