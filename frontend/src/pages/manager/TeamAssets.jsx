import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assetApi } from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function TeamAssets() {
    const { user } = useAuth();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (user?.sbu) {
            fetchTeamAssets();
        }
    }, [user, search]);

    const fetchTeamAssets = async () => {
        setLoading(true);
        try {
            const data = await assetApi.list({
                sbu: user.sbu,
                search: search,
                limit: 100
            });
            setAssets(data.assets || []);
        } catch (err) {
            console.error("Failed to fetch team assets", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="role-console min-h-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-px w-12 bg-gradient-to-r from-[#1E5FA8]/40 to-transparent" />
                        <span className="text-[9px] font-black tracking-[0.22em] text-[#1E5FA8]/60 uppercase">
                            OFFICER CLEARANCE — {user?.sbu?.replace('SBU_', '')}
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-wide">Team Assets</h1>
                </div>
            </div>

            <Card goldAccent={false}>
                <CardHeader>
                    <CardTitle>Team Asset Ledger</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Search Bar */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search by asset name or type..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#1E5FA8] outline-none"
                        />
                    </div>

                    {/* Table */}
                    {loading ? (
                        <p className="text-slate-400 text-center py-8">Loading team assets...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="text-xs uppercase text-[#1E5FA8] border-b border-[#1F293D]">
                                    <tr>
                                        <th className="px-4 py-3">Asset Name</th>
                                        <th className="px-4 py-3">Classification</th>
                                        <th className="px-4 py-3">Current Holder</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1F293D]">
                                    {assets.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                                No team assets found
                                            </td>
                                        </tr>
                                    ) : (
                                        assets.map((asset) => (
                                            <tr key={asset.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium text-white">
                                                    {asset.name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 rounded bg-[#1E3E62] text-[#7ab0fe] text-xs font-bold">
                                                        Tier {asset.classificationTier}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {asset.owner?.displayName || 'Unassigned'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 rounded bg-emerald-900/50 text-emerald-400 text-xs font-bold">
                                                        {asset.status || 'ACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link
                                                        to={`/manager/assets/${asset.id}`}
                                                        className="text-[#1E5FA8] hover:text-[#7ab0fe] text-xs font-bold flex items-center gap-1"
                                                    >
                                                        View Details <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
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
