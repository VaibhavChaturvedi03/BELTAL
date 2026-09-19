import { useState, useEffect } from 'react';
import { auditApi } from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function AuditTrailExplorer() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20 });

    const [filters, setFilters] = useState({
        actor: '',
        actionType: '',
        asset: '',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        fetchEvents();
    }, [pagination.page, pagination.limit, filters]);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                ...filters,
                page: pagination.page,
                limit: pagination.limit,
            };
            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const data = await auditApi.list(params);
            const auditEvents = Array.isArray(data?.events) ? data.events : [];
            // The API returns `type`, `actor`, and `targetId`; normalize them
            // once for the existing explorer presentation.
            setEvents(auditEvents.map((event) => ({
                ...event,
                actionType: event.type ?? event.actionType,
                performedBy: event.actor ?? event.performedBy,
                entityId: event.targetId ?? event.entityId,
            })));
            setTotal(data?.pagination?.total ?? data?.total ?? 0);
        } catch (err) {
            console.error("Failed to fetch audit events", err);
            setError(err?.uiMessage || 'The audit service could not be reached. Check that the backend is running and has been restarted after database configuration changes.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    };

    const clearFilters = () => {
        setFilters({ actor: '', actionType: '', asset: '', startDate: '', endDate: '' });
        setPagination({ page: 1, limit: 20 });
    };

    const getActionIcon = (actionType) => {
        const icons = {
            IDENTITY_CREATED: 'person_add',
            ROLE_CHANGED: 'admin_panel_settings',
            ASSET_MINTED: 'token',
            TRANSFER_EXECUTED: 'swap_horiz',
            TRANSFER_REQUESTED: 'swap_horiz',
            BADGE_TAP: 'badge',
        };
        return icons[actionType] || 'event';
    };

    const getActionColor = (actionType) => {
        const colors = {
            IDENTITY_CREATED: 'text-emerald-400',
            ROLE_CHANGED: 'text-blue-400',
            ASSET_MINTED: 'text-amber-400',
            TRANSFER_EXECUTED: 'text-purple-400',
            TRANSFER_REQUESTED: 'text-orange-400',
            BADGE_TAP: 'text-pink-400',
        };
        return colors[actionType] || 'text-slate-400';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const totalPages = Math.ceil(total / pagination.limit);

    return (
        <div className="role-console audit-explorer min-h-full p-5 sm:p-8 space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="h-px w-12 bg-gradient-to-r from-[#D4AF37]/40 to-transparent" />
                    <span className="text-[9px] font-black tracking-[0.22em] text-[#D4AF37]/60 uppercase">
                        ◈ AUDITOR CLEARANCE — READ-ONLY ACCESS
                    </span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-wide">Audit Trail Explorer</h1>
                <p className="text-sm text-slate-400">Filterable, paginated audit log with detailed event inspection</p>
            </div>

            {/* Filters */}
            <Card goldAccent={false} className="audit-surface">
                <CardHeader>
                    <div><CardTitle>Filter Audit Events</CardTitle><p className="mt-1 text-xs text-slate-500">Narrow the ledger using any combination of fields.</p></div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Actor (Wallet/Name)
                            </label>
                            <input
                                type="text"
                                placeholder="Search by actor..."
                                value={filters.actor}
                                onChange={(e) => handleFilterChange('actor', e.target.value)}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Action Type
                            </label>
                            <select
                                value={filters.actionType}
                                onChange={(e) => handleFilterChange('actionType', e.target.value)}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                            >
                                <option value="">All Actions</option>
                                <option value="IDENTITY_CREATED">Identity Created</option>
                                <option value="ROLE_CHANGED">Role Changed</option>
                                <option value="ASSET_MINTED">Asset Minted</option>
                                <option value="TRANSFER_EXECUTED">Transfer Executed</option>
                                <option value="TRANSFER_REQUESTED">Transfer Requested</option>
                                <option value="BADGE_TAP">Badge Tap</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Asset ID/Name
                            </label>
                            <input
                                type="text"
                                placeholder="Search by asset..."
                                value={filters.asset}
                                onChange={(e) => handleFilterChange('asset', e.target.value)}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                className="w-full bg-[#0D1F38] border border-[#1F293D] rounded px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="audit-clear-button w-full px-4 py-2 text-xs font-bold rounded transition-colors"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Audit Events Table */}
            <Card goldAccent={false} className="audit-surface audit-events-card">
                <CardHeader>
                    <div className="flex w-full items-center justify-between gap-3"><div><CardTitle>Audit Events</CardTitle><p className="mt-1 text-xs text-slate-500">Select a record to inspect its complete, immutable payload.</p></div><span className="audit-count">{loading ? 'SYNCING' : `${total} TOTAL`}</span></div>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="audit-error-state mb-4 flex items-start gap-3 rounded-lg border p-4 text-sm" role="alert">
                            <span className="audit-error-icon material-symbols-outlined">error</span>
                            <div>
                                <p className="audit-error-title font-bold">Unable to load the audit trail</p>
                                <p className="audit-error-message mt-1 text-xs">{error}</p>
                                <button type="button" onClick={fetchEvents} className="audit-error-retry mt-3 text-xs font-bold underline">Retry</button>
                            </div>
                        </div>
                    )}
                    {loading ? (
                        <p className="text-slate-400 text-center py-8">Loading audit trail...</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="audit-table w-full text-left text-sm text-slate-300">
                                    <thead className="text-xs uppercase text-[#D4AF37] border-b border-[#1F293D]">
                                        <tr>
                                            <th className="px-4 py-3">Action</th>
                                            <th className="px-4 py-3">Actor</th>
                                            <th className="px-4 py-3">Entity</th>
                                            <th className="px-4 py-3">TX Hash</th>
                                            <th className="px-4 py-3">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1F293D]">
                                        {events.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                                    No audit events found for selected filters
                                                </td>
                                            </tr>
                                        ) : (
                                            events.map((event) => (
                                                <tr
                                                    key={event.id}
                                                    onClick={() => setSelectedEvent(event)}
                                                    className="hover:bg-white/5 transition-colors cursor-pointer"
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`material-symbols-outlined text-[18px] ${getActionColor(event.actionType)}`}>
                                                                {getActionIcon(event.actionType)}
                                                            </span>
                                                            <span className="text-xs font-bold text-white">
                                                                {event.actionType?.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs">
                                                            <div className="text-white font-medium">
                                                                {event.performedBy?.displayName || 'System'}
                                                            </div>
                                                            <div className="text-slate-500 font-mono text-[10px]">
                                                                {event.performedBy?.walletAddress?.slice(0, 6)}...
                                                                {event.performedBy?.walletAddress?.slice(-4)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        <div className="text-white">{event.entityName || 'N/A'}</div>
                                                        <div className="text-slate-500 text-[10px]">{event.entityId}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                                                        {event.txHash?.slice(0, 10)}...{event.txHash?.slice(-8)}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-400">
                                                        {formatDate(event.timestamp || event.createdAt)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1F293D]">
                                    <div className="text-xs text-slate-400">
                                        Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, total)} of {total}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                            disabled={pagination.page === 1}
                                            className="px-3 py-1.5 bg-[#1F293D] hover:bg-[#2D3748] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <span className="px-3 py-1.5 text-xs text-slate-400">
                                            Page {pagination.page} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                                            disabled={pagination.page === totalPages}
                                            className="px-3 py-1.5 bg-[#1F293D] hover:bg-[#2D3748] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
        </div>
    );
}

// Event Detail Modal Component
function EventDetailModal({ event, onClose }) {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0D1F38] border border-[#1F293D] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-[#1F293D]">
                        <h2 className="text-xl font-black text-white">Event Details</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Event Info */}
                    <div className="space-y-3">
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Action Type</div>
                            <div className="text-white font-bold">{event.actionType}</div>
                        </div>

                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Timestamp</div>
                            <div className="text-white">{formatDate(event.timestamp || event.createdAt)}</div>
                        </div>

                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Performed By</div>
                            <div className="text-white">{event.performedBy?.displayName || 'System'}</div>
                            <div className="text-slate-400 font-mono text-xs mt-1">
                                {event.performedBy?.walletAddress}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Entity</div>
                            <div className="text-white">{event.entityName || 'N/A'}</div>
                            <div className="text-slate-400 font-mono text-xs mt-1">{event.entityId}</div>
                        </div>

                        {event.txHash && (
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction Hash</div>
                                <div className="text-emerald-400 font-mono text-xs break-all">{event.txHash}</div>
                                <a
                                    href={`https://etherscan.io/tx/${event.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#1E5FA8] hover:text-[#7ab0fe] text-xs mt-1 inline-block"
                                >
                                    View on Etherscan →
                                </a>
                            </div>
                        )}

                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Block Number</div>
                            <div className="text-white">{event.blockNumber || 'N/A'}</div>
                        </div>

                        {/* Full Payload */}
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Full Event Payload</div>
                            <pre className="bg-[#060D1A] border border-[#1F293D] rounded p-3 text-xs text-slate-300 overflow-x-auto">
                                {JSON.stringify(event.payload || event, null, 2)}
                            </pre>
                        </div>
                    </div>

                    {/* Close Button */}
                    <div className="pt-4 border-t border-[#1F293D]">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-[#1E5FA8] hover:bg-[#164a85] text-white font-bold rounded transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
