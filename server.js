const express = require("express");
const connectDB = require("./config/conn");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
    origin: [
        "http://localhost:4200", "http://localhost:4000"
    ],
    methods: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS"
    ],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.json({message: "🚀 Stock Management API is running!"});
});

const categoryRoutes = require("./routes/category.routes");
const supplierRoutes = require("./routes/supplier.routes");
const productRoutes = require("./routes/product.routes");
const customerRoutes = require("./routes/customer.route");
const salesRoutes = require("./routes/sale.routes");
const bakongRoutes = require("./routes/bakong.routes");
const authRoutes = require("./routes/auth.routes");

app.use("/api/auth", authRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/bakong", bakongRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Server running on http://localhost:${PORT}`);
});
