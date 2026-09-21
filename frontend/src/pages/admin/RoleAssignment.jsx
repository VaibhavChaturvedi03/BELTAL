import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/api';
import { useTransaction } from '../../context/TransactionContext';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function RoleAssignment() {
    const { showSuccess, showError } = useTransaction();
    const [identities, setIdentities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(null); // Stores ID of currently saving row

    const fetchIdentities = useCallback(async () => {
        setError(null);
        try {
            const data = await adminApi.listIdentities({ limit: 50 });
            setIdentities(data.users || []);
        } catch (err) {
            console.error("Failed to fetch identities", err);
            setError(err.uiMessage || 'The identity ledger could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIdentities();
    }, [fetchIdentities]);

    const handleUpdate = async (id, currentIdentity) => {
        setSaving(id);
        try {
            await adminApi.updateRole(id, {
                role: currentIdentity.role,
                clearanceLevel: currentIdentity.clearanceLevel,
            });
            showSuccess("Role and clearance updated successfully!");
            fetchIdentities(); // Refresh list
        } catch (err) {
            showError("Failed to update: " + (err.uiMessage || err.message));
        } finally {
            setSaving(null);
        }
    };

    const handleChange = (id, field, value) => {
        setIdentities(prev => prev.map(user =>
            user.id === id ? { ...user, [field]: field === 'clearanceLevel' ? parseInt(value, 10) : value } : user
        ));
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

            <h1 className="text-2xl font-black text-white tracking-wide">Role & Clearance Assignment</h1>

            <Card goldAccent>
                <CardHeader>
                    <CardTitle>Sovereign Identity Ledger</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 rounded-lg border border-red-500/40 p-4 text-sm text-red-400" role="alert">
                            <p className="font-bold">Unable to load identities</p>
                            <p className="mt-1 text-xs">{error}</p>
                            <button type="button" onClick={fetchIdentities} className="mt-3 text-xs font-bold underline">Retry</button>
                        </div>
                    )}
                    {loading ? (
                        <p className="text-slate-400">Loading identities...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="text-xs uppercase text-[#D4AF37] border-b border-[#1F293D]">
                                    <tr>
                                        <th className="px-4 py-3">Display Name</th>
                                        <th className="px-4 py-3">Wallet Address</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Clearance Tier</th>
                                        <th className="px-4 py-3">SBU</th>
                                        <th className="px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1F293D]">
                                    {identities.map((user) => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 font-medium text-white">{user.displayName || 'Unknown'}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{user.walletAddress}</td>

                                            {/* Role Dropdown */}
                                            <td className="px-4 py-3">
                                                <select
                                                    aria-label={`Role for ${user.displayName || user.walletAddress}`}
                                                    value={user.role}
                                                    onChange={(e) => handleChange(user.id, 'role', e.target.value)}
                                                    className="bg-[#0D1F38] border border-[#1F293D] rounded px-2 py-1 text-xs focus:border-[#1E5FA8] outline-none"
                                                >
                                                    <option value="USER">USER</option>
                                                    <option value="MANAGER">MANAGER</option>
                                                    <option value="AUDITOR">AUDITOR</option>
                                                    <option value="ADMIN">ADMIN</option>
                                                    {user.role === 'SYSTEM_CONNECTOR' && (
                                                        <option value="SYSTEM_CONNECTOR">SYSTEM_CONNECTOR</option>
                                                    )}
                                                </select>
                                            </td>

                                            {/* Clearance Dropdown */}
                                            <td className="px-4 py-3">
                                                <select
                                                    aria-label={`Clearance tier for ${user.displayName || user.walletAddress}`}
                                                    value={user.clearanceLevel}
                                                    onChange={(e) => handleChange(user.id, 'clearanceLevel', e.target.value)}
                                                    className="bg-[#0D1F38] border border-[#1F293D] rounded px-2 py-1 text-xs focus:border-[#1E5FA8] outline-none"
                                                >
                                                    <option value={1}>1 - Restricted</option>
                                                    <option value={2}>2 - Confidential</option>
                                                    <option value={3}>3 - Secret</option>
                                                    <option value={4}>4 - Top Secret</option>
                                                </select>
                                            </td>

                                            {/* SBU is assigned at registration and is read-only here */}
                                            <td className="px-4 py-3 text-xs">{user.sbu?.replace('SBU_', '') || 'N/A'}</td>

                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdate(user.id, user)}
                                                    disabled={saving === user.id}
                                                    className="px-3 py-1.5 bg-[#1E5FA8] hover:bg-[#164a85] text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
                                                >
                                                    {saving === user.id ? 'Saving...' : 'Update'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
