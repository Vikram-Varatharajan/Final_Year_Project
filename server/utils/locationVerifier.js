  // server/utils/locationVerifier.js
  require('dotenv').config(); // Load environment variables

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

function isWithinHospitalRange(doctorLocation) {
  const maxDistance = process.env.MAX_DISTANCE ? parseInt(process.env.MAX_DISTANCE, 10) : 100;
  const hospitalLat = process.env.HOSPITAL_LAT ? parseFloat(process.env.HOSPITAL_LAT) : null;
  const hospitalLon = process.env.HOSPITAL_LON ? parseFloat(process.env.HOSPITAL_LON) : null;

  if (!hospitalLat || !hospitalLon) {
    console.error("Hospital coordinates are not set in .env file");
    return false;
  }

  const { latitude, longitude } = doctorLocation;

  // Calculate distance from hospital
  const distance = calculateDistance(latitude, longitude, hospitalLat, hospitalLon);

  console.log(`Doctor's distance from hospital: ${distance.toFixed(2)} meters`);

  return distance <= maxDistance;
}

module.exports = { isWithinHospitalRange };
