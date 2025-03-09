const express = require('express');
const mongoose = require('mongoose');
const corsMiddleware = require('./middleware/cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Apply CORS middleware BEFORE other middlewares
app.use(corsMiddleware);

// Other middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const adminRoutes = require('./routes/admin');
const activityRoutes = require('./routes/activities');
const faceVerification = require('./routes/faceVerification')
// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/face',faceVerification)
// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});