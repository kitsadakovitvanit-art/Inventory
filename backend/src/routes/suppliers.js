import { Router } from "express";
import { db } from "../db.js";

export function suppliersRouter(io) {
  const router = Router();

  router.get("/", (req, res) => {
    const rows = db.prepare(`
      SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id) AS product_count
      FROM suppliers s ORDER BY s.name ASC
    `).all();
    res.json(rows);
  });

  router.get("/:id", (req, res) => {
    const row = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Supplier not found" });
    const products = db.prepare("SELECT * FROM products WHERE supplier_id = ?").all(req.params.id);
    res.json({ ...row, products });
  });

  router.post("/", (req, res) => {
    const { name, contact_name, email, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const result = db.prepare(`
      INSERT INTO suppliers (name, contact_name, email, phone, address) VALUES (?, ?, ?, ?, ?)
    `).run(name, contact_name || null, email || null, phone || null, address || null);
    const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(result.lastInsertRowid);
    io.emit("supplier:created", supplier);
    res.status(201).json(supplier);
  });

  router.put("/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Supplier not found" });
    const merged = { ...existing, ...req.body };
    db.prepare(`
      UPDATE suppliers SET name=?, contact_name=?, email=?, phone=?, address=? WHERE id=?
    `).run(merged.name, merged.contact_name || null, merged.email || null, merged.phone || null, merged.address || null, req.params.id);
    const updated = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(req.params.id);
    io.emit("supplier:updated", updated);
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Supplier not found" });
    db.prepare("DELETE FROM suppliers WHERE id = ?").run(req.params.id);
    io.emit("supplier:deleted", { id: Number(req.params.id) });
    res.status(204).end();
  });

  return router;
}
