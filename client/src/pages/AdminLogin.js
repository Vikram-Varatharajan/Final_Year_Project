import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Add a timeout to simulate network delay and prevent immediate navigation
      const loginPromise = api.post('/auth/login/admin', {
        email,
        password
      });

      // Set a maximum timeout to prevent indefinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login request timed out')), 10000)
      );

      const response = await Promise.race([loginPromise, timeoutPromise]);

      // Immediately store token and user info
      login({
        token: response.data.token,
        role: 'admin'
      });

      // Use replace to prevent going back to login page
      navigate('/admin-dashboard', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 
        (error.message === 'Login request timed out' 
          ? 'Login request took too long. Please try again.' 
          : 'Login failed');
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Admin Login
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              {error}
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email address"
              disabled={isLoading}
              className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 
                placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 
                focus:border-indigo-500 focus:z-10 sm:text-sm 
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              disabled={isLoading}
              className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 
                placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 
                focus:border-indigo-500 focus:z-10 sm:text-sm 
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent 
                text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Logging in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;