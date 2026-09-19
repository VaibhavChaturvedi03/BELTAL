import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assetApi, transferApi } from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function AssetDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [asset, setAsset] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssetDetail();
    }, [id]);

    const fetchAssetDetail = async () => {
        setLoading(true);
        try {
            // Fetch asset details
            const data = await assetApi.list({ id: id });
            const foundAsset = data.assets?.[0];
            setAsset(foundAsset);

            // Fetch ownership history (transfers for this asset)
            const transfersData = await transferApi.list({ assetId: id });
            setHistory(transfersData.transfers || []);
        } catch (err) {
            console.error("Failed to fetch asset detail", err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE': return 'bg-emerald-900/50 text-emerald-400 border-emerald-700';
            case 'INACTIVE': return 'bg-slate-700/50 text-slate-400 border-slate-600';
            case 'MAINTENANCE': return 'bg-amber-900/50 text-amber-400 border-amber-700';
            default: return 'bg-slate-700/50 text-slate-400 border-slate-600';
        }
    };

    if (loading) {
        return (
            <div className="user-console p-6 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-block w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 mt-3 text-sm">Loading asset details...</p>
                </div>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="user-console p-6">
                <Card goldAccent={false}>
                    <CardContent>
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined text-6xl text-red-500/50 mb-3">
                                error
                            </span>
                            <p className="text-slate-400 text-sm">Asset not found</p>
                            <button
                                onClick={() => navigate('/my-assets')}
                                className="mt-4 px-4 py-2 bg-[#1E5FA8] hover:bg-[#164a85] text-white text-xs font-bold rounded"
                            >
                                Back to My Assets
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="user-console min-h-full p-6 sm:p-8 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
                <Link to="/my-assets" className="hover:text-emerald-400 transition-colors">
                    My Assets
                </Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-white font-medium truncate max-w-[300px]">
                    {asset.name}
                </span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-px w-12 bg-gradient-to-r from-emerald-500/40 to-transparent" />
                        <span className="text-[9px] font-black tracking-[0.22em] text-emerald-500/60 uppercase">
                            ASSET DETAIL VIEW
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-wide truncate">
                        {asset.name}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1 font-mono">
                        ID: {asset.id}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate(`/transfer/request?asset=${asset.id}`)}
                        className="px-4 py-2 bg-[#1E5FA8] hover:bg-[#164a85] text-white text-xs font-bold rounded transition-colors"
                    >
                        Request Transfer
                    </button>
                    <button
                        onClick={() => navigate('/my-assets')}
                        className="px-4 py-2 border border-[#1F293D] hover:border-emerald-500/50 text-slate-300 text-xs font-bold rounded transition-colors"
                    >
                        Back
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Metadata */}
                    <Card goldAccent={false}>
                        <CardHeader>
                            <CardTitle>Asset Metadata</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-3 rounded bg-[#0D1F38] border border-[#1F293D]">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status</div>
                                    <span className={`inline-block px-2 py-1 rounded border text-xs font-bold ${getStatusColor(asset.status)}`}>
                                        {asset.status || 'ACTIVE'}
                                    </span>
                                </div>

                                <div className="p-3 rounded bg-[#0D1F38] border border-[#1F293D]">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Asset Type</div>
                                    <div className="text-white text-sm font-bold">{asset.assetType || 'N/A'}</div>
                                </div>

                                <div className="p-3 rounded bg-[#0D1F38] border border-[#1F293D]">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Classification Tier</div>
                                    <div className="text-white text-sm font-bold">Tier {asset.classificationTier}</div>
                                </div>

                                <div className="p-3 rounded bg-[#0D1F38] border border-[#1F293D]">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Current Custodian</div>
                                    <div className="text-white text-sm font-bold truncate">
                                        {asset.owner?.displayName || 'Unassigned'}
                                    </div>
                                    <div className="text-slate-500 font-mono text-[10px] mt-0.5 truncate">
                                        {asset.owner?.walletAddress || 'N/A'}
                                    </div>
                                </div>

                                <div className="p-3 rounded bg-[#0D1F38] border border-[#1F293D]">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Minted On</div>
                                    <div className="text-white text-sm font-bold">
                                        {new Date(asset.createdAt).toLocaleString('en-IN')}
                                    </div>
                                </div>

                                <div className="p-3 rounded bg-[#0D1F38] border border-[#1F293D]">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">SBU</div>
                                    <div className="text-white text-sm font-bold">
                                        {asset.sbu?.replace('SBU_', '') || 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {asset.metadata && (
                                <div className="mt-4">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Additional Metadata</div>
                                    <pre className="bg-[#060D1A] border border-[#1F293D] rounded p-3 text-xs text-slate-300 overflow-x-auto">
                                        {JSON.stringify(asset.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Ownership History Timeline */}
                    <Card goldAccent={false}>
                        <CardHeader>
                            <CardTitle>Ownership History Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {history.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-5xl text-slate-600 mb-2">
                                        history
                                    </span>
                                    <p className="text-slate-400 text-sm">No transfer history yet</p>
                                    <p className="text-slate-500 text-xs mt-1">This asset hasn't been transferred</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((transfer, index) => (
                                        <div key={transfer.id} className="relative pl-8 pb-4 last:pb-0">
                                            {/* Timeline line */}
                                            {index < history.length - 1 && (
                                                <div className="absolute left-[11px] top-6 bottom-0 w-px bg-[#1F293D]"></div>
                                            )}
                                            {/* Timeline dot */}
                                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[#1E5FA8] border-2 border-[#060D1A] flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[12px] text-white">
                                                    {transfer.status === 'APPROVED' ? 'check' : transfer.status === 'REJECTED' ? 'close' : 'pending'}
                                                </span>
                                            </div>
                                            {/* Content */}
                                            <div className="bg-[#0D1F38] border border-[#1F293D] rounded p-3">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold text-white">
                                                            {transfer.fromUser?.displayName || 'Unknown'}
                                                            <span className="text-slate-500 font-normal"> → </span>
                                                            {transfer.toUser?.displayName || 'Unknown'}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                            {new Date(transfer.createdAt).toLocaleString('en-IN')}
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${transfer.status === 'APPROVED'
                                                        ? 'bg-emerald-900/50 text-emerald-400'
                                                        : transfer.status === 'REJECTED'
                                                            ? 'bg-red-900/50 text-red-400'
                                                            : 'bg-amber-900/50 text-amber-400'
                                                        }`}>
                                                        {transfer.status}
                                                    </span>
                                                </div>
                                                {transfer.reason && (
                                                    <div className="text-xs text-slate-400 italic">
                                                        "{transfer.reason}"
                                                    </div>
                                                )}
                                                {transfer.txHash && (
                                                    <div className="mt-2 pt-2 border-t border-[#1F293D]">
                                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">TX Hash</div>
                                                        <div className="text-emerald-400 font-mono text-[10px] break-all">
                                                            {transfer.txHash}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-4">
                    <Card goldAccent={false}>
                        <CardHeader>
                            <CardTitle>Quick Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Asset ID</div>
                                <div className="text-xs text-white font-mono break-all">{asset.id}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Owner Wallet</div>
                                <div className="text-xs text-white font-mono break-all">
                                    {asset.owner?.walletAddress || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Last Updated</div>
                                <div className="text-xs text-white">
                                    {new Date(asset.updatedAt || asset.createdAt).toLocaleString('en-IN')}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card goldAccent={false}>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <button
                                onClick={() => navigate(`/transfer/request?asset=${asset.id}`)}
                                className="w-full px-3 py-2 bg-[#1E5FA8] hover:bg-[#164a85] text-white text-xs font-bold rounded transition-colors"
                            >
                                Request Transfer
                            </button>
                            <button
                                onClick={() => navigate('/my-assets')}
                                className="w-full px-3 py-2 border border-[#1F293D] hover:border-emerald-500/50 text-slate-300 text-xs font-bold rounded transition-colors"
                            >
                                Back to Assets
                            </button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
