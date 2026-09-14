import { Router } from "express";
import PDFDocument from "pdfkit";
import { db } from "../db.js";

function toCsv(rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const header = columns.map((c) => c.label).join(",");
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(","));
  return [header, ...lines].join("\n");
}

export function reportsRouter() {
  const router = Router();

  router.get("/inventory.csv", (req, res) => {
    const rows = db.prepare(`
      SELECT p.sku, p.name, p.category, p.quantity, p.low_stock_threshold, p.unit_price,
             (p.quantity * p.unit_price) AS stock_value, s.name AS supplier_name
      FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id
      ORDER BY p.category, p.name
    `).all();
    const csv = toCsv(rows, [
      { key: "sku", label: "SKU" },
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "quantity", label: "Quantity" },
      { key: "low_stock_threshold", label: "Low Stock Threshold" },
      { key: "unit_price", label: "Unit Price" },
      { key: "stock_value", label: "Stock Value" },
      { key: "supplier_name", label: "Supplier" }
    ]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="inventory-report.csv"');
    res.send(csv);
  });

  router.get("/low-stock.csv", (req, res) => {
    const rows = db.prepare(`
      SELECT p.sku, p.name, p.category, p.quantity, p.low_stock_threshold, s.name AS supplier_name
      FROM products p LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.quantity <= p.low_stock_threshold
      ORDER BY p.quantity ASC
    `).all();
    const csv = toCsv(rows, [
      { key: "sku", label: "SKU" },
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "quantity", label: "Quantity" },
      { key: "low_stock_threshold", label: "Low Stock Threshold" },
      { key: "supplier_name", label: "Supplier" }
    ]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="low-stock-report.csv"');
    res.send(csv);
  });

  router.get("/movements.csv", (req, res) => {
    const rows = db.prepare(`
      SELECT sm.created_at, p.sku, p.name, sm.change_qty, sm.reason, sm.reference
      FROM stock_movements sm JOIN products p ON p.id = sm.product_id
      ORDER BY sm.created_at DESC
      LIMIT 500
    `).all();
    const csv = toCsv(rows, [
      { key: "created_at", label: "Date" },
      { key: "sku", label: "SKU" },
      { key: "name", label: "Product" },
      { key: "change_qty", label: "Change" },
      { key: "reason", label: "Reason" },
      { key: "reference", label: "Reference" }
    ]);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="stock-movements.csv"');
    res.send(csv);
  });

  router.get("/inventory.pdf", (req, res) => {
    const rows = db.prepare(`
      SELECT p.sku, p.name, p.category, p.quantity, p.low_stock_threshold, p.unit_price,
             (p.quantity * p.unit_price) AS stock_value
      FROM products p ORDER BY p.category, p.name
    `).all();
    const totalValue = rows.reduce((sum, r) => sum + r.stock_value, 0);
    const lowStockCount = rows.filter((r) => r.quantity <= r.low_stock_threshold).length;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="inventory-report.pdf"');

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc.fontSize(18).text("Inventory Report", { align: "left" });
    doc.fontSize(9).fillColor("#555").text(`Generated ${new Date().toLocaleString()}`);
    doc.moveDown(0.5);
    doc.fillColor("#000").fontSize(11).text(`Total SKUs: ${rows.length}    Total Stock Value: $${totalValue.toFixed(2)}    Low Stock Items: ${lowStockCount}`);
    doc.moveDown(1);

    const colX = { sku: 40, name: 120, category: 300, qty: 390, price: 440, value: 500 };
    const rowHeight = 18;
    const drawHeader = (y) => {
      doc.fontSize(9).fillColor("#fff");
      doc.rect(40, y, 515, rowHeight).fill("#1F4B43");
      doc.fillColor("#fff");
      doc.text("SKU", colX.sku + 4, y + 5);
      doc.text("Name", colX.name + 4, y + 5);
      doc.text("Category", colX.category + 4, y + 5);
      doc.text("Qty", colX.qty + 4, y + 5);
      doc.text("Price", colX.price + 4, y + 5);
      doc.text("Value", colX.value + 4, y + 5);
      doc.fillColor("#000");
    };

    let y = doc.y;
    drawHeader(y);
    y += rowHeight;

    rows.forEach((r, idx) => {
      if (y > 760) {
        doc.addPage();
        y = 40;
        drawHeader(y);
        y += rowHeight;
      }
      if (idx % 2 === 0) {
        doc.rect(40, y, 515, rowHeight).fill("#F3F4F1");
        doc.fillColor("#000");
      }
      doc.fontSize(8.5).fillColor(r.quantity <= r.low_stock_threshold ? "#B3432B" : "#161B1A");
      doc.text(r.sku, colX.sku + 4, y + 5, { width: 75 });
      doc.text(r.name, colX.name + 4, y + 5, { width: 175 });
      doc.text(r.category || "-", colX.category + 4, y + 5, { width: 85 });
      doc.text(String(r.quantity), colX.qty + 4, y + 5, { width: 45 });
      doc.text(`$${r.unit_price.toFixed(2)}`, colX.price + 4, y + 5, { width: 55 });
      doc.text(`$${r.stock_value.toFixed(2)}`, colX.value + 4, y + 5, { width: 55 });
      y += rowHeight;
    });

    doc.end();
  });

  return router;
}
