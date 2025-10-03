import { XMarkIcon } from '@heroicons/react/24/solid';
import { useClickOutside, useHotkeys } from '@mantine/hooks';
import { useMemo } from 'react';
import QRCode from 'react-qr-code';
import { JoinModalProps } from './JoinModal.types';

export function JoinModal({ onClose }: JoinModalProps) {
    const contentRef = useClickOutside(() => onClose());

    const link = useMemo(() => {
        const origin = typeof window === 'undefined' ? '' : window.location.origin;
        return `${origin}/player`;
    }, []);

    useHotkeys([['Escape', onClose]]);

    return (
        <div className="fixed inset-0 z-100">
            {/* Backdrop */}
            <div className="bg-black fixed opacity-50 inset-0" />

            {/* Container */}
            <div className="flex h-screen items-center justify-center p-4">
                <div className="bg-black max-w-2xs p-4 relative w-full" ref={contentRef}>
                    {/* Close button */}
                    <div className="absolute right-0 top-0 p-4">
                        <button className="h-8 w-8" onClick={onClose}>
                            <XMarkIcon />
                        </button>
                    </div>

                    {/* Content */}
                    <h2 className="mb-4 text-5xl text-indigo-500">Join</h2>
                    <p className="text-center">Open on a mobile device</p>
                    <div className="bg-white my-2  w-16">
                        <QRCode size={256} value={link} viewBox="0 0 256 256" />
                    </div>
                    <a className="block text-center underline" href={link}>
                        {link}
                    </a>
                </div>
            </div>
        </div>
    );
}
