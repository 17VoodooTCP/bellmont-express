const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  sender: { type: String, enum: ['bot', 'user', 'admin'], required: true },
  message: { type: String, required: true },
  quickActions: [{
    label: { type: String },
    value: { type: String }
  }],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
