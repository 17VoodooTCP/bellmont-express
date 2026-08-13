const { Server } = require('socket.io');
const chatHandler = require('./chatHandler');
const trackingHandler = require('./trackingHandler');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  chatHandler(io);
  trackingHandler(io);

  console.log('Socket.io initialized');
  return io;
};

module.exports = initializeSocket;
