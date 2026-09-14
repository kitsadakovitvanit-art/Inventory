import { useState } from "react";

export default function SupplierForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    contact_name: initial?.contact_name || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    address: initial?.address || ""
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="field">
        <label htmlFor="s-name">Company name</label>
        <input id="s-name" required value={form.name} onChange={update("name")} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="s-contact">Contact name</label>
          <input id="s-contact" value={form.contact_name} onChange={update("contact_name")} />
        </div>
        <div className="field">
          <label htmlFor="s-email">Email</label>
          <input id="s-email" type="email" value={form.email} onChange={update("email")} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="s-phone">Phone</label>
          <input id="s-phone" value={form.phone} onChange={update("phone")} />
        </div>
        <div className="field">
          <label htmlFor="s-address">Address</label>
          <input id="s-address" value={form.address} onChange={update("address")} />
        </div>
      </div>
      <div className="modal-footer" style={{ padding: 0, marginTop: 6 }}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save supplier"}
        </button>
      </div>
    </form>
  );
}
