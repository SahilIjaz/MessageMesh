'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const getPasswordValidation = (password: string) => {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const isLongEnough = password.length >= 8;

  return {
    hasUppercase,
    hasLowercase,
    hasNumbers,
    isLongEnough,
    isValid: hasUppercase && hasLowercase && hasNumbers && isLongEnough,
  };
};

export default function AuthPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailValid = email === '' || isValidEmail(email);
  const passwordValidation = getPasswordValidation(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        console.log('🔓 Login attempt:', { email });
        await login(email, password);
        console.log('✅ Login successful for:', email);
      } else {
        console.log('📝 Registration attempt:', { email });
        await register(email, password);
        console.log('✅ Registration successful for:', email);
      }
      console.log('🚀 Redirecting to dashboard...');
      router.push('/');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
      console.error('❌ Authentication error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-black">
          MessageMesh
        </h1>
        <p className="text-center text-black font-medium mb-8">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-black placeholder-gray-500 transition ${
                email === ''
                  ? 'border-gray-300 focus:ring-blue-500'
                  : emailValid
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-red-500 focus:ring-red-500'
              }`}
              placeholder="your@email.com"
              required
            />
            {email && !emailValid && (
              <p className="text-red-600 text-xs font-medium mt-1">❌ Invalid email format</p>
            )}
            {email && emailValid && (
              <p className="text-green-600 text-xs font-medium mt-1">✓ Valid email</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 text-black placeholder-gray-500 transition ${
                password === ''
                  ? 'border-gray-300 focus:ring-blue-500'
                  : passwordValidation.isValid
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-red-500 focus:ring-red-500'
              }`}
              placeholder="••••••••"
              required
            />
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={passwordValidation.isLongEnough ? '✓' : '❌'}>
                    <span className={`text-xs font-medium ${passwordValidation.isLongEnough ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.isLongEnough ? '✓' : '❌'} At least 8 characters ({password.length}/8)
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordValidation.hasUppercase ? '✓' : '❌'} One uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${passwordValidation.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordValidation.hasLowercase ? '✓' : '❌'} One lowercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${passwordValidation.hasNumbers ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordValidation.hasNumbers ? '✓' : '❌'} One number
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border-2 border-red-400 rounded-lg text-red-700 font-medium text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !emailValid || (!isLogin && !passwordValidation.isValid)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <p className="text-center text-black font-medium mt-6 text-sm">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-blue-600 font-semibold hover:underline ml-1"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
