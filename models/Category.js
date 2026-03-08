const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema({
    category_name: {
        type: String,
        required: [
            true, "Category name is required"
        ],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    icon_key: {
        type: String,
        trim: true
    }, // For frontend brand icons
    hero_image: {
        type: String,
        trim: true
    }, // For category landing pages
    sub_categories: [
        {
            type: String,
            trim: true
        }
    ]
}, {timestamps: true});

module.exports = mongoose.model("Category", categorySchema);
