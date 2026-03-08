const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    product_name: String,
    product_code: String,
    quantity: {
        type: Number,
        required: true,
        min: [1, "Quantity must be at least 1"]
    },
    purchase_cost: {
        type: Number,
        required: true,
        min: [0, "Cost cannot be negative"]
    },
    subtotal: {
        type: Number,
        required: true
    }
}, {_id: false});

const purchaseSchema = new mongoose.Schema({
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
        required: true
    },
    supplier_name: String,
    purchase_date: {
        type: Date,
        default: Date.now
    },
    items: [purchaseItemSchema],
    total_amount: {
        type: Number,
        required: true,
        min: [0, "Total amount cannot be negative"]
    },
    status: {
        type: String,
        enum: [
            "PENDING", "RECEIVED", "CANCELLED"
        ],
        default: "PENDING"
    },
    notes: {
        type: String,
        trim: true
    }
}, {timestamps: true});

// Calculate total before saving
purchaseSchema.pre("save", function () {
    if (this.items && this.items.length > 0) {
        this.total_amount = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    }
});

module.exports = mongoose.model("Purchase", purchaseSchema);
