import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import AssetCard from '../../components/marketplace/AssetCard';
import InvestmentModal from '../../components/marketplace/InvestmentModal';

const Marketplace = () => {
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [selectedPool, setSelectedPool] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchPools = async () => {
        try {
            const response = await api.get('/marketplace/pools');
            setPools(response.data);
        } catch (error) {
            console.error('Error fetching pools:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPools();
    }, []);

    const handleInvestClick = (pool) => {
        setSelectedPool({
            ...pool.asset,
            address: pool.address,
            stablecoinAddress: pool.stablecoinAddress,
            assetId: pool.asset.id
        });
        setIsModalOpen(true);
    };

    const filteredPools = filter === 'ALL'
        ? pools
        : pools.filter(p => p.asset.type === filter);

    const categories = [
        { id: 'ALL', label: 'All Assets' },
        { id: 'ART', label: 'Fine Art' },
        { id: 'METAL', label: 'Precious Metals' },
        { id: 'REAL_ESTATE', label: 'Real Estate' },
        { id: 'CARBON', label: 'Carbon Credits' },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="ml-4 text-slate-500 font-medium">Loading Marketplace...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white bg-none mb-1">Active Marketplace</h3>
                    <p className="text-slate-500 text-sm">Discover and invest in tokenized real-world assets</p>
                </div>
                <div className="flex items-center p-1 bg-slate-50 dark:bg-slate-800/50 rounded-full border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilter(cat.id)}
                            className={`whitespace-nowrap px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 border-none cursor-pointer ${filter === cat.id
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm transform scale-[1.02]'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent hover:bg-white/50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Assets Grid */}
            {filteredPools.length === 0 ? (
                <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                    <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4 block">inventory_2</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 bg-none">No assets found</h3>
                    <p className="text-slate-500">Try selecting a different category or check back later for new issuances.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPools.map(pool => (
                        <AssetCard
                            key={pool.id}
                            asset={{ ...pool.asset, totalLiquidity: pool.totalLiquidity }}
                            onInvest={() => handleInvestClick(pool)}
                        />
                    ))}
                </div>
            )}

            {selectedPool && (
                <InvestmentModal
                    asset={selectedPool}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchPools}
                />
            )}
        </div>
    );
};

export default Marketplace;
