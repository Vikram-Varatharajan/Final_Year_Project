  const express = require('express');
  const router = express.Router();
  const Doctor = require('../models/Doctor');
  const Activity = require('../models/Activity');
  const bcrypt = require('bcryptjs');
  const auth = require('../middleware/auth');
  const roleCheck = require('../middleware/roleCheck');

  // Apply middleware to all routes
  router.use(auth);
  router.use(roleCheck('admin'));

  // Get all doctors
  router.get('/doctors', async (req, res) => {
    try {
      const doctors = await Doctor.find().select('-password -faceData');
      res.json(doctors);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get a specific doctor
  router.get('/doctors/:id', async (req, res) => {
    try {
      const doctor = await Doctor.findById(req.params.id).select('-password -faceData');
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      res.json(doctor);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/doctors', async (req, res) => {
    try {
      console.log('Starting doctor creation process');
      const { email, password, name, hospitalLocation, totalLeaves } = req.body;
      console.log('Extracted request data');

      // Check if doctor already exists
      console.log('Checking for existing doctor');
      let doctor = await Doctor.findOne({ email });
      console.log('Database query completed');
      
      if (doctor) {
        return res.status(400).json({ message: 'Doctor already exists' });
      }

      // Hash password
      console.log('Starting password hashing');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      console.log('Password hashing completed');

      // Create doctor object
      console.log('Creating doctor object');
      doctor = new Doctor({
        email,
        password: hashedPassword,
        name,
        hospitalLocation: {
          latitude: hospitalLocation?.latitude || 0,
          longitude: hospitalLocation?.longitude || 0
        },
        totalLeaves: totalLeaves || 20
      });
      
      console.log('Saving doctor to database');
      await doctor.save();
      console.log('Doctor saved successfully');
      
      res.status(201).json({ 
        message: 'Doctor added successfully', 
        id: doctor._id 
      });
    } catch (err) {
      console.error('Add doctor error:', err);
      res.status(500).json({ message: 'Server error: ' + err.message });
    }
  });
  // Update a doctor
  router.put('/doctors/:id', async (req, res) => {
    try {
      const { name, email, hospitalLocation, totalLeaves } = req.body;
      const updateFields = {};
      
      if (name) updateFields.name = name;
      if (email) updateFields.email = email;
      if (hospitalLocation) {
        updateFields.hospitalLocation = {
          latitude: hospitalLocation.latitude || 0,
          longitude: hospitalLocation.longitude || 0
        };
      }
      if (totalLeaves) updateFields.totalLeaves = totalLeaves;

      const doctor = await Doctor.findByIdAndUpdate(
        req.params.id,
        { $set: updateFields },
        { new: true }
      ).select('-password -faceData');

      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      res.json(doctor);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete a doctor
  router.delete('/doctors/:id', async (req, res) => {
    try {
      const doctor = await Doctor.findById(req.params.id);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      await Doctor.findByIdAndDelete(req.params.id);
      // Delete related activities
      await Activity.deleteMany({ doctorId: req.params.id });
      
      res.json({ message: 'Doctor removed successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Reset doctor's password
  router.post('/doctors/:id/reset-password', async (req, res) => {
    try {
      const { newPassword } = req.body;
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      const doctor = await Doctor.findByIdAndUpdate(
        req.params.id,
        { $set: { password: hashedPassword } },
        { new: true }
      ).select('-password -faceData');

      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get suspicious activities
  router.get('/activities', async (req, res) => {
    try {
      const activities = await Activity.find({
        type: { $in: ['LOGIN_FAIL', 'FACE_VERIFY_FAIL', 'LOCATION_VERIFY_FAIL'] }
      })
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 });
      
      res.json(activities);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get all activities for a specific doctor
  router.get('/doctors/:id/activities', async (req, res) => {
    try {
      const activities = await Activity.find({ doctorId: req.params.id })
        .sort({ createdAt: -1 });
      
      res.json(activities);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get dashboard stats
  router.get('/stats', async (req, res) => {
    try {
      const totalDoctors = await Doctor.countDocuments();
      const totalActivities = await Activity.countDocuments();
      const suspiciousActivities = await Activity.countDocuments({
        type: { $in: ['LOGIN_FAIL', 'FACE_VERIFY_FAIL', 'LOCATION_VERIFY_FAIL'] }
      });
      
      // Get counts by activity type
      const activityCounts = await Activity.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);
      
      // Format the activity counts into an object
      const activityStats = {};
      activityCounts.forEach(item => {
        activityStats[item._id] = item.count;
      });
      
      res.json({
        totalDoctors,
        totalActivities,
        suspiciousActivities,
        activityStats,
        successRate: totalActivities > 0 
          ? (((totalActivities - suspiciousActivities) / totalActivities) * 100).toFixed(2) 
          : 100
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update doctor's face data
  router.put('/doctors/:id/face', async (req, res) => {
    try {
      const { faceData } = req.body;
      
      const doctor = await Doctor.findByIdAndUpdate(
        req.params.id,
        { $set: { faceData } },
        { new: true }
      ).select('-password -faceData');

      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      res.json({ message: 'Face data updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update doctor's hospital location
  router.put('/doctors/:id/location', async (req, res) => {
    try {
      const { hospitalLocation } = req.body;
      
      const doctor = await Doctor.findByIdAndUpdate(
        req.params.id,
        { $set: { 
          hospitalLocation: {
            latitude: hospitalLocation.latitude || 0,
            longitude: hospitalLocation.longitude || 0
          } 
        }},
        { new: true }
      ).select('-password -faceData');

      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      res.json(doctor);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  module.exports = router;