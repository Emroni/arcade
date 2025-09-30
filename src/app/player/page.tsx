'use client';
import { Controller, Loader } from '@/components';
import { useConnection } from '@/contexts/Connection/Connection';

export default function Player() {
    const connection = useConnection();

    if (!connection.connected) {
        return <Loader />;
    }

    return <Controller />;
}
