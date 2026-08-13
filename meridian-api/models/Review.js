const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  stars: { type: Number, min: 1, max: 5, default: 5 },
  avatar: { type: String, default: '' },
  quote: { type: String, required: true, trim: true },
  published: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

reviewSchema.index({ published: 1, sortOrder: 1, createdAt: 1 });

module.exports = mongoose.model('Review', reviewSchema);
