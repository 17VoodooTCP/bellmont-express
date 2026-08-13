const express = require('express');
const Review = require('../models/Review');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

const clampStars = (value) => Math.min(5, Math.max(1, Math.round(Number(value) || 5)));

const serialize = (review) => {
  const value = review.toObject ? review.toObject() : review;
  return {
    id: String(value._id || value.id),
    name: value.name,
    role: value.role,
    stars: value.stars,
    avatar: value.avatar || '',
    quote: value.quote,
    published: value.published,
    sortOrder: value.sortOrder,
  };
};

const sort = { sortOrder: 1, createdAt: 1 };

// GET /api/reviews — public, published reviews only
router.get('/', async (req, res, next) => {
  try {
    const reviews = await Review.find({ published: true }).sort(sort).lean();
    res.json({ reviews: reviews.map(serialize) });
  } catch (error) {
    next(error);
  }
});

// GET /api/reviews/all — admin review editor
router.get('/all', adminAuth, async (req, res, next) => {
  try {
    const reviews = await Review.find().sort(sort).lean();
    res.json({ reviews: reviews.map(serialize) });
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews — admin create
router.post('/', adminAuth, async (req, res, next) => {
  try {
    const review = await Review.create({
      name: req.body.name || 'New Customer',
      role: req.body.role || '',
      stars: clampStars(req.body.stars),
      avatar: req.body.avatar || '',
      quote: req.body.quote || 'Write the review here.',
      published: req.body.published !== false,
      sortOrder: Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0,
    });
    res.status(201).json({ review: serialize(review) });
  } catch (error) {
    next(error);
  }
});

// PUT /api/reviews/:id — admin update
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const allowed = {};
    for (const key of ['name', 'role', 'avatar', 'quote', 'published']) {
      if (req.body[key] !== undefined) allowed[key] = req.body[key];
    }
    if (req.body.stars !== undefined) allowed.stars = clampStars(req.body.stars);
    if (req.body.sortOrder !== undefined) allowed.sortOrder = Number(req.body.sortOrder) || 0;

    const review = await Review.findByIdAndUpdate(req.params.id, allowed, {
      new: true,
      runValidators: true,
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ review: serialize(review) });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/reviews/:id — admin delete
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
