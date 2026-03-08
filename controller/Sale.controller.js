const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const StockTransaction = require("../models/StockTransaction");

// @desc    Get all sales
// @route   GET /api/sales
// @access  Public
exports.getAllSales = async (req, res) => {
    try {
        const sales = await Sale.find().sort({sale_date: -1});

        res.status(200).json({success: true, count: sales.length, data: sales});
    } catch (error) {
        res.status(500).json({success: false, message: "Error fetching sales", error: error.message});
    }
};

// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Public
exports.getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);

        if (! sale) {
            return res.status(404).json({success: false, message: "Sale not found"});
        }

        res.status(200).json({success: true, data: sale});
    } catch (error) {
        res.status(500).json({success: false, message: "Error fetching sale", error: error.message});
    }
};

// @desc    Create new sale
// @route   POST /api/sales
// @access  Private
exports.createSale = async (req, res) => {
    try {
        const {
            customer_id,
            items,
            payment_status,
            payment_method,
            notes,
            performed_by,
            shipping_address,
            shipping_method
        } = req.body;

        // Validate required fields
        if (!items || items.length === 0) {
            return res.status(400).json({success: false, message: "Sale must have at least one item"});
        }

        // Get or Create customer profile
        let customerName = shipping_address ?. name || "Walk-in Customer";
        let finalizedCustomerId = customer_id || null;

        if (finalizedCustomerId) {
            const customer = await Customer.findById(finalizedCustomerId);
            if (customer) {
                customerName = customer.customer_name;
            }
        } else if (shipping_address ?. name) { // Try to find by name, or create
            try {
                let customer = await Customer.findOne({customer_name: shipping_address.name});
                if (! customer) {
                    customer = await Customer.create({
                        customer_name: shipping_address.name,
                        address: shipping_address.address ? `${
                            shipping_address.address
                        }, ${
                            shipping_address.city
                        }` : 'Web/Walk-in',
                        phone: shipping_address.phone || '',
                        email: shipping_address.email || ''
                    });
                } else { // Update missing info
                    if (! customer.email && shipping_address.email) 
                        customer.email = shipping_address.email;
                    


                    if (! customer.phone && shipping_address.phone) 
                        customer.phone = shipping_address.phone;
                    


                    if (customer.isModified()) 
                        await customer.save();
                    


                }

                if (customer) {
                    finalizedCustomerId = customer._id;
                    customerName = customer.customer_name;
                }
            } catch (err) {
                console.error('Customer Creation Error:', err);
            }
        }

        // Process each item and check stock availability
        const saleItems = [];
        let totalAmount = 0;

        for (const item of items) {
            const product = await Product.findById(item.product_id);

            if (! product) {
                return res.status(404).json({
                        success: false, message: `Product not found: ${
                        item.product_id
                    }`
                });
            }

            // Check stock availability
            if (product.quantity_in_stock<item.quantity) {
        return res.status(400).json({
          success: false, message: `Insufficient stock for ${product.product_name}. Available: ${product.quantity_in_stock}, Requested: ${item.quantity}`, });
      }

      const subtotal = item.quantity * product.unit_price;
      totalAmount += subtotal;

      saleItems.push({
        product_id: product._id, product_name: product.product_name, product_code: product.product_code, quantity: item.quantity, unit_price: product.unit_price, subtotal: subtotal, });
    }

    // Create sale
    const sale = await Sale.create({
      customer_id: finalizedCustomerId, customer_name: customerName, items: saleItems, total_amount: totalAmount, payment_status: payment_status || "PENDING", payment_method: payment_method || "CASH", notes, shipping_address, shipping_method: shipping_method || "standard"
    });

    // Update stock for each item and create stock transactions
    for (const item of saleItems) {
      const product = await Product.findById(item.product_id);
      await product.updateStock(item.quantity, "OUT");

      // Create stock transaction
      await StockTransaction.create({
        product_id: product._id, product_name: product.product_name, product_code: product.product_code, transaction_type: "OUT", quantity: item.quantity, notes: `Sale #${sale._id}`, performed_by: performed_by || "System", });
    }

    res.status(201).json({
      success: true, message: "Sale created successfully", data: sale, });
  } catch (error) {
    res.status(400).json({
      success: false, message: "Error creating sale", error: error.message, });
  }
};

