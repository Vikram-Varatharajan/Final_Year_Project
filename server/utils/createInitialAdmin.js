// server/utils/createInitialAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
require('dotenv').config();

const createInitialAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Check if admin already exists
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      console.log('Admin account already exists');
      mongoose.disconnect();
      return;
    }

    // Create default admin credentials - CHANGE THESE IN PRODUCTION
    const defaultAdmin = {
      name: 'System Admin',
      email: 'admin@hospital.com',
      password: 'admin123',
      faceData: null // Face data will be added during first login
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, salt);

    // Create new admin
    const admin = new Admin({
      name: defaultAdmin.name,
      email: defaultAdmin.email,
      password: hashedPassword,
      faceData: defaultAdmin.faceData
    });

    await admin.save();
    console.log('Initial admin account created successfully');
    console.log('Email: admin@hospital.com');
    console.log('Password: admin123');
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating initial admin:', error);
    process.exit(1);
  }
};

createInitialAdmin();
