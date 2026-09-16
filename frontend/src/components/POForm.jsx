import { useMemo, useState } from "react";

// Products belong to exactly one supplier, so a purchase order can only
// contain items that the selected supplier actually sells.
const productsForSupplier = (products, supplierId) =>
  products.filter((p) => String(p.supplier_id) === String(supplierId));

const newLineItem = (availableProducts) => ({
  product_id: availableProducts[0]?.id ?? "",
  quantity: 1,
  unit_cost: 0
});

export default function POForm({ suppliers, products, onSubmit, onCancel }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState(() => {
    const initial = productsForSupplier(products, suppliers[0]?.id);
    return initial.length ? [newLineItem(initial)] : [];
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const availableProducts = useMemo(
    () => productsForSupplier(products, supplierId),
    [products, supplierId]
  );

  // Changing supplier invalidates every existing line, since those products
  // belong to the previous supplier. Reset to a single fresh line instead of
  // silently leaving stale product ids in the form.
  const handleSupplierChange = (value) => {
    setSupplierId(value);
    setError(null);
    const next = productsForSupplier(products, value);
    setItems(next.length ? [newLineItem(next)] : []);
  };

  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, newLineItem(availableProducts)]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unit_cost || 0), 0);

  const selectedSupplier = suppliers.find((s) => String(s.id) === String(supplierId));
  const noProducts = availableProducts.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) return setError("Choose a supplier.");
    if (noProducts) {
      return setError(
        `${selectedSupplier?.name || "This supplier"} has no products assigned yet. Assign products to this supplier first.`
      );
    }
    if (items.length === 0) return setError("Add at least one line item.");
    setSaving(true);
    try {
      await onSubmit({
        supplier_id: Number(supplierId),
        expected_date: expectedDate || null,
        notes,
        items: items.map((i) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
          unit_cost: Number(i.unit_cost)
        }))
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="field-row">
        <div className="field">
          <label htmlFor="po-supplier">Supplier</label>
          <select id="po-supplier" value={supplierId} onChange={(e) => handleSupplierChange(e.target.value)}>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="po-expected">Expected date</label>
          <input id="po-expected" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="po-notes">Notes</label>
        <textarea id="po-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <label>
        Line items
        {!noProducts && (
          <span style={{ fontWeight: 400, color: "var(--muted)" }}>
            {" "}
            — {availableProducts.length} product{availableProducts.length === 1 ? "" : "s"} from{" "}
            {selectedSupplier?.name}
          </span>
        )}
      </label>

      {noProducts ? (
        <p style={{ color: "var(--muted)", margin: "6px 0 10px" }}>
          {selectedSupplier?.name || "This supplier"} has no products assigned yet. Assign products to this
          supplier on the Products page before ordering from them.
        </p>
      ) : (
        <>
          <div className="line-items">
            {items.map((item, idx) => (
              <div className="line-item-row" key={idx}>
                <select value={item.product_id} onChange={(e) => updateItem(idx, "product_id", e.target.value)}>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  placeholder="Qty"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_cost}
                  onChange={(e) => updateItem(idx, "unit_cost", e.target.value)}
                  placeholder="Cost"
                />
                <button
                  type="button"
                  className="line-item-remove"
                  onClick={() => removeItem(idx)}
                  aria-label="Remove item"
                  disabled={items.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
            <div className="line-items-total">Total: ${total.toFixed(2)}</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={addItem} style={{ marginBottom: 6 }}>
            + Add line item
          </button>
        </>
      )}

      <div className="modal-footer" style={{ padding: 0, marginTop: 10 }}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || noProducts}>
          {saving ? "Creating…" : "Create purchase order"}
        </button>
      </div>
    </form>
  );
}
