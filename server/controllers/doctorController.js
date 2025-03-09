// server/controllers/doctorController.js
const Doctor = require('../models/Doctor');
const Activity = require('../models/Activity');
const bcrypt = require('bcryptjs');

const addDoctor = async (req, res) => {
  try {
    const { email, password, name, faceData, hospitalLocation } = req.body;

    let doctor = await Doctor.findOne({ email });
    if (doctor) {
      return res.status(400).json({ message: 'Doctor already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    doctor = new Doctor({
      email,
      password: hashedPassword,
      name,
      faceData,
      hospitalLocation
    });

    await doctor.save();
    res.json({ message: 'Doctor added successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getDoctorActivities = async (req, res) => {
  try {
    const activities = await Activity.find({ doctorId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addDoctor,
  getDoctorActivities
};