const express = require("express");
const router = express.Router();
const StockTransaction = require("../models/StockTransaction");

// @desc    Get all stock transactions
// @route   GET /api/stock-transactions
// @access  Public
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const transactions = await StockTransaction.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: error.message,
    });
  }
});

// @desc    Get transactions by product
// @route   GET /api/stock-transactions/product/:productId
// @access  Public
router.get("/product/:productId", async (req, res) => {
  try {
    const transactions = await StockTransaction.find({
      product_id: req.params.productId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: error.message,
    });
  }
});

// @desc    Get transactions by type
// @route   GET /api/stock-transactions/type/:type
// @access  Public
router.get("/type/:type", async (req, res) => {
  try {
    const type = req.params.type.toUpperCase();

    if (!["IN", "OUT", "ADJUSTMENT"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    const transactions = await StockTransaction.find({
      transaction_type: type,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: error.message,
    });
  }
});

// @desc    Get transactions by date range
// @route   GET /api/stock-transactions/date-range?start=YYYY-MM-DD&end=YYYY-MM-DD
// @access  Public
router.get("/date-range", async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Start and end dates are required",
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const transactions = await StockTransaction.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: error.message,
    });
  }
});

module.exports = router;
