const mongoose = require('mongoose');

const timelineEntrySchema = new mongoose.Schema({
  status: { type: String, required: true },
  location: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  description: { type: String }
}, { _id: false });

const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  city: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  amount:      { type: Number, required: true },
  currency:    { type: String, default: 'USD' },
  description: { type: String, required: true },
  type:        { type: String, enum: ['shipping_fee', 'delay_fee', 'customs_fee', 'storage_fee', 'other'], default: 'other' },
  paid:        { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
}, { _id: true });

const shipmentSchema = new mongoose.Schema({
  trackingId:    { type: String, unique: true, index: true },
  senderName:    { type: String, required: true },
  senderAddress: { type: String, required: true },
  receiverName:  { type: String, required: true },
  receiverAddress: { type: String, required: true },
  origin:          { type: locationSchema, required: true },
  destination:     { type: locationSchema, required: true },
  currentLocation: { type: locationSchema, required: true },

  status: {
    type: String,
    enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'on_hold'],
    default: 'pending'
  },

  // Hold & Delay
  holdReason:    { type: String, default: '' },
  delayReason:   { type: String, default: '' },
  delayDescription: { type: String, default: '' },

  // Customs / Border
  customsIntercepted:       { type: Boolean, default: false },
  borderClearanceEligible:  { type: Boolean, default: false },
  customsNotes:             { type: String, default: '' },

  // Package
  weight:           { type: Number, required: true },
  packageType:      { type: String, default: 'Standard' },
  estimatedDelivery: { type: Date },

  // Financials
  invoices: [invoiceSchema],

  // Relations
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

  timeline: [timelineEntrySchema]
}, { timestamps: true });

// Indexes
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ userId: 1, createdAt: -1 });
shipmentSchema.index({ trackingId: 1, status: 1 });

// Auto-generate tracking ID
shipmentSchema.pre('save', function (next) {
  if (!this.trackingId) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'VLX-';
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.trackingId = id;
  }
  next();
});

module.exports = mongoose.model('Shipment', shipmentSchema);
