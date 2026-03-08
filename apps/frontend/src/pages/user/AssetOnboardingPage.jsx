import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Send, Building2, Server } from 'lucide-react';

const AssetOnboardingPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        description: '',
        type: 'ART',
        valuation: '',
        location: '',
        companyName: '',
        companyRegNumber: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/assets/onboard', {
                ...formData,
                valuation: parseFloat(formData.valuation)
            });
            navigate('/assets');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to onboard asset');
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 transition-all shadow-sm";
    const labelClasses = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2";

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            <button
                onClick={() => navigate('/assets')}
                className="btn-secondary flex items-center gap-2 border shadow-none"
            >
                <ArrowLeft size={18} /> Back to Assets
            </button>

            <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Onboard New Asset</h1>
                    <p className="text-slate-500 text-sm font-medium">Provide the details for your real-world asset (RWA).</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClasses}>Asset Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Fine Art Collection 2024" className={inputClasses} required />
                        </div>
                        <div>
                            <label className={labelClasses}>Asset Symbol</label>
                            <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} placeholder="e.g. FAC24" className={inputClasses} required />
                        </div>
                    </div>

                    <div>
                        <label className={labelClasses}>Asset Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Detailed description of the asset..."
                            rows="4"
                            className={`${inputClasses} resize-none`}
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClasses}>Asset Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className={inputClasses}>
                                <option value="ART">Art</option>
                                <option value="METAL">Metals (Gold/Silver/etc.)</option>
                                <option value="REAL_ESTATE">Real Estate</option>
                                <option value="CARBON">Carbon Credits</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}>Valuation (USD)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input type="number" name="valuation" value={formData.valuation} onChange={handleChange} placeholder="e.g. 50000" step="0.01" className={`${inputClasses} pl-8`} required />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelClasses}>Physical Location (Optional)</label>
                        <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Geneva Freeport, Switzerland" className={inputClasses} />
                    </div>

                    <div className="mt-8 p-6 rounded-xl border border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2 mb-6 font-bold text-primary">
                            <Building2 size={20} /> Company / Entity Details (Optional)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>Company Name</label>
                                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="e.g. Aura Assets LLC" className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Registration Number</label>
                                <input type="text" name="companyRegNumber" value={formData.companyRegNumber} onChange={handleChange} placeholder="e.g. REG-123456" className={inputClasses} />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800 flex items-center gap-2">
                            <Server size={16} /> {error}
                        </div>
                    )}

                    <div className="pt-4">
                        <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base flex flex-row items-center justify-center gap-2 border shadow-none">
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <Send size={20} />
                            )}
                            {loading ? 'Processing Protocol Request...' : 'Submit Onboarding Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssetOnboardingPage;
