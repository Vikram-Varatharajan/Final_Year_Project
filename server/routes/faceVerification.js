const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Activity = require('../models/Activity');
const faceVerifier = require('../utils/faceVerifier');

// Middleware to verify token for any user
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ success: false, message: 'No token provided' });
  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    console.log("Decoded token content:", JSON.stringify(decoded));
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

// POST /api/face/store - Store face data for any user (admin or doctor)
router.post('/store', verifyToken, async (req, res) => {
  try {
    // Get authenticated user from token
    const authenticatedUserId = req.user.id;
    const authenticatedEmail = req.user.email;
    const authenticatedRole = req.user.role;
    
    // Get target user (who we're storing face data for) from request body
    const targetEmail = req.body.email || authenticatedEmail;
    const targetRole = req.body.userType || authenticatedRole || 'doctor';
    const { faceDescriptor } = req.body;
    
    console.log(`Authenticated user: ${authenticatedEmail} (${authenticatedRole})`);
    console.log(`Storing face data for user: ${targetEmail}, role: ${targetRole}`);
    
    // Security check - only allow storing face data for yourself unless you're an admin
    if (targetEmail !== authenticatedEmail && authenticatedRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only store face data for your own account' 
      });
    }
    
    let user;
    if (targetRole === 'admin') {
      user = await Admin.findOne({ email: targetEmail });
      console.log("Admin found:", user ? "Yes" : "No");
    } else {
      user = await Doctor.findOne({ email: targetEmail });
      console.log("Doctor found:", user ? "Yes" : "No");
    }
    
    if (!user) {
      console.log(`No ${targetRole} found with email: ${targetEmail}`);
      return res.status(404).json({ 
        success: false, 
        message: `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} not found` 
      });
    }
    
    // Validate and process the face descriptor before storing
    if (!faceVerifier.validateDescriptor(faceDescriptor)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid face descriptor format'
      });
    }
    
    // Process and standardize the face descriptor for storage
    try {
      // Store the original descriptor format for now to maintain compatibility
      user.faceData = faceDescriptor;
      await user.save();
      console.log(`Face data stored for ${targetRole}: ${targetEmail}`);
    } catch (error) {
      console.error('Error processing face data:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing face data'
      });
    }
    
    await Activity.create({
      userId: user._id,
      userType: targetRole.toUpperCase(),
      type: 'FACE_DATA_STORED',
      details: `Face data stored for ${targetRole} ${targetEmail}`
    });
    
    res.json({ success: true, message: 'Face data stored successfully' });
  } catch (error) {
    console.error('Face data storage error:', error);
    res.status(500).json({ success: false, message: 'Server error while storing face data' });
  }
});

// POST /api/face/verify - Verify face for login
router.post('/verify', async (req, res) => {
  try {
    const { email, faceDescriptor, userType = 'doctor' } = req.body;
    console.log(`Verifying face for ${userType} with email: ${email}`);
    
    let user;
    if (userType.toLowerCase() === 'admin') {
      user = await Admin.findOne({ email });
    } else {
      user = await Doctor.findOne({ email });
      console.log(`Doctor lookup result for ${email}:`, user ? "Found" : "Not Found");
    }
    
    if (!user) {
      console.log(`No ${userType} found with email: ${email}`);
      return res.status(404).json({ 
        success: false, 
        message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} not found` 
      });
    }
    
    if (!user.faceData) {
      console.log(`No face data found for ${userType}: ${email}`);
      return res.status(400).json({ 
        success: false, 
        message: 'No face data is stored for this user. Please set up face verification first.' 
      });
    }

    // Log what we're working with (for debugging)
    console.log("Face data format check");
    console.log("Stored data type:", typeof user.faceData);
    console.log("Stored data sample:", typeof user.faceData === 'string' ? user.faceData.substring(0, 50) + "..." : "Non-string data");
    console.log("Received data type:", typeof faceDescriptor);
    console.log("Received data sample:", typeof faceDescriptor === 'string' ? faceDescriptor.substring(0, 50) + "..." : "Non-string data");
    
    // Use the FaceVerifier to compare descriptors - no need to manually parse
    const isMatch = faceVerifier.compareFaceDescriptors(user.faceData, faceDescriptor);
    console.log(`Face verification result for ${userType} ${email}: ${isMatch ? 'Match' : 'No match'}`);
    
    if (!isMatch) {
      await Activity.create({
        userId: user._id,
        userType: userType.toUpperCase(),
        type: 'FACE_VERIFY_FAIL',
        details: `Failed face verification attempt for ${userType} ${email}`
      });
      return res.status(401).json({ success: false, message: 'Face verification failed' });
    }
    
    await Activity.create({
      userId: user._id,
      userType: userType.toUpperCase(),
      type: 'FACE_VERIFY_SUCCESS',
      details: `Successful face verification for ${userType} ${email}`
    });
    
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: userType.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      success: true, 
      message: 'Face verified successfully', 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        role: userType.toLowerCase(), 
        name: user.name || user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() 
      } 
    });
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during face verification' });
  }
});

// GET /api/face/status - Check if user has face data stored
router.get('/status', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userRole = req.user.role;
    
    let user;
    if (userRole === 'admin') {
      user = await Admin.findOne({ email: userEmail });
    } else {
      user = await Doctor.findOne({ email: userEmail });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const hasFaceData = !!user.faceData;
    res.json({ 
      success: true, 
      hasFaceData, 
      message: hasFaceData ? 'Face data is configured for this user' : 'No face data found for this user' 
    });
  } catch (error) {
    console.error('Face status check error:', error);
    res.status(500).json({ success: false, message: 'Server error during face status check' });
  }
});

// DELETE /api/face/reset - Reset user's face data
router.delete('/reset', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userRole = req.user.role;
    
    let user;
    if (userRole === 'admin') {
      user = await Admin.findOne({ email: userEmail });
    } else {
      user = await Doctor.findOne({ email: userEmail });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.faceData = null;
    await user.save();
    
    await Activity.create({
      userId: user._id,
      userType: userRole.toUpperCase(),
      type: 'FACE_DATA_RESET',
      details: `Face data reset for ${userRole} ${userEmail}`
    });
    
    res.json({ success: true, message: 'Face data has been reset successfully' });
  } catch (error) {
    console.error('Face data reset error:', error);
    res.status(500).json({ success: false, message: 'Server error during face data reset' });
  }
});

module.exports = router;