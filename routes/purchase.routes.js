const express = require("express");
const router = express.Router();
const {getAllPurchases, getPurchaseById, createPurchase, updatePurchaseStatus} = require("../controller/purchase.controller");

router.get("/", getAllPurchases);
router.get("/:id", getPurchaseById);
router.post("/", createPurchase);
router.put("/:id/status", updatePurchaseStatus);

module.exports = router;
