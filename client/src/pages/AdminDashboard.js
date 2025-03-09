import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import ActivityLog from '../components/ActivityLog';

const AdminDashboard = () => {
  const [doctors, setDoctors] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    email: '',
    password: '',
    hospitalLocation: {
      latitude: '',
      longitude: ''
    }
  });

  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      console.log('Fetching data...');
      
      // Log the API endpoints we're calling
      const doctorsUrl = '/doctors?limit=5&sort=-createdAt';
      const activitiesUrl = '/admin/activities?limit=10&page=1';
      console.log('Doctors URL:', doctorsUrl);
      console.log('Activities URL:', activitiesUrl);
      
      const [doctorsRes, activitiesRes] = await Promise.all([
        api.get(doctorsUrl),
        api.get(activitiesUrl)
      ]);
      
      // Log the raw responses
      console.log('Doctors response:', doctorsRes);
      console.log('Activities response:', activitiesRes);
      
      // Log response data
      console.log('Doctors data:', doctorsRes.data);
      console.log('Activities data:', activitiesRes.data);
      console.log('Activities data type:', typeof activitiesRes.data);
      console.log('Is activities array?', Array.isArray(activitiesRes.data));
      
      if (activitiesRes.data && typeof activitiesRes.data === 'object') {
        console.log('Activities data keys:', Object.keys(activitiesRes.data));
        
        if (activitiesRes.data.activities) {
          console.log('Found activities property:', activitiesRes.data.activities);
        }
      }
      
      // Extract data as before
      const doctorsData = Array.isArray(doctorsRes.data) 
        ? doctorsRes.data 
        : (doctorsRes.data.doctors || doctorsRes.data.data || []);
      
      const activitiesData = activitiesRes.data.activities || activitiesRes.data;
      console.log('Final activities data to be set:', activitiesData);
      
      setDoctors(doctorsData);
      setActivities(activitiesData);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', error.response || error.message);
      setError('Failed to load dashboard data. Please try again.');
    }
  };
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/doctors', newDoctor);
      setNewDoctor({
        name: '',
        email: '',
        password: '',
        hospitalLocation: {
          latitude: '',
          longitude: ''
        }
      });
      await fetchData(); // Refresh data after adding
      setError(null);
      alert('Doctor added successfully!');
    } catch (error) {
      console.error('Error adding doctor:', error);
      setError('Failed to add doctor: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm('Are you sure you want to delete this doctor?')) {
      return;
    }
    
    try {
      await api.delete(`/admin/doctors/${doctorId}`);
      await fetchData(); // Refresh data after deleting
      alert('Doctor deleted successfully!');
    } catch (error) {
      console.error('Error deleting doctor:', error);
      alert('Failed to delete doctor: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <button
              className="absolute top-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
            >
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="mb-4">
          <button 
            onClick={fetchData} 
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Refresh Data
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add New Doctor Form */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">Add New Doctor</h2>
              <form onSubmit={handleAddDoctor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({...newDoctor, password: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hospital Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={newDoctor.hospitalLocation.latitude}
                      onChange={(e) => setNewDoctor({
                        ...newDoctor,
                        hospitalLocation: {
                          ...newDoctor.hospitalLocation,
                          latitude: e.target.value
                        }
                      })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hospital Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={newDoctor.hospitalLocation.longitude}
                      onChange={(e) => setNewDoctor({
                        ...newDoctor,
                        hospitalLocation: {
                          ...newDoctor.hospitalLocation,
                          longitude: e.target.value
                        }
                      })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Doctor
                </button>
              </form>
            </div>
          </div>

          {/* Doctor List */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">Recently Registered Doctors</h2>
              <div className="overflow-y-auto max-h-60 mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {doctors && doctors.length > 0 ? (
                      doctors.map((doctor) => (
                        <tr key={doctor._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {doctor.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {doctor.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteDoctor(doctor._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                          No doctors found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Suspicious Activities */}
        <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">Suspicious Activities</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activities && activities.length > 0 ? (
                    activities.map((activity) => (
                      <tr key={activity._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {activity.doctorId?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${activity.type.includes('FAIL') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {activity.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {activity.details || 'No details'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(activity.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                        No suspicious activities recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;