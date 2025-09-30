'use client';
import { Controller, Loader } from '@/components';
import { useSocket } from '@/contexts/Socket/Socket';

export default function Player() {
    const socket = useSocket();

    if (!socket.connected) {
        return <Loader />;
    }

    return <Controller />;
}
