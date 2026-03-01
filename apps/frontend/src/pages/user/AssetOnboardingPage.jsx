import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Send, Building2, User } from 'lucide-react';

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

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <button onClick={() => navigate('/assets')} className="secondary" style={{ width: 'auto', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={18} /> Back to Assets
            </button>

            <div className="glass-card" style={{ padding: '2rem' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Onboard New Asset</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Provide the details for your real-world asset (RWA).</p>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <label>Asset Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Fine Art Collection 2024" required />
                        </div>
                        <div>
                            <label>Asset Symbol</label>
                            <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} placeholder="e.g. FAC24" required />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label>Asset Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Detailed description of the asset..." rows="4" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--glass)', border: '1px solid var(--card-border)', color: 'var(--text-main)', outline: 'none' }}></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <label>Asset Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--glass)', border: '1px solid var(--card-border)', color: 'var(--text-main)', outline: 'none' }}>
                                <option value="ART">Art</option>
                                <option value="METAL">Metals (Gold/Silver/etc.)</option>
                                <option value="REAL_ESTATE">Real Estate</option>
                                <option value="CARBON">Carbon Credits</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <label>Valuation (USD)</label>
                            <input type="number" name="valuation" value={formData.valuation} onChange={handleChange} placeholder="e.g. 50000" step="0.01" required />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label>Physical Location (Optional)</label>
                        <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Geneva Freeport, Switzerland" />
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'rgba(99, 102, 241, 0.05)' }}>
                        <div className="flex items-center gap-2 mb-4" style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                            <Building2 size={20} /> Company / Entity Details (Optional)
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label>Company Name</label>
                                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="e.g. Aura Assets LLC" />
                            </div>
                            <div>
                                <label>Registration Number</label>
                                <input type="text" name="companyRegNumber" value={formData.companyRegNumber} onChange={handleChange} placeholder="e.g. REG-123456" />
                            </div>
                        </div>
                    </div>

                    {error && <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.875rem' }}>{error}</p>}

                    <button type="submit" disabled={loading} style={{ marginTop: '2rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Send size={18} /> {loading ? 'Processing...' : 'Submit Onboarding Request'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AssetOnboardingPage;
