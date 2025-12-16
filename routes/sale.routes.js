const express = require("express");
const router = express.Router();
const {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  cancelSale,
  deleteSale,
  getSalesByDateRange,
  getSalesStats,
  getBestSellingProducts,
} = require("../controller/Sale.controller");

// Get sales by date range (must be before /:id)
router.get("/date-range", getSalesByDateRange);

// Get sales statistics (must be before /:id)
router.get("/stats/overview", getSalesStats);

// Get best selling products (must be before /:id)
router.get("/best-sellers", getBestSellingProducts);

// Get all sales & Create new sale
router.route("/").get(getAllSales).post(createSale);

// Cancel sale (must be before /:id routes)
router.put("/:id/cancel", cancelSale);

// Get, Update, Delete single sale
router.route("/:id").get(getSaleById).put(updateSale).delete(deleteSale);

module.exports = router;
