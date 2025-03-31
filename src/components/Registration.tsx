import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUser } from '../lib/firebase';
import { assignMethodOrder } from '../lib/counterbalance';
import { Demographics } from '../utils/types';

interface RegistrationProps {
  onComplete: (uid: string) => void;
}

export default function Registration({ onComplete }: RegistrationProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demographics, setDemographics] = useState<Demographics>({
    age: '',
    gender: '',
    education: '',
    englishProficiency: '',
    readingFrequency: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemographicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDemographics(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!email || !password) {
        throw new Error('Please fill in all required fields');
      }

      // Register the user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Assign method order via counterbalancing
      const methodOrder = await assignMethodOrder();

      // Create the user document in Firestore
      await createUser(user.uid, {
        uid: user.uid,
        email: user.email || '',
        demographics,
        methodOrder,
        progress: 0,
        startTime: new Date()
      });

      // Complete registration
      onComplete(user.uid);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Participant Registration</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
            minLength={6}
          />
          <p className="text-xs text-gray-500 mt-1">
            Password must be at least 6 characters long.
          </p>
        </div>

        {/* Demographics Section */}
        <div className="pt-4">
          <h3 className="text-lg font-semibold mb-3">Demographics</h3>
          
          {/* Age Group */}
          <div className="mb-3">
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
              Age Group
            </label>
            <select
              id="age"
              name="age"
              value={demographics.age}
              onChange={handleDemographicChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select...</option>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45-54">45-54</option>
              <option value="55-64">55-64</option>
              <option value="65+">65+</option>
            </select>
          </div>

          {/* Gender */}
          <div className="mb-3">
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={demographics.gender}
              onChange={handleDemographicChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          {/* Education Level */}
          <div className="mb-3">
            <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
              Education Level
            </label>
            <select
              id="education"
              name="education"
              value={demographics.education}
              onChange={handleDemographicChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select...</option>
              <option value="high-school">High School</option>
              <option value="some-college">Some College</option>
              <option value="bachelors">Bachelor's Degree</option>
              <option value="masters">Master's Degree</option>
              <option value="doctorate">Doctorate</option>
            </select>
          </div>

          {/* English Proficiency */}
          <div className="mb-3">
            <label htmlFor="englishProficiency" className="block text-sm font-medium text-gray-700 mb-1">
              English Proficiency
            </label>
            <select
              id="englishProficiency"
              name="englishProficiency"
              value={demographics.englishProficiency}
              onChange={handleDemographicChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select...</option>
              <option value="native">Native Speaker</option>
              <option value="fluent">Fluent</option>
              <option value="intermediate">Intermediate</option>
              <option value="beginner">Beginner</option>
            </select>
          </div>

          {/* Reading Frequency */}
          <div className="mb-3">
            <label htmlFor="readingFrequency" className="block text-sm font-medium text-gray-700 mb-1">
              How often do you read?
            </label>
            <select
              id="readingFrequency"
              name="readingFrequency"
              value={demographics.readingFrequency}
              onChange={handleDemographicChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select...</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="rarely">Rarely</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white ${
              loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors`}
          >
            {loading ? 'Registering...' : 'Start Study'}
          </button>
        </div>
      </form>
    </div>
  );
}