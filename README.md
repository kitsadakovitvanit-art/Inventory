# Stockroom — Inventory Management System

A full-stack inventory management app: real-time stock tracking, purchase
order and supplier management, webcam barcode scanning, low-stock alerts,
and CSV/PDF report export.

**Stack:** React (Vite) · Node.js/Express REST API · SQLite (better-sqlite3) · Socket.io

## Features

- **Products** — full CRUD, search by name/SKU/barcode, category tagging, per-item low-stock threshold
- **Barcode scanning** — scan a product with your device's webcam (via ZXing) to look it up or start adding it
- **Real-time stock tracking** — stock changes broadcast over WebSockets, so every open tab updates instantly with no refresh
- **Low-stock alerts** — dashboard panel plus a live toast notification when an item crosses its threshold
- **Suppliers** — CRUD with linked product counts
- **Purchase orders** — create multi-line orders against a supplier, then "Receive" to add stock and log the movement automatically
- **Reports** — export full inventory, low-stock items, and stock-movement history as CSV, plus a formatted inventory PDF
- **Seeded data** — the database is pre-populated with realistic sample suppliers, products (including a few intentionally low-stock), and purchase orders in different statuses, so the app looks live the moment you start it

## Project structure

```
inventory-management-system/
├── backend/            Express API + SQLite + Socket.io
│   └── src/
│       ├── db.js           schema + seed data
│       ├── server.js       app entry point
│       └── routes/         products, suppliers, purchase-orders, reports
└── frontend/           React (Vite) app
    └── src/
        ├── pages/           Dashboard, Products, Suppliers, PurchaseOrders, Reports
        ├── components/      Navbar, forms, Modal, BarcodeScanner
        ├── api.js           REST client
        └── socket.js        Socket.io client
```

## Setup

You'll need Node.js 18+ installed.

### 1. Backend

```bash
cd backend
npm install
npm run dev      # starts the API on http://localhost:4000
```

The first run creates `backend/inventory.db` and seeds it automatically with
sample suppliers, products, and purchase orders. Delete that file to reseed
from scratch.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev       # starts the app on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` and
`/socket.io` to the backend, so no extra configuration is needed.

### Barcode scanning

The scanner (Products → "Scan barcode") requests webcam access, so it needs
either `localhost` (already fine in dev) or HTTPS if you deploy it. The
seeded products use barcodes `012345678901`–`012345678912` — you can
generate matching barcode images with any free online barcode generator to
test scanning against a phone or printed sheet.

## API overview

| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List products (`?q=`, `?category=`, `?lowStock=true`) |
| GET | `/api/products/barcode/:barcode` | Look up a product by barcode |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |
| POST | `/api/products/:id/stock` | Adjust stock (`{ change, reason }`) |
| GET | `/api/products/:id/movements` | Stock movement history for a product |
| GET | `/api/products/alerts/low-stock` | Items at or below threshold |
| GET/POST/PUT/DELETE | `/api/suppliers` | Supplier CRUD |
| GET/POST/PUT/DELETE | `/api/purchase-orders` | Purchase order CRUD |
| POST | `/api/purchase-orders/:id/receive` | Receive an order — adds stock, logs movements |
| GET | `/api/reports/inventory.csv` \| `.pdf` | Full inventory export |
| GET | `/api/reports/low-stock.csv` | Low-stock export |
| GET | `/api/reports/movements.csv` | Recent stock movement log |

All stock-affecting endpoints emit Socket.io events (`stock:update`,
`alert:low-stock`, `product:*`, `po:*`) that the frontend listens for to
keep every open view in sync in real time.

## Notes on this build

- SQLite keeps setup to zero external services — swap `better-sqlite3` for
  `pg` in `db.js` if you want to run this against Postgres later.
- Data validation is intentionally kept lightweight (server-side required
  fields, unique SKU/barcode) — a production version would add stronger
  schema validation (e.g. zod) and authentication/authorization, neither of
  which is included here.
