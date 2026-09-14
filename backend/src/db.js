import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "inventory.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    unit_price REAL NOT NULL DEFAULT 0,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT NOT NULL UNIQUE,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    order_date TEXT NOT NULL DEFAULT (datetime('now')),
    expected_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_cost REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    change_qty INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function seed() {
  const productCount = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
  if (productCount > 0) return;

  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (name, contact_name, email, phone, address)
    VALUES (@name, @contact_name, @email, @phone, @address)
  `);

  const suppliers = [
    { name: "Northgate Components", contact_name: "Dana Ruiz", email: "dana@northgatecomp.com", phone: "555-0142", address: "88 Foundry Rd, Cleveland, OH" },
    { name: "Pacific Rim Electronics", contact_name: "Wei Chen", email: "wei@pacificrimelec.com", phone: "555-0198", address: "12 Harbor Way, Long Beach, CA" },
    { name: "Anchor Supply Co.", contact_name: "Marcus Holt", email: "marcus@anchorsupply.com", phone: "555-0177", address: "410 Industrial Pkwy, Austin, TX" },
    { name: "Rivertown Hardware", contact_name: "Priya Nair", email: "priya@rivertownhw.com", phone: "555-0163", address: "27 Millbrook St, Portland, OR" }
  ];

  const supplierIds = suppliers.map((s) => insertSupplier.run(s).lastInsertRowid);

  const insertProduct = db.prepare(`
    INSERT INTO products (sku, barcode, name, description, category, quantity, low_stock_threshold, unit_price, supplier_id)
    VALUES (@sku, @barcode, @name, @description, @category, @quantity, @low_stock_threshold, @unit_price, @supplier_id)
  `);

  const products = [
    { sku: "ELC-1001", barcode: "012345678901", name: "USB-C Cable 1m", description: "Braided USB-C to USB-C cable", category: "Electronics", quantity: 240, low_stock_threshold: 50, unit_price: 4.5, supplier_id: supplierIds[1] },
    { sku: "ELC-1002", barcode: "012345678902", name: "Wireless Mouse", description: "2.4GHz wireless optical mouse", category: "Electronics", quantity: 18, low_stock_threshold: 20, unit_price: 12.99, supplier_id: supplierIds[1] },
    { sku: "ELC-1003", barcode: "012345678903", name: "Mechanical Keyboard", description: "TKL hot-swappable mechanical keyboard", category: "Electronics", quantity: 6, low_stock_threshold: 15, unit_price: 59.0, supplier_id: supplierIds[1] },
    { sku: "ELC-1004", barcode: "012345678904", name: "USB Hub 4-Port", description: "Compact USB 3.0 hub", category: "Electronics", quantity: 75, low_stock_threshold: 25, unit_price: 9.75, supplier_id: supplierIds[0] },
    { sku: "HRD-2001", barcode: "012345678905", name: "M4 Hex Bolt (100pk)", description: "Stainless steel M4 hex bolts", category: "Hardware", quantity: 340, low_stock_threshold: 60, unit_price: 6.2, supplier_id: supplierIds[3] },
    { sku: "HRD-2002", barcode: "012345678906", name: "Cable Ties (500pk)", description: "8in nylon cable ties, black", category: "Hardware", quantity: 12, low_stock_threshold: 30, unit_price: 8.4, supplier_id: supplierIds[3] },
    { sku: "HRD-2003", barcode: "012345678907", name: "Aluminum Standoffs (50pk)", description: "M3 aluminum standoffs, assorted lengths", category: "Hardware", quantity: 54, low_stock_threshold: 20, unit_price: 11.1, supplier_id: supplierIds[3] },
    { sku: "PKG-3001", barcode: "012345678908", name: "Shipping Box Small", description: "8x6x4in corrugated shipping box", category: "Packaging", quantity: 520, low_stock_threshold: 100, unit_price: 0.65, supplier_id: supplierIds[2] },
    { sku: "PKG-3002", barcode: "012345678909", name: "Bubble Mailer 6x9", description: "Padded poly bubble mailer", category: "Packaging", quantity: 28, low_stock_threshold: 75, unit_price: 0.22, supplier_id: supplierIds[2] },
    { sku: "PKG-3003", barcode: "012345678910", name: "Packing Tape Roll", description: "2in clear packing tape, 55yd", category: "Packaging", quantity: 9, low_stock_threshold: 40, unit_price: 3.1, supplier_id: supplierIds[2] },
    { sku: "ELC-1005", barcode: "012345678911", name: "Power Bank 10000mAh", description: "USB-C fast charging power bank", category: "Electronics", quantity: 41, low_stock_threshold: 20, unit_price: 21.5, supplier_id: supplierIds[0] },
    { sku: "HRD-2004", barcode: "012345678912", name: "Anti-Static Wrist Strap", description: "Grounding strap with coil cord", category: "Hardware", quantity: 63, low_stock_threshold: 15, unit_price: 3.9, supplier_id: supplierIds[0] }
  ];

  const productIds = {};
  for (const p of products) {
    const id = insertProduct.run(p).lastInsertRowid;
    productIds[p.sku] = id;
  }

  const insertMovement = db.prepare(`
    INSERT INTO stock_movements (product_id, change_qty, reason, reference, created_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
  `);
  for (const p of products) {
    insertMovement.run(productIds[p.sku], p.quantity, "initial_stock", "Seed data", "-14 days");
  }
  insertMovement.run(productIds["ELC-1002"], -22, "sale", "ORD-9931", "-3 days");
  insertMovement.run(productIds["HRD-2002"], -18, "sale", "ORD-9944", "-2 days");
  insertMovement.run(productIds["PKG-3003"], -31, "sale", "ORD-9950", "-1 days");

  const insertPO = db.prepare(`
    INSERT INTO purchase_orders (po_number, supplier_id, status, order_date, expected_date, notes)
    VALUES (@po_number, @supplier_id, @status, datetime('now', @order_offset), datetime('now', @expected_offset), @notes)
  `);
  const insertPOItem = db.prepare(`
    INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost)
    VALUES (?, ?, ?, ?)
  `);

  const po1 = insertPO.run({
    po_number: "PO-2026-0001",
    supplier_id: supplierIds[1],
    status: "received",
    order_offset: "-10 days",
    expected_offset: "-3 days",
    notes: "Restock ahead of Q3 promotion"
  }).lastInsertRowid;
  insertPOItem.run(po1, productIds["ELC-1001"], 200, 3.1);
  insertPOItem.run(po1, productIds["ELC-1004"], 60, 6.5);

  const po2 = insertPO.run({
    po_number: "PO-2026-0002",
    supplier_id: supplierIds[3],
    status: "ordered",
    order_offset: "-2 days",
    expected_offset: "+5 days",
    notes: "Standing order for cable ties and tape"
  }).lastInsertRowid;
  insertPOItem.run(po2, productIds["HRD-2002"], 100, 5.9);
  insertPOItem.run(po2, productIds["PKG-3003"], 80, 2.4);

  const po3 = insertPO.run({
    po_number: "PO-2026-0003",
    supplier_id: supplierIds[1],
    status: "draft",
    order_offset: "0 days",
    expected_offset: "+10 days",
    notes: "Draft — awaiting approval"
  }).lastInsertRowid;
  insertPOItem.run(po3, productIds["ELC-1003"], 30, 38.0);
}

seed();
