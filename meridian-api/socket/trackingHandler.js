module.exports = (io) => {
  // Tracking-specific socket events
  io.on('connection', (socket) => {
    // Client subscribes to track a specific shipment
    socket.on('trackShipment', ({ trackingId }) => {
      socket.join(`tracking_${trackingId}`);
      console.log(`Socket ${socket.id} tracking ${trackingId}`);
    });

    // Client unsubscribes from tracking
    socket.on('untrackShipment', ({ trackingId }) => {
      socket.leave(`tracking_${trackingId}`);
    });
  });
};
