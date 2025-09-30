'use client';
import { Loader, PlayerConfig, PlayerController } from '@/components';
import { useConnection } from '@/contexts/Connection/Connection';
import { useState } from 'react';

export default function Player() {
    const [showConfig, setShowConfig] = useState(false);
    const connection = useConnection();

    // Show loader if not connected
    if (!connection.connected) {
        return <Loader />;
    }

    // Config
    if (showConfig) {
        return <PlayerConfig onClose={() => setShowConfig(false)} />;
    }

    // Controller
    return <PlayerController onShowConfig={() => setShowConfig(true)} />;
}
