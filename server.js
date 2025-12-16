const express = require("express");
const connectDB = require("./config/conn");
require("dotenv").config();

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({ message: "🚀 Stock Management API is running!" });
});

// Routes
const categoryRoutes = require("./routes/category.routes");
const supplierRoutes = require("./routes/supplier.routes");
const productRoutes = require("./routes/product.routes");
const customerRoutes = require("./routes/customer.route");
const salesRoutes = require("./routes/sale.routes");
// const purchaseRoutes = require("./routes/purchase.route");
app.use("/api/sales", salesRoutes);
// app.use("/api/purchases", purchaseRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/categories", categoryRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
});
