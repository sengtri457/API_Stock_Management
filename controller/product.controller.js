const Product = require("../models/Product");
const StockTransaction = require("../models/StockTransaction");

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

// @desc    Get product by product code
// @route   GET /api/products/code/:code
// @access  Public
exports.getProductByCode = async (req, res) => {
  try {
    const product = await Product.findOne({
      product_code: req.params.code.toUpperCase(),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    const {
      product_name,
      product_code,
      category,
      supplier,
      unit_price,
      quantity_in_stock,
      reorder_level,
      description,
    } = req.body;

    // Check if product code already exists
    const existingProduct = await Product.findOne({
      product_code: product_code.toUpperCase(),
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product code already exists",
      });
    }

    // Create product
    const product = await Product.create({
      product_name,
      product_code: product_code.toUpperCase(),
      category,
      supplier,
      unit_price,
      quantity_in_stock: quantity_in_stock || 0,
      reorder_level: reorder_level || 10,
      description,
    });

    // Create initial stock transaction if quantity > 0
    if (quantity_in_stock > 0) {
      await StockTransaction.create({
        product_id: product._id,
        product_name: product.product_name,
        product_code: product.product_code,
        transaction_type: "IN",
        quantity: quantity_in_stock,
        notes: "Initial stock",
        performed_by: req.body.performed_by || "Admin",
      });
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Don't allow direct stock quantity updates via this route
    // Use updateStock route instead for stock changes
    if (req.body.quantity_in_stock !== undefined) {
      delete req.body.quantity_in_stock;
    }

    // Update product
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
};

// @desc    Update product stock
// @route   PUT /api/products/:id/stock
// @access  Private
exports.updateProductStock = async (req, res) => {
  try {
    const { quantity, type, notes, performed_by } = req.body;

    // Validate required fields
    if (!quantity || !type) {
      return res.status(400).json({
        success: false,
        message: "Quantity and type are required",
      });
    }

    // Validate transaction type
    if (!["IN", "OUT", "ADJUSTMENT"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type. Must be IN, OUT, or ADJUSTMENT",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Store old quantity for transaction record
    const oldQuantity = product.quantity_in_stock;

    // Update stock using the model method
    await product.updateStock(parseInt(quantity), type);

    // Create stock transaction record
    await StockTransaction.create({
      product_id: product._id,
      product_name: product.product_name,
      product_code: product.product_code,
      transaction_type: type,
      quantity: parseInt(quantity),
      notes: notes || `Stock ${type.toLowerCase()}`,
      performed_by: performed_by || "Admin",
    });

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: {
        product,
        previous_quantity: oldQuantity,
        new_quantity: product.quantity_in_stock,
        transaction_type: type,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating stock",
      error: error.message,
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock/alert
// @access  Public
exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find();

    // Filter products where quantity is at or below reorder level
    const lowStockProducts = products.filter(
      (product) => product.quantity_in_stock <= product.reorder_level,
    );

    res.status(200).json({
      success: true,
      count: lowStockProducts.length,
      data: lowStockProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching low stock products",
      error: error.message,
    });
  }
};

// @desc    Search products
// @route   GET /api/products/search?q=searchTerm
// @access  Public
exports.searchProducts = async (req, res) => {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: "Search term is required",
      });
    }

    const products = await Product.find({
      $or: [
        { product_name: { $regex: searchTerm, $options: "i" } },
        { product_code: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { "category.category_name": { $regex: searchTerm, $options: "i" } },
        { "supplier.supplier_name": { $regex: searchTerm, $options: "i" } },
      ],
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching products",
      error: error.message,
    });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
exports.getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({
      "category.category_id": req.params.categoryId,
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products by category",
      error: error.message,
    });
  }
};

// @desc    Get products by supplier
// @route   GET /api/products/supplier/:supplierId
// @access  Public
exports.getProductsBySupplier = async (req, res) => {
  try {
    const products = await Product.find({
      "supplier.supplier_id": req.params.supplierId,
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products by supplier",
      error: error.message,
    });
  }
};

// @desc    Get inventory statistics
// @route   GET /api/products/stats/inventory
// @access  Public
exports.getInventoryStats = async (req, res) => {
  try {
    const products = await Product.find();

    const stats = {
      total_products: products.length,
      total_items_in_stock: products.reduce(
        (sum, product) => sum + product.quantity_in_stock,
        0,
      ),
      total_inventory_value: products.reduce(
        (sum, product) => sum + product.quantity_in_stock * product.unit_price,
        0,
      ),
      low_stock_products: products.filter(
        (product) => product.quantity_in_stock <= product.reorder_level,
      ).length,
      out_of_stock_products: products.filter(
        (product) => product.quantity_in_stock === 0,
      ).length,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching inventory statistics",
      error: error.message,
    });
  }
};
