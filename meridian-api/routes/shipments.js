const express = require('express');
const Shipment = require('../models/Shipment');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/shipments/track/:trackingId — Public tracking
router.get('/track/:trackingId', async (req, res, next) => {
  try {
    const trackingId = req.params.trackingId.toUpperCase().trim();
    // lean() returns plain JS object — faster & lighter for read-only use
    const shipment = await Shipment.findOne({ trackingId }).lean();
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found', trackingId });
    }
    res.json({ shipment });
  } catch (error) {
    next(error);
  }
});

// GET /api/shipments — Admin: list all
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const shipments = await Shipment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Shipment.countDocuments(filter);
    res.json({ shipments, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});

// POST /api/shipments — Admin: create
router.post('/', adminAuth, async (req, res, next) => {
  try {
    const shipment = new Shipment(req.body);
    shipment.timeline.push({
      status: 'pending',
      location: req.body.origin?.city || 'Origin',
      description: 'Shipment created and pending pickup'
    });
    await shipment.save();
    res.status(201).json({ shipment });
  } catch (error) {
    next(error);
  }
});

// PUT /api/shipments/:id — Admin: update
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const shipment = await Shipment.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    res.json({ shipment });
  } catch (error) {
    next(error);
  }
});

// PUT /api/shipments/:id/status — Admin: update status
router.put('/:id/status', adminAuth, async (req, res, next) => {
  try {
    const { status, location, description } = req.body;
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    shipment.status = status;
    shipment.timeline.push({
      status,
      location: location || shipment.currentLocation?.city || 'Unknown',
      description: description || `Status updated to ${status}`,
      timestamp: new Date()
    });

    if (req.body.currentLocation) {
      shipment.currentLocation = { ...req.body.currentLocation, updatedAt: new Date() };
    }

    await shipment.save();

    // Emit real-time update via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('shipmentUpdate', { shipment });
    }

    res.json({ shipment });
  } catch (error) {
    next(error);
  }
});

// PUT /api/shipments/:id/hold — Admin: pause
router.put('/:id/hold', adminAuth, async (req, res, next) => {
  try {
    const { holdReason } = req.body;
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    shipment.status = 'on_hold';
    shipment.holdReason = holdReason || 'Placed on hold by admin';
    shipment.timeline.push({
      status: 'on_hold',
      location: shipment.currentLocation?.city || 'Unknown',
      description: `On hold: ${shipment.holdReason}`,
      timestamp: new Date()
    });
    await shipment.save();

    const io = req.app.get('io');
    if (io) io.emit('shipmentUpdate', { shipment });

    res.json({ shipment });
  } catch (error) {
    next(error);
  }
});

// PUT /api/shipments/:id/resume — Admin: resume
router.put('/:id/resume', adminAuth, async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    shipment.status = 'in_transit';
    shipment.holdReason = '';
    shipment.timeline.push({
      status: 'in_transit',
      location: shipment.currentLocation?.city || 'Unknown',
      description: 'Shipment resumed from hold',
      timestamp: new Date()
    });
    await shipment.save();

    const io = req.app.get('io');
    if (io) io.emit('shipmentUpdate', { shipment });

    res.json({ shipment });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/shipments/:id — Admin: delete
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    res.json({ message: 'Shipment deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
