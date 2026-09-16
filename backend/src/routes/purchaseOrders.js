import { Router } from "express";
import { db } from "../db.js";

function nextPoNumber() {
  const year = new Date().getFullYear();
  const row = db.prepare(`
    SELECT po_number FROM purchase_orders WHERE po_number LIKE ? ORDER BY id DESC LIMIT 1
  `).get(`PO-${year}-%`);
  let seq = 1;
  if (row) {
    const parts = row.po_number.split("-");
    seq = parseInt(parts[2], 10) + 1;
  }
  return `PO-${year}-${String(seq).padStart(4, "0")}`;
}

function withItems(po) {
  const items = db.prepare(`
    SELECT poi.*, p.name AS product_name, p.sku
    FROM purchase_order_items poi JOIN products p ON p.id = poi.product_id
    WHERE poi.po_id = ?
  `).all(po.id);
  const total_amount = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);
  return { ...po, items, total_amount };
}

export function purchaseOrdersRouter(io) {
  const router = Router();

  router.get("/", (req, res) => {
    const rows = db.prepare(`
      SELECT po.*, s.name AS supplier_name
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id
      ORDER BY po.created_at DESC
    `).all();
    res.json(rows.map(withItems));
  });

  router.get("/:id", (req, res) => {
    const po = db.prepare(`
      SELECT po.*, s.name AS supplier_name
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = ?
    `).get(req.params.id);
    if (!po) return res.status(404).json({ error: "Purchase order not found" });
    res.json(withItems(po));
  });

  router.post("/", (req, res) => {
    const { supplier_id, expected_date, notes, items } = req.body;
    if (!supplier_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "supplier_id and at least one item are required" });
    }

    const supplier = db.prepare("SELECT id, name FROM suppliers WHERE id = ?").get(supplier_id);
    if (!supplier) return res.status(400).json({ error: "Supplier not found" });

    // A purchase order is placed with one supplier, so every line item must be a
    // product that supplier actually sells. The client filters the dropdown, but
    // the rule is enforced here too — the API is reachable without the UI.
    const productIds = items.map((i) => Number(i.product_id));
    if (productIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({ error: "Every line item needs a valid product_id" });
    }
    const placeholders = productIds.map(() => "?").join(",");
    const foundProducts = db
      .prepare(`SELECT id, name, supplier_id FROM products WHERE id IN (${placeholders})`)
      .all(...productIds);
    const byId = new Map(foundProducts.map((p) => [p.id, p]));
    for (const id of productIds) {
      const product = byId.get(id);
      if (!product) {
        return res.status(400).json({ error: `Product ${id} not found` });
      }
      if (Number(product.supplier_id) !== Number(supplier_id)) {
        return res
          .status(400)
          .json({ error: `"${product.name}" is not supplied by ${supplier.name}` });
      }
    }

    const po_number = nextPoNumber();
    const tx = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO purchase_orders (po_number, supplier_id, status, expected_date, notes)
        VALUES (?, ?, 'ordered', ?, ?)
      `).run(po_number, supplier_id, expected_date || null, notes || null);
      const poId = result.lastInsertRowid;
      const insertItem = db.prepare(`
        INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)
      `);
      for (const item of items) {
        insertItem.run(poId, item.product_id, item.quantity, item.unit_cost || 0);
      }
      return poId;
    });
    const poId = tx();
    const po = db.prepare(`
      SELECT po.*, s.name AS supplier_name
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = ?
    `).get(poId);
    const full = withItems(po);
    io.emit("po:created", full);
    res.status(201).json(full);
  });

  router.put("/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM purchase_orders WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Purchase order not found" });
    const { status, expected_date, notes } = req.body;
    const merged = {
      status: status ?? existing.status,
      expected_date: expected_date ?? existing.expected_date,
      notes: notes ?? existing.notes
    };
    db.prepare(`UPDATE purchase_orders SET status=?, expected_date=?, notes=? WHERE id=?`)
      .run(merged.status, merged.expected_date, merged.notes, req.params.id);
    const po = db.prepare(`
      SELECT po.*, s.name AS supplier_name
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = ?
    `).get(req.params.id);
    const full = withItems(po);
    io.emit("po:updated", full);
    res.json(full);
  });

  router.post("/:id/receive", (req, res) => {
    const po = db.prepare("SELECT * FROM purchase_orders WHERE id = ?").get(req.params.id);
    if (!po) return res.status(404).json({ error: "Purchase order not found" });
    if (po.status === "received") return res.status(400).json({ error: "This order was already received" });

    const items = db.prepare("SELECT * FROM purchase_order_items WHERE po_id = ?").all(po.id);
    const tx = db.transaction(() => {
      for (const item of items) {
        db.prepare("UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?")
          .run(item.quantity, item.product_id);
        db.prepare("INSERT INTO stock_movements (product_id, change_qty, reason, reference) VALUES (?, ?, ?, ?)")
          .run(item.product_id, item.quantity, "po_receive", po.po_number);
      }
      db.prepare("UPDATE purchase_orders SET status = 'received' WHERE id = ?").run(po.id);
    });
    tx();

    for (const item of items) {
      const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id);
      io.emit("stock:update", updated);
    }
    const updatedPo = db.prepare(`
      SELECT po.*, s.name AS supplier_name
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = ?
    `).get(po.id);
    const full = withItems(updatedPo);
    io.emit("po:updated", full);
    res.json(full);
  });

  router.delete("/:id", (req, res) => {
    const existing = db.prepare("SELECT * FROM purchase_orders WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Purchase order not found" });
    db.prepare("DELETE FROM purchase_orders WHERE id = ?").run(req.params.id);
    io.emit("po:deleted", { id: Number(req.params.id) });
    res.status(204).end();
  });

  return router;
}
