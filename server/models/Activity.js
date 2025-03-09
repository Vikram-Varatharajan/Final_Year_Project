// server/models/Activity.js
const mongoose = require("mongoose");
const activitySchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    type: {
      type: String,
      enum: [
        "LOGIN_SUCCESS",
        "LOGIN_FAIL",
        "FACE_VERIFY_FAIL",
        "LOCATION_VERIFY_FAIL",
        "FACE_DATA_STORED",
        "FACE_VERIFY_SUCCESS"
      ],
    },
    details: String,
    location: {
      latitude: Number,
      longitude: Number,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Activity", activitySchema);
