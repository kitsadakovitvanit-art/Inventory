import { Router } from "express";
import { db } from "../db.js";

export function productsRouter(io) {
  const router = Router();

  router.get("/alerts/low-stock", (req, res) => {
    const rows = db.prepare(`
      SELECT p.*, s.name AS supplier_name
      FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.quantity <= p.low_stock_threshold
      ORDER BY (p.quantity * 1.0 / NULLIF(p.low_stock_threshold, 0)) ASC
    `).all();
    res.json(rows);
  });

  router.get("/", (req, res) => {
    const { q, category, lowStock } = req.query;
    let sql = `
      SELECT p.*, s.name AS supplier_name
      FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE 1=1
    `;
    const params = [];
    if (q) {
      sql += " AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)";
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (category) {
      sql += " AND p.category = ?";
      params.push(category);
    }
    if (lowStock === "true") {
      sql += " AND p.quantity <= p.low_stock_threshold";
    }
    sql += " ORDER BY p.name ASC";
    res.json(db.prepare(sql).all(...params));
  });

  router.get("/barcode/:barcode", (req, res) => {
    const row = db.prepare(`
      SELECT p.*, s.name AS supplier_name
      FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.barcode = ?
    `).get(req.params.barcode);
    if (!row) return res.status(404).json({ error: "No product with that barcode" });
    res.json(row);
  });

  router.get("/:id", (req, res) => {
    const row = db.prepare(`
      SELECT p.*, s.name AS supplier_name
      FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: "Product not found" });
    res.json(row);
  });

  router.get("/:id/movements", (req, res) => {
    const rows = db.prepare(`
      SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(req.params.id);
    res.json(rows);
  });

  router.post("/", (req, res) => {
    const { sku, barcode, name, description, category, quantity, low_stock_threshold, unit_price, supplier_id } = req.body;
    if (!sku || !name) return res.status(400).json({ error: "sku and name are required" });
    try {
      const result = db.prepare(`
        INSERT INTO products (sku, barcode, name, description, category, quantity, low_stock_threshold, unit_price, supplier_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sku, barcode || null, name, description || null, category || null, quantity || 0, low_stock_threshold ?? 10, unit_price || 0, supplier_id || null);
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid);
      if (product.quantity > 0) {
        db.prepare(`INSERT INTO stock_movements (product_id, change_qty, reason, reference) VALUES (?, ?, ?, ?)`)
          .run(product.id, product.quantity, "initial_stock", "Manual entry");
      }
      io.emit("product:created", product);
      res.status(201).json(product);
    } catch (err) {
      if (String(err.message).includes("UNIQUE")) {
        return res.status(409).json({ error: "SKU or barcode already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  router.put("/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found" });
    const merged = { ...existing, ...req.body };
    try {
      db.prepare(`
        UPDATE products SET sku=?, barcode=?, name=?, description=?, category=?,
          low_stock_threshold=?, unit_price=?, supplier_id=?, updated_at=datetime('now')
        WHERE id=?
      `).run(
        merged.sku, merged.barcode || null, merged.name, merged.description || null, merged.category || null,
        merged.low_stock_threshold, merged.unit_price, merged.supplier_id || null, req.params.id
      );
      const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
      io.emit("product:updated", updated);
      res.json(updated);
    } catch (err) {
      if (String(err.message).includes("UNIQUE")) {
        return res.status(409).json({ error: "SKU or barcode already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  router.delete("/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found" });
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    io.emit("product:deleted", { id: Number(req.params.id) });
    res.status(204).end();
  });

  router.post("/:id/stock", (req, res) => {
    const { change, reason, reference } = req.body;
    const delta = Number(change);
    if (!delta || Number.isNaN(delta)) return res.status(400).json({ error: "change must be a nonzero number" });
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const newQty = product.quantity + delta;
    if (newQty < 0) return res.status(400).json({ error: "Stock cannot go below zero" });

    const tx = db.transaction(() => {
      db.prepare("UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(newQty, product.id);
      db.prepare("INSERT INTO stock_movements (product_id, change_qty, reason, reference) VALUES (?, ?, ?, ?)")
        .run(product.id, delta, reason || "adjustment", reference || null);
    });
    tx();

    const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(product.id);
    io.emit("stock:update", updated);
    if (updated.quantity <= updated.low_stock_threshold) {
      io.emit("alert:low-stock", updated);
    }
    res.json(updated);
  });

  return router;
}
