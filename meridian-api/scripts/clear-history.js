/**
 * Clears all historical records shown in the admin dashboard:
 * shipments (incl. timelines), chat sessions, and chat messages.
 * User accounts are preserved.
 *
 * Usage: node scripts/clear-history.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const [shipments, sessions, messages] = await Promise.all([
      Shipment.countDocuments(),
      ChatSession.countDocuments(),
      Message.countDocuments(),
    ]);
    console.log(`Found: ${shipments} shipments, ${sessions} chat sessions, ${messages} messages`);

    await Promise.all([
      Shipment.deleteMany({}),
      ChatSession.deleteMany({}),
      Message.deleteMany({}),
    ]);
    console.log('All shipment and chat history cleared. User accounts preserved.');
  } catch (err) {
    console.error('Failed to clear history:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
