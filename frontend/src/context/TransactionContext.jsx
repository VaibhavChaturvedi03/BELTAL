import { createContext, useContext, useState, useCallback } from 'react';
import TransactionToast from '../components/TransactionToast';

const TransactionContext = createContext();

export function TransactionProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((type, message, duration) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message, duration }]);
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showPending = useCallback((message) => {
        return showToast('pending', message, 0); // Don't auto-close pending
    }, [showToast]);

    const showSuccess = useCallback((message, duration) => {
        return showToast('success', message, duration || 5000);
    }, [showToast]);

    const showError = useCallback((message, duration) => {
        return showToast('error', message, duration || 5000);
    }, [showToast]);

    return (
        <TransactionContext.Provider value={{ showPending, showSuccess, showError, removeToast }}>
            {children}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <TransactionToast
                        key={toast.id}
                        type={toast.type}
                        message={toast.message}
                        onClose={() => removeToast(toast.id)}
                        duration={toast.duration}
                    />
                ))}
            </div>
        </TransactionContext.Provider>
    );
}

export function useTransaction() {
    const context = useContext(TransactionContext);
    if (!context) {
        throw new Error('useTransaction must be used within TransactionProvider');
    }
    return context;
}