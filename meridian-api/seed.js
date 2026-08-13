require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Shipment = require('./models/Shipment');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Seeding database...\n');

    // Clear existing data
    await User.deleteMany({});
    await Shipment.deleteMany({});

    // Create admin user
    const admin = new User({
      name: 'Admin',
      email: 'admin@velonex24.com',
      password: 'admin123',
      role: 'admin'
    });
    await admin.save();
    console.log('Admin user created: admin@velonex24.com / admin123');

    // Create test user
    const user = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'user123',
      role: 'user'
    });
    await user.save();
    console.log('Test user created: john@example.com / user123');

    // Sample shipments
    const shipments = [
      {
        trackingId: 'VLX-A1B2C3D4',
        senderName: 'TechCorp Inc.',
        senderAddress: '123 Silicon Valley, San Francisco, CA',
        receiverName: 'Jane Smith',
        receiverAddress: '456 Park Avenue, New York, NY',
        origin: { lat: 37.7749, lng: -122.4194, city: 'San Francisco' },
        destination: { lat: 40.7128, lng: -74.0060, city: 'New York' },
        currentLocation: { lat: 39.7392, lng: -104.9903, city: 'Denver', updatedAt: new Date() },
        status: 'in_transit',
        weight: 2.5,
        packageType: 'Express',
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        timeline: [
          { status: 'pending', location: 'San Francisco', description: 'Shipment created', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          { status: 'picked_up', location: 'San Francisco', description: 'Package picked up by courier', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { status: 'in_transit', location: 'Denver', description: 'Package in transit — Denver hub', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        ]
      },
      {
        trackingId: 'VLX-E5F6G7H8',
        senderName: 'Global Exports Ltd.',
        senderAddress: '789 Commerce St, Chicago, IL',
        receiverName: 'Alice Johnson',
        receiverAddress: '321 Oak Lane, Miami, FL',
        origin: { lat: 41.8781, lng: -87.6298, city: 'Chicago' },
        destination: { lat: 25.7617, lng: -80.1918, city: 'Miami' },
        currentLocation: { lat: 33.7490, lng: -84.3880, city: 'Atlanta', updatedAt: new Date() },
        status: 'in_transit',
        weight: 5.2,
        packageType: 'Standard',
        estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        timeline: [
          { status: 'pending', location: 'Chicago', description: 'Shipment created', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { status: 'picked_up', location: 'Chicago', description: 'Package collected', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { status: 'in_transit', location: 'Atlanta', description: 'Arrived at Atlanta sorting facility', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
        ]
      },
      {
        trackingId: 'VLX-I9J0K1L2',
        senderName: 'FreshFoods Co.',
        senderAddress: '555 Market St, Seattle, WA',
        receiverName: 'Bob Williams',
        receiverAddress: '888 Pine St, Portland, OR',
        origin: { lat: 47.6062, lng: -122.3321, city: 'Seattle' },
        destination: { lat: 45.5152, lng: -122.6784, city: 'Portland' },
        currentLocation: { lat: 45.5152, lng: -122.6784, city: 'Portland', updatedAt: new Date() },
        status: 'out_for_delivery',
        weight: 1.8,
        packageType: 'Express',
        estimatedDelivery: new Date(),
        timeline: [
          { status: 'pending', location: 'Seattle', description: 'Order placed', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { status: 'picked_up', location: 'Seattle', description: 'Picked up', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { status: 'in_transit', location: 'Portland', description: 'Arrived in Portland', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) },
          { status: 'out_for_delivery', location: 'Portland', description: 'Out for delivery', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) }
        ]
      },
      {
        trackingId: 'VLX-M3N4O5P6',
        senderName: 'Electro Gadgets',
        senderAddress: '100 Tech Dr, Austin, TX',
        receiverName: 'Carol Davis',
        receiverAddress: '200 Main St, Houston, TX',
        origin: { lat: 30.2672, lng: -97.7431, city: 'Austin' },
        destination: { lat: 29.7604, lng: -95.3698, city: 'Houston' },
        currentLocation: { lat: 29.7604, lng: -95.3698, city: 'Houston', updatedAt: new Date() },
        status: 'delivered',
        weight: 0.8,
        packageType: 'Priority',
        estimatedDelivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        timeline: [
          { status: 'pending', location: 'Austin', description: 'Shipment created', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { status: 'picked_up', location: 'Austin', description: 'Picked up', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          { status: 'in_transit', location: 'Houston', description: 'In transit to Houston', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { status: 'out_for_delivery', location: 'Houston', description: 'Out for delivery', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { status: 'delivered', location: 'Houston', description: 'Delivered — signed by Carol Davis', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
        ]
      },
      {
        trackingId: 'VLX-Q7R8S9T0',
        senderName: 'BookWorld Publishers',
        senderAddress: '900 Library Ave, Boston, MA',
        receiverName: 'David Lee',
        receiverAddress: '450 College Rd, Philadelphia, PA',
        origin: { lat: 42.3601, lng: -71.0589, city: 'Boston' },
        destination: { lat: 39.9526, lng: -75.1652, city: 'Philadelphia' },
        currentLocation: { lat: 42.3601, lng: -71.0589, city: 'Boston', updatedAt: new Date() },
        status: 'on_hold',
        holdReason: 'Address verification required — incomplete delivery address',
        weight: 3.4,
        packageType: 'Standard',
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        timeline: [
          { status: 'pending', location: 'Boston', description: 'Shipment created', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { status: 'picked_up', location: 'Boston', description: 'Picked up', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { status: 'on_hold', location: 'Boston', description: 'On hold — address verification required', timestamp: new Date() }
        ]
      }
    ];

    await Shipment.insertMany(shipments);
    console.log(`${shipments.length} sample shipments created`);

    console.log('\nDatabase seeded successfully!');
    console.log('\nTest Tracking IDs:');
    shipments.forEach(s => {
      console.log(`   ${s.trackingId} — ${s.status} (${s.origin.city} → ${s.destination.city})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
