import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import "./db.js";
import { productsRouter } from "./routes/products.js";
import { suppliersRouter } from "./routes/suppliers.js";
import { purchaseOrdersRouter } from "./routes/purchaseOrders.js";
import { reportsRouter } from "./routes/reports.js";

const PORT = process.env.PORT || 4000;

// In dev, no FRONTEND_URL is set, so we allow any origin. In production, set
// FRONTEND_URL to your deployed frontend's URL, e.g. https://your-app.vercel.app
const allowedOrigin = process.env.FRONTEND_URL || "*";

const app = express();
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigin }
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on("disconnect", () => console.log(`Client disconnected: ${socket.id}`));
});

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/products", productsRouter(io));
app.use("/api/suppliers", suppliersRouter(io));
app.use("/api/purchase-orders", purchaseOrdersRouter(io));
app.use("/api/reports", reportsRouter());

app.use((req, res) => res.status(404).json({ error: "Not found" }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

server.listen(PORT, () => {
  console.log(`Inventory API listening on http://localhost:${PORT}`);
});
