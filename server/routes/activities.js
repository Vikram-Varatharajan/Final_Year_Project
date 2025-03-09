// server/routes/activities.js
const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Get activities with pagination (admin only)
router.get('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    // Get page number from query params (default to 1)
    const page = parseInt(req.query.page) || 1;
    // Get limit from query params (default to 10)
    const limit = parseInt(req.query.limit) || 10;
    // Calculate skip count
    const skip = (page - 1) * limit;

    // Count total documents for pagination info
    const totalActivities = await Activity.countDocuments();
    
    const activities = await Activity.find()
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      activities,
      currentPage: page,
      totalPages: Math.ceil(totalActivities / limit),
      totalActivities
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get suspicious activities with pagination (admin only)
router.get('/suspicious', auth, roleCheck('admin'), async (req, res) => {
  try {
    // Get page number from query params (default to 1)
    const page = parseInt(req.query.page) || 1;
    // Get limit from query params (default to 10)
    const limit = parseInt(req.query.limit) || 10;
    // Calculate skip count
    const skip = (page - 1) * limit;

    // Count total suspicious documents for pagination info
    const totalSuspicious = await Activity.countDocuments({
      type: { $in: ['LOGIN_FAIL', 'FACE_VERIFY_FAIL', 'LOCATION_VERIFY_FAIL'] }
    });
    
    const activities = await Activity.find({
      type: { $in: ['LOGIN_FAIL', 'FACE_VERIFY_FAIL', 'LOCATION_VERIFY_FAIL'] }
    })
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      activities,
      currentPage: page,
      totalPages: Math.ceil(totalSuspicious / limit),
      totalActivities: totalSuspicious
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;