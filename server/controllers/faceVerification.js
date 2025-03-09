// server/controllers/faceVerification.js
const Doctor = require('../models/Doctor');
const Activity = require('../models/Activity');
const FaceVerifier = require('../utils/faceVerifier');

module.exports = {
  // Store face descriptor during doctor registration
  storeFaceData: async (req, res) => {
    try {
      const { doctorId, faceDescriptor } = req.body;
      
      if (!doctorId || !faceDescriptor) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Store the face descriptor string directly
      // If it's already a Base64 string, no need to modify it
      // If it's an array or object, stringify it
      const descriptorToStore = typeof faceDescriptor === 'string' ? 
        faceDescriptor : JSON.stringify(faceDescriptor);
      
      await Doctor.findByIdAndUpdate(doctorId, {
        faceData: descriptorToStore
      });
      
      console.log(`Face data stored for doctor ID: ${doctorId}`);
      res.status(200).json({ message: 'Face data stored successfully' });
    } catch (error) {
      console.error('Error storing face data:', error);
      res.status(500).json({ message: 'Error storing face data' });
    }
  },
  
  // Verify face during login
  verifyFace: async (req, res) => {
    try {
      const { email, faceDescriptor, location } = req.body;
      
      if (!email || !faceDescriptor || !location) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      console.log(`Verifying face for doctor with email: ${email}`);
      
      // Find doctor by email
      const doctor = await Doctor.findOne({ email });
      if (!doctor) {
        console.log(`Doctor lookup result for ${email}: Not found`);
        return res.status(404).json({ message: 'Doctor not found' });
      }
      
      console.log(`Doctor lookup result for ${email}: Found`);
      
      if (!doctor.faceData) {
        console.log(`No face data stored for doctor with email: ${email}`);
        return res.status(400).json({ message: 'No face data registered for this doctor' });
      }
      
      // Use the FaceVerifier class for comparison
      const isMatch = FaceVerifier.compareFaceDescriptors(
        doctor.faceData, 
        faceDescriptor,
        0.6 // Threshold
      );
      
      console.log(`Face verification result for doctor ${email}: ${isMatch ? 'Match' : 'No match'}`);
      
      // Log the verification attempt
      await Activity.create({
        doctorId: doctor._id,
        type: isMatch ? 'LOGIN_SUCCESS' : 'FACE_VERIFY_FAIL',
        details: isMatch ? 'Face verified successfully' : 'Face verification failed',
        location
      });
      
      if (!isMatch) {
        return res.status(401).json({ 
          message: 'Face verification failed', 
          verificationSuccess: false 
        });
      }
      
      res.status(200).json({ 
        message: 'Face verified successfully', 
        verificationSuccess: true,
        doctor: {
          id: doctor._id,
          name: doctor.name,
          email: doctor.email
        }
      });
    } catch (error) {
      console.error('Error verifying face:', error);
      res.status(500).json({ message: 'Error verifying face' });
    }
  }
};