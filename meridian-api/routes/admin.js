const express = require('express');
const Shipment = require('../models/Shipment');
const ChatSession = require('../models/ChatSession');
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// ── GET /api/admin/stats ─────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res, next) => {
  try {
    const [
      totalShipments,
      activeShipments,
      deliveredShipments,
      onHoldShipments,
      pendingShipments,
      activeChatSessions,
      totalUsers,
      recentShipments
    ] = await Promise.all([
      Shipment.countDocuments(),
      Shipment.countDocuments({ status: { $in: ['picked_up', 'in_transit', 'out_for_delivery'] } }),
      Shipment.countDocuments({ status: 'delivered' }),
      Shipment.countDocuments({ status: 'on_hold' }),
      Shipment.countDocuments({ status: 'pending' }),
      ChatSession.countDocuments({ status: { $ne: 'closed' } }),
      User.countDocuments({ role: 'user' }),
      Shipment.find().sort({ createdAt: -1 }).limit(5).lean()
    ]);

    res.json({
      stats: {
        totalShipments,
        activeShipments,
        deliveredShipments,
        onHoldShipments,
        pendingShipments,
        activeChatSessions,
        totalUsers,
        recentShipments
      }
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/admin/users ─────────────────────────────────────────
router.get('/users', adminAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await User.countDocuments(filter);
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});

// ── DELETE /api/admin/users/:id ──────────────────────────────────
router.delete('/users/:id', adminAuth, async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

// ── PATCH /api/admin/users/:id/role ─────────────────────────────
router.patch('/users/:id/role', adminAuth, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user or admin.' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-password' }
    ).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
