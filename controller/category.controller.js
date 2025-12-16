const Category = require("../models/Category");
const addCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
getCategory = async (req, res) => {
  try {
    const category = await Category.find();
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  addCategory,
  getCategory,
};
