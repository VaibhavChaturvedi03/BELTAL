import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assetApi } from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function MyAssets() {
    const { user } = useAuth();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (user?.walletAddress) {
            fetchAssets();
        }
    }, [user]);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const data = await assetApi.list({
                owner: user.walletAddress,
                search: search,
                limit: 100
            });
            setAssets(data.assets || []);
        } catch (err) {
            console.error("Failed to fetch assets", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => fetchAssets(), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE': return 'bg-emerald-900/50 text-emerald-400 border-emerald-700';
            case 'INACTIVE': return 'bg-slate-700/50 text-slate-400 border-slate-600';
            case 'MAINTENANCE': return 'bg-amber-900/50 text-amber-400 border-amber-700';
            default: return 'bg-slate-700/50 text-slate-400 border-slate-600';
        }
    };

    return (
        <div className="user-console min-h-full p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="h-px w-12 bg-gradient-to-r from-emerald-500/40 to-transparent" />
                    <span className="text-[9px] font-black tracking-[0.22em] text-emerald-500/60 uppercase">
                        REGISTERED PERSONNEL — MY ASSETS
                    </span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-wide">My Assets</h1>
                <p className="text-sm text-slate-400 mt-1">
                    View and manage all assets under your custody
                </p>
            </div>

            {/* Search */}
            <Card goldAccent={false}>
                <CardContent>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Search by asset name or type..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#0D1F38] border border-[#1F293D] rounded pl-10 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Assets Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 mt-3 text-sm">Loading your assets...</p>
                </div>
            ) : assets.length === 0 ? (
                <Card goldAccent={false}>
                    <CardContent>
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined text-6xl text-slate-600 mb-3">
                                inventory_2
                            </span>
                            <p className="text-slate-400 text-sm">You don't have any assets yet</p>
                            <p className="text-slate-500 text-xs mt-1">Assets will appear here once assigned to you</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assets.map((asset) => (
                        <Link
                            key={asset.id}
                            to={`/user/assets/${asset.id}`}
                            className="group"
                        >
                            <Card goldAccent={false} className="h-full hover:border-emerald-500/50 transition-all">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-sm font-bold text-white truncate">
                                                {asset.name}
                                            </CardTitle>
                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                                                ID: {asset.id?.slice(0, 8)}...
                                            </div>
                                        </div>
                                        <span className={`ml-2 px-2 py-1 rounded border text-[10px] font-bold shrink-0 ${getStatusColor(asset.status)}`}>
                                            {asset.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Type</span>
                                            <span className="text-white font-medium">{asset.assetType || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Classification</span>
                                            <span className="px-2 py-0.5 rounded bg-[#1E3E62] text-[#7ab0fe] text-[10px] font-bold">
                                                Tier {asset.classificationTier}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Minted On</span>
                                            <span className="text-slate-300">
                                                {new Date(asset.createdAt).toLocaleDateString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-[#1F293D] flex items-center justify-between">
                                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                            View Details
                                        </span>
                                        <span className="material-symbols-outlined text-emerald-400 text-[18px] group-hover:translate-x-1 transition-transform">
                                            arrow_forward
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Summary */}
            {!loading && assets.length > 0 && (
                <div className="text-center text-xs text-slate-500">
                    Showing {assets.length} asset{assets.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
}
