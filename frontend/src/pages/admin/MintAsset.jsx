import { useState } from 'react';
import { assetApi } from '../../services/api';
import { useTransaction } from '../../context/TransactionContext';

export default function MintAssetModal({ onClose, open = true }) {
  const { showPending, showSuccess, showError, removeToast } = useTransaction();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    assetType: '',
    classificationTier: 1,
    sbu: '',
    custodianWallet: '',
    assetTag: '',
    description: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const pendingId = showPending('Minting asset on blockchain...');
    try {
      await assetApi.mint({
        ...formData,
        classificationTier: Number(formData.classificationTier),
        metadata: formData.description ? { description: formData.description, tag: formData.assetTag } : {},
      });
      removeToast(pendingId);
      showSuccess('Asset minted successfully!');
      onClose();
    } catch (err) {
      removeToast(pendingId);
      showError(`Failed to mint asset: ${err.uiMessage || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#1E5FA8] text-xl">token</span>
            <h2 className="text-base font-black text-[#0A1F3D]">Mint Defence Asset</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Asset Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Sentinel Radar Unit"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-[#1E5FA8] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Classification Tier</label>
              <select
                value={formData.classificationTier}
                onChange={(e) => setFormData({ ...formData, classificationTier: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-[#1E5FA8] outline-none"
              >
                <option value={1}>Tier 1</option>
                <option value={2}>Tier 2</option>
                <option value={3}>Tier 3</option>
                <option value={4}>Tier 4</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">SBU</label>
              <select
                value={formData.sbu}
                onChange={(e) => setFormData({ ...formData, sbu: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-[#1E5FA8] outline-none"
              >
                <option value="">Select SBU</option>
                <option value="SBU_RADAR">Radar</option>
                <option value="SBU_EW">Electronic Warfare</option>
                <option value="SBU_MILCOMM">Military Comm</option>
                <option value="SBU_CYBER">Cyber Security</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Custodian Wallet Address</label>
            <input
              type="text"
              required
              value={formData.custodianWallet}
              onChange={(e) => setFormData({ ...formData, custodianWallet: e.target.value })}
              placeholder="0x..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-[#1E5FA8] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Asset Tag</label>
            <input
              type="text"
              value={formData.assetTag}
              onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
              placeholder="Optional inventory / asset tag"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-[#1E5FA8] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Non-sensitive asset metadata"
              rows={2}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-[#1E5FA8] outline-none resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-bold text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-3 py-2 bg-[#1E5FA8] hover:bg-[#164a85] disabled:bg-slate-300 text-white font-bold rounded-lg text-xs transition-all"
            >
              {submitting ? 'Minting...' : 'Mint Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}