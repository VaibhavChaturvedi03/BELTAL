import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi } from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function IdentityTable({ refreshTrigger = 0, onRegisterClick }) {
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sbuFilter, setSbuFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [editModal, setEditModal] = useState({ open: false, identity: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchIdentities();
  }, [refreshTrigger]);

  // Lock page scrolling when modal is active
  useEffect(() => {
    if (editModal.open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editModal.open]);

  const fetchIdentities = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listIdentities({ limit: 100 });
      setIdentities(data.users || []);
    } catch (err) {
      console.error("Failed to fetch identities", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editModal.identity) return;
    setSaving(true);
    try {
      await adminApi.updateRole(editModal.identity.id, {
        role: editModal.identity.role,
        clearanceLevel: editModal.identity.clearanceLevel,
        sbu: editModal.identity.sbu,
      });
      setEditModal({ open: false, identity: null });
      fetchIdentities();
    } catch (err) {
      alert("Failed to update: " + (err.uiMessage || err.message));
    } finally {
      setSaving(false);
    }
  };

  const filtered = identities.filter(u => {
    const matchSearch = !search ||
      (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.walletAddress || '').toLowerCase().includes(search.toLowerCase());
    const matchSbu = !sbuFilter || u.sbu === sbuFilter;
    const matchTier = !tierFilter || String(u.clearanceLevel) === tierFilter;
    return matchSearch && matchSbu && matchTier;
  });

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="bg-white border-b border-slate-200">
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="text-[#0A1F3D] font-black text-base uppercase tracking-wider">
              Sovereign Identity Registry
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {filtered.length} identit{filtered.length === 1 ? 'y' : 'ies'} provisioned
            </p>
          </div>
          <button
            type="button"
            onClick={onRegisterClick}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E5FA8] hover:bg-[#164a85] px-4 py-2 text-xs font-bold text-white shadow-md transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Register Identity
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
          <input
            type="text"
            placeholder="Search wallet address or DID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-[#0A1F3D] placeholder-slate-400 focus:border-[#1E5FA8] outline-none"
          />
          <select
            value={sbuFilter}
            onChange={(e) => setSbuFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-[#0A1F3D] focus:border-[#1E5FA8] outline-none"
          >
            <option value="">All SBUs</option>
            <option value="SBU_RADAR">Radar</option>
            <option value="SBU_EW">Electronic Warfare</option>
            <option value="SBU_MILCOMM">Military Comm</option>
            <option value="SBU_CYBER">Cyber Security</option>
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-[#0A1F3D] focus:border-[#1E5FA8] outline-none"
          >
            <option value="">All Tiers</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
            <option value="4">Tier 4</option>
            <option value="5">Tier 5</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-slate-500 text-center py-6 text-xs">Loading identities...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-bold">Wallet Address</th>
                  <th className="px-3 py-2 font-bold">Role</th>
                  <th className="px-3 py-2 font-bold">Clearance</th>
                  <th className="px-3 py-2 font-bold">SBU</th>
                  <th className="px-3 py-2 font-bold">On-Chain Status</th>
                  <th className="px-3 py-2 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-6 text-center text-slate-400">
                      No identities found
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-mono text-[#0A1F3D] font-bold">
                          {user.walletAddress?.slice(0, 6)}...{user.walletAddress?.slice(-4)}
                        </div>
                        <div className="text-[10px] text-slate-400">{user.displayName || 'Unknown'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded bg-[#1E5FA8]/10 text-[#1E5FA8] text-[11px] font-bold">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          T-{user.clearanceLevel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {user.sbu?.replace('SBU_', '') || 'N/A'}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          REVOKED
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => setEditModal({ open: true, identity: { ...user } })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#1E5FA8] text-[#1E5FA8] hover:bg-[#1E5FA8] hover:text-white rounded text-[11px] font-bold transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                          Edit Role
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Edit Role Modal - Portal Mount */}
      {editModal.open && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D4AF37] text-xl">admin_panel_settings</span>
                <h2 className="text-sm font-black text-[#0A1F3D]">Modify Identity Clearance</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditModal({ open: false, identity: null })}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3 text-slate-800">
              <div className="p-2.5 rounded-lg bg-[#0A1F3D] border border-[#1F293D]">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#D4AF37] text-xl">badge</span>
                  <div>
                    <div className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-wider">Target Identity</div>
                    <div className="text-xs text-white font-mono font-bold">
                      {editModal.identity?.walletAddress?.slice(0, 8)}...{editModal.identity?.walletAddress?.slice(-4)}
                    </div>
                    <div className="text-[10px] text-slate-300">— {editModal.identity?.displayName || 'System Administrator'}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Role</label>
                <select
                  value={editModal.identity?.role || ''}
                  onChange={(e) => setEditModal(prev => ({
                    ...prev,
                    identity: { ...prev.identity, role: e.target.value }
                  }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:border-[#1E5FA8] outline-none"
                >
                  <option value="USER">USER</option>
                  <option value="OFFICER">OFFICER</option>
                  <option value="AUDITOR">AUDITOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Clearance Tier</label>
                <select
                  value={editModal.identity?.clearanceLevel || 1}
                  onChange={(e) => setEditModal(prev => ({
                    ...prev,
                    identity: { ...prev.identity, clearanceLevel: parseInt(e.target.value) }
                  }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-900 focus:border-[#1E5FA8] outline-none"
                >
                  <option value={1}>Tier 1 — Basic</option>
                  <option value={2}>Tier 2 — Confidential</option>
                  <option value={3}>Tier 3 — Secret</option>
                  <option value={4}>Tier 4 — Top Secret</option>
                  <option value={5}>Tier 5 — Sovereign</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 p-3.5 border-t border-slate-200 shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={() => setEditModal({ open: false, identity: null })}
                className="flex-1 px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={saving}
                className="flex-1 px-3 py-2 bg-[#1E5FA8] hover:bg-[#164a85] text-white font-bold rounded-md text-xs transition-colors shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Card>
  );
}