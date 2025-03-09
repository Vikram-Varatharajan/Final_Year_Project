// scripts/create-test-doctor.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Doctor = require('../models/Doctor');

async function createTestDoctor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check if test doctor already exists
    const existingDoctor = await Doctor.findOne({ email: 'test@example.com' });
    
    if (existingDoctor) {
      console.log('Test doctor already exists');
      mongoose.disconnect();
      return;
    }
    
    // Create a hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Create new doctor
    const newDoctor = new Doctor({
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test Doctor',
      faceData: '', // This will be updated after first login
      hospitalLocation: {
        latitude: 11.002492104050951, // Example coordinates (San Francisco)
        longitude: 78.35909477040113
      }
    });
    
    await newDoctor.save();
    console.log('Test doctor created successfully');
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating test doctor:', error);
    mongoose.disconnect();
  }
}

createTestDoctor();