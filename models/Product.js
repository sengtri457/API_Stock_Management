const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    product_name: {
        type: String,
        required: [
            true, "Product name is required"
        ],
        trim: true
    },
    product_code: {
        type: String,
        required: [
            true, "Product code is required"
        ],
        unique: true,
        trim: true,
        uppercase: true
    },
    category: {
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category"
        },
        category_name: String
    },
    supplier: {
        supplier_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supplier"
        },
        supplier_name: String
    },
    unit_price: {
        type: Number,
        required: [
            true, "Unit price is required"
        ],
        min: [0, "Price cannot be negative"]
    },
    quantity_in_stock: {
        type: Number,
        default: 0,
        min: [0, "Quantity cannot be negative"]
    },
    reorder_level: {
        type: Number,
        default: 10,
        min: [0, "Reorder level cannot be negative"]
    },
    description: {
        type: String,
        trim: true
    },
    photo: {
        type: String,
        trim: true
    },
    gallery_photos: [
        {
            type: String,
            trim: true
        }
    ],
    sizes: [
        {
            type: String,
            trim: true
        }
    ]
}, {
    timestamps: true
},);

// Virtual field to check if product is low in stock
productSchema.virtual("is_low_stock").get(function () {
    return this.quantity_in_stock <= this.reorder_level;
});

// Method to update stock
productSchema.methods.updateStock = async function (quantity, type) {
    if (type === "IN") {
        this.quantity_in_stock += quantity;
    } else if (type === "OUT") {
        if (this.quantity_in_stock < quantity) {
            throw new Error("Insufficient stock");
        }
        this.quantity_in_stock -= quantity;
    } else if (type === "ADJUSTMENT") {
        this.quantity_in_stock = quantity;
    }
    return await this.save();
};

// Index for better performance
productSchema.index({product_code: 1});
productSchema.index({"category.category_id": 1});

module.exports = mongoose.model("Product", productSchema);
