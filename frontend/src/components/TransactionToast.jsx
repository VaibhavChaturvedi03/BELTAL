import { useEffect } from 'react';

export default function TransactionToast({ type, message, onClose, duration = 5000 }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-emerald-900/90 border-emerald-600 text-emerald-100';
            case 'error':
                return 'bg-red-900/90 border-red-600 text-red-100';
            case 'pending':
                return 'bg-amber-900/90 border-amber-600 text-amber-100';
            default:
                return 'bg-slate-800/90 border-slate-600 text-slate-100';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'check_circle';
            case 'error':
                return 'error';
            case 'pending':
                return 'schedule';
            default:
                return 'info';
        }
    };

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-start gap-3 p-4 rounded-lg border shadow-2xl max-w-md ${getStyles()}`}>
            <span className="material-symbols-outlined text-[20px] mt-0.5">
                {getIcon()}
            </span>
            <div className="flex-1">
                <p className="text-sm font-bold">{type === 'pending' ? 'Processing...' : type === 'success' ? 'Success!' : 'Error'}</p>
                <p className="text-xs mt-1 opacity-90">{message}</p>
            </div>
            <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors"
            >
                <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
        </div>
    );
}