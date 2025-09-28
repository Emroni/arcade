'use client';
import { Controller, Loader } from '@/components';
import { useSocket } from '@/contexts/Socket/Socket';
import { useEffect, useRef } from 'react';

export default function Player() {
    const initialized = useRef(false);
    const socket = useSocket();

    useEffect(() => {
        // Register as player
        if (!initialized.current) {
            initialized.current = true;
            socket.emit('registerPlayer');
        }
    }, [socket]);

    return <>{socket.id ? <Controller /> : <Loader />}</>;
}
