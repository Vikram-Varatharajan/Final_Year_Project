// server/utils/faceVerifier.js
const faceapi = require('face-api.js');

class FaceVerifier {
  /**
   * Compare two face descriptors
   * @param {string|number[]} storedDescriptor - Stored face descriptor (possibly Base64 encoded)
   * @param {string|number[]} incomingDescriptor - Incoming face descriptor
   * @param {number} threshold - Similarity threshold (lower means stricter matching)
   * @returns {boolean} - Whether the faces match
   */
  compareFaceDescriptors(storedDescriptor, incomingDescriptor, threshold = 0.6) {
    try {
      console.log('Comparing face descriptors...');
      
      // Handle stored descriptor (from database)
      let parsedStored;
      if (typeof storedDescriptor === 'string') {
        try {
          // Check if it's Base64 encoded
          if (/^[A-Za-z0-9+/=]+$/.test(storedDescriptor)) {
            // Decode Base64 to JSON string
            const jsonString = Buffer.from(storedDescriptor, 'base64').toString();
            // Parse JSON string to array
            parsedStored = JSON.parse(jsonString);
          } else {
            // Try direct JSON parsing as fallback
            parsedStored = JSON.parse(storedDescriptor);
          }
          console.log('Successfully parsed stored descriptor');
        } catch (e) {
          console.error('Face descriptor parsing error:', e);
          console.error('Raw stored descriptor (first 50 chars):', storedDescriptor.substring(0, 50));
          return false;
        }
      } else {
        parsedStored = storedDescriptor;
      }
      
      // Handle incoming descriptor (from current verification)
      let parsedIncoming;
      if (typeof incomingDescriptor === 'string') {
        try {
          // Check if it's Base64 encoded
          if (/^[A-Za-z0-9+/=]+$/.test(incomingDescriptor)) {
            const jsonString = Buffer.from(incomingDescriptor, 'base64').toString();
            parsedIncoming = JSON.parse(jsonString);
          } else {
            parsedIncoming = JSON.parse(incomingDescriptor);
          }
          console.log('Successfully parsed incoming descriptor');
        } catch (e) {
          console.error('Face descriptor parsing error:', e);
          console.error('Raw incoming descriptor (first 50 chars):', incomingDescriptor.substring(0, 50));
          return false;
        }
      } else {
        parsedIncoming = incomingDescriptor;
      }
      
      // Convert to Float32Array if needed
      const stored = parsedStored instanceof Float32Array ? 
        parsedStored : new Float32Array(parsedStored);
      const incoming = parsedIncoming instanceof Float32Array ? 
        parsedIncoming : new Float32Array(parsedIncoming);

      // Log descriptor information for debugging
      console.log(`Stored descriptor type: ${typeof parsedStored}, length: ${stored.length}`);
      console.log(`Incoming descriptor type: ${typeof parsedIncoming}, length: ${incoming.length}`);

      // Verify both descriptors have the same length
      if (stored.length !== incoming.length) {
        console.error(`Descriptor length mismatch: stored=${stored.length}, incoming=${incoming.length}`);
        return false;
      }

      // Calculate Euclidean distance between descriptors
      const distance = this.calculateEuclideanDistance(stored, incoming);
      console.log(`Face match distance: ${distance}, threshold: ${threshold}`);
      
      // Lower distance means more similar
      return distance <= threshold;
    } catch (error) {
      console.error('Face descriptor comparison error:', error);
      return false;
    }
  }

  /**
   * Calculate Euclidean distance between two descriptors
   * @param {Float32Array} descriptor1 
   * @param {Float32Array} descriptor2 
   * @returns {number} - Euclidean distance
   */
  calculateEuclideanDistance(descriptor1, descriptor2) {
    if (descriptor1.length !== descriptor2.length) {
      throw new Error('Descriptors must have the same length');
    }

    let squaredDiffSum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
      const diff = descriptor1[i] - descriptor2[i];
      squaredDiffSum += diff * diff;
    }

    return Math.sqrt(squaredDiffSum);
  }
  
  /**
   * Process and standardize a face descriptor
   * @param {any} descriptor - Face descriptor in any format
   * @returns {string} - Base64 encoded JSON string
   */
  processDescriptor(descriptor) {
    try {
      // Convert to array if needed
      const descriptorArray = descriptor instanceof Float32Array ? 
        Array.from(descriptor) : descriptor;
      
      // Convert to JSON string
      const jsonString = JSON.stringify(descriptorArray);
      
      // Convert to Base64 for storage
      return Buffer.from(jsonString).toString('base64');
    } catch (error) {
      console.error('Error processing face descriptor:', error);
      throw error;
    }
  }
  
  /**
   * Validate a face descriptor to ensure it's in proper format
   * @param {any} descriptor - Face descriptor to validate
   * @returns {boolean} - Whether the descriptor is valid
   */
  validateDescriptor(descriptor) {
    try {
      if (!descriptor) return false;
      
      // If it's already an array or Float32Array
      if (Array.isArray(descriptor) || descriptor instanceof Float32Array) {
        return descriptor.length > 0;
      }
      
      // If it's a string (possibly JSON or Base64)
      if (typeof descriptor === 'string') {
        try {
          // Try parsing as JSON first
          const parsed = JSON.parse(descriptor);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch (e) {
          // If not valid JSON, try Base64
          try {
            const decoded = Buffer.from(descriptor, 'base64').toString();
            const parsed = JSON.parse(decoded);
            return Array.isArray(parsed) && parsed.length > 0;
          } catch (e2) {
            console.error('Invalid face descriptor format');
            return false;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error validating face descriptor:', error);
      return false;
    }
  }
}

module.exports = new FaceVerifier();