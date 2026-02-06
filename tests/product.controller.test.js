const productController = require('../controller/product.controller');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
// Mock the Mongoose models
jest.mock('../models/Product');
jest.mock('../models/StockTransaction');

describe('Product Controller Unit Tests', () => {
    let req,
        res;

    // Reset mocks before each test
    beforeEach(() => {
        req = {
            body: {},
            params: {},
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('createProduct', () => { // Check if Product inser Successfully

        it('should create a new product and return 201 status', async () => {
            const mockProductData = {
                product_name: 'Test Product',
                product_code: 'TP001',
                unit_price: 100,
                quantity_in_stock: 10
            };
            req.body = mockProductData;

            // Mock Product.findOne to return null (product doesn't exist)
            Product.findOne.mockResolvedValue(null);
            // Mock Product.create to return the created product
            const createdProduct = {
                ... mockProductData,
                _id: 'product_id'
            };
            Product.create.mockResolvedValue(createdProduct);
            StockTransaction.create.mockResolvedValue({});
            await productController.createProduct(req, res);
            expect(Product.findOne).toHaveBeenCalledWith({product_code: 'TP001'});
            expect(Product.create).toHaveBeenCalled();
            expect(StockTransaction.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({success: true, data: createdProduct}));
        });


        it('should return 400 if product code already exists', async () => {
            req.body = {
                product_code: 'EXISTING'
            };
            Product.findOne.mockResolvedValue({product_code: 'EXISTING'});

            await productController.createProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({success: false, message: 'Product code already exists'}));
        });

        it('should return 400 with error details if creation fails', async () => {
            const errorMessage = 'Validation Error';
            req.body = {
                product_name: 'Test',
                product_code: 'TEST001'
            };
            // Mock findOne to expect null (not duplicate)
            Product.findOne.mockResolvedValue(null);
            Product.create.mockRejectedValue(new Error(errorMessage));
            await productController.createProduct(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({success: false, message: 'Error creating product', error: errorMessage}));
        });
    });


    describe('getAllProducts', () => {
        it('should return all products with 200 status', async () => {
            const mockProducts = [
                {
                    product_name: 'P1'
                }, {
                    product_name: 'P2'
                }, {
                    product_name: 'P3'
                }, {
                    product_name: 'P4'
                }
            ];
            const mockSort = jest.fn().mockResolvedValue(mockProducts);
            Product.find.mockReturnValue({sort: mockSort});
            await productController.getAllProducts(req, res);
            expect(Product.find).toHaveBeenCalled();
            expect(mockSort).toHaveBeenCalledWith({createdAt: -1});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({success: true, count: mockProducts.length, data: mockProducts});
        });

        it('should return 500 with error details if database fails', async () => {
            const errorMessage = 'Database Connection Failed';
            Product.find.mockImplementation(() => {
                throw new Error(errorMessage);
            });

            await productController.getAllProducts(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({success: false, message: "Error fetching products", error: errorMessage}));
        });
    });

    describe('getProductById', () => {
        it('should return product if found', async () => {
            const mockProduct = {
                _id: '123',
                product_name: 'Test'
            };
            req.params.id = mockProduct._id;
            Product.findById.mockResolvedValue(mockProduct);
            await productController.getProductById(req, res);
            expect(Product.findById).toHaveBeenCalledWith(mockProduct._id);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({success: true, data: mockProduct});
        });
        it('should return 404 if product not found', async () => {
            req.params.id = '123';
            Product.findById.mockResolvedValue(null);
            await productController.getProductById(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({success: false, message: "Product not found"}));
        });
    });

    describe('updateProduct', () => {
        it('should update product and return 200 status', async () => {
            req.params.id = '123';
            req.body = {
                product_name: 'Updated Name'
            };

            const mockProduct = {
                _id: '123',
                product_name: 'Old Name'
            };
            const updatedProduct = {
                _id: '123',
                product_name: 'Updated Name'
            };

            Product.findById.mockResolvedValue(mockProduct);
            Product.findByIdAndUpdate.mockResolvedValue(updatedProduct);

            await productController.updateProduct(req, res);

            expect(Product.findById).toHaveBeenCalledWith('123');
            expect(Product.findByIdAndUpdate).toHaveBeenCalledWith('123', {
                product_name: 'Updated Name'
            }, {
                new: true,
                runValidators: true
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({success: true, message: "Product updated successfully", data: updatedProduct});
        });

        it('should remove quantity_in_stock from update body', async () => {
            req.params.id = '123';
            req.body = {
                product_name: 'Updated',
                quantity_in_stock: 50
            }; // Should invoke logic to remove quantity

            Product.findById.mockResolvedValue({_id: '123'});
            Product.findByIdAndUpdate.mockResolvedValue({});

            await productController.updateProduct(req, res);

            expect(req.body.quantity_in_stock).toBeUndefined();
        });
    });

    describe('deleteProduct', () => {
        it('should delete product and return 200 status', async () => {
            req.params.id = '123';
            const mockProduct = {
                _id: '123',
                deleteOne: jest.fn().mockResolvedValue(true)
            };

            Product.findById.mockResolvedValue(mockProduct);

            await productController.deleteProduct(req, res);

            expect(Product.findById).toHaveBeenCalledWith('123');
            expect(mockProduct.deleteOne).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 if product to delete is not found', async () => {
            req.params.id = '123';
            Product.findById.mockResolvedValue(null);

            await productController.deleteProduct(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('updateProductStock', () => {
        it('should update stock and create transaction', async () => {
            req.params.id = '123';
            req.body = {
                quantity: 10,
                type: 'IN'
            };

            const mockProduct = {
                _id: '123',
                product_name: 'Test',
                quantity_in_stock: 50,
                updateStock: jest.fn().mockResolvedValue(true) // Helper method on document
            };

            Product.findById.mockResolvedValue(mockProduct);
            StockTransaction.create.mockResolvedValue({});

            await productController.updateProductStock(req, res);

            expect(mockProduct.updateStock).toHaveBeenCalledWith(10, 'IN');
            expect(StockTransaction.create).toHaveBeenCalledWith(expect.objectContaining({transaction_type: 'IN', quantity: 10, product_id: '123'}));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 for invalid transaction type', async () => {
            req.body = {
                quantity: 10,
                type: 'INVALID'
            };
            await productController.updateProductStock(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
