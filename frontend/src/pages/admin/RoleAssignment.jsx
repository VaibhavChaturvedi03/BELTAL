import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function RoleAssignment() {
    const [identities, setIdentities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // Stores ID of currently saving row

    useEffect(() => {
        fetchIdentities();
    }, []);

    const fetchIdentities = async () => {
        try {
            const data = await adminApi.listIdentities({ limit: 50 });
            setIdentities(data.users || []);
        } catch (err) {
            console.error("Failed to fetch identities", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id, currentIdentity) => {
        setSaving(id);
        try {
            await adminApi.updateRole(id, {
                role: currentIdentity.role,
                clearanceLevel: currentIdentity.clearanceLevel,
                sbu: currentIdentity.sbu,
            });
            alert("Role and clearance updated successfully!");
            fetchIdentities(); // Refresh list
        } catch (err) {
            alert("Failed to update: " + (err.uiMessage || err.message));
        } finally {
            setSaving(null);
        }
    };

    const handleChange = (id, field, value) => {
        setIdentities(prev => prev.map(user =>
            user.id === id ? { ...user, [field]: field === 'clearanceLevel' ? parseInt(value) : value } : user
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
                                                    value={user.role}
                                                    onChange={(e) => handleChange(user.id, 'role', e.target.value)}
                                                    className="bg-[#0D1F38] border border-[#1F293D] rounded px-2 py-1 text-xs focus:border-[#1E5FA8] outline-none"
                                                >
                                                    <option value="USER">USER</option>
                                                    <option value="OFFICER">OFFICER</option>
                                                    <option value="AUDITOR">AUDITOR</option>
                                                    <option value="ADMIN">ADMIN</option>
                                                </select>
                                            </td>

                                            {/* Clearance Dropdown */}
                                            <td className="px-4 py-3">
                                                <select
                                                    value={user.clearanceLevel}
                                                    onChange={(e) => handleChange(user.id, 'clearanceLevel', e.target.value)}
                                                    className="bg-[#0D1F38] border border-[#1F293D] rounded px-2 py-1 text-xs focus:border-[#1E5FA8] outline-none"
                                                >
                                                    <option value={1}>1 - Restricted</option>
                                                    <option value={2}>2 - Confidential</option>
                                                    <option value={3}>3 - Secret</option>
                                                    <option value={4}>4 - Top Secret</option>
                                                    <option value={5}>5 - System Admin</option>
                                                </select>
                                            </td>

                                            {/* SBU Dropdown */}
                                            <td className="px-4 py-3">
                                                <select
                                                    value={user.sbu}
                                                    onChange={(e) => handleChange(user.id, 'sbu', e.target.value)}
                                                    className="bg-[#0D1F38] border border-[#1F293D] rounded px-2 py-1 text-xs focus:border-[#1E5FA8] outline-none"
                                                >
                                                    <option value="SBU_RADAR">Radar</option>
                                                    <option value="SBU_EW">Electronic Warfare</option>
                                                    <option value="SBU_MILCOMM">Military Comm</option>
                                                    <option value="SBU_CYBER">Cyber Security</option>
                                                </select>
                                            </td>

                                            <td className="px-4 py-3">
                                                <button
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
