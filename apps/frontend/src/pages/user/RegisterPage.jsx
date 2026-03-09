import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const user = await register(email, password);
            navigate(user?.role === 'ADMIN' ? '/admin' : '/discover');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[80vh] p-4 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-8 lg:p-10 shadow-sm w-full max-w-md">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 bg-none">Create Account</h2>
                    <p className="text-slate-500 text-sm">Join AURA and start tokenizing assets.</p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm border border-red-200 dark:border-red-800 mb-6 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                        <input
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-3.5 text-base border shadow-none mt-4 disabled:opacity-70"
                    >
                        {loading ? 'Creating account...' : 'Get Started'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-500">
                    Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
