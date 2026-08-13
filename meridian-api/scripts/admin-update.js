require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const connectDB = require('../config/db');
const User = require('../models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const updatePassword = async () => {
  try {
    await connectDB();
    console.log('\nVelonex24 Admin Security Update');
    
    const adminEmail = 'admin@velonex24.com';
    const admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      console.error(`\nError: Admin user with email ${adminEmail} not found!`);
      process.exit(1);
    }
    
    console.log(`\nFound Admin: ${admin.name} (${admin.email})`);
    
    rl.question('\nEnter your new, strong password: ', async (newPassword) => {
      if (newPassword.length < 8) {
        console.error('\nWarning: Password must be at least 8 characters long!');
        rl.close();
        process.exit(1);
      }
      
      admin.password = newPassword;
      await admin.save();
      
      console.log('\nSuccess: Administrator password has been updated!');
      console.log('You can now log in at https://velonex24.com/admin/login');
      
      rl.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\nRuntime Error:', error.message);
    process.exit(1);
  }
};

updatePassword();
