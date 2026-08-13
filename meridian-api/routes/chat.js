const express = require('express');
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/chat/sessions — Admin: all active sessions
router.get('/sessions', adminAuth, async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    else filter.status = { $ne: 'closed' };

    const sessions = await ChatSession.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    // Get last message for each session
    const sessionsWithLastMsg = await Promise.all(
      sessions.map(async (session) => {
        const lastMessage = await Message.findOne({ sessionId: session.sessionId })
          .sort({ timestamp: -1 })
          .lean();
        const messageCount = await Message.countDocuments({ sessionId: session.sessionId });
        return { ...session, lastMessage, messageCount };
      })
    );

    res.json({ sessions: sessionsWithLastMsg });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/sessions/:sessionId — Get session with messages
router.get('/sessions/:sessionId', async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const messages = await Message.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: 1 });

    res.json({ session, messages });
  } catch (error) {
    next(error);
  }
});

// POST /api/chat/sessions — Create new session
router.post('/sessions', async (req, res, next) => {
  try {
    const { sessionId, userId, userName } = req.body;
    const session = new ChatSession({
      sessionId,
      userId: userId || null,
      userName: userName || 'Anonymous User',
      status: 'bot',
      context: { state: 'greeting' }
    });
    await session.save();
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

// PUT /api/chat/sessions/:sessionId/close — Close session
router.put('/sessions/:sessionId/close', adminAuth, async (req, res, next) => {
  try {
    const session = await ChatSession.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { status: 'closed' },
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const io = req.app.get('io');
    if (io) io.emit('sessionUpdate', { session });

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
