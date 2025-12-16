const express = require("express");
const router = express.Router();
const {
  addCategory,
  getCategory,
} = require("../controller/category.controller.js");
router.post("/", addCategory);
router.get("/", getCategory);
module.exports = router;
