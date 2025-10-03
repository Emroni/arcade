'use client';
import { GameContainer, Loader, Sidebar } from '@/components';
import { useConnection } from '@/contexts/Connection/Connection';

export default function Viewer() {
    const connection = useConnection();

    if (!connection.connected) {
        return <Loader />;
    }

    return (
        <div className="flex h-dvh">
            <GameContainer />
            <Sidebar />
        </div>
    );
}
