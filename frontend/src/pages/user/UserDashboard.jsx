import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assetApi, transferApi } from '../../services/api';

const shortAddress = (value) => value ? `${value.slice(0, 8)}...${value.slice(-6)}` : 'Credential pending';

function Empty({ icon, title, text }) {
  return <div className="px-6 py-14 text-center"><span className="material-symbols-outlined text-4xl text-[#7AB0FE]">{icon}</span><p className="mt-3 text-sm font-bold text-[#0D2B4E]">{title}</p><p className="mx-auto mt-1 max-w-sm text-sm text-[#65758A]">{text}</p></div>;
}

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myAssets, setMyAssets] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assetsError, setAssetsError] = useState(false);
  const [greeting, setGreeting] = useState('Good Afternoon');

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening');
  }, []);

  useEffect(() => {
    if (!user?.walletAddress) return;
    const load = async () => {
      setLoading(true); setAssetsError(false);
      try { const data = await assetApi.list({ owner: user.walletAddress, limit: 5 }); setMyAssets(data.assets || []); }
      catch (err) { setAssetsError(err?.status === 403 || err?.response?.status === 403); setMyAssets([]); }
      try { const data = await transferApi.list({ fromUser: user.id || user.walletAddress, status: 'PENDING', limit: 5 }); setPendingTransfers(data.transfers || []); }
      catch { setPendingTransfers([]); }
      setLoading(false);
    };
    load();
  }, [user]);

  const metrics = [
    { icon: 'fingerprint', label: 'Identity credential', value: `Level ${user?.clearanceLevel ?? '—'}`, detail: 'Verified access profile', cls: 'bg-[#C8A74C]/15 text-[#9A730C]' },
    { icon: 'token', label: 'Assets in custody', value: loading ? '—' : assetsError ? 'Restricted' : String(myAssets.length).padStart(2, '0'), detail: assetsError ? 'Permission required' : 'Registered to your identity', cls: 'bg-[#1E5FA8]/10 text-[#1E5FA8]' },
    { icon: 'pending_actions', label: 'Open requests', value: loading ? '—' : String(pendingTransfers.length).padStart(2, '0'), detail: 'Transfers awaiting review', cls: 'bg-emerald-100 text-emerald-700' },
  ];

  return <div className="dashboard-console min-h-full bg-[#F6F8FC] text-[#001631]">
    <section className="bg-[#F4F8FC] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <div className="mx-auto max-w-7xl rounded-xl border border-[#315C89] bg-[linear-gradient(135deg,#0A2748_0%,#123D67_62%,#17577E_100%)] p-6 shadow-[0_14px_32px_rgba(13,43,78,0.18)] sm:p-8 lg:p-9">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_310px]"><div><div className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] text-white"><span className="h-2 w-2 rounded-full bg-[#E8CC71]" /> BELTAL USER PORTAL</div><p className="mb-2 text-sm font-semibold text-[#C5DDF7]">Secure personnel access</p><h1 className="max-w-3xl text-3xl font-black tracking-[-0.025em] text-white sm:text-4xl">Welcome, <span className="text-[#E8CC71]">{user?.displayName || 'Officer'}</span>.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#D7E9FB]">Access your identity record, asset registry, and transfer requests through the BELTAL sovereign ledger.</p><div className="mt-7 flex flex-wrap gap-3"><button onClick={() => navigate('/my-assets')} className="dashboard-primary-action rounded-md bg-white px-5 py-3 text-sm font-bold text-[#0D2B4E] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#E8F1FB]">View my assets <span aria-hidden="true">→</span></button><button onClick={() => navigate('/transfer/request')} className="rounded-md border border-white/35 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20">Request transfer</button></div></div><div className="overflow-hidden rounded-xl border border-white/20 bg-white/10 p-4 shadow-[0_12px_30px_rgba(0,18,49,0.18)] backdrop-blur-xl"><div className="flex items-center justify-between border-b border-white/15 pb-3"><span className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-white"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" /> LEDGER ONLINE</span><span className="font-mono text-[10px] text-[#C5DDF7]">#4,928,192</span></div><div className="mt-3 space-y-2">{[['verified_user','Identity verified'],['token','Registry synchronized'],['policy','Access policy active']].map(([icon, text]) => <div key={text} className="flex items-center gap-3 rounded-md border border-white/10 bg-[#071D39]/20 px-3 py-2"><span className="material-symbols-outlined text-[17px] text-[#9DCAFF]">{icon}</span><span className="flex-1 text-xs font-semibold text-white">{text}</span><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /></div>)}</div></div></div>
      </div>
    </section>

    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12"><div className="grid gap-4 md:grid-cols-3">{metrics.map(({ icon, label, value, detail, cls }) => <article key={label} className="group rounded-2xl border border-[#D7E0EA] bg-[#FFFDF8] p-5 shadow-[0_5px_18px_rgba(13,43,78,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(13,43,78,0.12)]"><div className="flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${cls}`}><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span></div><span className="text-[10px] font-bold tracking-[0.12em] text-[#7A8796]">SECURED</span></div><p className="mt-6 text-[11px] font-bold uppercase tracking-[0.12em] text-[#52657B]">{label}</p><p className="mt-1 text-2xl font-extrabold tracking-tight text-[#0D2B4E]">{value}</p><p className="mt-1 text-sm text-[#65758A]">{detail}</p></article>)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.65fr_0.85fr]"><section className="overflow-hidden rounded-2xl border border-[#D7E0EA] bg-[#FFFDF8] shadow-[0_5px_18px_rgba(13,43,78,0.07)]"><div className="flex items-center justify-between border-b border-[#D7E0EA] px-6 py-5"><div><p className="text-[11px] font-bold tracking-[0.13em] text-[#1E5FA8]">ASSET REGISTRY</p><h2 className="mt-1 text-xl font-bold text-[#0D2B4E]">Assets under your custody</h2></div><button onClick={() => navigate('/my-assets')} className="rounded-lg bg-[#0D2B4E] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1E5FA8]">View all →</button></div>
        {loading ? <div className="p-12 text-center text-sm text-[#65758A]"><span className="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-2 border-[#1E5FA8] border-t-transparent" />Syncing your registry…</div> : assetsError ? <Empty icon="lock" title="Registry access is restricted" text="Contact your administrator if you need direct asset access." /> : myAssets.length === 0 ? <Empty icon="inventory_2" title="No assets registered yet" text="Assets assigned to your identity will appear here." /> : <div className="divide-y divide-[#E4EAF1]">{myAssets.map(asset => <div key={asset.id} className="flex items-center gap-4 px-6 py-4 transition hover:bg-[#E8F1FB]/55"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E5FA8]/10 text-[#1E5FA8]"><span className="material-symbols-outlined">token</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#0D2B4E]">{asset.name}</p><p className="mt-0.5 font-mono text-[11px] text-[#718096]">{shortAddress(asset.id)}</p></div><span className="hidden rounded-full bg-[#E8F1FB] px-3 py-1 text-[11px] font-bold text-[#1E5FA8] sm:inline-flex">Tier {asset.classificationTier ?? '—'}</span><button onClick={() => navigate(`/transfer/request?asset=${asset.id}`)} className="text-xs font-bold text-[#1E5FA8] hover:underline">Transfer</button></div>)}</div>}</section>
        <aside className="relative overflow-hidden rounded-2xl bg-[#0D2B4E] p-6 text-white shadow-[0_12px_30px_rgba(13,43,78,0.20)]"><div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:22px_22px]" /><div className="relative"><p className="text-[11px] font-bold tracking-[0.13em] text-[#7AB0FE]">YOUR CREDENTIAL</p><h2 className="mt-2 text-xl font-bold">Identity vault</h2><div className="mt-6 rounded-xl border border-white/15 bg-white/[0.06] p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C8A74C]/20 text-[#E8CC71]"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span></span><div><p className="text-sm font-bold">{user?.displayName || 'Registered User'}</p><p className="text-xs text-[#A9BFDE]">{user?.role || 'USER'} · clearance level {user?.clearanceLevel ?? '—'}</p></div></div><p className="mt-4 break-all border-t border-white/10 pt-3 font-mono text-[11px] leading-5 text-[#B9CCE6]">{user?.walletAddress || 'Awaiting wallet credential'}</p></div><button onClick={() => navigate('/profile')} className="mt-5 flex w-full items-center justify-between rounded-xl border border-[#7AB0FE]/35 bg-[#1E5FA8]/30 px-4 py-3 text-sm font-bold transition hover:bg-[#1E5FA8]/55">Manage identity <span>→</span></button><div className="mt-6 border-t border-white/10 pt-5"><p className="text-[11px] font-bold tracking-[0.13em] text-[#7AB0FE]">TRANSFER ACTIVITY</p><p className="mt-2 text-3xl font-bold">{loading ? '—' : pendingTransfers.length}</p><p className="text-sm text-[#B9CCE6]">requests currently in review</p></div></div></aside></div>
    </div>
  </div>;
}
