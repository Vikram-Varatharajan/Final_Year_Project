// server/seed-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

const createAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check if admin already exists
    const adminExists = await Admin.findOne({ email: 'admin@hospital.com' });
    if (adminExists) {
      console.log('Admin already exists');
      process.exit(0);
    }
    
    // Create hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Create admin user
    const admin = new Admin({
      email: 'admin@hospital.com',
      password: hashedPassword,
      name: 'System Admin'
    });
    
    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@hospital.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    mongoose.disconnect();
  }
};

createAdmin();