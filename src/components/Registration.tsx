import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUser } from '../lib/firebase';
import { assignUserTests } from '../lib/counterbalance';

interface RegistrationProps {
  onComplete: (uid: string) => void;
}

export default function Registration({ onComplete }: RegistrationProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!name || !email || !password) {
        throw new Error('Please fill in all required fields');
      }

      // Create an account with email/password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get passage and method assignments
      console.log('Getting test assignments...');
      const { passages, methods } = await assignUserTests();
      console.log('Assignments:', { passages, methods });

      // Create the user document in Firestore
      console.log('Creating user document...');
      await createUser(user.uid, {
        uid: user.uid,
        name,
        email,
        assignedPassages: passages,
        assignedMethods: methods,
        progress: 0,
        startTime: new Date()
      });

      console.log('Registration complete for user:', user.uid);
      
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
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
            placeholder="Enter your full name"
          />
        </div>

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
            placeholder="Enter your email address"
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
            placeholder="Choose a password (min 6 characters)"
          />
        </div>

        <div className="pt-4">
          <p className="text-sm text-gray-600 mb-4">
            By participating in this study, you agree to complete a series of reading 
            and fill-in-the-blank tasks. Your data will be used for research purposes only.
          </p>
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