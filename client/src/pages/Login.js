import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FaceRecognition from "../components/FaceRecognition";
import LocationVerifier from "../components/LocationVerifier";
import api from "../utils/api";

const DoctorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginStage, setLoginStage] = useState("credentials");
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [doctorId, setDoctorId] = useState(null);
  const { login, setLoading } = useAuth();
  const navigate = useNavigate();

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Please enter your email and password");
      return;
    }

    try {
      setLoading(true);
      // First, check credentials only with explicit user type
      const credentialResponse = await api.post("/auth/check-credentials", {
        email,
        password,
        userType: "doctor", // Explicitly specify doctor role
      });

      if (credentialResponse.data.success) {
        // Store temporary token for subsequent requests
        localStorage.setItem("tempToken", credentialResponse.data.tempToken);

        // Store doctor ID for face registration if needed
        setDoctorId(credentialResponse.data.doctorId);

        // Check if face data exists
        if (!credentialResponse.data.hasFaceData) {
          // If no face data, go to face registration flow
          setIsFirstLogin(true);
          setLoginStage("face-registration");
        } else {
          // If face data exists, go to face verification
          setLoginStage("face");
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  // In DoctorLogin.js
  const handleFaceRegistration = async (faceDescriptor) => {
    try {
      setLoading(true);

      // Convert face descriptor to array and then to JSON string
      const descriptorArray = Array.from(faceDescriptor);
      const jsonString = JSON.stringify(descriptorArray);

      // Convert to Base64 for safer storage/transmission
      const base64String = btoa(jsonString);

      // Store this for the final login request
      localStorage.setItem("faceDescriptor", base64String);

      // Send the Base64 encoded string to the server
      const registrationResponse = await api.post(
        "/face/store",
        {
          faceDescriptor: base64String,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("tempToken")}`,
          },
        }
      );

      if (registrationResponse.data.success) {
        setLoginStage("location");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Face registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFaceVerification = async (faceDescriptor) => {
    try {
      setLoading(true);

      // Convert to array, stringify, then Base64 encode
      const descriptorArray = Array.from(faceDescriptor);
      const jsonString = JSON.stringify(descriptorArray);
      const base64String = btoa(jsonString);

      // Store this for the final login request
      localStorage.setItem("faceDescriptor", base64String);

      // Verify face with Base64 encoded data
      const faceResponse = await api.post("/face/verify", {
        email,
        faceDescriptor: base64String,
        userType: "doctor",
      });

      if (faceResponse.data.success) {
        setLoginStage("location");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Face verification failed");
    } finally {
      setLoading(false);
    }
  };
  const handleLocationUpdate = async (locationData) => {
    try {
      setLoading(true);
      // Final login with all verification steps - explicitly call doctor login
      const loginResponse = await api.post("auth/login/doctor", {
        email,
        password,
        location: locationData,
        faceData: {
          faceDescriptor: localStorage.getItem("faceDescriptor"),
        },
        userType: "doctor", // Explicitly specify doctor role
      });

      if (loginResponse.data.success) {
        // Clean up any temporary tokens and data
        localStorage.removeItem("tempToken");
        localStorage.removeItem("faceDescriptor");

        // Set the full authentication
        login(loginResponse.data);
        navigate("/doctor-dashboard");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Login failed");
      // Reset to initial stage on failure
      setLoginStage("credentials");
    } finally {
      setLoading(false);
    }
  };

  const renderLoginContent = () => {
    switch (loginStage) {
      case "location":
        return (
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Location Verification
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Please allow location access to verify you are within the hospital
              premises.
            </p>
            <LocationVerifier onLocationUpdate={handleLocationUpdate} />
          </div>
        );

      case "face-registration":
        return (
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Face Registration
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              We need to register your face for future logins. Please look
              directly at the camera.
            </p>
            <FaceRecognition
              onVerification={handleFaceRegistration}
              isRegistration={true}
            />
          </div>
        );

      case "face":
        return (
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Face Verification
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Please look directly at the camera for verification.
            </p>
            <FaceRecognition onVerification={handleFaceVerification} />
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <form className="space-y-6" onSubmit={handleCredentialsSubmit}>
              <div className="rounded-md shadow-sm -space-y-px">
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Next
                </button>
              </div>
            </form>

            {/* Admin Login Button */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Are you an admin?</p>
              <button
                onClick={() => navigate("/admin-login")}
                className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Admin Login
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Doctor Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isFirstLogin
              ? "Welcome! Let's set up your account"
              : "Please complete all verification steps"}
          </p>
        </div>
        {renderLoginContent()}
      </div>
    </div>
  );
};

export default DoctorLogin;
