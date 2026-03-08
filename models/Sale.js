const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
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
    unit_price: {
        type: Number,
        required: true,
        min: [0, "Price cannot be negative"]
    },
    subtotal: {
        type: Number,
        required: true
    }
}, {
    _id: false
},);

const saleSchema = new mongoose.Schema({
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer"
    },
    customer_name: String,
    sale_date: {
        type: Date,
        default: Date.now
    },
    items: [saleItemSchema],
    total_amount: {
        type: Number,
        required: true,
        min: [0, "Total amount cannot be negative"]
    },
    payment_status: {
        type: String,
        enum: [
            "PAID", "PENDING", "CANCELLED"
        ],
        default: "PENDING"
    },
    notes: {
        type: String,
        trim: true
    },
    shipping_address: {
        name: String,
        email: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        zip: String
    },
    shipping_method: {
        type: String,
        enum: [
            "standard", "express"
        ],
        default: "standard"
    }
});

// Calculate total before saving
saleSchema.pre("save", function () {
    if (this.items && this.items.length > 0) {
        this.total_amount = this.items.reduce((sum, item) => sum + item.subtotal, 0,);
    }
});

// Index for queries
saleSchema.index({customer_id: 1});
saleSchema.index({sale_date: -1});

module.exports = mongoose.model("Sale", saleSchema);
