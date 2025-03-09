// client/src/utils/auth.js
import api from './api';

/**
 * Auth utility functions for managing user authentication
 */

// Token management
const TOKEN_KEY = 'doctor_attendance_token';
const USER_KEY = 'doctor_attendance_user';

/**
 * Store authentication token and user data
 * @param {Object} data - Authentication response containing token and user data
 */
export const setAuth = (data) => {
  if (data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
    if (data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    // Set default Authorization header for all future requests
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
  }
};

/**
 * Remove authentication data from local storage
 */
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  delete api.defaults.headers.common['Authorization'];
};

/**
 * Get stored authentication token
 * @returns {string|null} Authentication token or null if not found
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Get stored user data
 * @returns {Object|null} User data object or null if not found
 */
export const getStoredUser = () => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

/**
 * Login user
 * @param {Object} credentials - User login credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @param {Object} credentials.location - User's current location
 * @param {Object} credentials.faceData - Face recognition data
 * @returns {Promise} Login response
 */
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      setAuth(response.data);
    }
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

/**
 * Logout user
 */
export const logout = () => {
  clearAuth();
};

/**
 * Check if stored token is still valid
 * @returns {Promise<boolean>} Promise resolving to token validity
 */
export const validateToken = async () => {
  try {
    const token = getToken();
    if (!token) return false;

    const response = await api.get('/auth/validate');
    return response.data.valid;
  } catch (error) {
    clearAuth();
    return false;
  }
};

/**
 * Get user role from stored user data
 * @returns {string|null} User role or null if not found
 */
export const getUserRole = () => {
  const user = getStoredUser();
  return user?.role || null;
};

/**
 * Initialize authentication state from stored data
 * @returns {Object} Authentication state
 */
export const initializeAuth = () => {
  const token = getToken();
  const user = getStoredUser();

  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  return {
    isAuthenticated: !!token,
    user,
    token
  };
};

// Helper function to handle authentication errors
export const handleAuthError = (error) => {
  if (error.response?.status === 401) {
    clearAuth();
    window.location.href = '/login';
  }
  throw error;
};

// API request interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);



export default {
  setAuth,
  clearAuth,
  getToken,
  getStoredUser,
  isAuthenticated,
  login,
  logout,
  validateToken,
  getUserRole,
  initializeAuth,
  handleAuthError
};