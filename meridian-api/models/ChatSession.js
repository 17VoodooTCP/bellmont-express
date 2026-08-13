const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true, required: true, index: true },
  userId: { type: String, default: null },
  userName: { type: String, default: 'Anonymous User' },
  status: { type: String, enum: ['bot', 'human', 'closed'], default: 'bot' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  context: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
