
import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const FaceRecognition = ({ onVerification, isRegistration = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('');
  
  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      setDetectionMessage('Loading face detection models...');
      
      try {
        // Adjust path according to where you host your models
        const MODEL_URL = '/models';
        
        // Wait for all models to load
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        // Start video stream after models are loaded
        startVideo();
      } catch (error) {
        console.error('Error loading models:', error);
        setDetectionMessage('Error loading face detection models');
      }
    };
    
    loadModels();
    
    // Cleanup on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  
  // Start video stream from user's camera
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
          setDetectionMessage(isRegistration ? 'Position your face for registration' : 'Position your face for verification');
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setDetectionMessage('Error accessing camera. Please allow camera permissions.');
    }
  };
  
  // Start face detection when button is clicked
  const startDetection = async () => {
    if (isDetecting || isLoading) return;
    
    setIsDetecting(true);
    setDetectionMessage(isRegistration ? 'Registering face...' : 'Verifying face...');
    
    try {
      // Ensure video is playing
      if (videoRef.current && videoRef.current.paused) {
        await videoRef.current.play();
      }
      
      // Detect faces
      const detections = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();
      
      if (!detections) {
        setDetectionMessage('No face detected. Please try again.');
        setIsDetecting(false);
        return;
      }
      
      // Draw detections on canvas
      if (canvasRef.current) {
        const displaySize = { 
          width: videoRef.current.width, 
          height: videoRef.current.height 
        };
        faceapi.matchDimensions(canvasRef.current, displaySize);
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw the detection box
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        
        // Draw face landmarks
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
      }
      
      // Pass the face descriptor to parent component
      onVerification(detections.descriptor);
      
      // Set success message
      setDetectionMessage(isRegistration ? 'Face registered successfully!' : 'Face verified successfully!');
      
      // Clean up camera after a short delay
      setTimeout(() => {
        if (videoRef.current && videoRef.current.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
        }
      }, 2000);
      
    } catch (error) {
      console.error('Face detection error:', error);
      setDetectionMessage('Error during face detection. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-4 rounded overflow-hidden">
        <video 
          ref={videoRef}
          width="400" 
          height="300" 
          autoPlay 
          muted 
          playsInline
          className="transform scale-x-[-1]" // Mirror the video (selfie mode)
        />
        <canvas 
          ref={canvasRef} 
          width="400" 
          height="300"
          className="absolute top-0 left-0 transform scale-x-[-1]" // Mirror the canvas too
        />
      </div>
      
      <p className="text-center text-gray-700 mb-4">{detectionMessage}</p>
      
      <button
        onClick={startDetection}
        disabled={isLoading || isDetecting}
        className={`w-full py-2 px-4 border border-transparent rounded-md font-medium text-white
          ${isLoading || isDetecting 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
      >
        {isRegistration 
          ? (isDetecting ? 'Registering...' : 'Register Face') 
          : (isDetecting ? 'Verifying...' : 'Verify Face')}
      </button>
    </div>
  );
};

export default FaceRecognition;