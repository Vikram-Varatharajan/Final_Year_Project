// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['doctor', 'admin'], 
    required: true 
  },
  faceData: { 
    type: String, 
    required: true 
  },
  hospitalLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  // Doctor-specific fields
  totalLeaves: { 
    type: Number, 
    default: function() { 
      return this.role === 'doctor' ? 20 : 0; 
    }
  },
  usedLeaves: { 
    type: Number, 
    default: 0 
  },
  // Admin-specific fields if needed
  department: { 
    type: String, 
    default: null 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);