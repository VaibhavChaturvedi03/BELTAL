import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function TeamMembers() {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (user?.sbu) {
            fetchTeamMembers();
        }
    }, [user, search]);

    const fetchTeamMembers = async () => {
        setLoading(true);
        try {
            const data = await adminApi.listIdentities({
                sbu: user.sbu,
                search: search,
                limit: 100
            });
            setMembers(data.users || []);
        } catch (err) {
            console.error("Failed to fetch team members", err);
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
                    <h1 className="text-2xl font-black text-white tracking-wide">Team Members</h1>
                </div>
            </div>

            <Card goldAccent={false}>
                <CardHeader>
                    <CardTitle>Team Personnel Registry</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Search Bar */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search by name, DID, or wallet..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#1E5FA8] outline-none"
                        />
                    </div>

                    {/* Table */}
                    {loading ? (
                        <p className="text-slate-400 text-center py-8">Loading team members...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="text-xs uppercase text-[#1E5FA8] border-b border-[#1F293D]">
                                    <tr>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">DID / Wallet</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Clearance</th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1F293D]">
                                    {members.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                                No team members found
                                            </td>
                                        </tr>
                                    ) : (
                                        members.map((member) => (
                                            <tr key={member.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium text-white">
                                                    {member.displayName || 'Unknown'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-xs">
                                                        <div className="font-mono text-slate-400">
                                                            {member.walletAddress?.slice(0, 6)}...{member.walletAddress?.slice(-4)}
                                                        </div>
                                                        {member.did && (
                                                            <div className="text-slate-500 text-[10px]">{member.did}</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 rounded bg-[#1E3E62] text-[#7ab0fe] text-xs font-bold">
                                                        {member.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    Level {member.clearanceLevel}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link
                                                        to={`/manager/team/${member.id}`}
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
