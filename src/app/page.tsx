'use client';
import { Loader, Lobby } from '@/components';
import { useSocket } from '@/contexts/Socket/Socket';
import { useEffect, useRef } from 'react';

export default function Home() {
    const initialized = useRef(false);
    const socket = useSocket();

    useEffect(() => {
        // Register as viewer
        if (!initialized.current) {
            initialized.current = true;
            socket.emit('registerViewer');
        }
    }, [socket]);

    return <>{socket.id ? <Lobby /> : <Loader />}</>;
}
