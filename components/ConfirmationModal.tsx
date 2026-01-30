import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Evet, Sil',
    cancelText = 'İptal',
    variant = 'danger'
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Wait for exit animation
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, onConfirm]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors bg-zinc-50 hover:bg-zinc-100 p-1.5 rounded-full"
                >
                    <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`mb-4 p-3 rounded-full ${variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        <AlertCircle size={32} />
                    </div>

                    <h3 className="text-xl font-bold text-zinc-900 mb-2">{title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                        {message}
                    </p>

                    <div className="flex w-full gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 font-semibold text-sm hover:bg-zinc-50 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white shadow-lg shadow-red-200 transition-all active:scale-95 ${variant === 'danger'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
