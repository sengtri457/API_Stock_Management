const express = require("express");
const router = express.Router();
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerPurchaseHistory,
} = require("../controller/cutomer.controller");

router.post("/", createCustomer);
router.get("/", getAllCustomers);
router.get("/:id/purchase", getCustomerPurchaseHistory);
router.get("/:id", getCustomerById);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

module.exports = router;
