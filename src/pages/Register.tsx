import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Mail, Lock, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    gender: 'male',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              name: formData.name,
              email: formData.email,
              gender: formData.gender,
            },
          ]);

        if (profileError) throw profileError;

        navigate('/login');
      }
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
      style={{
        backgroundImage: `
          radial-gradient(circle at 100% 0%, rgba(255,255,255,0.2) 0%, transparent 25%),
          radial-gradient(circle at 0% 100%, rgba(255,255,255,0.2) 0%, transparent 25%)
        `,
      }}
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />

      <motion.div
        className="bg-white/80 backdrop-blur-xl border-2 border-blue-400 rounded-xl shadow-2xl p-10 w-full max-w-[500px] relative z-10"
        initial={{ opacity: 0, y: 60 }}
        animate={shake ? 'shake' : { opacity: 1, y: 0 }}
        variants={{
          shake: {
            x: [0, -8, 8, -6, 6, -4, 4, 0],
            transition: { duration: 0.6 },
          },
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.div
          className="absolute top-0 left-[220px] -translate-x-1/2 bg-white rounded-full p-4 shadow-xl"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <UserPlus className="w-12 h-12 text-indigo-600" />
        </motion.div>

        <motion.div
          className="mt-8 mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r pt-2 from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-gray-600 mt-2">Join our community today</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.15,
                },
              },
            }}
          >
            {['name', 'email', 'password', 'gender'].map((field, idx) => (
              <motion.div
                key={field}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                {field === 'name' && (
                  <div className="relative">
                    <label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white/50 backdrop-blur-sm "
                      required
                    />
                    <UserPlus className="absolute left-3 top-[47px] -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                )}

                {field === 'email' && (
                  <div className="relative">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <Mail className="absolute left-3 top-[47px] -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                )}

                {field === 'password' && (
                  <div className="relative">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-2 block">
                      Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <Lock className="absolute left-3 top-[47px] -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[47px] -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                )}

                {field === 'gender' && (
                  <div className="relative ">
                    <label htmlFor="gender" className="text-sm font-medium text-gray-700 mb-2 block">
                      Gender
                    </label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <Users className="absolute left-3 top-[47px] -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </motion.button>

          <motion.p
            className="text-center text-sm text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:underline font-medium">
              Login here
            </Link>
          </motion.p>
        </form>
      </motion.div>
    </div>
  );
}

export default Register;
