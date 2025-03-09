// server/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Doctor = require("../models/Doctor");
const Admin = require("../models/Admin");
const Activity = require("../models/Activity");
const { isWithinHospitalRange } = require("../utils/locationVerifier");
const loginDoctor = async (req, res) => {
  try {
    const { email, password, location, faceData } = req.body;

    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      await logActivity(doctor._id, "LOGIN_FAIL", "Invalid password");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Verify location
    const isLocationValid = isWithinHospitalRange(location);
    if (!isLocationValid) {
      await logActivity(
        doctor._id,
        "LOCATION_VERIFY_FAIL",
        "Location outside hospital range"
      );
      return res.status(400).json({ message: "Location verification failed" });
    }

    // Verify face (Implement actual face recognition)
    const isFaceValid = true; // Placeholder - Replace with actual face verification logic
    if (!isFaceValid) {
      await logActivity(
        doctor._id,
        "FACE_VERIFY_FAIL",
        "Face verification failed"
      );
      return res.status(400).json({ message: "Face verification failed" });
    }

    await logActivity(doctor._id, "LOGIN_SUCCESS", "Login successful");

    const token = jwt.sign(
      { id: doctor._id, role: "doctor" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      doctor: { id: doctor._id, name: doctor.name, email: doctor.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const logActivity = async (doctorId, type, details, location = null) => {
  try {
    await Activity.create({
      doctorId,
      type,
      details,
      location,
    });
  } catch (err) {
    console.error("Error logging activity:", err);
  }
};

// server/controllers/authController.js
// Add this function

// server/controllers/authController.js
// Add this method to handle admin face verification

const verifyAdminFace = async (storedFaceData, capturedFaceData) => {
  // In a production environment, you would:
  // 1. Convert the base64 images to face descriptors using face-api.js on the server
  // 2. Calculate the Euclidean distance between the descriptors
  // 3. Return true if the distance is below a threshold (typically 0.5-0.6)
  
  // For this example, we'll just compare if the data exists
  // and assume the verification passed
  if (storedFaceData && capturedFaceData) {
    return true;
  }
  return false;
};

// Update the loginAdmin function to handle face capture
const loginAdmin = async (req, res) => {
  try {
    const { email, password, faceData } = req.body;
    
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if this is first login (no face data)
    const isFirstLogin = !admin.faceData;
    
    if (isFirstLogin && faceData) {
      // Save face data for future logins
      admin.faceData = faceData;
      await admin.save();
      console.log('Face data saved for admin:', admin.email);
    } else if (!isFirstLogin && faceData) {
      // Verify face data for subsequent logins
      const isFaceValid = await verifyAdminFace(admin.faceData, faceData);
      
      if (!isFaceValid) {
        return res.status(400).json({ message: 'Face verification failed' });
      }
      console.log('Face verification successful for admin:', admin.email);
    }

    // Create JWT token
    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ 
      token, 
      admin: { 
        id: admin._id, 
        name: admin.name, 
        email: admin.email,
        isFirstLogin
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  loginDoctor,
  loginAdmin,
  verifyAdminFace
};