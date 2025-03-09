import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceCapture = ({ onCapture, userRole, autoStart = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const [error, setError] = useState('');

  // Skip face capture for admins
  useEffect(() => {
    if (userRole === 'admin') {
      onCapture({ skipFaceVerification: true });
      return;
    }
    
    // Load face detection models
    const loadModels = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setIsLoading(false);
        setIsReady(true);
        
        if (autoStart) {
          startCamera();
        }
      } catch (err) {
        console.error('Error loading face recognition models:', err);
        setIsLoading(false);
        setError('Failed to load face recognition models. Please refresh and try again.');
      }
    };
    
    loadModels();
    
    // Clean up when component unmounts
    return () => {
      stopCamera();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [userRole, autoStart, onCapture]);

  const startCamera = async () => {
    try {
      setError('');
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
            setError('Could not start video preview. Please check camera permissions.');
          });
          
          streamRef.current = stream;
          setIsCameraActive(true);
          
          // Wait for video to be ready before starting face detection
          videoRef.current.onloadedmetadata = () => {
            startFaceDetection();
          };
        }
      } else {
        setError('Your browser does not support camera access');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
  };

  const startFaceDetection = () => {
    // Run face detection every 500ms
    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const detections = await faceapi.detectAllFaces(videoRef.current);
          setFaceDetected(detections.length > 0);
        } catch (err) {
          console.error('Error detecting faces:', err);
        }
      }
    }, 500);
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready. Please try again.');
      return;
    }
    
    try {
      // Detect if there's a face in the frame
      const detections = await faceapi.detectAllFaces(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      if (!detections || detections.length === 0) {
        setError('No face detected. Please position your face clearly in the frame and try again.');
        return;
      }
      
      // Get the first face detected
      const detection = detections[0];
      
      // Draw the image to canvas
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Get the data URL
      const imageData = canvas.toDataURL('image/png');
      setCapturedImage(imageData);
      
      // Prepare data for parent component
      const faceData = {
        faceDescriptor: Array.from(detection.descriptor),
        imageData
      };
      
      // Pass the face descriptor and image data to parent
      onCapture(faceData);
      
      // Stop the camera after successful capture
      stopCamera();
    } catch (err) {
      console.error('Error capturing face:', err);
      setError('Error capturing face: ' + err.message);
    }
  };

  // If user is admin, don't render the component
  if (userRole === 'admin') {
    return <div>No face verification required for Admin users</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-600">Loading face recognition models...</p>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Face Verification</h3>
          
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
              <button
                className="absolute top-0 right-0 px-4 py-3"
                onClick={() => setError('')}
              >
                <span className="sr-only">Close</span>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          
          {!isCameraActive && capturedImage && (
            <div className="mb-4">
              <div className="relative w-full max-w-sm mx-auto rounded-lg overflow-hidden shadow-md">
                <img 
                  src={capturedImage} 
                  alt="Captured face" 
                  className="w-full"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-green-100 text-green-800 px-3 py-1 text-sm">
                  Face captured successfully
                </div>
              </div>
            </div>
          )}
          
          {!isCameraActive && !capturedImage && (
            <button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={startCamera}
              disabled={!isReady}
            >
              Start Camera
            </button>
          )}
          
          {isCameraActive && (
            <>
              <div className="relative mb-4 border-2 rounded-lg overflow-hidden" style={{ minHeight: "300px" }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full h-full object-cover"
                  style={{ minHeight: "300px" }}
                />
                
                {faceDetected && (
                  <div className="absolute bottom-2 left-2 bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm">
                    Face detected
                  </div>
                )}
                
                {!faceDetected && isCameraActive && (
                  <div className="absolute bottom-2 left-2 bg-red-100 text-red-800 px-2 py-1 rounded-md text-sm">
                    No face detected
                  </div>
                )}
              </div>
              
              <canvas 
                ref={canvasRef} 
                style={{ display: 'none' }} 
              />
              
              <div className="flex space-x-2">
                <button 
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md focus:outline-none"
                  onClick={stopCamera}
                  type="button"
                >
                  Cancel
                </button>
                
                <button 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={captureImage}
                  disabled={!faceDetected}
                  type="button"
                >
                  Submit
                </button>
              </div>
              
              <p className="mt-4 text-sm text-gray-600">
                Please position your face clearly in the frame and look directly at the camera.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FaceCapture;