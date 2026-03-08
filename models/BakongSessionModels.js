const mongoose = require('mongoose');

/**
 * Stores a pending Bakong QR payment session.
 * Auto-expires documents 15 minutes after creation via the `expiresAt` TTL index.
 */
const bakongSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    /**
         * Cart items captured at the time of QR generation.
         * Uses snake_case field names to match Product / Sale schema conventions.
         */
    items: [
        {
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: [1, 'Quantity must be at least 1']
            },
            unit_price: {
                type: Number,
                required: true,
                min: [0, 'Price cannot be negative']
            },
            subtotal: {
                type: Number,
                required: true
            },
            product_name: String,
            product_code: String,
            remarks: String
        },
    ],
    /** Total amount in the currency specified below */
    total_amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative']
    },
    currency: {
        type: String,
        enum: [
            'usd', 'khr'
        ],
        default: 'usd'
    },
    /** Raw KHQR string returned by bakong-khqr library */
    qrString: {
        type: String,
        required: true
    },
    /** MD5 hash used to poll payment status */
    md5: {
        type: String,
        required: true,
        unique: true
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
            'standard', 'express'
        ],
        default: 'standard'
    },
    status: {
        type: String,
        enum: [
            'pending', 'paid', 'expired', 'failed'
        ],
        default: 'pending'
    },
    /** TTL field — MongoDB will delete the document automatically after this date */
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    }
}, {
    timestamps: true
},);

// Auto-delete expired sessions
bakongSessionSchema.index({
    expiresAt: 1
}, {expireAfterSeconds: 0});

module.exports = mongoose.model('BakongSession', bakongSessionSchema);
