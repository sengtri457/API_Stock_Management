# Unit Testing Guide for Node.js & Express

This guide explains how to write and understand unit tests for your backend API using **Jest**. It is tailored to your current project structure, specifically focusing on testing Controllers and mocking Mongoose models.

## 1. Concepts

### What is Unit Testing?
Unit testing involves testing individual units of source code (like a single function) to determine if they are fit for use.
*   **Isolation**: Tests should not touch the real database or make network requests.
*   **Speed**: Because they don't touch the DB, unit tests run very fast.
*   **Reliability**: They ensure your logic works exactly as expected.

### Key Tools
*   **Jest**: The testing framework that runs the tests and provides assertions (checks).
*   **Mocks**: Fake versions of your database models (e.g., `Product`, `StockTransaction`) used to simulate database responses without actually connecting to a database.

---

## 2. Anatomy of a Test File

A typical test file (e.g., `tests/product.controller.test.js`) has four main parts:

### A. Imports & Mocking
We import the code we want to test (Controller) and the dependencies it uses (Models). Then, we tell Jest to "mock" the dependencies.

```javascript
/* 1. Import the Controller */
const productController = require('../controller/product.controller');

/* 2. Import the Model */
const Product = require('../models/Product');

/* 3. Mock the Model */
// This replaces the real Mongoose methods (find, create, etc.) with fake "spy" functions
jest.mock('../models/Product');
```

### B. Global Setup (`beforeEach`)
We need a fresh "Request" (`req`) and "Response" (`res`) object for every single test case so data doesn't leak between tests.

```javascript
let req, res;

beforeEach(() => {
    // 1. Reset standard Express objects
    req = { body: {}, params: {}, query: {} };
    
    // 2. Mock the Response object methods
    res = {
        status: jest.fn().mockReturnThis(), // allowing chaining: res.status(200).json(...)
        json: jest.fn()
    };
    
    // 3. Clear previous usage data from mocks
    jest.clearAllMocks();
});
```

### C. Test Groups (`describe`)
We group tests by the function they are testing.

```javascript
describe('createProduct', () => {
    // Individual tests go here...
});
```

### D. Individual Tests (`it`)
Each test follows the **AAA** pattern:
1.  **Arrange**: Prepare the data and tell the Mocks what to return.
2.  **Act**: Run the controller function.
3.  **Assert**: Check if the result is what we expected.

---

## 3. Step-by-Step Example: `createProduct`

Let's break down how to write a test for creating a product.

### Scenario: Success (201 Created)

```javascript
it('should create a new product and return 201 status', async () => {
    
    // --- [ARRANGE] ---
    // 1. Prepare the input data usually coming from the user
    const mockInput = { 
        product_name: 'New Product', 
        product_code: 'NP001' 
    };
    req.body = mockInput;

    // 2. Control the Database Mock
    // The controller checks if the product exists first. 
    // We tell the mock: "When findOne is called, return NULL (not found)"
    Product.findOne.mockResolvedValue(null);

    // Then the controller creates the product.
    // We tell the mock: "When create is called, return this success object"
    Product.create.mockResolvedValue({ ...mockInput, _id: 'mock_id_123' });


    // --- [ACT] ---
    // Run the actual function
    await productController.createProduct(req, res);


    // --- [ASSERT] ---
    // 1. Did we check for duplicates?
    expect(Product.findOne).toHaveBeenCalledWith({ product_code: 'NP001' });

    // 2. Did we attempt to save to the DB?
    expect(Product.create).toHaveBeenCalled();

    // 3. Did the response send a 201 status?
    expect(res.status).toHaveBeenCalledWith(201);

    // 4. Did the response include success: true?
    expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
    );
});
```

### Scenario: Failure (400 Duplicate)

```javascript
it('should return 400 if product code already exists', async () => {
    // --- [ARRANGE] ---
    req.body = { product_code: 'DUPLICATE' };

    // We tell the mock: "Yes, I found a product with that code!"
    Product.findOne.mockResolvedValue({ product_name: 'Existing Product' });

    // --- [ACT] ---
    await productController.createProduct(req, res);

    // --- [ASSERT] ---
    expect(res.status).toHaveBeenCalledWith(400); // Should be Bad Request
    expect(Product.create).not.toHaveBeenCalled(); // Should NOT try to create
});
```

---

## 4. Common Mock Functions

Here is a cheat sheet for mocking Mongoose functions:

| Mongoose Method | Jest Mock Command | Use Case |
| :--- | :--- | :--- |
| `Product.find()` | `Product.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([...]) })` | When checking lists (supports chaining like `.sort()`) |
| `Product.findOne()` | `Product.findOne.mockResolvedValue(resultObject)` | Checking duplicates or finding by specific field |
| `Product.findById()`| `Product.findById.mockResolvedValue(resultObject)` | Finding a single item by ID |
| `Product.create()` | `Product.create.mockResolvedValue(newObject)` | Creating new items |
| `findByIdAndUpdate` | `Product.findByIdAndUpdate.mockResolvedValue(updatedObject)` | Updating items |

---

## 5. Running Your Tests

Run the following command in your terminal to execute all tests:

```bash
npm test
```

To run a specific test file:

```bash
npx jest tests/product.controller.test.js
```

## 6. Debugging

If a test fails:
1.  Read the failing output. It will usually say `Expected: 200, Received: 500`.
2.  Check your **Mock Implementation**. Did you forget to set `mockResolvedValue`?
3.  Check your **Controller Logic**. Is there a bug in the actual code?
