import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { assetApi } from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { TierBadge } from '../../components/ui/Badge';

export default function AssetList() {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        sbu: '',
        classificationTier: '',
    });

    // Debounce the free-text search so typing does not fire a request per keystroke.
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => (prev.search === searchInput.trim() ? prev : { ...prev, search: searchInput.trim() }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Do not send empty filters. The API validates supplied values, so
            // `sbu=` and `classificationTier=` are not equivalent to no filter.
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([, value]) => value !== '')
            );
            const data = await assetApi.list({ ...activeFilters, limit: 100 });
            setAssets(Array.isArray(data) ? data : (data.assets || []));
        } catch (err) {
            console.error("Failed to fetch assets", err);
            setError(err.uiMessage || 'The asset registry could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="role-console min-h-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2 mb-3">
                <span className="h-px flex-1 bg-gradient-to-r from-[#D4AF37]/40 to-transparent" />
                <span className="text-[9px] font-black tracking-[0.22em] text-[#D4AF37]/60 uppercase">
                    ◈ RESTRICTED — ADMIN CLEARANCE
                </span>
                <span className="h-px flex-1 bg-gradient-to-l from-[#D4AF37]/40 to-transparent" />
            </div>

            <h1 className="text-2xl font-black text-white tracking-wide">Asset Ledger</h1>

            <Card goldAccent>
                <CardHeader>
                    <CardTitle>Sovereign Asset Registry</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label htmlFor="asset-search" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Search
                            </label>
                            <input
                                id="asset-search"
                                type="text"
                                placeholder="Asset name or token ID..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#1E5FA8] outline-none"
                            />
                        </div>

                        <div>
                            <label htmlFor="asset-sbu" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                SBU
                            </label>
                            <select
                                id="asset-sbu"
                                value={filters.sbu}
                                onChange={(e) => handleFilterChange('sbu', e.target.value)}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#1E5FA8] outline-none"
                            >
                                <option value="">All SBUs</option>
                                <option value="SBU_RADAR">Radar</option>
                                <option value="SBU_EW">Electronic Warfare</option>
                                <option value="SBU_MILCOMM">Military Comm</option>
                                <option value="SBU_CYBER">Cyber Security</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="asset-tier" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Classification Tier
                            </label>
                            <select
                                id="asset-tier"
                                value={filters.classificationTier}
                                onChange={(e) => handleFilterChange('classificationTier', e.target.value)}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#1E5FA8] outline-none"
                            >
                                <option value="">All Tiers</option>
                                <option value="1">1 - Restricted</option>
                                <option value="2">2 - Confidential</option>
                                <option value="3">3 - Secret</option>
                                <option value="4">4 - Top Secret</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-lg border border-red-500/40 p-4 text-sm text-red-400" role="alert">
                            <p className="font-bold">Unable to load assets</p>
                            <p className="mt-1 text-xs">{error}</p>
                            <button type="button" onClick={fetchAssets} className="mt-3 text-xs font-bold underline">Retry</button>
                        </div>
                    )}

                    {/* Assets Table */}
                    {loading ? (
                        <p className="text-slate-400 text-center py-8">Loading assets...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="text-xs uppercase text-[#D4AF37] border-b border-[#1F293D]">
                                    <tr>
                                        <th className="px-4 py-3">Asset Name</th>
                                        <th className="px-4 py-3">Classification</th>
                                        <th className="px-4 py-3">SBU</th>
                                        <th className="px-4 py-3">Current Custodian</th>
                                        <th className="px-4 py-3">Wallet</th>
                                        <th className="px-4 py-3">Minted</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1F293D]">
                                    {assets.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                                                No assets found
                                            </td>
                                        </tr>
                                    ) : (
                                        assets.map((asset) => (
                                            <tr key={asset.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium text-white">{asset.name}</td>
                                                <td className="px-4 py-3">
                                                    <TierBadge tier={asset.classificationTier} />
                                                </td>
                                                <td className="px-4 py-3 text-xs">{asset.sbu?.replace('SBU_', '')}</td>
                                                <td className="px-4 py-3 font-medium text-white">
                                                    {asset.owner?.displayName || 'Unassigned'}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                                                    {asset.owner?.walletAddress?.slice(0, 6)}...{asset.owner?.walletAddress?.slice(-4)}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-400">
                                                    {new Date(asset.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link
                                                        to={`/assets/${asset.id}`}
                                                        aria-label={`View details for ${asset.name}`}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-[#D4AF37] px-3 py-1.5 text-[11px] font-bold text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#0D1F38]"
                                                    >
                                                        View details
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
