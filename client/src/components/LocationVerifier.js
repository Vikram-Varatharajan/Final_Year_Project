import React, { useState } from 'react';

const LocationVerifier = ({ onLocationUpdate }) => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestLocationAccess = () => {
    setIsLoading(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLoading(false);
      return;
    }

    // Fetching values from .env
    const enableHighAccuracy = process.env.REACT_APP_ENABLE_HIGH_ACCURACY === "true";
    const timeout = parseInt(process.env.REACT_APP_LOCATION_TIMEOUT, 10) || 10000;

    const options = {
      enableHighAccuracy,
      timeout,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        onLocationUpdate(locationData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Unable to retrieve your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred.';
        }
        
        setError(errorMessage);
        setIsLoading(false);
      },
      options
    );
  };

  return (
    <div className="location-verifier p-4 bg-blue-50 rounded text-center">
      {!isLoading && !error && (
        <div>
          <p className="mb-4">For security purposes, we need to verify your location.</p>
          <button 
            onClick={requestLocationAccess}
            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm"
          >
            Allow Location Access
          </button>
        </div>
      )}
      
      {isLoading && (
        <div className="animate-pulse mb-4">
          <p>Determining your location...</p>
          <p className="text-sm text-gray-600 mt-2">
            Please allow location access when prompted by your browser
          </p>
        </div>
      )}
      
      {error && (
        <div className="error text-red-600 mb-2">
          <p>{error}</p>
          <button 
            onClick={requestLocationAccess}
            className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationVerifier;