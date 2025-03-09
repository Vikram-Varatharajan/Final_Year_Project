// server/routes/doctors.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Doctor = require('../models/Doctor');
const Activity = require('../models/Activity');

// Middleware for role verification (similar to auth routes)
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ success: false, message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.doctorId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

// POST /api/doctors/ - Add a new doctor (Admin only)
router.post('/', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      name, 
      faceData, 
      hospitalLocation 
    } = req.body;

    // Check if doctor already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Doctor with this email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new doctor
    const newDoctor = new Doctor({
      email,
      password: hashedPassword,
      name,
      faceData: null, // Store face descriptor as string
      hospitalLocation,
      totalLeaves: 20,
      usedLeaves: 0
    });

    await newDoctor.save();

    res.status(201).json({ 
      success: true, 
      message: 'Doctor added successfully',
      doctor: {
        id: newDoctor._id,
        name: newDoctor.name,
        email: newDoctor.email
      }
    });
  } catch (error) {
    console.error('Add doctor error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while adding doctor' 
    });
  }
});
router.get('/', async (req, res) => {
    try {
      const doctors = await Doctor.find().select('-password -faceData');
      res.json(doctors);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

// GET /api/doctors/activities - Fetch doctor's activities
router.get('/activities', verifyToken, async (req, res) => {
  try {
    // Fetch activities for the authenticated doctor
    const activities = await Activity.find({ 
      doctorId: req.doctorId 
    }).sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Fetch activities error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching activities' 
    });
  }
});

module.exports = router;