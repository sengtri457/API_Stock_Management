const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const StockTransaction = require("../models/StockTransaction");

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
exports.getAllPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.find().sort({createdAt: -1});
        res.status(200).json({success: true, count: purchases.length, data: purchases});
    } catch (error) {
        res.status(500).json({success: false, message: "Error fetching purchases", error: error.message});
    }
};

// @desc    Get single purchase by ID
// @route   GET /api/purchases/:id
// @access  Private
exports.getPurchaseById = async (req, res) => {
    try {
        const purchase = await Purchase.findById(req.params.id);
        if (! purchase) {
            return res.status(404).json({success: false, message: "Purchase order not found"});
        }
        res.status(200).json({success: true, data: purchase});
    } catch (error) {
        res.status(500).json({success: false, message: "Error fetching purchase order", error: error.message});
    }
};

// @desc    Create new purchase order
// @route   POST /api/purchases
// @access  Private
exports.createPurchase = async (req, res) => {
    try {
        const {supplier_id, supplier_name, items, notes} = req.body;

        // Calculate subtotal for each item
        const processedItems = items.map(item => ({
            ...item,
            subtotal: parseFloat(item.quantity) * parseFloat(item.purchase_cost)
        }));

        const total_amount = processedItems.reduce((sum, item) => sum + item.subtotal, 0);

        const purchase = await Purchase.create({
            supplier_id,
            supplier_name,
            items: processedItems,
            total_amount,
            notes,
            status: 'PENDING'
        });

        res.status(201).json({success: true, message: "Purchase order created", data: purchase});
    } catch (error) {
        console.error('PO Creation Error:', error);
        res.status(400).json({success: false, message: "Error creating purchase order", error: error.message, details: error.errors});
    }
};

// @desc    Update purchase order status (and update stock if RECEIVED)
// @route   PUT /api/purchases/:id/status
// @access  Private
exports.updatePurchaseStatus = async (req, res) => {
    try {
        const {status} = req.body;
        const purchase = await Purchase.findById(req.params.id);

        if (! purchase) {
            return res.status(404).json({success: false, message: "Purchase order not found"});
        }

        // Avoid re-receiving already received purchases
        if (purchase.status === 'RECEIVED' && status === 'RECEIVED') {
            return res.status(400).json({success: false, message: "Order already received and stock added"});
        }

        // If status changing to RECEIVED, increment product stock
        if (status === 'RECEIVED') {
            for (const item of purchase.items) {
                const product = await Product.findById(item.product_id);
                if (product) {
                    const oldStock = product.quantity_in_stock;
                    await product.updateStock(item.quantity, "IN");

                    // Log stock transaction
                    await StockTransaction.create({
                        product_id: product._id,
                        product_name: product.product_name,
                        product_code: product.product_code,
                        transaction_type: "IN",
                        quantity: item.quantity,
                        notes: `PO Received: #${
                            purchase._id.toString().slice(-6).toUpperCase()
                        }`,
                        performed_by: "System Admin"
                    });
                }
            }
        }

        purchase.status = status;
        await purchase.save();

        res.status(200).json({success: true, message: `Status updated to ${status}`, data: purchase});
    } catch (error) {
        res.status(400).json({success: false, message: "Error updating status", error: error.message});
    }
};
