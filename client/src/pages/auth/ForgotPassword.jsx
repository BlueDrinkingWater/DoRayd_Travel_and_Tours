import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DataService from '../../components/services/DataService';
import { Mail, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await DataService.forgotPassword(email);
      if (response.success) {
        setMessage('A password reset link has been sent to your email address.');
      } else {
        setError(response.message || 'Failed to send reset link.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Forgot Your Password?</h2>
          <p className="mt-2 text-sm text-gray-600">
            No problem. Enter your email address and we'll send you a link to reset it.
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
          {message && <div className="bg-green-100 text-green-700 p-3 rounded-md">{message}</div>}
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-md">{error}</div>}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div className="text-center">
            <Link to="/" className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center justify-center gap-1">
              <ArrowLeft size={16} /> Back to Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;