// @desc    Update sale
// @route   PUT /api/sales/:id
// @access  Private
exports.updateSale = async (req, res) => {
                try {
                    let sale = await Sale.findById(req.params.id);

                    if (! sale) {
                        return res.status(404).json({success: false, message: "Sale not found"});
                    }

                    // Only allow updating payment_status and notes
                    const {payment_status, notes} = req.body;

                    sale = await Sale.findByIdAndUpdate(req.params.id, {
                        payment_status,
                        notes
                    }, {
                        new: true,
                        runValidators: true
                    },);

                    res.status(200).json({success: true, message: "Sale updated successfully", data: sale});
                } catch (error) {
                    res.status(400).json({success: false, message: "Error updating sale", error: error.message});
                }
            };

            // @desc    Cancel sale
            // @route   PUT /api/sales/:id/cancel
            // @access  Private
                exports.cancelSale = async (req, res) => {
                try {
                    const sale = await Sale.findById(req.params.id);

                    if (! sale) {
                        return res.status(404).json({success: false, message: "Sale not found"});
                    }

                    if (sale.payment_status === "CANCELLED") {
                        return res.status(400).json({success: false, message: "Sale is already cancelled"});
                    }

                    // Return stock for each item
                    for (const item of sale.items) {
                        const product = await Product.findById(item.product_id);
                        if (product) {
                            await product.updateStock(item.quantity, "IN");

                            // Create stock transaction for return
                            await StockTransaction.create({
                                product_id: product._id,
                                product_name: product.product_name,
                                product_code: product.product_code,
                                transaction_type: "IN",
                                quantity: item.quantity,
                                notes: `Sale #${
                                    sale._id
                                } cancelled - stock returned`,
                                performed_by: req.body.performed_by || "System"
                            });
                        }
                    }

                    // Update sale status
                    sale.payment_status = "CANCELLED";
                    sale.notes = `${
                        sale.notes || ""
                    } [CANCELLED: ${
                        new Date().toISOString()
                    }]`;
                    await sale.save();

                    res.status(200).json({success: true, message: "Sale cancelled successfully. Stock has been returned.", data: sale});
                } catch (error) {
                    res.status(400).json({success: false, message: "Error cancelling sale", error: error.message});
                }
            };

            // @desc    Delete sale
            // @route   DELETE /api/sales/:id
            // @access  Private
                exports.deleteSale = async (req, res) => {
                try {
                    const sale = await Sale.findById(req.params.id);

                    if (! sale) {
                        return res.status(404).json({success: false, message: "Sale not found"});
                    }

                    // Only allow deletion if sale is CANCELLED
                    if (sale.payment_status !== "CANCELLED") {
                        return res.status(400).json({success: false, message: "Only cancelled sales can be deleted. Please cancel the sale first."});
                    }

                    await sale.deleteOne();

                    res.status(200).json({success: true, message: "Sale deleted successfully", data: {}});
                } catch (error) {
                    res.status(500).json({success: false, message: "Error deleting sale", error: error.message});
                }
            };

            // @desc    Get sales by date range
            // @route   GET /api/sales/date-range?start=YYYY-MM-DD&end=YYYY-MM-DD
            // @access  Public
                exports.getSalesByDateRange = async (req, res) => {
                try {
                    const {start, end} = req.query;

                    if (!start || !end) {
                        return res.status(400).json({success: false, message: "Start and end dates are required"});
                    }

                    const startDate = new Date(start);
                    const endDate = new Date(end);
                    endDate.setHours(23, 59, 59, 999);

                    const sales = await Sale.find({
                        sale_date: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }).sort({sale_date: -1});

                    const totalRevenue = sales.filter((s) => s.payment_status === "PAID").reduce((sum, sale) => sum + sale.total_amount, 0);

                    res.status(200).json({success: true, count: sales.length, total_revenue: totalRevenue.toFixed(2), data: sales});
                } catch (error) {
                    res.status(500).json({success: false, message: "Error fetching sales", error: error.message});
                }
            };

            // @desc    Get sales statistics
            // @route   GET /api/sales/stats/overview
            // @access  Public
                exports.getSalesStats = async (req, res) => {
                try {
                    const allSales = await Sale.find();
                    const paidSales = allSales.filter((s) => s.payment_status === "PAID");
                    const pendingSales = allSales.filter((s) => s.payment_status === "PENDING");
                    const cancelledSales = allSales.filter((s) => s.payment_status === "CANCELLED",);

                    const totalRevenue = paidSales.reduce((sum, sale) => sum + sale.total_amount, 0,);
                    const averageOrderValue = paidSales.length > 0 ? totalRevenue / paidSales.length : 0;

                    // Today's sales
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const todaySales = allSales.filter((s) => new Date(s.sale_date) >= today && s.payment_status === "PAID",);
                    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total_amount, 0,);

                    res.status(200).json({
                        success: true,
                        data: {
                            total_sales: allSales.length,
                            paid_sales: paidSales.length,
                            pending_sales: pendingSales.length,
                            cancelled_sales: cancelledSales.length,
                            total_revenue: totalRevenue.toFixed(2),
                            average_order_value: averageOrderValue.toFixed(2),
                            today_sales_count: todaySales.length,
                            today_revenue: todayRevenue.toFixed(2)
                        }
                    });
                } catch (error) {
                    res.status(500).json({success: false, message: "Error fetching sales statistics", error: error.message});
                }
            };

            // @desc    Get best selling products
            // @route   GET /api/sales/best-sellers
            // @access  Public
                exports.getBestSellingProducts = async (req, res) => {
                try {
                    const limit = parseInt(req.query.limit) || 10;

                    // Aggregate sales to find most sold products
                    const salesData = await Sale.aggregate([
                        {
                            $match: {
                                payment_status: "PAID"
                            }
                        },
                        {
                            $unwind: "$items"
                        },
                        {
                            $group: {
                                _id: "$items.product_id",
                                total_quantity_sold: {
                                    $sum: "$items.quantity"
                                },
                                total_revenue: {
                                    $sum: "$items.subtotal"
                                }
                            }
                        },
                        {
                            $sort: {
                                total_quantity_sold: -1
                            }
                        }, {
                            $limit: limit
                        },
                    ]);

                    // Fetch full product details for the top sold items
                    const productIds = salesData.map((s) => s._id);
                    const products = await Product.find({
                        _id: {
                            $in: productIds
                        }
                    });

                    // Combine stats with product details
                    const bestSellers = salesData.map((stat) => {
                        const product = products.find((p) => p._id.toString() === stat._id.toString(),);
                        return {
                            ... product ?. toObject(),
                            total_quantity_sold: stat.total_quantity_sold,
                            total_revenue: stat.total_revenue
                        };
                    });

                    res.status(200).json({success: true, count: bestSellers.length, data: bestSellers});
                } catch (error) {
                    res.status(500).json({success: false, message: "Error fetching best selling products", error: error.message});
                }
            };
