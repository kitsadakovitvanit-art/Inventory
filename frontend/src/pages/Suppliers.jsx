import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { socket } from "../socket.js";
import Modal from "../components/Modal.jsx";
import SupplierForm from "../components/SupplierForm.jsx";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setSuppliers(await api.listSuppliers());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refresh = () => load();
    socket.on("supplier:created", refresh);
    socket.on("supplier:updated", refresh);
    socket.on("supplier:deleted", refresh);
    return () => {
      socket.off("supplier:created", refresh);
      socket.off("supplier:updated", refresh);
      socket.off("supplier:deleted", refresh);
    };
  }, [load]);

  const handleSubmit = async (data) => {
    if (editing) {
      await api.updateSupplier(editing.id, data);
    } else {
      await api.createSupplier(data);
    }
    setShowForm(false);
    load();
  };

  const handleDelete = async (supplier) => {
    if (!confirm(`Delete ${supplier.name}? Products stay, but lose their supplier link.`)) return;
    await api.deleteSupplier(supplier.id);
    load();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p>Vendors you order stock from.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          Add supplier
        </button>
      </div>

      <div className="panel">
        <div className="panel-body">
          {loading ? (
            <p className="empty-state">Loading suppliers…</p>
          ) : suppliers.length === 0 ? (
            <p className="empty-state">No suppliers yet.</p>
          ) : (
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Products</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Name">{s.name}</td>
                    <td data-label="Contact">{s.contact_name || "—"}</td>
                    <td data-label="Email">{s.email || "—"}</td>
                    <td data-label="Phone">{s.phone || "—"}</td>
                    <td className="cell-mono" data-label="Products">{s.product_count}</td>
                    <td data-label="">
                      <div className="cell-actions">
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setEditing(s);
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s)}>
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
        <Modal title={editing ? "Edit supplier" : "Add supplier"} onClose={() => setShowForm(false)}>
          <SupplierForm initial={editing} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  );
}
