const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const chatBot = require('../services/chatBot');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User joins a chat session room
    socket.on('joinSession', async ({ sessionId }) => {
      socket.join(sessionId);
      console.log(`Socket ${socket.id} joined session ${sessionId}`);
    });

    // User sends a message
    socket.on('userMessage', async ({ sessionId, message, userId }) => {
      try {
        // Save user message
        const userMsg = new Message({
          sessionId,
          sender: 'user',
          message,
          timestamp: new Date()
        });
        await userMsg.save();

        // Emit user message to room (for admin panel)
        io.to(sessionId).emit('newMessage', {
          sessionId,
          sender: 'user',
          message,
          timestamp: userMsg.timestamp
        });

        // Also emit to admin room so admin panel sees live updates
        io.to('admin_room').emit('newMessage', {
          sessionId,
          sender: 'user',
          message,
          timestamp: userMsg.timestamp
        });

        // Check session status — only bot responds if status is 'bot'
        const session = await ChatSession.findOne({ sessionId });
        if (!session) return;

        if (session.status === 'bot') {
          // Process through bot
          const botResponse = await chatBot.processMessage(session, message);

          // Handle escalation
          if (botResponse.newState === 'escalate_to_human') {
            session.status = 'human';
            session.context = { ...session.context, state: 'escalated' };
            await session.save();

            // Save bot message
            const botMsg = new Message({
              sessionId,
              sender: 'bot',
              message: botResponse.message,
              quickActions: botResponse.quickActions || [],
              timestamp: new Date()
            });
            await botMsg.save();

            io.to(sessionId).emit('botReply', {
              sessionId,
              sender: 'bot',
              message: botResponse.message,
              quickActions: botResponse.quickActions || [],
              timestamp: botMsg.timestamp
            });

            // Notify admin room
            io.to('admin_room').emit('sessionUpdate', { session });
            io.to('admin_room').emit('newMessage', {
              sessionId,
              sender: 'bot',
              message: botResponse.message,
              timestamp: botMsg.timestamp
            });
          } else {
            // Normal bot response
            session.context = { ...session.context, state: botResponse.newState };
            await session.save();

            // Simulate typing delay
            setTimeout(async () => {
              const botMsg = new Message({
                sessionId,
                sender: 'bot',
                message: botResponse.message,
                quickActions: botResponse.quickActions || [],
                timestamp: new Date()
              });
              await botMsg.save();

              io.to(sessionId).emit('botReply', {
                sessionId,
                sender: 'bot',
                message: botResponse.message,
                quickActions: botResponse.quickActions || [],
                timestamp: botMsg.timestamp
              });

              io.to('admin_room').emit('newMessage', {
                sessionId,
                sender: 'bot',
                message: botResponse.message,
                timestamp: botMsg.timestamp
              });
            }, 800);
          }
        }
        // If session status is 'human', bot does nothing — admin handles it
      } catch (error) {
        console.error('Chat handler error:', error);
        socket.emit('chatError', { error: 'Failed to process message' });
      }
    });

    // Admin joins admin room for live updates
    socket.on('adminConnect', () => {
      socket.join('admin_room');
      console.log(`Admin connected: ${socket.id}`);
    });

    // Admin joins a specific chat session
    socket.on('adminJoin', async ({ sessionId, adminId }) => {
      try {
        socket.join(sessionId);

        const session = await ChatSession.findOneAndUpdate(
          { sessionId },
          { status: 'human', adminId },
          { new: true }
        );

        if (session) {
          // Notify the user that admin has joined
          const joinMsg = new Message({
            sessionId,
            sender: 'bot',
            message: 'A support agent has joined the conversation. You\'re now speaking with a live agent.',
            quickActions: [],
            timestamp: new Date()
          });
          await joinMsg.save();

          io.to(sessionId).emit('adminJoin', {
            sessionId,
            message: joinMsg.message,
            timestamp: joinMsg.timestamp
          });

          io.to('admin_room').emit('sessionUpdate', { session });

          console.log(`Admin took over session ${sessionId}`);
        }
      } catch (error) {
        console.error('Admin join error:', error);
      }
    });

    // Admin sends a message
    socket.on('adminMessage', async ({ sessionId, message, adminId }) => {
      try {
        const adminMsg = new Message({
          sessionId,
          sender: 'admin',
          message,
          timestamp: new Date()
        });
        await adminMsg.save();

        // Send to the user in the session room
        io.to(sessionId).emit('newMessage', {
          sessionId,
          sender: 'admin',
          message,
          timestamp: adminMsg.timestamp
        });

        // Also update admin room
        io.to('admin_room').emit('newMessage', {
          sessionId,
          sender: 'admin',
          message,
          timestamp: adminMsg.timestamp
        });

        // Update session timestamp
        await ChatSession.findOneAndUpdate(
          { sessionId },
          { updatedAt: new Date() }
        );
      } catch (error) {
        console.error('Admin message error:', error);
      }
    });

    // Close session
    socket.on('closeSession', async ({ sessionId }) => {
      try {
        const session = await ChatSession.findOneAndUpdate(
          { sessionId },
          { status: 'closed' },
          { new: true }
        );

        if (session) {
          const closeMsg = new Message({
            sessionId,
            sender: 'bot',
            message: 'This conversation has been closed. Thank you for using Velonex24!',
            quickActions: [],
            timestamp: new Date()
          });
          await closeMsg.save();

          io.to(sessionId).emit('sessionClosed', { sessionId });
          io.to('admin_room').emit('sessionUpdate', { session });
        }
      } catch (error) {
        console.error('Close session error:', error);
      }
    });

    // Typing indicators
    socket.on('typing', ({ sessionId, sender }) => {
      socket.to(sessionId).emit('typing', { sessionId, sender });
    });

    socket.on('stopTyping', ({ sessionId, sender }) => {
      socket.to(sessionId).emit('stopTyping', { sessionId, sender });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
