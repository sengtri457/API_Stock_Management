const express = require("express");
const router = express.Router();
const {
  addSupplier,
  getSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controller/supplier.controller");

router.post("/", addSupplier);
router.get("/", getSupplier);
router.get("/:id", getSupplier);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

module.exports = router;
