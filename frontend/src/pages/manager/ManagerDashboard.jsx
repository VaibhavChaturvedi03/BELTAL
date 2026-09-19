import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assetApi, transferApi, adminApi } from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function ManagerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ teamMembers: 0, totalAssets: 0, pendingTransfers: 0 });
    const [loading, setLoading] = useState(true);
    const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
    const division = user?.sbu?.replace('SBU_', '') || 'Team';

    useEffect(() => { if (user?.sbu) loadTeamStats(); }, [user]);

    const loadTeamStats = async () => {
        setLoading(true);
        try {
            const identitiesData = await adminApi.listIdentities({ sbu: user.sbu, limit: 1000 }).catch(() => ({ users: [] }));
            const assetsData = await assetApi.list({ sbu: user.sbu, limit: 1000 }).catch(() => ({ assets: [] }));
            const transfersData = await transferApi.list({ status: 'PENDING', sbu: user.sbu }).catch(() => ({ transfers: [] }));
            setStats({ teamMembers: identitiesData.users?.length || 0, totalAssets: assetsData.assets?.length || 0, pendingTransfers: transfersData.transfers?.length || 0 });
        } catch (err) { console.error('Failed to load manager stats', err); } finally { setLoading(false); }
    };

    if (loading) return <div className="role-console min-h-full p-6 flex justify-center items-center h-64"><p className="text-slate-400 animate-pulse">Loading team dashboard...</p></div>;

    return <div className="role-console manager-dashboard min-h-full p-5 sm:p-8 space-y-6">
        <section className="manager-welcome">
            <div className="relative z-10">
                <div className="manager-eyebrow"><span className="h-2 w-2 rounded-full bg-[#E8CC71]" /> MANAGER CLEARANCE · {division.toUpperCase()} DIVISION</div>
                <p className="mt-5 text-sm font-semibold text-[#C5DDF7]">{greeting},</p>
                <h1>Welcome, <span>{user?.displayName || 'Manager'}</span>.</h1>
                <p className="manager-welcome-copy">Coordinate your team, maintain asset readiness, and keep every custody decision moving with confidence.</p>
            </div>
            <div className="manager-status-card relative z-10">
                <div className="flex items-center justify-between border-b border-white/15 pb-3"><span className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-white"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" /> COMMAND CENTER ONLINE</span><span className="font-mono text-[10px] text-[#C5DDF7]">{division.toUpperCase()}</span></div>
                <div className="mt-3 grid grid-cols-2 gap-3"><div><p className="text-[10px] font-bold tracking-wider text-[#A9BFDE]">TEAM SIZE</p><p className="mt-1 text-sm font-bold text-white">{stats.teamMembers}</p></div><div><p className="text-[10px] font-bold tracking-wider text-[#A9BFDE]">AWAITING REVIEW</p><p className="mt-1 text-sm font-bold text-white">{stats.pendingTransfers}</p></div></div>
            </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard title="Team Members" icon="groups" variant="team" value={stats.teamMembers} detail={`Active personnel in ${division}`} />
            <StatCard title="Team Assets" icon="inventory_2" variant="assets" value={stats.totalAssets} detail="Items under team custody" />
            <StatCard title="Pending Transfers" icon="pending_actions" variant="pending" value={stats.pendingTransfers} detail="Awaiting your approval" attention />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <Card goldAccent={false} className="manager-panel lg:col-span-3"><CardHeader><div><CardTitle>Command Shortcuts</CardTitle><p className="manager-panel-subtitle">Open the workspaces your team uses most.</p></div></CardHeader><CardContent><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><ActionCard icon="groups" title="Team Members" detail="Manage personnel" onClick={() => navigate('/team')} /><ActionCard icon="inventory_2" title="Team Assets" detail="Review custody" onClick={() => navigate('/team-assets')} /><ActionCard icon="swap_horiz" title="Approvals" detail="Resolve requests" onClick={() => navigate('/transfers')} /></div></CardContent></Card>
            <Card goldAccent={false} className="manager-panel manager-readiness-card lg:col-span-2"><CardHeader><CardTitle>Operational Readiness</CardTitle></CardHeader><CardContent><ReadinessRow icon="verified_user" title="Custody oversight" detail={`${stats.totalAssets} assets are assigned to your division.`} /><ReadinessRow icon="assignment_turned_in" title="Approval queue" detail={stats.pendingTransfers ? `${stats.pendingTransfers} transfer${stats.pendingTransfers === 1 ? '' : 's'} need review.` : 'No transfers need review.'} /></CardContent></Card>
        </div>
    </div>;
}

function StatCard({ title, icon, variant, value, detail, attention = false }) {
    return <Card goldAccent={false} className={`manager-stat-card${attention ? ' manager-stat-card--attention' : ''}`}><CardHeader><div className="flex w-full items-center justify-between"><CardTitle className="text-sm">{title}</CardTitle><span className={`manager-stat-icon manager-stat-icon--${variant} material-symbols-outlined`}>{icon}</span></div></CardHeader><CardContent><div className="manager-stat-value">{value}</div><div className="manager-stat-copy">{detail}</div></CardContent></Card>;
}

function ActionCard({ icon, title, detail, onClick }) {
    return <button type="button" onClick={onClick} className="manager-action-card"><span className="material-symbols-outlined">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><i className="material-symbols-outlined">arrow_forward</i></button>;
}

function ReadinessRow({ icon, title, detail }) {
    return <div className="manager-readiness-row"><span className="material-symbols-outlined">{icon}</span><div><strong>{title}</strong><small>{detail}</small></div></div>;
}
