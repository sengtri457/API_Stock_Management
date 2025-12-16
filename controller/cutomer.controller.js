const Customer = require("../models/Customer");
const Sale = require("../models/Sale");

// @desc    Get all customers
// @route   GET /api/customers
// @access  Public
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ customer_name: 1 });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching customers",
      error: error.message,
    });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Public
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Get customer purchase history
    const sales = await Sale.find({
      customer_id: customer._id,
      payment_status: "PAID",
    });

    const totalPurchases = sales.length;
    const totalSpent = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const averageOrderValue =
      totalPurchases > 0 ? totalSpent / totalPurchases : 0;

    res.status(200).json({
      success: true,
      data: {
        ...customer.toObject(),
        purchase_stats: {
          total_purchases: totalPurchases,
          total_spent: totalSpent.toFixed(2),
          average_order_value: averageOrderValue.toFixed(2),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching customer",
      error: error.message,
    });
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
  try {
    const { customer_name, phone, email, address } = req.body;

    // Check if email already exists (if provided)
    if (email) {
      const existingCustomer = await Customer.findOne({ email });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Customer with this email already exists",
        });
      }
    }

    const customer = await Customer.create({
      customer_name,
      phone,
      email,
      address,
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error creating customer",
      error: error.message,
    });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    let customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const oldCustomerName = customer.customer_name;

    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // If customer name changed, update all sales with this customer
    if (req.body.customer_name && req.body.customer_name !== oldCustomerName) {
      await Sale.updateMany(
        { customer_id: customer._id },
        { $set: { customer_name: customer.customer_name } },
      );
    }

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating customer",
      error: error.message,
    });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if customer has sales
    const salesCount = await Sale.countDocuments({ customer_id: customer._id });

    if (salesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer. They have ${salesCount} sale(s) in the system`,
      });
    }

    await customer.deleteOne();

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting customer",
      error: error.message,
    });
  }
};

// @desc    Search customers
// @route   GET /api/customers/search?q=searchTerm
// @access  Public
exports.searchCustomers = async (req, res) => {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: "Search term is required",
      });
    }

    const customers = await Customer.find({
      $or: [
        { customer_name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { phone: { $regex: searchTerm, $options: "i" } },
      ],
    });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching customers",
      error: error.message,
    });
  }
};

// @desc    Get customer purchase history
// @route   GET /api/customers/:id/purchases
// @access  Public
exports.getCustomerPurchaseHistory = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const sales = await Sale.find({ customer_id: customer._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      customer: {
        _id: customer._id,
        customer_name: customer.customer_name,
      },
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching purchase history",
      error: error.message,
    });
  }
};

// @desc    Get top customers
// @route   GET /api/customers/top/revenue
// @access  Public
exports.getTopCustomers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const customers = await Customer.find();

    const customerStats = await Promise.all(
      customers.map(async (customer) => {
        const sales = await Sale.find({
          customer_id: customer._id,
          payment_status: "PAID",
        });

        const totalSpent = sales.reduce(
          (sum, sale) => sum + sale.total_amount,
          0,
        );
        const totalPurchases = sales.length;

        return {
          _id: customer._id,
          customer_name: customer.customer_name,
          email: customer.email,
          phone: customer.phone,
          total_spent: totalSpent,
          total_purchases: totalPurchases,
        };
      }),
    );

    // Sort by total spent and limit
    const topCustomers = customerStats
      .filter((c) => c.total_spent > 0)
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, limit);

    res.status(200).json({
      success: true,
      count: topCustomers.length,
      data: topCustomers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching top customers",
      error: error.message,
    });
  }
};
