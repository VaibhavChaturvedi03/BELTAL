import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assetApi, adminApi, transferApi } from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function InitiateTransfer() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [assets, setAssets] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [formData, setFormData] = useState({
        assetId: '',
        toUserId: '',
        reason: '',
    });

    useEffect(() => {
        if (user?.sbu) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            // Fetch team assets
            const assetsData = await assetApi.list({ sbu: user.sbu, limit: 100 });
            setAssets(assetsData.assets || []);

            // Fetch team members (exclude current user)
            const membersData = await adminApi.listIdentities({ sbu: user.sbu, limit: 100 });
            const filteredMembers = (membersData.users || []).filter(
                (m) => m.id !== user.id
            );
            setTeamMembers(filteredMembers);
        } catch (err) {
            console.error("Failed to fetch data", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await transferApi.create({
                assetId: formData.assetId,
                toUserId: formData.toUserId,
                reason: formData.reason || 'Manager-initiated transfer',
            });

            alert('Transfer request submitted successfully!');
            navigate('/transfers'); // Redirect to pending transfers page
        } catch (err) {
            console.error("Failed to create transfer", err);
            alert(`Failed to create transfer: ${err.uiMessage || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const selectedAsset = assets.find((a) => a.id === formData.assetId);
    const selectedMember = teamMembers.find((m) => m.id === formData.toUserId);

    return (
        <div className="role-console min-h-full p-6 sm:p-8 max-w-none space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-px w-12 bg-gradient-to-r from-[#1E5FA8]/40 to-transparent" />
                        <span className="text-[9px] font-black tracking-[0.22em] text-[#1E5FA8]/60 uppercase">
                            OFFICER CLEARANCE — {user?.sbu?.replace('SBU_', '')}
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-wide">Initiate Asset Transfer</h1>
                </div>
            </div>

            <Card goldAccent={false}>
                <CardHeader>
                    <CardTitle>Transfer Request Form</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Select Asset */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Select Asset to Transfer *
                            </label>
                            <select
                                required
                                value={formData.assetId}
                                onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#1E5FA8] outline-none"
                            >
                                <option value="">-- Select an Asset --</option>
                                {assets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name} (Tier {asset.classificationTier}) - {asset.owner?.displayName || 'Unassigned'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selected Asset Details */}
                        {selectedAsset && (
                            <div className="p-4 rounded-lg bg-[#0D1F38] border border-[#1F293D]">
                                <h3 className="text-sm font-bold text-[#1E5FA8] mb-2">Asset Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="text-slate-500">Name:</span>
                                        <span className="text-white ml-2">{selectedAsset.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Classification:</span>
                                        <span className="text-white ml-2">Tier {selectedAsset.classificationTier}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Current Holder:</span>
                                        <span className="text-white ml-2">{selectedAsset.owner?.displayName || 'Unassigned'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Status:</span>
                                        <span className="text-emerald-400 ml-2">{selectedAsset.status || 'ACTIVE'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Select New Custodian */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Transfer To (New Custodian) *
                            </label>
                            <select
                                required
                                value={formData.toUserId}
                                onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#1E5FA8] outline-none"
                            >
                                <option value="">-- Select Team Member --</option>
                                {teamMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.displayName || 'Unknown'} ({member.role}) - Level {member.clearanceLevel}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selected Member Details */}
                        {selectedMember && (
                            <div className="p-4 rounded-lg bg-[#0D1F38] border border-[#1F293D]">
                                <h3 className="text-sm font-bold text-[#1E5FA8] mb-2">New Custodian Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="text-slate-500">Name:</span>
                                        <span className="text-white ml-2">{selectedMember.displayName || 'Unknown'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Role:</span>
                                        <span className="text-white ml-2">{selectedMember.role}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Clearance:</span>
                                        <span className="text-white ml-2">Level {selectedMember.clearanceLevel}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">SBU:</span>
                                        <span className="text-white ml-2">{selectedMember.sbu?.replace('SBU_', '')}</span>
                                    </div>
                                </div>
                                {selectedMember.clearanceLevel < (selectedAsset?.classificationTier || 0) && (
                                    <div className="mt-3 p-3 rounded bg-amber-900/30 border border-amber-600/50">
                                        <p className="text-amber-400 text-xs font-bold">️ Warning</p>
                                        <p className="text-amber-300/80 text-xs mt-1">
                                            The selected custodian's clearance level ({selectedMember.clearanceLevel}) is lower than
                                            the asset's classification tier ({selectedAsset?.classificationTier}).
                                            This may require additional approval.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reason */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Reason for Transfer
                            </label>
                            <textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Enter reason for this transfer (optional)"
                                rows={3}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#1E5FA8] outline-none resize-none"
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => navigate('/transfers')}
                                className="flex-1 px-4 py-3 border border-[#1F293D] text-slate-400 hover:text-white hover:bg-white/5 rounded font-bold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !formData.assetId || !formData.toUserId}
                                className="flex-1 px-4 py-3 bg-[#1E5FA8] hover:bg-[#164a85] disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest rounded transition-colors"
                            >
                                {loading ? 'Submitting...' : 'Submit Transfer Request'}
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
          </div>
        </div>
    );
}
