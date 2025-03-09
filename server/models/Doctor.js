// server/models/Doctor.js
const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    faceData: { type: String, required: false }, // Base64 encoded face data
    location: {
      latitude: Number,
      longitude: Number,
    },
    hospitalLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
