const mongoose = require("mongoose");

const stockTransactionSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    product_name: {
      type: String,
      required: true,
    },
    product_code: {
      type: String,
      required: true,
    },
    transaction_type: {
      type: String,
      enum: ["IN", "OUT", "ADJUSTMENT"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    notes: {
      type: String,
      trim: true,
    },
    performed_by: {
      type: String,
      default: "System",
    },
  },
  {
    timestamps: true,
  },
);

// Index for queries
stockTransactionSchema.index({ product_id: 1 });
stockTransactionSchema.index({ createdAt: -1 });
stockTransactionSchema.index({ transaction_type: 1 });

module.exports = mongoose.model("StockTransaction", stockTransactionSchema);
