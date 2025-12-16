const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getProductByCode,
  createProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  getLowStockProducts,
  searchProducts,
  getProductsByCategory,
  getProductsBySupplier,
  getInventoryStats,
} = require("../controller/product.controller");
// Search products (must be before /:id to avoid conflicts)
router.get("/search", searchProducts);

// Get inventory statistics
router.get("/stats/inventory", getInventoryStats);

// Get low stock products (must be before /:id)
router.get("/low-stock/alert", getLowStockProducts);

// Get products by category
router.get("/category/:categoryId", getProductsByCategory);

// Get products by supplier
router.get("/supplier/:supplierId", getProductsBySupplier);

// Get product by code (must be before /:id)
router.get("/code/:code", getProductByCode);

// Get all products & Create new product
router.route("/").get(getAllProducts).post(createProduct);

// Get, Update, Delete single product
router
  .route("/:id")
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

// Update product stock
router.put("/:id/stock", updateProductStock);

module.exports = router;
