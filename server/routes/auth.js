const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Activity = require('../models/Activity');
const faceVerifier = require('../utils/faceVerifier');
const locationVerifier = require('../utils/locationVerifier');

// Route to check just credentials without other verification
router.post('/check-credentials', async (req, res) => {
  try {
    const { email, password, userType = 'doctor' } = req.body;
    
    console.log(`Checking credentials for ${userType} with email: ${email}`);
    
    // Find user based on userType
    let user;
    
    if (userType === 'admin') {
      user = await Admin.findOne({ email });
      console.log(`Admin lookup result for ${email}:`, user ? "Found" : "Not Found");
    } else {
      user = await Doctor.findOne({ email });
      console.log(`Doctor lookup result for ${email}:`, user ? "Found" : "Not Found");
      
      // Additional check - ensure user isn't in Admin collection if trying for doctor login
      const adminWithSameEmail = await Admin.findOne({ email });
      if (adminWithSameEmail) {
        console.log(`Warning: ${email} exists in both Doctor and Admin collections`);
      }
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} not found` 
      });
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      // Log failed login attempt
      await Activity.create({
        userId: user._id,
        userType: userType.toUpperCase(),
        type: 'LOGIN_FAIL',
        details: 'Invalid password attempt'
      });
      
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate a temporary token for intermediate steps if needed
    // Fixed: Using user instead of doctor
    const tempToken = jwt.sign(
      { id: user._id.toString(), email: user.email, role: userType },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Return success with information needed for next steps
    res.json({ 
      success: true,
      doctorId: user._id,
      hasFaceData: !!user.faceData && user.faceData.length > 2, // Check if face data exists
      tempToken, // For secured intermediate operations
      userType  // Include user type in response
    });

  } catch (error) {
    console.error('Credential check error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during credential verification' 
    });
  }
});

// Login route for doctors
router.post('/login/doctor', async (req, res) => {
  try {
    const { email, password, location, faceData } = req.body;
    
    console.log(`Doctor login attempt for email: ${email}`);
    
    // Find doctor and ensure we're not getting an admin by mistake
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Doctor not found' 
      });
    }
    
    // Check if this email exists in Admin collection (potential issue)
    const adminCheck = await Admin.findOne({ email });
    if (adminCheck) {
      console.log(`WARNING: Email ${email} exists in both Doctor and Admin collections`);
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, doctor.password);
    if (!isPasswordMatch) {
      // Log failed login attempt
      await Activity.create({
        doctorId: doctor._id,
        type: 'LOGIN_FAIL',
        details: 'Invalid password attempt'
      });
      
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Location verification
    if (location) {
      const isWithinHospitalRange = locationVerifier.isWithinHospitalRange(
        location, 
        { 
          latitude: doctor.hospitalLocation.latitude, 
          longitude: doctor.hospitalLocation.longitude 
        }
      );

      if (!isWithinHospitalRange) {
        // Log location verification failure
        await Activity.create({
          doctorId: doctor._id,
          type: 'LOCATION_VERIFY_FAIL',
          details: 'Location verification failed',
          location: location
        });
        
        return res.status(401).json({ 
          success: false, 
          message: 'Outside hospital premises' 
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Location data required for doctor login' 
      });
    }

    // Face verification check
    if (faceData) {
      const storedDescriptor = JSON.parse(doctor.faceData || '[]');
      const incomingDescriptor = JSON.parse(faceData.faceDescriptor);
      
      // Skip verification on first login
      if (storedDescriptor.length > 0) {
        const isMatch = faceVerifier.compareFaceDescriptors(storedDescriptor, incomingDescriptor);
        
        if (!isMatch) {
          // Log face verification failure
          await Activity.create({
            doctorId: doctor._id,
            type: 'FACE_VERIFY_FAIL',
            details: 'Face verification failed'
          });
          
          return res.status(401).json({ 
            success: false, 
            message: 'Face verification failed' 
          });
        }
      } else {
        // First login - store face data
        doctor.faceData = JSON.stringify(incomingDescriptor);
        await doctor.save();
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Face data required for doctor login' 
      });
    }
    
    // Generate JWT token with explicit role
    const token = jwt.sign(
      { 
        id: doctor._id, 
        email: doctor.email,
        role: 'doctor'  // Explicitly set role to doctor
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Log successful login
    await Activity.create({
      doctorId: doctor._id,
      type: 'LOGIN_SUCCESS',
      details: 'Successful login',
      location: location
    });

    res.json({ 
      success: true, 
      token, 
      user: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        role: 'doctor',
        totalLeaves: doctor.totalLeaves,
        usedLeaves: doctor.usedLeaves
      }
    });
  } catch (error) {
    console.error('Doctor login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Login route for admins - no face or location verification
router.post('/login/admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`Admin login attempt for email: ${email}`);
    
    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }
    
    // Check if this email exists in Doctor collection (potential issue)
    const doctorCheck = await Doctor.findOne({ email });
    if (doctorCheck) {
      console.log(`WARNING: Email ${email} exists in both Admin and Doctor collections`);
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, admin.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token with explicit role
    const token = jwt.sign(
      { 
        id: admin._id, 
        email: admin.email,
        role: 'admin'  // Explicitly set role to admin
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      token, 
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

module.exports = router;